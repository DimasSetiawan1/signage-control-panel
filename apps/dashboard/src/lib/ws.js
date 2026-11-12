import { api } from './api';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:4001';

class DashboardWebSocket {
  constructor() {
    this.ws = null;
    this.connectionState = 'disconnected'; // 'connecting' | 'connected' | 'disconnected'
    this.listeners = {
      deviceStatus: new Set(),
      snapshot: new Set(),
      connectionState: new Set(),
    };
    this.reconnectAttempts = 0;
    this.maxReconnectDelay = 15000;
    this.reconnectTimer = null;
    this.manualClosed = false;
  }

  connect() {
    const token = api.getToken();
    if (!token) {
      this.setConnectionState('disconnected');
      return;
    }

    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.manualClosed = false;
    this.setConnectionState('connecting');

    try {
      this.ws = new WebSocket(WS_URL);

      this.ws.onopen = () => {
        // Send Dashboard Auth Handshake with JWT
        this.ws.send(
          JSON.stringify({
            type: 'auth',
            payload: { token: api.getToken() },
          })
        );
        this.reconnectAttempts = 0;
        this.setConnectionState('connected');
      };

      this.ws.onmessage = (event) => {
        try {
          const { type, payload } = JSON.parse(event.data);
          console.log('[Dashboard WS Message]', type, payload);
          if (type === 'snapshot') {
            this.emit('snapshot', payload);
          } else if (type === 'device:status') {
            this.emit('deviceStatus', payload);
          }
        } catch (err) {
          console.error('[Dashboard WS] Error parsing message:', err);
        }
      };

      this.ws.onclose = (event) => {
        this.setConnectionState('disconnected');
        if (!this.manualClosed) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (err) => {
        this.setConnectionState('disconnected');
      };
    } catch (err) {
      console.error('[Dashboard WS] Init error:', err);
      this.setConnectionState('disconnected');
      this.scheduleReconnect();
    }
  }

  scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), this.maxReconnectDelay) + Math.random() * 500;
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  disconnect() {
    this.manualClosed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setConnectionState('disconnected');
  }

  setConnectionState(state) {
    this.connectionState = state;
    this.emit('connectionState', state);
  }

  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].add(callback);
    }
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].delete(callback);
    }
  }

  emit(event, data) {
    if (this.listeners[event]) {
      for (const cb of this.listeners[event]) {
        try {
          cb(data);
        } catch (e) {
          console.error(`[Dashboard WS] Listener error on ${event}:`, e);
        }
      }
    }
  }
}

export const wsClient = new DashboardWebSocket();

