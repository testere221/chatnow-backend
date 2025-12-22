import { Platform } from 'react-native';
import {
  fetchProducts,
  finishTransaction,
  flushFailedPurchasesCachedAsPendingAndroid,
  initConnection,
  Product,
  requestPurchase
} from 'react-native-iap';
import { ApiService } from '../config/api';

type PurchaseResult = {
  success: boolean;
  message?: string;
  diamondsCredited?: number;
};

export class BillingService {
  private static initialized = false;
  private static productsLoaded = false;
  private static products: Product[] = [];

  // Initialize billing client and listeners
  static async initialize(productIds: string[]): Promise<void> {
    if (this.initialized) {
      console.log('[BillingService] Already initialized, skipping');
      return;
    }
    
    try {
      console.log('[BillingService] Initializing connection...');
      console.log('[BillingService] Product IDs:', productIds);
      
      await initConnection();
      this.initialized = true;
      console.log('[BillingService] Connection initialized successfully');

      // Android: flush failed/unfinished purchases defensively
      if (Platform.OS === 'android') {
        try { 
          await flushFailedPurchasesCachedAsPendingAndroid();
          console.log('[BillingService] Flushed pending purchases');
        } catch (e: any) {
          console.log('[BillingService] No pending purchases to flush:', e?.message || e);
        }
      }

      // Preload products (non-blocking)
      if (productIds && productIds.length > 0) {
        this.loadProducts(productIds).catch((e: any) => {
          console.warn('[BillingService] Failed to preload products (non-critical):', e?.message || e);
        });
      }
    } catch (e: any) {
      console.error('[BillingService] Failed to initialize:', e);
      console.error('[BillingService] Error details:', {
        message: e?.message,
        code: e?.code,
        stack: e?.stack
      });
      // Initialize hatası durumunda initialized flag'ini false tut
      this.initialized = false;
      throw e;
    }
  }

  static async loadProducts(productIds: string[]): Promise<Product[]> {
    if (this.productsLoaded && this.products.length > 0) return this.products;
    try {
      console.log('[BillingService] Loading products:', productIds);
      // v9 API: fetchProducts takes skus array directly
      const products = await fetchProducts({ skus: productIds });
      console.log('[BillingService] Products loaded:', products.map(p => ({ id: p.productId, title: p.title })));
      this.products = products;
      this.productsLoaded = true;
      return products;
    } catch (e) {
      console.error('[BillingService] Failed to load products:', e);
      this.productsLoaded = false;
      this.products = [];
      throw e;
    }
  }

  static getCachedProducts(): Product[] {
    return this.products;
  }

  // Core purchase flow: request, acknowledge/consume, verify with backend, then finish
  static async purchase(productId: string): Promise<PurchaseResult> {
    // Check if initialized
    if (!this.initialized) {
      console.error('[BillingService] Not initialized, cannot purchase');
      return { success: false, message: 'Billing servisi başlatılmadı' };
    }

    try {
      console.log('[BillingService] Requesting purchase for:', productId);
      
      // v9 API: requestPurchase takes sku string directly
      const purchase = await requestPurchase({ sku: productId });
      console.log('[BillingService] Purchase result:', purchase);

      const p = Array.isArray(purchase) ? purchase[0] : purchase;
      if (!p) return { success: false, message: 'Satın alma iptal edildi' };

      const purchaseToken = p.transactionReceipt || p.purchaseToken || '';
      if (!purchaseToken) {
        // Always finish to avoid stuck state
        try { await finishTransaction({ purchase: p, isConsumable: true }); } catch {}
        return { success: false, message: 'Geçersiz satın alma makbuzu' };
      }

      // Verify on backend to credit diamonds
      let verifyResponse: any = null;
      try {
        console.log('[BillingService] Verifying purchase with backend:', { productId, purchaseToken: purchaseToken.substring(0, 20) + '...' });
        verifyResponse = await ApiService.verifyAndroidPurchase({
          productId,
          purchaseToken,
          orderId: p.orderId,
          packageName: p.packageNameAndroid,
        });
        console.log('[BillingService] Backend verification success:', verifyResponse);
      } catch (err: any) {
        console.error('[BillingService] Backend verification failed:', err);
        // Still try to finish to avoid pending purchases
        try { await finishTransaction({ purchase: p, isConsumable: true }); } catch {}
        return { success: false, message: err?.message || 'Doğrulama başarısız' };
      }

      // Finish transaction as consumable
      try {
        await finishTransaction({ purchase: p, isConsumable: true });
      } catch {}

      const credited = verifyResponse?.diamondsCredited ?? verifyResponse?.diamonds ?? 0;
      return { success: true, diamondsCredited: credited };
    } catch (e: any) {
      console.error('[BillingService] Purchase error:', e);
      const code = e?.code || e?.message;
      if (code === 'E_USER_CANCELLED') return { success: false, message: 'İptal edildi' };
      return { success: false, message: e?.message || 'Satın alma başarısız' };
    }
  }
}


