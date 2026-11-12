(function () {
  'use strict';

  // ─── DOM Elements ───────────────────────────────────────────────────────────
  const pairingScreen    = document.getElementById('pairing-screen');
  const pairingForm      = document.getElementById('pairing-form');
  const inputServerUrl   = document.getElementById('input-server-url');
  const inputDeviceToken = document.getElementById('input-device-token');
  const btnDemoToken1    = document.getElementById('btn-demo-token-1');
  const btnDemoToken2    = document.getElementById('btn-demo-token-2');
  const btnCancelPairing = document.getElementById('btn-cancel-pairing');
  const modeRandomRadio  = document.getElementById('mode-random');

  const slotA        = document.getElementById('media-slot-a');
  const slotB        = document.getElementById('media-slot-b');
  const waitingScreen = document.getElementById('waiting-screen');
  const waitingDeviceName = document.getElementById('waiting-device-name');
  const pushBanner   = document.getElementById('push-banner');
  const pushBannerText = document.getElementById('push-banner-text');

  const statusIndicatorDot = document.getElementById('status-indicator-dot');
  const overlayDeviceName  = document.getElementById('overlay-device-name');
  const overlayStatusText  = document.getElementById('overlay-status-text');
  const statusOverlay      = document.getElementById('status-overlay');
  const btnToggleMode      = document.getElementById('btn-toggle-mode');
  const btnSettings        = document.getElementById('btn-settings');

  // ─── State ──────────────────────────────────────────────────────────────────
  let config = null;
  let ws = null;
  let activeSlot = 'A';          // Which slot is currently VISIBLE
  let playlist = [];
  let currentIndex = 0;
  let slideTimer = null;
  let pushReturnTimer = null;
  let reconnectAttempts = 0;
  let reconnectTimer = null;
  let mouseTimer = null;
  let isPushActive = false;
  let hasPlayedOnce = false;
  let showOverlay = false;

  // Generation counter — incremented on every new transition request.
  // Any async callback checks if its generation still matches before executing.
  let transitionGen = 0;

  const DEFAULT_CONFIG = {
    serverUrl: 'ws://localhost:4001',
    deviceToken: 'token_lobby_utama_demo_12345',
    playbackMode: 'random',
  };

  // ─── Storage ─────────────────────────────────────────────────────────────────
  const isElectron = Boolean(window.electronAPI && window.electronAPI.isElectron);

  async function loadConfig() {
    try {
      if (isElectron) {
        const f = await window.electronAPI.getConfig();
        if (f && f.deviceToken) return f;
      }
      const raw = localStorage.getItem('signage_device_config');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  async function saveConfig(cfg) {
    try {
      if (isElectron) await window.electronAPI.saveConfig(cfg);
      localStorage.setItem('signage_device_config', JSON.stringify(cfg));
    } catch { /* silent */ }
  }

  function getCachedPlaylist() {
    try { return JSON.parse(localStorage.getItem('signage_cached_playlist') || '[]'); }
    catch { return []; }
  }

  function setCachedPlaylist(items) {
    try { localStorage.setItem('signage_cached_playlist', JSON.stringify(items)); }
    catch { /* silent */ }
  }

  // ─── Init ────────────────────────────────────────────────────────────────────
  async function init() {
    // Environment overlay check (from .env CLIENT_SHOW_OVERLAY)
    try {
      if (isElectron && window.electronAPI?.getEnvConfig) {
        const envConfig = await window.electronAPI.getEnvConfig();
        showOverlay = Boolean(envConfig?.showOverlay);
      }
    } catch {
      showOverlay = false;
    }

    if (showOverlay) {
      statusOverlay?.classList.remove('hidden');
    } else {
      statusOverlay?.classList.add('hidden');
    }

    setupMouseHide();

    // Keyboard shortcut (F2 or Ctrl+,) to open settings modal at any time
    window.addEventListener('keydown', (e) => {
      if (e.key === 'F2' || (e.ctrlKey && e.key === ',')) {
        openPairingScreen(true);
      }
    });

    // Clean disconnect on window close so server immediately marks offline
    window.addEventListener('beforeunload', () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        try {
          ws.close(1000, 'Device window closing');
        } catch { /* ok */ }
      }
    });

    btnDemoToken1?.addEventListener('click', () => {
      inputDeviceToken.value = 'token_lobby_utama_demo_12345';
    });
    btnDemoToken2?.addEventListener('click', () => {
      inputDeviceToken.value = 'token_cafeteria_demo_67890';
    });
    btnCancelPairing?.addEventListener('click', closePairingScreen);
    btnSettings?.addEventListener('click', () => openPairingScreen(true));
    btnToggleMode?.addEventListener('click', async () => {
      if (!config) return;
      config.playbackMode = config.playbackMode === 'random' ? 'sequential' : 'random';
      await saveConfig(config);
      updateModeUI();
    });

    pairingForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      config = {
        serverUrl: inputServerUrl.value.trim() || 'ws://localhost:4001',
        deviceToken: inputDeviceToken.value.trim(),
        playbackMode: modeRandomRadio?.checked ? 'random' : 'sequential',
      };
      if (!config.deviceToken) return;
      await saveConfig(config);
      updateModeUI();
      closePairingScreen();
      startConnection();
    });

    config = await loadConfig();
    if (!config || !config.deviceToken) {
      config = DEFAULT_CONFIG;
      await saveConfig(config);
    }
    if (!config.playbackMode) config.playbackMode = 'random';

    updateModeUI();

    // Show cached content immediately while connecting (no black screen on boot)
    playlist = getCachedPlaylist();
    if (playlist.length > 0) {
      hideWaitingScreen();
      currentIndex = pickIndex('initial');
      renderSlide();
    } else {
      showWaitingScreen();
    }

    startConnection();
  }

  function updateModeUI() {
    const isRandom = config?.playbackMode !== 'sequential';
    if (btnToggleMode) {
      btnToggleMode.textContent = isRandom ? '🔀 Acak' : '🔁 Urut';
    }
    if (modeRandomRadio) modeRandomRadio.checked = isRandom;
    const seqRadio = document.getElementById('mode-sequential');
    if (seqRadio) seqRadio.checked = !isRandom;
  }

  function openPairingScreen(allowCancel = false) {
    pairingScreen.classList.remove('hidden');
    if (btnCancelPairing) {
      btnCancelPairing.classList.toggle('hidden', !(allowCancel && config?.deviceToken));
    }
    if (config) {
      inputServerUrl.value = config.serverUrl || 'ws://localhost:4001';
      inputDeviceToken.value = config.deviceToken || '';
      updateModeUI();
    }
  }

  function closePairingScreen() {
    pairingScreen.classList.add('hidden');
  }

  // ─── Mouse Hide ──────────────────────────────────────────────────────────────
  function setupMouseHide() {
    function reset() {
      if (showOverlay) statusOverlay?.classList.remove('overlay-hidden');
      document.body.style.cursor = 'default';
      clearTimeout(mouseTimer);
      mouseTimer = setTimeout(() => {
        if (showOverlay) statusOverlay?.classList.add('overlay-hidden');
        document.body.style.cursor = 'none';
      }, 3000);
    }
    window.addEventListener('mousemove', reset);
    window.addEventListener('click', reset);
    reset();
  }

  // ─── WebSocket ───────────────────────────────────────────────────────────────
  function startConnection() {
    if (!config?.deviceToken) { openPairingScreen(false); return; }
    clearTimeout(reconnectTimer);
    setStatus('connecting', 'Menyambung ke server...');

    try {
      ws = new WebSocket(config.serverUrl);

      ws.onopen = () => {
        reconnectAttempts = 0;
        setStatus('connecting', 'Mengotentikasi token layar...');
        ws.send(JSON.stringify({ type: 'hello', payload: { device_token: config.deviceToken } }));
      };

      ws.onmessage = (ev) => {
        try { handleMessage(JSON.parse(ev.data)); }
        catch (e) { console.error('[Client] WS parse error:', e); }
      };

      ws.onclose = (ev) => {
        if (ev.code === 4403) {
          setStatus('offline', 'Token tidak valid.');
          openPairingScreen(false);
          return;
        }
        setStatus('offline', 'Terputus. Menyambung ulang...');
        scheduleReconnect();
      };

      ws.onerror = () => setStatus('offline', 'Koneksi bermasalah');

    } catch {
      setStatus('offline', 'Gagal membuka koneksi');
      scheduleReconnect();
    }
  }

  function handleMessage({ type, payload }) {
    switch (type) {

      case 'welcome': {
        const devName = payload?.device?.name || 'Layar Digital';
        setStatus('online', 'Layar Online (Tersambung)', devName);
        if (waitingDeviceName) waitingDeviceName.textContent = devName;

        const incoming = payload?.playlist || [];
        if (incoming.length > 0) {
          playlist = incoming;
          setCachedPlaylist(playlist);
          if (!hasPlayedOnce) {
            hideWaitingScreen();
            currentIndex = pickIndex('initial');
            renderSlide();
          }
        } else if (!hasPlayedOnce) {
          showWaitingScreen();
        }
        break;
      }

      case 'playlist:update': {
        playlist = payload?.items || [];
        setCachedPlaylist(playlist);
        if (!isPushActive) {
          if (playlist.length > 0) {
            hideWaitingScreen();
            currentIndex = pickIndex('initial');
            renderSlide();
          } else {
            showWaitingScreen();
          }
        }
        break;
      }

      case 'content:update': {
        // Update content in-place inside playlist
        const updated = payload?.content;
        if (updated) {
          playlist = playlist.map(item => {
            if (item.content?.id === updated.id || item.content_id === updated.id) {
              return { ...item, content: updated };
            }
            return item;
          });
          setCachedPlaylist(playlist);
        }
        break;
      }

      case 'command:show': {
        console.log('[Client] ⚡ Push command received:', payload?.content?.title);
        if (payload?.content) handlePushCommand(payload.content);
        break;
      }

      default:
        break;
    }
  }

  function scheduleReconnect() {
    clearTimeout(reconnectTimer);
    const delay = Math.min(1000 * Math.pow(1.8, reconnectAttempts), 30000) + Math.random() * 1000;
    reconnectAttempts++;
    reconnectTimer = setTimeout(startConnection, delay);
  }

  // ─── Status UI ───────────────────────────────────────────────────────────────
  function setStatus(state, text, deviceName) {
    if (deviceName && overlayDeviceName) overlayDeviceName.textContent = deviceName;
    if (overlayStatusText) overlayStatusText.textContent = text;
    if (statusIndicatorDot) {
      statusIndicatorDot.className = 'status-dot';
      statusIndicatorDot.classList.add(state);   // 'online' | 'connecting' | 'offline'
    }
  }

  // ─── Index Helpers ───────────────────────────────────────────────────────────
  function pickIndex(mode) {
    if (!playlist.length) return 0;
    const isRandom = config?.playbackMode !== 'sequential';

    if (mode === 'initial') {
      return isRandom ? Math.floor(Math.random() * playlist.length) : 0;
    }
    // 'next'
    if (!isRandom || playlist.length === 1) return (currentIndex + 1) % playlist.length;
    let next;
    let tries = 0;
    do { next = Math.floor(Math.random() * playlist.length); tries++; }
    while (next === currentIndex && tries < 10);
    return next;
  }

  // ─── Waiting Screen ──────────────────────────────────────────────────────────
  function showWaitingScreen() {
    waitingScreen?.classList.remove('hidden');
  }

  function hideWaitingScreen() {
    waitingScreen?.classList.add('hidden');
  }

  // ─── Playlist Playback ───────────────────────────────────────────────────────
  function renderSlide() {
    if (isPushActive) return;
    clearTimeout(slideTimer);

    if (!playlist.length) { showWaitingScreen(); return; }

    const item = playlist[currentIndex % playlist.length];
    if (!item?.content) {
      currentIndex = pickIndex('next');
      slideTimer = setTimeout(renderSlide, 300);
      return;
    }

    const durationMs = Math.max((item.duration_sec || 10) * 1000, 2000);

    console.log(
      `[Client] ▶ [${currentIndex + 1}/${playlist.length}] "${item.content.title}" (${item.content.type}) ${durationMs / 1000}s`
    );

    crossfadeToContent(item.content, () => {
      hasPlayedOnce = true;
      clearTimeout(slideTimer);
      slideTimer = setTimeout(() => {
        currentIndex = pickIndex('next');
        renderSlide();
      }, durationMs);
    });
  }

  // ─── Push Command ─────────────────────────────────────────────────────────────
  function handlePushCommand(content) {
    console.log('[Client] ⚡ Push command received (pure display, no banner):', content.title);
    isPushActive = true;
    clearTimeout(slideTimer);
    clearTimeout(pushReturnTimer);

    // Keep banner hidden — pure screen display as requested
    pushBanner?.classList.add('hidden');

    crossfadeToContent(content, () => {
      pushReturnTimer = setTimeout(() => {
        isPushActive = false;
        currentIndex = pickIndex('next');
        renderSlide();
      }, 15000);
    });
  }

  // ─── Core Crossfade Engine ────────────────────────────────────────────────────
  // This is the fixed version. Key invariants:
  //  1. We always call executeFade() — never skip it silently.
  //  2. We use a generation counter so stale async callbacks are discarded.
  //  3. No isTransitioning gate that can get stuck.
  //  4. Safety timeout always calls executeFade() (not just the callback).
  function crossfadeToContent(content, onDone) {
    if (!content) return;

    // Bump generation — any callbacks from previous transitions are now stale.
    const myGen = ++transitionGen;

    const currentSlotEl = activeSlot === 'A' ? slotA : slotB;
    const nextSlotEl    = activeSlot === 'A' ? slotB : slotA;

    // Guard: if this callback is from a stale generation, ignore it.
    function guard(fn) {
      return function (...args) {
        if (transitionGen !== myGen) return;
        fn(...args);
      };
    }

    // This is the ONLY path that swaps slots. Called exactly once per transition.
    let fadeFired = false;
    function executeFade() {
      if (fadeFired) return;
      fadeFired = true;
      clearTimeout(safetyTimer);
      hideWaitingScreen();

      // Keep old slot as underlay so there's never a black frame
      currentSlotEl.classList.add('underlay');
      currentSlotEl.classList.remove('active');

      nextSlotEl.classList.remove('underlay');
      nextSlotEl.classList.add('active');

      // Flip active slot
      activeSlot = activeSlot === 'A' ? 'B' : 'A';

      // Clean up old slot after crossfade animation (400ms)
      setTimeout(() => {
        const oldVideo = currentSlotEl.querySelector('video');
        if (oldVideo) { try { oldVideo.pause(); } catch { /* ok */ } }
        currentSlotEl.classList.remove('underlay', 'active');
        currentSlotEl.innerHTML = '';
      }, 450);

      if (onDone) onDone();
    }

    // Safety timeout: if media never loads, force the swap after 3s anyway.
    // IMPORTANT: calls executeFade(), NOT just onDone().
    const safetyTimer = setTimeout(guard(() => {
      console.warn('[Client] Safety timeout triggered for:', content.title);
      executeFade();
    }), 3000);

    // Clear next slot
    nextSlotEl.innerHTML = '';

    if (content.type === 'text') {
      // Text is synchronous — no loading needed
      const wrap = document.createElement('div');
      wrap.className = 'text-slide';
      const h1 = document.createElement('h1');
      h1.innerHTML = formatText(content.payload);
      wrap.appendChild(h1);
      nextSlotEl.appendChild(wrap);
      executeFade();

    } else if (content.type === 'image') {
      const img = new Image();
      img.className = 'media-fill';
      img.alt = content.title || '';

      img.onload = guard(() => executeFade());
      img.onerror = guard(() => {
        console.warn('[Client] Image failed to load:', content.payload);
        // Fallback to stylized poster — screen NEVER goes black
        nextSlotEl.innerHTML = '';
        const wrap = document.createElement('div');
        wrap.className = 'text-slide';
        const h1 = document.createElement('h1');
        h1.innerHTML = formatText(content.title || 'Konten Signage');
        wrap.appendChild(h1);
        nextSlotEl.appendChild(wrap);
        executeFade();
      });

      img.src = content.payload;
      nextSlotEl.appendChild(img);

      if (img.complete && img.naturalWidth > 0) {
        guard(() => executeFade())();
      }

    } else if (content.type === 'video') {
      const video = document.createElement('video');
      video.className = 'media-fill';
      video.muted = true;
      video.autoplay = true;
      video.loop = true;
      video.playsInline = true;
      video.src = content.payload;

      nextSlotEl.appendChild(video);

      const onReady = guard(() => {
        video.play().catch(() => {});
        executeFade();
      });

      video.addEventListener('canplay',    onReady, { once: true });
      video.addEventListener('loadeddata', onReady, { once: true });

      video.onerror = guard(() => {
        console.warn('[Client] Video failed to load:', content.payload);
        // Fallback to stylized poster — screen NEVER goes black
        nextSlotEl.innerHTML = '';
        const wrap = document.createElement('div');
        wrap.className = 'text-slide';
        const h1 = document.createElement('h1');
        h1.innerHTML = formatText(content.title || 'Video Signage');
        wrap.appendChild(h1);
        nextSlotEl.appendChild(wrap);
        executeFade();
      });

      video.load();
    }
  }

  // ─── Text Formatter ───────────────────────────────────────────────────────────
  function formatText(raw) {
    if (!raw) return '';
    // Normalize literal \n escape sequences from JSON storage
    let t = String(raw)
      .replace(/\\r\\n/g, '\n')
      .replace(/\\n/g, '\n');

    // Convert <br> / <br/> → newlines
    t = t.replace(/<\s*br\s*\/?>/gi, '\n');

    // Strip stray backslashes (not part of a valid escape)
    t = t.replace(/\\(?![nrt"'\\])/g, '');

    // Escape HTML to prevent XSS, then convert \n → <br>
    const div = document.createElement('div');
    div.textContent = t;
    return div.innerHTML.replace(/\n/g, '<br>');
  }

  // ─── Bootstrap ───────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
