import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080';

class WebSocketService {
    constructor() {
        this.client = null;
        this.connected = false;
        this.subscribers = new Map();
        this.userId = null;
        this.pingInterval = null; // heartbeat interval
    }

    connect(userId, onConnectCallback) {
        if (!userId) {
            console.error('❌ Cannot connect: userId is required');
            return;
        }

        if (this.client && this.connected && this.userId === userId) {
            console.log('✅ WebSocket already connected for user: ' + userId);
            if (onConnectCallback) onConnectCallback();
            return;
        }

        if (this.client && this.userId !== userId) {
            this.disconnect();
        }

        this.userId = userId;

        const wsBaseUrl = API_BASE_URL.replace(/\/api$/, '');
        const socket = new SockJS(`${wsBaseUrl}/ws`);
        
        console.log('Connecting to WebSocket at:', `${wsBaseUrl}/ws`);
        
        this.client = new Client({
            webSocketFactory: () => socket,
            debug: (str) => { console.log('STOMP:', str); },
            reconnectDelay: 3000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000
        });

        this.client.onConnect = (frame) => {
            console.log('✅ WebSocket Connected for user: ' + userId);
            this.connected = true;
            
            // Register + ping ngay khi connect (proof of life sau refresh/back)
            this.client.publish({
                destination: '/app/game/register',
                body: JSON.stringify({ userId })
            });

            // Heartbeat mỗi 15s - server timeout là 45s
            this._startPing(userId);

            // 1. MATCH
            this.client.subscribe(`/topic/match/${userId}`, (message) => {
                try { this.notify('match', JSON.parse(message.body)); } catch {}
            });
            // 2. MOVE
            this.client.subscribe(`/topic/move/${userId}`, (message) => {
                try { this.notify('move', JSON.parse(message.body)); } catch {}
            });
            // 3. GAME OVER
            this.client.subscribe(`/topic/game-over/${userId}`, (message) => {
                try { this.notify('game-over', JSON.parse(message.body)); } catch {}
            });
            // 4. GAME STATE (server-authoritative)
            this.client.subscribe(`/topic/game-state/${userId}`, (message) => {
                try { this.notify('game-state', JSON.parse(message.body)); } catch {}
            });
            // 5. ROOM events
            this.client.subscribe(`/topic/room/${userId}`, (message) => {
                try { this.notify('room', JSON.parse(message.body)); } catch {}
            });

            if (onConnectCallback) onConnectCallback();
        };

        this.client.onStompError = (frame) => {
            console.error('❌ STOMP error:', frame.headers['message']);
            this.connected = false;
        };

        this.client.onWebSocketClose = () => {
            console.log('⚠️ WebSocket closed');
            this.connected = false;
            this._stopPing();
        };

        this.client.activate();
    }

    _startPing(userId) {
        this._stopPing();
        this.pingInterval = setInterval(() => {
            if (this.connected && this.client) {
                this.client.publish({
                    destination: '/app/game/ping',
                    body: JSON.stringify({ userId })
                });
            }
        }, 15000); // mỗi 15s
    }

    _stopPing() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }

    disconnect() {
        this._stopPing();
        if (this.client) {
            this.client.deactivate();
            this.connected = false;
        }
    }

    isConnected() {
        return this.connected;
    }

    subscribe(event, callback) {
        if (!this.subscribers.has(event)) {
            this.subscribers.set(event, []);
        }
        const list = this.subscribers.get(event);
        // Tránh duplicate subscription
        if (!list.includes(callback)) {
            list.push(callback);
        }
    }

    unsubscribe(event, callback) {
        if (this.subscribers.has(event)) {
            const list = this.subscribers.get(event);
            const index = list.indexOf(callback);
            if (index !== -1) {
                list.splice(index, 1);
            }
        }
    }

    notify(event, data) {
        if (this.subscribers.has(event)) {
            this.subscribers.get(event).forEach(cb => {
                try {
                    cb(data);
                } catch (error) {
                    console.error('Error in subscriber:', error);
                }
            });
        }
    }

    send(destination, payload) {
        if (this.client && this.connected) {
            this.client.publish({
                destination: `/app${destination}`,
                body: JSON.stringify(payload)
            });
            console.log(`📤 Sent to ${destination}:`, payload);
        } else {
            console.error('❌ Cannot send: WebSocket not connected');
        }
    }
}

const webSocketService = new WebSocketService();
export default webSocketService;