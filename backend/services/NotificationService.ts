import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { AppState, Platform } from 'react-native';
import { ApiService } from '../config/api';

// Notification handler configuration
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export class NotificationService {
  private static expoPushToken: string | null = null;
  private static appStateListener: any = null;
  private static isAppInForeground: boolean = true;

  // Initialize notification service
  static async initialize(): Promise<boolean> {
    try {
      // Check if device is physical
      if (!Device.isDevice) {
        return false;
      }

      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        return false;
      }

      // Get push token - Firebase olmadan da çalışabilir
      try {
        const token = await Notifications.getExpoPushTokenAsync({
          projectId: Constants.expoConfig?.extra?.eas?.projectId,
        });

        this.expoPushToken = token.data;
        
        // Token'ın geçerli olup olmadığını kontrol et
        if (!this.expoPushToken || this.expoPushToken === 'local-notification-token') {
          return false;
        }
      } catch (tokenError: any) {
        // Firebase olmadan da çalışabilir - local notification için fake token
        this.expoPushToken = 'local-notification-token';
        
        // Local notifications için true döndür
        return true;
      }

      // Set up app state listener
      this.setupAppStateListener();

      // Register for push notifications
      if (Platform.OS === 'android') {
        // Critical channel for messages
        await Notifications.setNotificationChannelAsync('critical', {
          name: 'Kritik Mesajlar',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          sound: 'default',
          enableVibrate: true,
          enableLights: true,
          showBadge: true,
          bypassDnd: true,
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        });
        
        // Default channel
        await Notifications.setNotificationChannelAsync('default', {
          name: 'ChatNow Mesajları',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          sound: 'default',
          enableVibrate: true,
          enableLights: true,
          showBadge: true,
          bypassDnd: true,
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        });
        
        // High priority channel for messages
        await Notifications.setNotificationChannelAsync('messages', {
          name: 'Mesaj Bildirimleri',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF231F7C',
          sound: 'default',
          enableVibrate: true,
          enableLights: true,
          showBadge: true,
          bypassDnd: true,
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        });
      }

      return true;
    } catch (error) {
      console.error('❌ Error initializing notifications:', error);
      return false;
    }
  }

  // Get current push token
  static getPushToken(): string | null {
    return this.expoPushToken;
  }

  // Clear push token from backend
  static async clearPushToken(userId: string): Promise<boolean> {
    try {
      // Send clear request to backend
      const response = await fetch(`${ApiService['baseURL']}/api/notifications/clear-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await ApiService.getToken()}`,
        },
      });

      const result = await response.json();

      if (response.ok) {
        return true;
      } else {
        return false;
      }
    } catch (error) {
      return false;
    }
  }

  // Send push token to backend
  static async registerPushToken(userId: string): Promise<boolean> {
    try {
      if (!this.expoPushToken) {
        return false;
      }
      
      // Send token to backend
      const response = await fetch(`${ApiService['baseURL']}/api/notifications/register-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await ApiService.getToken()}`,
        },
        body: JSON.stringify({
          pushToken: this.expoPushToken,
          platform: Platform.OS,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        return true;
      } else {
        return false;
      }
    } catch (error) {
      return false;
    }
  }

  // Show local notification
  static async showLocalNotification(
    title: string,
    body: string,
    data?: any
  ): Promise<void> {
    try {
      // Arkaplanda sistem bildirimi gönder
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data || {},
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null, // Show immediately
      });
    } catch (error) {
      // Error showing local notification
    }
  }

  // Show background notification (sistem bildirimi)
  static async showBackgroundNotification(
    title: string,
    body: string,
    data?: any
  ): Promise<void> {
    try {
      // Arkaplanda sistem bildirimi gönder
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: data || {},
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
          badge: 1,
        },
        trigger: null, // Show immediately
      });
    } catch (error) {
      // Error showing background notification
    }
  }

  // Handle notification received
  static addNotificationReceivedListener(
    listener: (notification: Notifications.Notification) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationReceivedListener(listener);
  }

  // Handle notification response (when user taps notification)
  static addNotificationResponseReceivedListener(
    listener: (response: Notifications.NotificationResponse) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationResponseReceivedListener(listener);
  }

  // Clear all notifications
  static async clearAllNotifications(): Promise<void> {
    try {
      await Notifications.dismissAllNotificationsAsync();
    } catch (error) {
      // Error clearing notifications
    }
  }

  // Set badge count
  static async setBadgeCount(count: number): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      // Error setting badge count
    }
  }

  // Get notification permissions status
  static async getPermissionsStatus(): Promise<Notifications.NotificationPermissionsStatus> {
    return await Notifications.getPermissionsAsync();
  }

  // Request notification permissions
  static async requestPermissions(): Promise<Notifications.NotificationPermissionsStatus> {
    return await Notifications.requestPermissionsAsync();
  }

  // Test notification (for debugging)
  static async sendTestNotification(): Promise<void> {
    try {
      await this.showLocalNotification(
        'Test Bildirimi',
        'Bu bir test bildirimidir!',
        { type: 'test' }
      );
    } catch (error) {
      // Test notification failed
    }
  }

  // Setup app state listener
  private static setupAppStateListener(): void {
    this.appStateListener = AppState.addEventListener('change', (nextAppState) => {
      this.isAppInForeground = nextAppState === 'active';
      
      if (nextAppState === 'active') {
        // App foreground'a geldiğinde badge'i temizle
        this.clearAllNotifications();
      }
      // Arkaplana geçtiğinde bildirim gönderme kaldırıldı (badge sistemi korundu)
    });
  }

  // Get app state
  static isAppForeground(): boolean {
    return this.isAppInForeground;
  }

  // Cleanup app state listener
  static cleanup(): void {
    if (this.appStateListener) {
      this.appStateListener.remove();
      this.appStateListener = null;
    }
  }
}
