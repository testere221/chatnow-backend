import { Image } from 'react-native';

export interface CachedImage {
  uri: string;
  timestamp: number;
  size: number;
  width: number;
  height: number;
}

class ImageCacheService {
  private static cache = new Map<string, CachedImage>();
  private static readonly MAX_CACHE_SIZE = 50; // Maksimum 50 resim
  private static readonly CACHE_TTL = 30 * 60 * 1000; // 30 dakika
  private static readonly MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB maksimum

  /**
   * Resmi önbelleğe al
   */
  static setImage(key: string, imageData: CachedImage): void {
    try {
      // Cache boyutunu kontrol et
      if (this.cache.size >= this.MAX_CACHE_SIZE) {
        this.cleanupOldImages();
      }

      this.cache.set(key, {
        ...imageData,
        timestamp: Date.now()
      });

    } catch (error) {
      console.error('❌ ImageCache: Resim önbelleğe alınırken hata:', error);
    }
  }

  /**
   * Önbellekten resim al
   */
  static getImage(key: string): CachedImage | null {
    try {
      const cached = this.cache.get(key);
      
      if (!cached) {
        return null;
      }

      // TTL kontrolü
      if (Date.now() - cached.timestamp > this.CACHE_TTL) {
        this.cache.delete(key);
        return null;
      }

      return cached;
    } catch (error) {
      console.error('❌ ImageCache: Resim önbellekten alınırken hata:', error);
      return null;
    }
  }

  /**
   * Resim var mı kontrol et
   */
  static hasImage(key: string): boolean {
    const cached = this.cache.get(key);
    if (!cached) return false;
    
    // TTL kontrolü
    if (Date.now() - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Eski resimleri temizle
   */
  private static cleanupOldImages(): void {
    try {
      const now = Date.now();
      const entries = Array.from(this.cache.entries());
      
      // Tarihe göre sırala (en eski önce)
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      // En eski %20'sini sil
      const toDelete = Math.floor(entries.length * 0.2);
      
      for (let i = 0; i < toDelete; i++) {
        this.cache.delete(entries[i][0]);
      }

    } catch (error) {
      console.error('❌ ImageCache: Eski resimler temizlenirken hata:', error);
    }
  }

  /**
   * Cache'i temizle
   */
  static clearCache(): void {
    try {
      this.cache.clear();
    } catch (error) {
      console.error('❌ ImageCache: Önbellek temizlenirken hata:', error);
    }
  }

  /**
   * Cache istatistikleri
   */
  static getCacheStats(): { size: number; totalSize: number; oldest: number; newest: number } {
    const entries = Array.from(this.cache.values());
    const totalSize = entries.reduce((sum, img) => sum + img.size, 0);
    const timestamps = entries.map(img => img.timestamp);
    
    return {
      size: this.cache.size,
      totalSize,
      oldest: timestamps.length > 0 ? Math.min(...timestamps) : 0,
      newest: timestamps.length > 0 ? Math.max(...timestamps) : 0
    };
  }

  /**
   * Resim önceden yükle (WhatsApp'ın yaptığı gibi)
   */
  static async preloadImage(uri: string): Promise<void> {
    try {
      if (this.hasImage(uri)) {
        return; // Zaten önbellekte
      }

      // Base64 URI'leri desteklemiyor, sadece HTTP/HTTPS URI'leri önceden yükle
      if (uri.startsWith('data:')) {
        // Base64 URI'leri direkt önbelleğe al, prefetch yapma
        this.setImage(uri, {
          uri,
          timestamp: Date.now(),
          size: 0,
          width: 200, // Varsayılan boyut
          height: 200
        });
        return;
      }

      // Sadece HTTP/HTTPS URI'leri için prefetch yap
      if (uri.startsWith('http')) {
        await Image.prefetch(uri);
        
        // Boyut bilgilerini al
        const { width, height } = await new Promise<{width: number, height: number}>((resolve, reject) => {
          Image.getSize(uri, (w, h) => resolve({ width: w, height: h }), reject);
        });

        // Önbelleğe al
        this.setImage(uri, {
          uri,
          timestamp: Date.now(),
          size: 0, // Boyut bilinmiyor
          width,
          height
        });

      }
    } catch (error) {
      console.error('❌ ImageCache: Resim önceden yüklenirken hata:', error);
    }
  }

  /**
   * Profil fotoğrafı için optimize edilmiş getter
   */
  static getProfileImage(userId: string, avatarImage?: string): string | null {
    if (!avatarImage) return null;

    const key = `profile_${userId}`;
    const cached = this.getImage(key);
    
    if (cached) {
      return cached.uri;
    }

    // Cache'de yoksa, resmi önbelleğe al
    const imageUri = avatarImage.startsWith('data:') 
      ? avatarImage 
      : `data:image/jpeg;base64,${avatarImage}`;

    this.setImage(key, {
      uri: imageUri,
      timestamp: Date.now(),
      size: 0,
      width: 200,
      height: 200
    });

    return imageUri;
  }
}

export default ImageCacheService;
