import { Elysia } from 'elysia';
import { z } from 'zod';
import { generateToken, verifyToken } from '../config/auth';
import { Admin } from '../models/Admin';
import { Block } from '../models/Block';
import { Chat } from '../models/Chat';
import { Message } from '../models/Message';
import { User } from '../models/User';

const adminLoginSchema = z.object({
  username: z.string().min(1, 'Kullanıcı adı gerekli'),
  password: z.string().min(1, 'Şifre gerekli')
});

// Admin middleware
const adminAuth = async ({ headers, set }: { headers: any; set: any }) => {
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
  
  if (!payload || (payload.role !== 'admin' && payload.role !== 'moderator')) {
    set.status = 403;
    return {
      success: false,
      message: 'Admin yetkisi gerekli'
    };
  }
  
  return payload;
};

export default new Elysia()
  .post('/admin/login', async ({ body, set }) => {
    try {
      // Veri doğrulama
      const validatedData = adminLoginSchema.parse(body);
      
      // Admin kullanıcısını bul
      const admin = await Admin.findOne({ username: validatedData.username });
      if (!admin) {
        set.status = 401;
        return {
          success: false,
          message: 'Kullanıcı adı veya şifre hatalı'
        };
      }
      
      // Şifre kontrolü
      const isPasswordValid = await admin.comparePassword(validatedData.password);
      if (!isPasswordValid) {
        set.status = 401;
        return {
          success: false,
          message: 'Kullanıcı adı veya şifre hatalı'
        };
      }
      
      // JWT token oluştur
      const token = generateToken({
        userId: admin._id.toString(),
        email: admin.email,
        role: admin.role
      });
      
      return {
        success: true,
        message: 'Admin girişi başarılı',
        data: {
          admin: {
            id: admin._id,
            username: admin.username,
            email: admin.email,
            role: admin.role
          },
          token
        }
      };
    } catch (error) {
      console.error('❌ Admin login error:', error);
      set.status = 400;
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Admin girişi sırasında hata oluştu'
      };
    }
  })
  
  .get('/admin/stats', async ({ headers, set }) => {
    try {
      const adminPayload = await adminAuth({ headers, set });
      if (!adminPayload.success) return adminPayload;
      
      // İstatistikleri hesapla
      const totalUsers = await User.countDocuments();
      const onlineUsers = await User.countDocuments({ is_online: true });
      const totalMessages = await Message.countDocuments();
      const totalChats = await Chat.countDocuments();
      const totalBlocks = await Block.countDocuments();
      
      // Son 7 günün kullanıcı kayıtları
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const newUsersLastWeek = await User.countDocuments({
        created_at: { $gte: sevenDaysAgo }
      });
      
      // Cinsiyet dağılımı
      const genderStats = await User.aggregate([
        { $group: { _id: '$gender', count: { $sum: 1 } } }
      ]);
      
      // Yaş grupları
      const ageStats = await User.aggregate([
        {
          $bucket: {
            groupBy: '$age',
            boundaries: [18, 25, 35, 45, 55, 65, 100],
            default: '65+',
            output: { count: { $sum: 1 } }
          }
        }
      ]);
      
      return {
        success: true,
        data: {
          totalUsers,
          onlineUsers,
          totalMessages,
          totalChats,
          totalBlocks,
          newUsersLastWeek,
          genderStats,
          ageStats
        }
      };
    } catch (error) {
      console.error('❌ Get admin stats error:', error);
      set.status = 500;
      return {
        success: false,
        message: 'İstatistikler getirilirken hata oluştu'
      };
    }
  })
  
  .get('/admin/users', async ({ headers, query, set }) => {
    try {
      const adminPayload = await adminAuth({ headers, set });
      if (!adminPayload.success) return adminPayload;
      
      const page = parseInt(query.page as string) || 1;
      const limit = parseInt(query.limit as string) || 20;
      const skip = (page - 1) * limit;
      const search = query.search as string || '';
      
      // Arama filtresi
      const searchFilter = search ? {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { surname: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      } : {};
      
      const users = await User.find(searchFilter)
        .select('-password')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit);
      
      const total = await User.countDocuments(searchFilter);
      
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
      console.error('❌ Get admin users error:', error);
      set.status = 500;
      return {
        success: false,
        message: 'Kullanıcılar getirilirken hata oluştu'
      };
    }
  })
  
  .get('/admin/users/:id', async ({ params, headers, set }) => {
    try {
      const adminPayload = await adminAuth({ headers, set });
      if (!adminPayload.success) return adminPayload;
      
      const user = await User.findById(params.id).select('-password');
      if (!user) {
        set.status = 404;
        return {
          success: false,
          message: 'Kullanıcı bulunamadı'
        };
      }
      
      // Kullanıcının engelleme geçmişi
      const blockedBy = await Block.find({ blocked_id: params.id })
        .populate('blocker_id', 'name surname email');
      
      const blockedUsers = await Block.find({ blocker_id: params.id })
        .populate('blocked_id', 'name surname email');
      
      // Kullanıcının mesaj sayısı
      const messageCount = await Message.countDocuments({
        $or: [
          { sender_id: params.id },
          { receiver_id: params.id }
        ]
      });
      
      // Kullanıcının chat sayısı
      const chatCount = await Chat.countDocuments({
        $or: [
          { user1_id: params.id },
          { user2_id: params.id }
        ]
      });
      
      return {
        success: true,
        data: {
          user,
          stats: {
            messageCount,
            chatCount,
            blockedBy: blockedBy.length,
            blockedUsers: blockedUsers.length
          },
          blockedBy,
          blockedUsers
        }
      };
    } catch (error) {
      console.error('❌ Get admin user error:', error);
      set.status = 500;
      return {
        success: false,
        message: 'Kullanıcı getirilirken hata oluştu'
      };
    }
  })
  
  .put('/admin/users/:id', async ({ params, body, headers, set }) => {
    try {
      const adminPayload = await adminAuth({ headers, set });
      if (!adminPayload.success) return adminPayload;
      
      const user = await User.findByIdAndUpdate(
        params.id,
        { ...body, updated_at: new Date() },
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
        message: 'Kullanıcı başarıyla güncellendi',
        data: { user }
      };
    } catch (error) {
      console.error('❌ Update admin user error:', error);
      set.status = 400;
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Kullanıcı güncellenirken hata oluştu'
      };
    }
  })
  
  .delete('/admin/users/:id', async ({ params, headers, set }) => {
    try {
      const adminPayload = await adminAuth({ headers, set });
      if (!adminPayload.success) return adminPayload;
      
      // Sadece admin rolü kullanıcı silebilir
      if (adminPayload.role !== 'admin') {
        set.status = 403;
        return {
          success: false,
          message: 'Kullanıcı silme yetkiniz yok'
        };
      }
      
      const user = await User.findByIdAndDelete(params.id);
      if (!user) {
        set.status = 404;
        return {
          success: false,
          message: 'Kullanıcı bulunamadı'
        };
      }
      
      // Kullanıcıyla ilgili tüm verileri sil
      await Message.deleteMany({
        $or: [
          { sender_id: params.id },
          { receiver_id: params.id }
        ]
      });
      
      await Chat.deleteMany({
        $or: [
          { user1_id: params.id },
          { user2_id: params.id }
        ]
      });
      
      await Block.deleteMany({
        $or: [
          { blocker_id: params.id },
          { blocked_id: params.id }
        ]
      });
      
      return {
        success: true,
        message: 'Kullanıcı ve ilgili veriler başarıyla silindi'
      };
    } catch (error) {
      console.error('❌ Delete admin user error:', error);
      set.status = 500;
      return {
        success: false,
        message: 'Kullanıcı silinirken hata oluştu'
      };
    }
  })
  
  .get('/admin/messages', async ({ headers, query, set }) => {
    try {
      const adminPayload = await adminAuth({ headers, set });
      if (!adminPayload.success) return adminPayload;
      
      const page = parseInt(query.page as string) || 1;
      const limit = parseInt(query.limit as string) || 20;
      const skip = (page - 1) * limit;
      
      const messages = await Message.find()
        .populate('sender_id', 'name surname email')
        .populate('receiver_id', 'name surname email')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit);
      
      const total = await Message.countDocuments();
      
      return {
        success: true,
        data: {
          messages,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        }
      };
    } catch (error) {
      console.error('❌ Get admin messages error:', error);
      set.status = 500;
      return {
        success: false,
        message: 'Mesajlar getirilirken hata oluştu'
      };
    }
  })
  
  .delete('/admin/messages/:id', async ({ params, headers, set }) => {
    try {
      const adminPayload = await adminAuth({ headers, set });
      if (!adminPayload.success) return adminPayload;
      
      const message = await Message.findByIdAndDelete(params.id);
      if (!message) {
        set.status = 404;
        return {
          success: false,
          message: 'Mesaj bulunamadı'
        };
      }
      
      return {
        success: true,
        message: 'Mesaj başarıyla silindi'
      };
    } catch (error) {
      console.error('❌ Delete admin message error:', error);
      set.status = 500;
      return {
        success: false,
        message: 'Mesaj silinirken hata oluştu'
      };
    }
  });
