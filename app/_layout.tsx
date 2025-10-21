import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { AuthWrapper } from '@/components/AuthWrapper';
import { AuthProvider } from '@/contexts/AuthContext';
import { ChatProvider } from '@/contexts/ChatContext';
import { ProfileProvider } from '@/contexts/ProfileContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { NotificationService } from '@/services/NotificationService';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  // RootLayout component rendered

  // Initialize notifications
  useEffect(() => {
    const initializeNotifications = async () => {
      try {
        // Starting notification initialization
        const result = await NotificationService.initialize();
        
        if (result) {
          // Notification service initialized successfully
        } else {
          // Notification service initialization failed
        }
        
        // Set up notification listeners
        const notificationListener = NotificationService.addNotificationReceivedListener(
          (notification) => {
            // Notification received
          }
        );

        const responseListener = NotificationService.addNotificationResponseReceivedListener(
          (response) => {
            // Handle notification tap - navigate to chat
            const data = response.notification.request.content.data;
            if (data?.chatId) {
              // Navigation will be handled by the app
            }
          }
        );

        // Test notification removed

        return () => {
          notificationListener.remove();
          responseListener.remove();
          NotificationService.cleanup();
        };
      } catch (error) {
        // Notification initialization error - silent
      }
    };

    initializeNotifications();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <ChatProvider>
          <ProfileProvider>
            <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
              <AuthWrapper>
              <Stack screenOptions={{ 
                headerShown: false,
                // ULTRA FAST NAVIGATION
                animation: 'none', // Disable animations for speed
                gestureEnabled: false, // Disable gestures for speed
                gestureDirection: 'horizontal',
                // Memory optimizations
                freezeOnBlur: true,
                // Speed optimizations
                animationDuration: 0, // Instant transitions
                presentation: 'card',
              }}>
                <Stack.Screen name="index" />
                
                <Stack.Screen name="home" />
                <Stack.Screen name="chats" />
                <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
                <Stack.Screen name="auth/login" />
                <Stack.Screen name="auth/register" />
                <Stack.Screen 
                  name="chat/[id]" 
                  options={{
                    // Chat screens should be optimized
                    freezeOnBlur: true,
                  }}
                />
                <Stack.Screen 
                  name="profile/[id]" 
                  options={{
                    // Profile screens should be optimized
                    freezeOnBlur: true,
                  }}
                />
                <Stack.Screen name="profile/edit" />
                <Stack.Screen name="tokens/purchase" />
                <Stack.Screen name="tokens/insufficient" />
                <Stack.Screen name="Welcome" />
              </Stack>
            </AuthWrapper>
            <StatusBar style="light" hidden={true} translucent={false} backgroundColor="#000000" />
          </ThemeProvider>
          </ProfileProvider>
        </ChatProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
