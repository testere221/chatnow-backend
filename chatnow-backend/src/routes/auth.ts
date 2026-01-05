import bcrypt from 'bcrypt';
import { Elysia } from 'elysia';
import { z } from 'zod';
import { generateToken, verifyToken } from '../config/auth';
import { User } from '../models/User';

const registerSchema = z.object({
  email: z.string().email('Geçersiz email formatı'),
  password: z.string().min(6, 'Şifre en az 6 karakter olmalı'),
  name: z.string().min(2, 'İsim en az 2 karakter olmalı'),
  surname: z.string().min(2, 'Soyisim en az 2 karakter olmalı'),
  age: z.number().min(18, 'Yaş en az 18 olmalı').max(100, 'Yaş en fazla 100 olabilir'),
  location: z.string().min(2, 'Konum en az 2 karakter olmalı'),
  gender: z.enum(['male', 'female'], 'Cinsiyet male veya female olmalı')
});

const loginSchema = z.object({
  email: z.string().email('Geçersiz email formatı'),
  password: z.string().min(1, 'Şifre gerekli')
});

export default new Elysia()
  .post('/auth/register', async ({ body, set }) => {
    try {
      // Veri doğrulama
      const validatedData = registerSchema.parse(body);
      
      // Email kontrolü
      const existingUser = await User.findOne({ email: validatedData.email });
      if (existingUser) {
        set.status = 400;
        return {
          success: false,
          message: 'Bu email adresi zaten kullanılıyor'
        };
      }
      
      // Şifre hashleme
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(validatedData.password, saltRounds);
      
      // Kullanıcı oluştur
      const user = new User({
        ...validatedData,
        password: hashedPassword,
        diamonds: 500, // Başlangıç jetonu
        is_online: true,
        last_active: new Date()
      });
      
      await user.save();
      
      // JWT token oluştur
      const token = generateToken({
        userId: user._id.toString(),
        email: user.email,
        role: 'user'
      });
      
      return {
        success: true,
        message: 'Kullanıcı başarıyla oluşturuldu',
        data: {
          user: {
            id: user._id,
            email: user.email,
            name: user.name,
            surname: user.surname,
            age: user.age,
            location: user.location,
            gender: user.gender,
            diamonds: user.diamonds,
            is_online: user.is_online
          },
          token
        }
      };
    } catch (error) {
      console.error('❌ Register error:', error);
      set.status = 400;
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Kayıt sırasında hata oluştu'
      };
    }
  })
  
  .post('/auth/login', async ({ body, set }) => {
    try {
      // Veri doğrulama
      const validatedData = loginSchema.parse(body);
      
      // Kullanıcı bul (password field'ını da getir)
      const user = await User.findOne({ email: validatedData.email }).select('+password');
      if (!user) {
        set.status = 401;
        return {
          success: false,
          message: 'Email veya şifre hatalı'
        };
      }
      
      // Password kontrolü
      if (!user.password) {
        set.status = 401;
        return {
          success: false,
          message: 'Kullanıcı şifresi bulunamadı'
        };
      }
      
      // Şifre kontrolü
      const isPasswordValid = await bcrypt.compare(validatedData.password, user.password);
      if (!isPasswordValid) {
        set.status = 401;
        return {
          success: false,
          message: 'Email veya şifre hatalı'
        };
      }
      
      // Kullanıcıyı online yap
      user.is_online = true;
      user.last_active = new Date();
      await user.save();
      
      // JWT token oluştur
      const token = generateToken({
        userId: user._id.toString(),
        email: user.email,
        role: 'user'
      });
      
      return {
        success: true,
        message: 'Giriş başarılı',
        data: {
          user: {
            id: user._id,
            email: user.email,
            name: user.name,
            surname: user.surname,
            age: user.age,
            location: user.location,
            gender: user.gender,
            about: user.about,
            avatar: user.avatar,
            avatar_image: user.avatar_image,
            bg_color: user.bg_color,
            diamonds: user.diamonds,
            is_online: user.is_online,
            hobbies: user.hobbies
          },
          token
        }
      };
    } catch (error) {
      console.error('❌ Login error:', error);
      set.status = 400;
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Giriş sırasında hata oluştu'
      };
    }
  })
  
  .get('/auth/me', async ({ headers, set }) => {
    try {
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
      
      const user = await User.findById(payload.userId);
      if (!user) {
        set.status = 404;
        return {
          success: false,
          message: 'Kullanıcı bulunamadı'
        };
      }
      
      return {
        success: true,
        data: {
          user: {
            id: user._id,
            email: user.email,
            name: user.name,
            surname: user.surname,
            age: user.age,
            location: user.location,
            gender: user.gender,
            about: user.about,
            avatar: user.avatar,
            avatar_image: user.avatar_image,
            bg_color: user.bg_color,
            diamonds: user.diamonds,
            is_online: user.is_online,
            hobbies: user.hobbies
          }
        }
      };
    } catch (error) {
      console.error('❌ Auth me error:', error);
      set.status = 500;
      return {
        success: false,
        message: 'Kimlik doğrulama hatası'
      };
    }
  });
