import { cors } from '@elysiajs/cors';
import { Elysia } from 'elysia';
import { connectDatabase } from './config/database';
import adminRoutes from './routes/admin';
import authRoutes from './routes/auth';
import chatRoutes from './routes/chats';
import messageRoutes from './routes/messages';
import userRoutes from './routes/users';

const app = new Elysia()
  .use(cors({
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000', 'http://localhost:8081'],
    credentials: true
  }))
  .get('/', () => ({
    message: 'ChatNow Backend API',
    version: '1.0.0',
    status: 'running'
  }))
  .group('/api', (app) =>
    app
      .use(authRoutes)
      .use(userRoutes)
      .use(messageRoutes)
      .use(chatRoutes)
      .use(adminRoutes)
  )
  .listen({
    port: parseInt(process.env.PORT || '3000'),
    hostname: '0.0.0.0'
  });

// MongoDB bağlantısını başlat
connectDatabase().then(() => {
  console.log('🚀 ChatNow Backend API başlatıldı');
  console.log(`📡 Server: http://localhost:${process.env.PORT || 3000}`);
  console.log(`📊 Admin Panel: http://localhost:${process.env.PORT || 3000}/admin`);
});

export default app;
