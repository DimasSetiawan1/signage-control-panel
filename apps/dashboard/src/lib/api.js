const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('signage_auth_token') || null;
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('signage_auth_token', token);
    } else {
      localStorage.removeItem('signage_auth_token');
    }
  }

  getToken() {
    return this.token || localStorage.getItem('signage_auth_token');
  }

  isAuthenticated() {
    return Boolean(this.getToken());
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = { ...options.headers };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 204) {
      return null;
    }

    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errorMsg = json.error?.message || `Request failed with status ${response.status}`;
      const err = new Error(errorMsg);
      err.status = response.status;
      err.code = json.error?.code;
      if (response.status === 401) {
        this.setToken(null);
        window.dispatchEvent(new CustomEvent('auth:expired'));
      }
      throw err;
    }

    return json.data;
  }

  // Auth
  async login(email, password) {
    const data = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.token);
    return data;
  }

  logout() {
    this.setToken(null);
  }

  // Summary
  async getSummary() {
    return this.request('/api/summary');
  }

  // Devices
  async getDevices({ status, q } = {}) {
    const params = new URLSearchParams();
    if (status && status !== 'all') params.append('status', status);
    if (q) params.append('q', q);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/api/devices${qs}`);
  }

  async getDevice(id) {
    return this.request(`/api/devices/${id}`);
  }

  async createDevice(payload) {
    return this.request('/api/devices', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateDevice(id, payload) {
    return this.request(`/api/devices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async deleteDevice(id) {
    return this.request(`/api/devices/${id}`, {
      method: 'DELETE',
    });
  }

  // Contents
  async getContents({ type, q } = {}) {
    const params = new URLSearchParams();
    if (type && type !== 'all') params.append('type', type);
    if (q) params.append('q', q);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/api/contents${qs}`);
  }

  async getContent(id) {
    return this.request(`/api/contents/${id}`);
  }

  async createContent(formDataOrJson) {
    const isFormData = formDataOrJson instanceof FormData;
    return this.request('/api/contents', {
      method: 'POST',
      body: isFormData ? formDataOrJson : JSON.stringify(formDataOrJson),
    });
  }

  async updateContent(id, formDataOrJson) {
    const isFormData = formDataOrJson instanceof FormData;
    return this.request(`/api/contents/${id}`, {
      method: 'PUT',
      body: isFormData ? formDataOrJson : JSON.stringify(formDataOrJson),
    });
  }

  async deleteContent(id) {
    return this.request(`/api/contents/${id}`, {
      method: 'DELETE',
    });
  }

  // Playlist
  async getPlaylist(deviceId) {
    return this.request(`/api/devices/${deviceId}/playlist`);
  }

  async updatePlaylist(deviceId, items) {
    return this.request(`/api/devices/${deviceId}/playlist`, {
      method: 'PUT',
      body: JSON.stringify({ items }),
    });
  }

  // Push Command
  async pushContent(deviceId, contentId) {
    return this.request(`/api/devices/${deviceId}/push`, {
      method: 'POST',
      body: JSON.stringify({ content_id: contentId }),
    });
  }
}

export const api = new ApiClient();

