// API Types
interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  imageUrl?: string;
  timestamp: string;
  read: boolean;
  deletedFor: string[];
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

interface MessagesResponse {
  messages: Message[];
  pagination: PaginationInfo;
}

// API Configuration
export const API_CONFIG = {
  // Railway Production URLs
  BASE_URL: 'https://observant-wisdom-production-ee9f.up.railway.app',
  WEBSOCKET_URL: 'https://observant-wisdom-production-ee9f.up.railway.app',
  
  

  // Ngrok URLs (commented out for local development):
  // BASE_URL: 'https://a8505e689bab.ngrok-free.app',
  // WEBSOCKET_URL: 'https://a8505e689bab.ngrok-free.app',
  ENDPOINTS: {
    AUTH: {
      REGISTER: '/api/auth/register',
      LOGIN: '/api/auth/login',
      FORGOT_PASSWORD: '/api/auth/forgot-password',
      VERIFY_RESET_TOKEN: '/api/auth/verify-reset-token',
      RESET_PASSWORD: '/api/auth/reset-password',
      DELETE_ACCOUNT: '/api/auth/delete-account',
    },
    USERS: {
      LIST: '/api/users',
      PROFILE: '/api/users',
      UPDATE: '/api/users/update',
    },
    MESSAGES: {
      SEND: '/api/messages',
      GET: '/api/messages',
      MARK_AS_READ: '/api/messages/markAsRead',
    },
    CHATS: {
      LIST: '/api/chats',
      MESSAGES: '/api/chats',
    },
    BLOCKS: {
      CREATE: '/api/users/:id/block',
      DELETE: '/api/users/:id/unblock',
      LIST: '/api/users/:id/blocked',
    },
  },
};

// API Helper Functions
export class ApiService {
  private static baseURL = API_CONFIG.BASE_URL;

  // Generic request method
  static async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add authorization header if token exists
    const token = await this.getToken();
    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Jeton hatası için özel error oluştur
        if (errorData.error === 'INSUFFICIENT_TOKENS') {
          const error = new Error('INSUFFICIENT_TOKENS');
          (error as any).requiredTokens = errorData.requiredTokens;
          (error as any).currentTokens = errorData.currentTokens;
          throw error;
        }
        
