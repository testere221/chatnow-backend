import { Elysia } from 'elysia';
import { z } from 'zod';
import { verifyToken } from '../config/auth';
import { Block } from '../models/Block';
import { User } from '../models/User';

const updateProfileSchema = z.object({
  name: z.string().min(2, 'İsim en az 2 karakter olmalı').optional(),
  surname: z.string().min(2, 'Soyisim en az 2 karakter olmalı').optional(),
  age: z.number().min(18, 'Yaş en az 18 olmalı').max(100, 'Yaş en fazla 100 olabilir').optional(),
  location: z.string().min(2, 'Konum en az 2 karakter olmalı').optional(),
  about: z.string().max(500, 'Hakkında en fazla 500 karakter olabilir').optional(),
  avatar: z.string().optional(),
  avatar_image: z.string().optional(),
  bg_color: z.string().optional(),
  hobbies: z.array(z.string()).optional()
});

export default new Elysia()
  .get('/users', async ({ query, set }) => {
    try {
      const page = parseInt(query.page as string) || 1;
      const limit = parseInt(query.limit as string) || 20;
      const skip = (page - 1) * limit;
      
      const users = await User.find({ is_online: true })
        .select('-password')
        .sort({ last_active: -1 })
        .skip(skip)
        .limit(limit);
      
      const total = await User.countDocuments({ is_online: true });
      
      return {
        success: true,
        data: {
          users,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        }
      };
    } catch (error) {
      console.error('❌ Get users error:', error);
      set.status = 500;
      return {
        success: false,
        message: 'Kullanıcılar getirilirken hata oluştu'
      };
    }
  })
  
  .get('/users/:id', async ({ params, set }) => {
    try {
      const user = await User.findById(params.id).select('-password');
      if (!user) {
        set.status = 404;
        return {
          success: false,
          message: 'Kullanıcı bulunamadı'
        };
      }
      
      return {
        success: true,
        data: { user }
      };
    } catch (error) {
      console.error('❌ Get user error:', error);
      set.status = 500;
      return {
        success: false,
        message: 'Kullanıcı getirilirken hata oluştu'
      };
    }
  })
  
  .put('/users/:id', async ({ params, body, headers, set }) => {
    try {
      // Token doğrulama
      const authHeader = headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        set.status = 401;
        return {
          success: false,
          message: 'Token gerekli'
        };
      }
      
      const token = authHeader.substring(7);
      const payload = verifyToken(token);
      
      if (!payload || payload.userId !== params.id) {
        set.status = 403;
        return {
          success: false,
          message: 'Bu işlem için yetkiniz yok'
        };
      }
      
      // Veri doğrulama
      const validatedData = updateProfileSchema.parse(body);
      
      const user = await User.findByIdAndUpdate(
        params.id,
        { ...validatedData, updated_at: new Date() },
        { new: true, runValidators: true }
      ).select('-password');
      
      if (!user) {
        set.status = 404;
        return {
          success: false,
          message: 'Kullanıcı bulunamadı'
        };
      }
      
      return {
        success: true,
        message: 'Profil başarıyla güncellendi',
        data: { user }
      };
    } catch (error) {
      console.error('❌ Update user error:', error);
      set.status = 400;
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Profil güncellenirken hata oluştu'
      };
    }
  })
  
  .post('/users/:id/block', async ({ params, body, headers, set }) => {
    try {
      // Token doğrulama
      const authHeader = headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        set.status = 401;
        return {
          success: false,
          message: 'Token gerekli'
        };
      }
      
      const token = authHeader.substring(7);
      const payload = verifyToken(token);
      
      if (!payload) {
        set.status = 401;
        return {
          success: false,
          message: 'Geçersiz token'
        };
      }
      
      const blockerId = payload.userId;
      const blockedId = params.id;
      
      if (blockerId === blockedId) {
        set.status = 400;
        return {
          success: false,
          message: 'Kendinizi engelleyemezsiniz'
        };
      }
      
      // Zaten engellenmiş mi kontrol et
      const existingBlock = await Block.findOne({
        blocker_id: blockerId,
        blocked_id: blockedId
      });
      
      if (existingBlock) {
        set.status = 400;
        return {
          success: false,
          message: 'Bu kullanıcı zaten engellenmiş'
        };
      }
      
      // Engelleme oluştur
      const block = new Block({
        blocker_id: blockerId,
        blocked_id: blockedId,
        reason: body.reason || 'Kullanıcı tarafından engellendi'
      });
      
      await block.save();
      
      return {
        success: true,
        message: 'Kullanıcı başarıyla engellendi'
      };
    } catch (error) {
      console.error('❌ Block user error:', error);
      set.status = 500;
      return {
        success: false,
        message: 'Kullanıcı engellenirken hata oluştu'
      };
    }
  })
  
  .delete('/users/:id/unblock', async ({ params, headers, set }) => {
    try {
      // Token doğrulama
      const authHeader = headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        set.status = 401;
        return {
          success: false,
          message: 'Token gerekli'
        };
      }
      
      const token = authHeader.substring(7);
      const payload = verifyToken(token);
      
      if (!payload) {
        set.status = 401;
        return {
          success: false,
          message: 'Geçersiz token'
        };
      }
      
      const blockerId = payload.userId;
      const blockedId = params.id;
      
      // Engellemeyi kaldır
      const result = await Block.findOneAndDelete({
        blocker_id: blockerId,
        blocked_id: blockedId
      });
      
      if (!result) {
        set.status = 404;
        return {
          success: false,
          message: 'Engelleme bulunamadı'
        };
      }
      
      return {
        success: true,
        message: 'Engelleme başarıyla kaldırıldı'
      };
    } catch (error) {
      console.error('❌ Unblock user error:', error);
      set.status = 500;
      return {
        success: false,
        message: 'Engelleme kaldırılırken hata oluştu'
      };
    }
  })
  
  .get('/users/:id/blocked', async ({ params, headers, set }) => {
    try {
      // Token doğrulama
      const authHeader = headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        set.status = 401;
        return {
          success: false,
          message: 'Token gerekli'
        };
      }
      
      const token = authHeader.substring(7);
      const payload = verifyToken(token);
      
      if (!payload || payload.userId !== params.id) {
        set.status = 403;
        return {
          success: false,
          message: 'Bu işlem için yetkiniz yok'
        };
      }
      
      const blocks = await Block.find({ blocker_id: params.id })
        .populate('blocked_id', 'name surname avatar avatar_image bg_color gender')
        .sort({ created_at: -1 });
      
      return {
        success: true,
        data: { blocks }
      };
    } catch (error) {
      console.error('❌ Get blocked users error:', error);
      set.status = 500;
      return {
        success: false,
        message: 'Engellenen kullanıcılar getirilirken hata oluştu'
      };
    }
  });
