import React, { memo, useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import ImageCacheService from '../services/ImageCacheService';

interface OptimizedImageProps {
  uri: string;
  style?: any;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
  placeholder?: React.ReactNode;
  onLoad?: () => void;
  onError?: (error: any) => void;
  cacheKey?: string;
  preload?: boolean;
}

const OptimizedImage = memo<OptimizedImageProps>(({
  uri,
  style,
  resizeMode = 'cover',
  placeholder,
  onLoad,
  onError,
  cacheKey,
  preload = true
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Cache'den resmi al
  const cachedUri = useMemo(() => {
    if (cacheKey) {
      // HTTP URL'leri için farklı cache stratejisi
      if (uri.startsWith('http')) {
        const cached = ImageCacheService.getImage(cacheKey);
        if (cached) {
          return cached.uri;
        }
        // Cache'de yoksa HTTP URL'yi direkt kullan
        return uri;
      } else {
        // Base64 resimler için mevcut strateji
        const cached = ImageCacheService.getProfileImage(cacheKey, uri);
        return cached;
      }
    }
    return uri;
  }, [uri, cacheKey]);

  // Resim yüklendiğinde
  const handleLoad = useCallback(() => {
    setLoading(false);
    setError(false);
    
    // HTTP URL'leri için cache'e kaydet
    if (cacheKey && uri.startsWith('http')) {
      ImageCacheService.setImage(cacheKey, {
        uri: uri,
        timestamp: Date.now(),
        size: 0,
        width: 200,
        height: 200
      });
    }
    
    onLoad?.();
  }, [onLoad, cacheKey, uri]);

  // Resim hatası
  const handleError = useCallback((error: any) => {
    setLoading(false);
    setError(true);
    onError?.(error);
  }, [onError]);

  // Resmi önceden yükle (sadece HTTP URI'leri için)
  React.useEffect(() => {
    if (preload && uri && uri.startsWith('http')) {
      ImageCacheService.preloadImage(uri);
    }
  }, [uri, preload]);

  // Loading placeholder
  const LoadingPlaceholder = memo(() => (
    <View style={[style, styles.placeholder]}>
      {placeholder || (
        <ActivityIndicator 
          size="small" 
          color="#999" 
        />
      )}
    </View>
  ));

  // Error placeholder
  const ErrorPlaceholder = memo(() => (
    <View style={[style, styles.errorPlaceholder]}>
      <View style={styles.errorIcon}>
        <Text style={styles.errorText}>📷</Text>
      </View>
    </View>
  ));

  if (error) {
    return <ErrorPlaceholder />;
  }

  return (
    <View style={style}>
      {loading && <LoadingPlaceholder />}
      <Image
        source={{ uri: cachedUri }}
        style={[
          style,
          {
            opacity: loading ? 0 : 1,
          }
        ]}
        resizeMode={resizeMode}
        onLoad={handleLoad}
        onError={handleError}
        // WhatsApp seviyesi optimizasyonlar
        fadeDuration={0} // Fade animasyonunu kapat (hız için)
        loadingIndicatorSource={undefined} // Loading indicator'ı kapat
        progressiveRenderingEnabled={true} // Progressive rendering
        // Memory optimizasyonları
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
      />
    </View>
  );
});

OptimizedImage.displayName = 'OptimizedImage';

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorPlaceholder: {
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 20,
    opacity: 0.5,
  },
});

export default OptimizedImage;
