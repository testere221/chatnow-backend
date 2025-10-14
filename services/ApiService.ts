import { API_CONFIG } from '../config/api';

// API Service sınıfı
class ApiService {
  private static baseURL = API_CONFIG.BASE_URL;

  // HTTP istekleri için yardımcı fonksiyon
  private static async request(endpoint: string, options: RequestInit = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    const defaultOptions: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, defaultOptions);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'API isteği başarısız');
      }

      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Auth API'leri
  static async register(userData: any) {
    return this.request(API_CONFIG.ENDPOINTS.AUTH.REGISTER, {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  static async login(email: string, password: string) {
    return this.request(API_CONFIG.ENDPOINTS.AUTH.LOGIN, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
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

  // Users API'leri
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

  // Messages API'leri
  static async sendMessage(receiverId: string, text: string, imageUrl?: string) {
    return this.request(API_CONFIG.ENDPOINTS.MESSAGES.SEND, {
      method: 'POST',
      body: JSON.stringify({ receiverId, text, imageUrl }),
    });
  }

  static async getMessages(userId: string, page: number = 1, limit: number = 50) {
    return this.request(`${API_CONFIG.ENDPOINTS.MESSAGES.GET}/${userId}?page=${page}&limit=${limit}`);
  }

  static async markAsRead(messageId: string) {
    return this.request(API_CONFIG.ENDPOINTS.MESSAGES.MARK_AS_READ, {
      method: 'PUT',
      body: JSON.stringify({ messageId }),
    });
  }

  // Chats API'leri
  static async getChats() {
    return this.request(API_CONFIG.ENDPOINTS.CHATS.LIST);
  }

  static async getChatMessages(chatId: string, page: number = 1, limit: number = 50) {
    return this.request(`${API_CONFIG.ENDPOINTS.CHATS.MESSAGES}/${chatId}?page=${page}&limit=${limit}`);
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
}

export default ApiService;
