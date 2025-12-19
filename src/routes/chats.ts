import { Elysia } from 'elysia';
import { verifyToken } from '../config/auth';
import { Block } from '../models/Block';
import { Chat } from '../models/Chat';
import { Message } from '../models/Message';

export default new Elysia()
  .get('/chats', async ({ headers, set }) => {
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
      
      const userId = payload.userId;
      
      // Kullanıcının chat'lerini getir
      const chats = await Chat.find({
        $or: [
          { user1_id: userId },
          { user2_id: userId }
        ]
      })
        .sort({ last_time: -1 })
        .populate('user1_id', 'name surname avatar avatar_image bg_color gender is_online last_active')
        .populate('user2_id', 'name surname avatar avatar_image bg_color gender is_online last_active');
      
      // Engellenen kullanıcıları filtrele
      const blockedUserIds = await Block.find({
        $or: [
          { blocker_id: userId },
          { blocked_id: userId }
        ]
      }).distinct('blocked_id');
      
      const filteredChats = chats.filter(chat => {
        const otherUserId = chat.user1_id._id.toString() === userId 
          ? chat.user2_id._id.toString() 
          : chat.user1_id._id.toString();
        return !blockedUserIds.includes(otherUserId);
      });
      
      // Chat'leri frontend formatına dönüştür
      const formattedChats = filteredChats.map(chat => {
        const otherUser = chat.user1_id._id.toString() === userId 
          ? chat.user2_id 
          : chat.user1_id;
        
        return {
          id: chat._id,
          user1Id: chat.user1_id._id.toString(),
          user2Id: chat.user2_id._id.toString(),
          lastMessage: chat.last_message,
          lastTime: chat.last_time,
          unreadCount: chat.unread_count,
          name: otherUser.name + ' ' + otherUser.surname,
          avatar: otherUser.avatar,
          avatarImage: otherUser.avatar_image,
          bgColor: otherUser.bg_color,
          gender: otherUser.gender,
          timestamp: chat.last_time.toISOString(),
          unreadCountText: chat.unread_count > 99 ? '99+' : chat.unread_count.toString()
        };
      });
      
      return {
        success: true,
        data: { chats: formattedChats }
      };
    } catch (error) {
      console.error('❌ Get chats error:', error);
      set.status = 500;
      return {
        success: false,
        message: 'Chat\'ler getirilirken hata oluştu'
      };
    }
  })
  
  .get('/chats/:id', async ({ params, headers, set }) => {
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
      
      const userId = payload.userId;
      
      // Chat'i bul
      const chat = await Chat.findById(params.id)
        .populate('user1_id', 'name surname avatar avatar_image bg_color gender is_online last_active')
        .populate('user2_id', 'name surname avatar avatar_image bg_color gender is_online last_active');
      
      if (!chat) {
        set.status = 404;
        return {
          success: false,
          message: 'Chat bulunamadı'
        };
      }
      
      // Kullanıcının bu chat'e erişim yetkisi var mı kontrol et
      if (chat.user1_id._id.toString() !== userId && chat.user2_id._id.toString() !== userId) {
        set.status = 403;
        return {
          success: false,
          message: 'Bu chat\'e erişim yetkiniz yok'
        };
      }
      
      // Engelleme kontrolü
      const otherUserId = chat.user1_id._id.toString() === userId 
        ? chat.user2_id._id.toString() 
        : chat.user1_id._id.toString();
      
      const isBlocked = await Block.findOne({
        $or: [
          { blocker_id: userId, blocked_id: otherUserId },
          { blocker_id: otherUserId, blocked_id: userId }
        ]
      });
      
      if (isBlocked) {
        set.status = 403;
        return {
          success: false,
          message: 'Bu kullanıcıyla mesajlaşamazsınız'
        };
      }
      
      const otherUser = chat.user1_id._id.toString() === userId 
        ? chat.user2_id 
        : chat.user1_id;
      
      const formattedChat = {
        id: chat._id,
        user1Id: chat.user1_id._id.toString(),
        user2Id: chat.user2_id._id.toString(),
        lastMessage: chat.last_message,
        lastTime: chat.last_time,
        unreadCount: chat.unread_count,
        name: otherUser.name + ' ' + otherUser.surname,
        avatar: otherUser.avatar,
        avatarImage: otherUser.avatar_image,
        bgColor: otherUser.bg_color,
        gender: otherUser.gender,
        timestamp: chat.last_time.toISOString(),
        unreadCountText: chat.unread_count > 99 ? '99+' : chat.unread_count.toString()
      };
      
      return {
        success: true,
        data: { chat: formattedChat }
      };
    } catch (error) {
      console.error('❌ Get chat error:', error);
      set.status = 500;
      return {
        success: false,
        message: 'Chat getirilirken hata oluştu'
      };
    }
  })
  
  .delete('/chats/:id', async ({ params, headers, set }) => {
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
      
      const userId = payload.userId;
      
      // Chat'i bul
      const chat = await Chat.findById(params.id);
      if (!chat) {
        set.status = 404;
        return {
          success: false,
          message: 'Chat bulunamadı'
        };
      }
      
      // Kullanıcının bu chat'i silme yetkisi var mı kontrol et
      if (chat.user1_id.toString() !== userId && chat.user2_id.toString() !== userId) {
        set.status = 403;
        return {
          success: false,
          message: 'Bu chat\'i silme yetkiniz yok'
        };
      }
      
      // Chat'i sil
      await Chat.findByIdAndDelete(params.id);
      
      // Chat'teki tüm mesajları da sil
      await Message.deleteMany({ chat_id: params.id });
      
      return {
        success: true,
        message: 'Chat başarıyla silindi'
      };
    } catch (error) {
      console.error('❌ Delete chat error:', error);
      set.status = 500;
      return {
        success: false,
        message: 'Chat silinirken hata oluştu'
      };
    }
  })
  
  .put('/chats/:id/read', async ({ params, headers, set }) => {
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
      
      const userId = payload.userId;
      
      // Chat'i bul
      const chat = await Chat.findById(params.id);
      if (!chat) {
        set.status = 404;
        return {
          success: false,
          message: 'Chat bulunamadı'
        };
      }
      
      // Kullanıcının bu chat'e erişim yetkisi var mı kontrol et
      if (chat.user1_id.toString() !== userId && chat.user2_id.toString() !== userId) {
        set.status = 403;
        return {
          success: false,
          message: 'Bu chat\'e erişim yetkiniz yok'
        };
      }
      
      // Unread count'u sıfırla
      chat.unread_count = 0;
      await chat.save();
      
      // Chat'teki okunmamış mesajları okundu olarak işaretle
      await Message.updateMany(
        {
          chat_id: params.id,
          receiver_id: userId,
          read: false
        },
        { read: true }
      );
      
      return {
        success: true,
        message: 'Chat okundu olarak işaretlendi'
      };
    } catch (error) {
      console.error('❌ Mark chat as read error:', error);
      set.status = 500;
      return {
        success: false,
        message: 'Chat işaretlenirken hata oluştu'
      };
    }
  });
