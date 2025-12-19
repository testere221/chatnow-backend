import { Elysia } from 'elysia';
import { z } from 'zod';
import { verifyToken } from '../config/auth';
import { Block } from '../models/Block';
import { Chat } from '../models/Chat';
import { Message } from '../models/Message';
import { User } from '../models/User';

const sendMessageSchema = z.object({
  receiver_id: z.string().min(1, 'Alıcı ID gerekli'),
  text: z.string().min(1, 'Mesaj metni gerekli').max(1000, 'Mesaj en fazla 1000 karakter olabilir'),
  image_url: z.string().optional()
});

export default new Elysia()
  .get('/messages/:chatId', async ({ params, query, headers, set }) => {
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
      
      const page = parseInt(query.page as string) || 1;
      const limit = parseInt(query.limit as string) || 50;
      const skip = (page - 1) * limit;
      
      // Chat ID'den kullanıcı ID'lerini çıkar
      const chatIdParts = params.chatId.split('_');
      const user1Id = chatIdParts[0];
      const user2Id = chatIdParts[1];
      
      // Kullanıcının bu chat'e erişim yetkisi var mı kontrol et
      if (payload.userId !== user1Id && payload.userId !== user2Id) {
        set.status = 403;
        return {
          success: false,
          message: 'Bu sohbete erişim yetkiniz yok'
        };
      }
      
      // Mesajları getir
      const messages = await Message.find({
        participants: { $all: [user1Id, user2Id] },
        deleted_for: { $nin: [payload.userId] }
      })
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .populate('sender_id', 'name surname avatar avatar_image')
        .populate('receiver_id', 'name surname avatar avatar_image');
      
      const total = await Message.countDocuments({
        participants: { $all: [user1Id, user2Id] },
        deleted_for: { $nin: [payload.userId] }
      });
      
      return {
        success: true,
        data: {
          messages: messages.reverse(), // Eski mesajlar önce gelsin
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        }
      };
    } catch (error) {
      console.error('❌ Get messages error:', error);
      set.status = 500;
      return {
        success: false,
        message: 'Mesajlar getirilirken hata oluştu'
      };
    }
  })
  
  .post('/messages', async ({ body, headers, set }) => {
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
      
      // Veri doğrulama
      const validatedData = sendMessageSchema.parse(body);
      
      const senderId = payload.userId;
      const receiverId = validatedData.receiver_id;
      
      // Kendine mesaj gönderme kontrolü
      if (senderId === receiverId) {
        set.status = 400;
        return {
          success: false,
          message: 'Kendinize mesaj gönderemezsiniz'
        };
      }
      
      // Engelleme kontrolü
      const isBlocked = await Block.findOne({
        $or: [
          { blocker_id: senderId, blocked_id: receiverId },
          { blocker_id: receiverId, blocked_id: senderId }
        ]
      });
      
      if (isBlocked) {
        set.status = 403;
        return {
          success: false,
          message: 'Bu kullanıcıyla mesajlaşamazsınız'
        };
      }
      
      // Alıcı kullanıcı var mı kontrol et
      const receiver = await User.findById(receiverId);
      if (!receiver) {
        set.status = 404;
        return {
          success: false,
          message: 'Alıcı kullanıcı bulunamadı'
        };
      }
      
      // Chat ID oluştur (alfabetik sıralama)
      const chatId = [senderId, receiverId].sort().join('_');
      
      // Mesaj oluştur
      const message = new Message({
        participants: [senderId, receiverId],
        sender_id: senderId,
        receiver_id: receiverId,
        text: validatedData.text,
        image_url: validatedData.image_url || '',
        chat_id: chatId
      });
      
      await message.save();
      
      // Chat'i güncelle veya oluştur
      let chat = await Chat.findOne({
        user1_id: { $in: [senderId, receiverId] },
        user2_id: { $in: [senderId, receiverId] }
      });
      
      if (!chat) {
        // Yeni chat oluştur
        chat = new Chat({
          user1_id: senderId,
          user2_id: receiverId,
          last_message: validatedData.text,
          last_time: new Date(),
          unread_count: 1,
          name: receiver.name + ' ' + receiver.surname,
          avatar: receiver.avatar,
          avatar_image: receiver.avatar_image,
          bg_color: receiver.bg_color,
          gender: receiver.gender
        });
      } else {
        // Mevcut chat'i güncelle
        chat.last_message = validatedData.text;
        chat.last_time = new Date();
        if (chat.user1_id.toString() === receiverId) {
          chat.unread_count += 1;
        }
      }
      
      await chat.save();
      
      // Mesajı populate et
      await message.populate('sender_id', 'name surname avatar avatar_image');
      await message.populate('receiver_id', 'name surname avatar avatar_image');
      
      return {
        success: true,
        message: 'Mesaj başarıyla gönderildi',
        data: { message }
      };
    } catch (error) {
      console.error('❌ Send message error:', error);
      set.status = 400;
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Mesaj gönderilirken hata oluştu'
      };
    }
  })
  
  .put('/messages/:id/read', async ({ params, headers, set }) => {
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
      
      const message = await Message.findById(params.id);
      if (!message) {
        set.status = 404;
        return {
          success: false,
          message: 'Mesaj bulunamadı'
        };
      }
      
      // Mesajın alıcısı mı kontrol et
      if (message.receiver_id.toString() !== payload.userId) {
        set.status = 403;
        return {
          success: false,
          message: 'Bu mesajı okuma yetkiniz yok'
        };
      }
      
      // Mesajı okundu olarak işaretle
      message.read = true;
      await message.save();
      
      return {
        success: true,
        message: 'Mesaj okundu olarak işaretlendi'
      };
    } catch (error) {
      console.error('❌ Mark message as read error:', error);
      set.status = 500;
      return {
        success: false,
        message: 'Mesaj işaretlenirken hata oluştu'
      };
    }
  })
  
  .delete('/messages/:id', async ({ params, headers, set }) => {
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
      
      const message = await Message.findById(params.id);
      if (!message) {
        set.status = 404;
        return {
          success: false,
          message: 'Mesaj bulunamadı'
        };
      }
      
      // Mesajın göndericisi mi kontrol et
      if (message.sender_id.toString() !== payload.userId) {
        set.status = 403;
        return {
          success: false,
          message: 'Bu mesajı silme yetkiniz yok'
        };
      }
      
      // Mesajı kullanıcı için sil (soft delete)
      if (!message.deleted_for.includes(payload.userId)) {
        message.deleted_for.push(payload.userId);
        await message.save();
      }
      
      return {
        success: true,
        message: 'Mesaj başarıyla silindi'
      };
    } catch (error) {
      console.error('❌ Delete message error:', error);
      set.status = 500;
      return {
        success: false,
        message: 'Mesaj silinirken hata oluştu'
      };
    }
  });
