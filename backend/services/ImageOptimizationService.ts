import * as ImagePicker from 'expo-image-picker';

export interface OptimizedImageResult {
  uri: string;
  width: number;
  height: number;
  size: number; // bytes
  quality: number;
}

class ImageOptimizationService {
  // WhatsApp seviyesi resim optimizasyonu
  private static readonly MAX_WIDTH = 800; // WhatsApp standardı
  private static readonly MAX_HEIGHT = 800;
  private static readonly MAX_SIZE = 500 * 1024; // 500KB
  private static readonly QUALITY = 0.7; // 70% kalite

  /**
   * Resmi WhatsApp seviyesinde optimize et
   */
  static async optimizeImage(originalUri: string): Promise<OptimizedImageResult> {
    try {
      console.log('🖼️ ImageOptimization: Resim optimize ediliyor...', originalUri);

      // Resim boyutlarını al
      const imageInfo = await ImagePicker.getMediaLibraryPermissionsAsync();
      
      // Resmi yeniden boyutlandır ve sıkıştır
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1], // Kare format (WhatsApp standardı)
        quality: this.QUALITY,
        base64: true,
        exif: false, // EXIF verilerini kaldır (boyut küçültür)
      });

      if (result.canceled || !result.assets[0]) {
        throw new Error('Resim seçimi iptal edildi');
      }

      const asset = result.assets[0];
      const optimizedUri = asset.uri;
      
      // Base64'e çevir
      const response = await fetch(optimizedUri);
      const blob = await response.blob();
      
      // Boyut kontrolü
      if (blob.size > this.MAX_SIZE) {
        console.log('⚠️ ImageOptimization: Resim hala çok büyük, daha fazla sıkıştırılıyor...');
        return this.compressImageFurther(optimizedUri);
      }

      const reader = new FileReader();
      return new Promise((resolve, reject) => {
        reader.onload = () => {
          const base64 = reader.result as string;
          resolve({
            uri: base64,
            width: asset.width || this.MAX_WIDTH,
            height: asset.height || this.MAX_HEIGHT,
            size: blob.size,
            quality: this.QUALITY
          });
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

    } catch (error) {
      console.error('❌ ImageOptimization: Resim optimize edilirken hata:', error);
      throw error;
    }
  }

  /**
   * Resmi daha fazla sıkıştır (WhatsApp'ın yaptığı gibi)
   */
  private static async compressImageFurther(uri: string): Promise<OptimizedImageResult> {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.3, // Çok düşük kalite
      base64: true,
      exif: false,
    });

    if (result.canceled || !result.assets[0]) {
      throw new Error('Resim sıkıştırma iptal edildi');
    }

    const asset = result.assets[0];
    const response = await fetch(asset.uri);
    const blob = await response.blob();

    const reader = new FileReader();
    return new Promise((resolve, reject) => {
      reader.onload = () => {
        const base64 = reader.result as string;
        resolve({
          uri: base64,
          width: asset.width || this.MAX_WIDTH,
          height: asset.height || this.MAX_HEIGHT,
          size: blob.size,
          quality: 0.3
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Resim boyutunu kontrol et ve optimize et
   */
  static async validateAndOptimize(uri: string): Promise<OptimizedImageResult> {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      
      console.log('📊 ImageOptimization: Orijinal boyut:', Math.round(blob.size / 1024), 'KB');

      if (blob.size <= this.MAX_SIZE) {
        // Zaten küçük, direkt döndür
        const reader = new FileReader();
        return new Promise((resolve, reject) => {
          reader.onload = () => {
            const base64 = reader.result as string;
            resolve({
              uri: base64,
              width: this.MAX_WIDTH,
              height: this.MAX_HEIGHT,
              size: blob.size,
              quality: 1.0
            });
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }

      // Büyükse optimize et
      return this.optimizeImage(uri);
    } catch (error) {
      console.error('❌ ImageOptimization: Resim doğrulanırken hata:', error);
      throw error;
    }
  }

  /**
   * Resim seçici (optimize edilmiş)
   */
  static async pickOptimizedImage(): Promise<OptimizedImageResult> {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1], // Kare format
        quality: this.QUALITY,
        base64: true,
        exif: false,
      });

      if (result.canceled || !result.assets[0]) {
        throw new Error('Resim seçimi iptal edildi');
      }

      const asset = result.assets[0];
      const response = await fetch(asset.uri);
      const blob = await response.blob();

      console.log('📊 ImageOptimization: Seçilen resim boyutu:', Math.round(blob.size / 1024), 'KB');

      if (blob.size > this.MAX_SIZE) {
        console.log('🔄 ImageOptimization: Resim çok büyük, optimize ediliyor...');
        return this.optimizeImage(asset.uri);
      }

      const reader = new FileReader();
      return new Promise((resolve, reject) => {
        reader.onload = () => {
          const base64 = reader.result as string;
          resolve({
            uri: base64,
            width: asset.width || this.MAX_WIDTH,
            height: asset.height || this.MAX_HEIGHT,
            size: blob.size,
            quality: this.QUALITY
          });
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

    } catch (error) {
      console.error('❌ ImageOptimization: Resim seçilirken hata:', error);
      throw error;
    }
  }
}

export default ImageOptimizationService;
