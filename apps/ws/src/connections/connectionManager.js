const WebSocket = require('ws');
const { WS_EVENTS } = require('shared');

class ConnectionManager {
  constructor() {
    this.dashboardSockets = new Set();
    this.deviceSockets = new Map(); // deviceId -> ws
    this.deviceData = new Map(); // deviceId -> device
    this.lastSeenThrottles = new Map(); // deviceId -> timestamp
  }

  addDashboard(ws) {
    this.dashboardSockets.add(ws);
    console.log(`[WS] Dashboard connected. Active dashboards: ${this.dashboardSockets.size}`);
  }

  removeDashboard(ws) {
    this.dashboardSockets.delete(ws);
    console.log(`[WS] Dashboard disconnected. Active dashboards: ${this.dashboardSockets.size}`);
  }

  addDevice(deviceId, device, ws) {
    // If device was already connected on an old socket, close the old one
    const existingWs = this.deviceSockets.get(deviceId);
    if (existingWs && existingWs !== ws && existingWs.readyState === WebSocket.OPEN) {
      console.log(`[WS] Closing duplicate connection for device: ${device.name} (${deviceId})`);
      existingWs.close(4409, 'Duplicate connection replaced');
    }

    this.deviceSockets.set(deviceId, ws);
    this.deviceData.set(deviceId, device);
    ws.deviceId = deviceId;
    console.log(`[WS] Device connected: "${device.name}" (${deviceId}). Active devices: ${this.deviceSockets.size}`);
  }

  removeDevice(deviceId) {
    this.deviceSockets.delete(deviceId);
    this.deviceData.delete(deviceId);
    this.lastSeenThrottles.delete(deviceId);
    console.log(`[WS] Device disconnected: (${deviceId}). Active devices: ${this.deviceSockets.size}`);
  }

  getDeviceSocket(deviceId) {
    return this.deviceSockets.get(deviceId);
  }

  getDeviceData(deviceId) {
    return this.deviceData.get(deviceId);
  }

  broadcastToDashboards(type, payload) {
    const message = JSON.stringify({ type, payload });
    console.log(`[WS Broadcast] Sent "${type}" to ${this.dashboardSockets.size} dashboards:`, payload);
    for (const ws of this.dashboardSockets) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    }
  }

  sendToDevice(deviceId, type, payload) {
    const ws = this.deviceSockets.get(deviceId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, payload }));
      return true;
    }
    return false;
  }

  getConnectedDeviceIds() {
    return Array.from(this.deviceSockets.keys());
  }

  sendToAllDevices(type, payload) {
    let sentCount = 0;
    const message = JSON.stringify({ type, payload });
    for (const [deviceId, ws] of this.deviceSockets.entries()) {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(message);
        sentCount++;
      }
    }
    return sentCount;
  }
}

const connectionManager = new ConnectionManager();
module.exports = connectionManager;

