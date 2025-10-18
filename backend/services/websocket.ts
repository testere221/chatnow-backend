import { io, Socket } from 'socket.io-client';
import { API_CONFIG } from '../config/api';
import { NotificationService } from './NotificationService';

export class WebSocketService {
  private static instance: WebSocketService;
  private socket: Socket | null = null;
  private listeners: Map<string, ((...args: any[]) => void)[]> = new Map();

  private constructor() {}

  static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  // Connect to WebSocket
  async connect(userId: string): Promise<void> {
    // Önce mevcut bağlantıyı tamamen kapat
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    // Validate userId
    if (!userId || typeof userId !== 'string') {
      return;
    }

    try {
      this.socket = io(API_CONFIG.WEBSOCKET_URL, {
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: true,
        reconnection: true,
        reconnectionDelay: 5000,
        reconnectionAttempts: 3,
        autoConnect: true,
        upgrade: true,
        rememberUpgrade: false,
        withCredentials: false,
        rejectUnauthorized: false,
        // Ngrok için özel ayarlar
        path: '/socket.io/',
        query: {
          'ngrok-skip-browser-warning': 'true'
        },
        extraHeaders: {
          'ngrok-skip-browser-warning': 'true'
        }
      });

      this.socket.on('connect', () => {
        // WebSocket connected
        this.socket?.emit('join', userId);
        // Kullanıcıyı online olarak işaretle
        this.setUserOnline(userId);
        
        // Kuyruğa alınan listener'ları ekle
        this.setupQueuedListeners();
      });

      this.socket.on('connect_error', (error) => {
        // Bağlantı hatası durumunda yeniden deneme
        setTimeout(() => {
          if (!this.socket?.connected) {
            this.connect(userId).catch(() => {});
          }
        }, 5000);
      });

      this.socket.on('disconnect', (reason) => {
        // WebSocket disconnected
      });

      // Set up message listeners
      this.setupMessageListeners();

    } catch (error) {
      // Hata durumunda yeniden deneme
      setTimeout(() => {
        this.connect(userId).catch(() => {});
      }, 3000);
    }
  }

  // Disconnect from WebSocket
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.listeners.clear();
    }
  }

  // Check if connected
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // Send message
  sendMessage(data: {
    senderId: string;
    receiverId: string;
    text?: string;
    imageUrl?: string;
  }): void {
    // Validate message data
    if (!data || !data.senderId || !data.receiverId) {
      return;
    }

    if (this.socket?.connected) {
      this.socket.emit('sendMessage', data);
    } else {
      // WebSocket not connected, attempting to reconnect
      if (data.senderId) {
        this.connect(data.senderId).then(() => {
          if (this.socket?.connected) {
            this.socket.emit('sendMessage', data);
          }
        }).catch(() => {});
      }
    }
  }

  // Add event listener
  on(event: string, callback: (...args: any[]) => void): void {
    // Önce aynı callback'i kaldır (duplicate'ları önlemek için)
    if (this.listeners.has(event)) {
      const existingCallbacks = this.listeners.get(event) || [];
      const index = existingCallbacks.indexOf(callback);
      if (index > -1) {
        existingCallbacks.splice(index, 1);
      }
    }

    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);

    // Socket'e ekleme - sadece bir kez ekle
    if (this.socket?.connected) {
      this.socket.off(event, callback);
      this.socket.on(event, callback);
    }
  }

  // Remove event listener
  off(event: string, callback?: (...args: any[]) => void): void {
    if (callback) {
      const listeners = this.listeners.get(event) || [];
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    } else {
      this.listeners.delete(event);
    }

    if (this.socket) {
      if (callback) {
        this.socket.off(event, callback);
      } else {
        this.socket.removeAllListeners(event);
      }
    }
  }

  // Setup message listeners
  private setupMessageListeners(): void {
    if (!this.socket) return;

    // Önce tüm listener'ları temizle
    this.socket.removeAllListeners('newMessage');
    this.socket.removeAllListeners('messageSent');
    this.socket.removeAllListeners('error');

    // Sadece notification için dinle - count ChatContext'te yönetiliyor
    this.socket.on('newMessage', (data) => {
      // Count için ayrı event emit et
      this.emit('messageForCount', data);
      // Show notification for new message (only for receiver)
      this.handleNewMessageNotification(data);
    });

    this.socket.on('messageSent', (data) => {
      this.emit('messageSent', data);
    });

    this.socket.on('error', (error) => {
      this.emit('error', error);
    });
  }

  // Handle new message notification
  private async handleNewMessageNotification(data: any): Promise<void> {
    try {
      if (data.message) {
        const message = data.message;
        const senderName = message.senderName || message.sender_name || 'Bilinmeyen Kullanıcı';
        const senderSurname = message.senderSurname || message.sender_surname || '';
        const fullSenderName = senderSurname ? `${senderName} ${senderSurname}` : senderName;
        const messageText = message.text || 'Yeni mesaj';
        
        // Always show notification for new messages (both foreground and background)
        await NotificationService.showLocalNotification(
          fullSenderName,
          messageText,
          {
            chatId: data.chatId,
            messageId: message.id,
            senderId: message.senderId || message.sender_id,
            type: 'message'
          }
        );
      }
    } catch (error) {
      // Error handling message notification
    }
  }

  // Setup queued listeners when socket connects
  private setupQueuedListeners(): void {
    if (!this.socket?.connected) return;

    this.listeners.forEach((callbacks, event) => {
      callbacks.forEach(callback => {
        // Önce kaldır, sonra ekle (duplicate'ları önlemek için)
        this.socket?.off(event, callback);
        this.socket?.on(event, callback);
      });
    });
  }

  // Emit event to listeners
  private emit(event: string, data: any): void {
    const listeners = this.listeners.get(event) || [];
    listeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        // Error in event listener
      }
    });
  }

  // Get socket ID
  getSocketId(): string | undefined {
    return this.socket?.id;
  }

  // Set user online
  setUserOnline(userId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('user_online', { userId });
    }
  }

  // Set user offline
  setUserOffline(userId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('user_offline', { userId });
    }
  }

  // Listen for user status changes
  onUserStatusChange(callback: (data: { userId: string; isOnline: boolean; lastActive: Date }) => void): void {
    if (this.socket) {
      this.socket.on('user_status_changed', callback);
    }
  }

  // Remove user status listener
  offUserStatusChange(callback: (...args: any[]) => void): void {
    if (this.socket) {
      this.socket.off('user_status_changed', callback);
    }
  }

  // Listen for new messages - Real-time messaging (KALDIRILDI - artık on() kullanılıyor)
  // onNewMessage(callback: (data: { chatId: string; message: any }) => void): void {
  //   if (this.socket) {
  //     this.socket.on('new_message', (data) => {
  //       callback(data);
  //     });
  //   }
  // }

  // Remove new message listener (KALDIRILDI - artık off() kullanılıyor)
  // offNewMessage(callback: (...args: any[]) => void): void {
  //   if (this.socket) {
  //     this.socket.off('new_message', callback);
  //   }
  // }
}

// Export singleton instance
export const webSocketService = WebSocketService.getInstance();