        // Diğer hatalar için log
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error: any) {
      // INSUFFICIENT_TOKENS hatası için log yazma
      if (error.message !== 'INSUFFICIENT_TOKENS') {
        // Console log'ları kaldırıldı
      }
      throw error;
    }
  }

  // Get stored token
  static async getToken(): Promise<string | null> {
    try {
      const AsyncStorage = await import('@react-native-async-storage/async-storage');
      const token = await AsyncStorage.default.getItem('auth_token');
      return token;
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }

  // Set token
  static async setToken(token: string): Promise<void> {
    try {
      const AsyncStorage = await import('@react-native-async-storage/async-storage');
      await AsyncStorage.default.setItem('auth_token', token);
    } catch (error) {
      console.error('Error setting token:', error);
    }
  }

  // Remove token
  static async removeToken(): Promise<void> {
    try {
      const AsyncStorage = await import('@react-native-async-storage/async-storage');
      await AsyncStorage.default.removeItem('auth_token');
    } catch (error) {
      console.error('Error removing token:', error);
    }
  }

  // Auth methods
  static async register(userData: {
    email: string;
    password: string;
    name: string;
    surname: string;
    age: number;
    location: string;
    gender: 'male' | 'female';
  }) {
    return this.request(API_CONFIG.ENDPOINTS.AUTH.REGISTER, {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  static async login(email: string, password: string) {
    const response = await this.request(API_CONFIG.ENDPOINTS.AUTH.LOGIN, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    // Store token
    if ((response as any).token) {
      await this.setToken((response as any).token);
    }

    return response;
  }

  static async logout() {
    await this.removeToken();
  }

  // Şifre sıfırlama API'leri
  static async forgotPassword(email: string) {
    return this.request(API_CONFIG.ENDPOINTS.AUTH.FORGOT_PASSWORD, {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  static async verifyResetToken(token: string) {
    return this.request(API_CONFIG.ENDPOINTS.AUTH.VERIFY_RESET_TOKEN, {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  static async resetPassword(token: string, newPassword: string) {
    return this.request(API_CONFIG.ENDPOINTS.AUTH.RESET_PASSWORD, {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    });
  }

  // User methods
  static async getUsers() {
    return this.request(API_CONFIG.ENDPOINTS.USERS.LIST);
  }

  static async getUserProfile(userId: string) {
    return this.request(`${API_CONFIG.ENDPOINTS.USERS.PROFILE}/${userId}`);
  }

  static async updateUserProfile(userId: string, userData: any) {
    return this.request(API_CONFIG.ENDPOINTS.USERS.UPDATE, {
      method: 'PUT',
      body: JSON.stringify({ userId, ...userData }),
    });
  }

  static async getUserInfo(userId: string) {
    return this.request(`${API_CONFIG.ENDPOINTS.USERS.PROFILE}/${userId}`);
  }

  // Message methods
  static async sendMessage(receiverId: string, text: string, imageUrl?: string) {
    
    try {
      const response = await this.request(API_CONFIG.ENDPOINTS.MESSAGES.SEND, {
        method: 'POST',
        body: JSON.stringify({
          receiverId,
          text,
          imageUrl,
        }),
      });
      return response;
    } catch (error) {
      console.error('📤 ApiService: sendMessage error', error);
      throw error;
    }
  }

  static async getMessages(chatId: string, page: number = 1) {
    const response = await this.request(`${API_CONFIG.ENDPOINTS.MESSAGES.GET}/${chatId}?page=${page}&limit=50`) as any;
    
    // Pagination response format
    if (response.messages && Array.isArray(response.messages)) {
      return {
        messages: response.messages.map((message: any) => ({
          id: message._id?.toString() || message.id,
          senderId: message.sender_id || message.senderId,
          receiverId: message.receiver_id || message.receiverId,
          text: message.text,
          imageUrl: message.image_url || message.imageUrl,
          timestamp: message.timestamp,
          read: message.read,
          deletedFor: message.deleted_for || message.deletedFor || []
        })),
        pagination: response.pagination
      };
    }
    
    // Backward compatibility for old response format
    if (Array.isArray(response)) {
      return {
        messages: response.map((message: any) => ({
          id: message._id?.toString() || message.id,
          senderId: message.sender_id || message.senderId,
          receiverId: message.receiver_id || message.receiverId,
          text: message.text,
          imageUrl: message.image_url || message.imageUrl,
          timestamp: message.timestamp,
          read: message.read,
          deletedFor: message.deleted_for || message.deletedFor || []
        })),
        pagination: { hasMore: false }
      };
    }
    
    return response;
  }

  static async getMessagesByUserId(userId: string, page: number = 1, limit: number = 50) {
    return this.request(`${API_CONFIG.ENDPOINTS.MESSAGES.GET}/${userId}?page=${page}&limit=${limit}`);
  }

  static async markAsRead(messageId: string) {
    return this.request(API_CONFIG.ENDPOINTS.MESSAGES.MARK_AS_READ, {
      method: 'PUT',
      body: JSON.stringify({ messageId }),
    });
  }

  static async markMessagesAsRead(chatId: string) {
    return Promise.race([
      this.request(API_CONFIG.ENDPOINTS.MESSAGES.MARK_AS_READ, {
        method: 'POST',
        body: JSON.stringify({ chatId }),
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('markAsRead timeout')), 5000)
      )
    ]);
  }

  // Chat methods
  static async getChats() {
    const response = await this.request(API_CONFIG.ENDPOINTS.CHATS.LIST);
    return response;
  }

  static async getChatMessages(chatId: string, page: number = 1, limit: number = 50) {
    return this.request(`${API_CONFIG.ENDPOINTS.CHATS.MESSAGES}/${chatId}?page=${page}&limit=${limit}`);
  }

  // User profile methods
  static async updateProfile(profileData: {
    name?: string;
    surname?: string;
    age?: number;
    location?: string;
    about?: string;
    hobbies?: string[];
    avatar_image?: string;
  }) {
    const response = await this.request(API_CONFIG.ENDPOINTS.USERS.UPDATE, {
      method: 'POST',
      body: JSON.stringify(profileData),
    });
    return response;
  }

  // Get users with pagination
  static async getUsersPaginated(page: number = 1, limit: number = 20, phase: 'online' | 'offline' = 'online') {
    const response = await this.request(`${API_CONFIG.ENDPOINTS.USERS.LIST}/paginated?page=${page}&limit=${limit}&phase=${phase}`);
    return response;
  }

  // Delete chat and all messages
  static async deleteChat(chatId: string) {
    console.log('🔧 ApiService.deleteChat çağrıldı, chatId:', chatId);
    console.log('🔧 Request URL:', `${API_CONFIG.BASE_URL}/api/messages/delete-chat`);
    console.log('🔧 Request body:', JSON.stringify({ chatId }));
    
    try {
      const response = await this.request('/api/messages/delete-chat', {
        method: 'DELETE',
        body: JSON.stringify({ chatId }),
      });
      console.log('🔧 ApiService.deleteChat yanıtı:', response);
      return response;
    } catch (error) {
      console.error('🔧 ApiService.deleteChat hatası:', error);
      throw error;
    }
  }

  // Blocks API'leri
  static async blockUser(userId: string, blockedUserId: string) {
    return this.request(API_CONFIG.ENDPOINTS.BLOCKS.CREATE, {
      method: 'POST',
      body: JSON.stringify({ userId, blockedUserId }),
    });
  }

  static async unblockUser(userId: string, blockedUserId: string) {
    return this.request(API_CONFIG.ENDPOINTS.BLOCKS.DELETE, {
      method: 'DELETE',
      body: JSON.stringify({ userId, blockedUserId }),
    });
  }

  static async getBlockedUsers(userId: string) {
    return this.request(`${API_CONFIG.ENDPOINTS.BLOCKS.LIST}/${userId}`);
  }

  // Account deletion
  static async deleteAccount() {
    return this.request(API_CONFIG.ENDPOINTS.AUTH.DELETE_ACCOUNT, {
      method: 'DELETE',
    });
  }
}
