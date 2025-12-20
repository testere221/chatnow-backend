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
  );

// MongoDB bağlantısını başlat
connectDatabase().then(() => {
  console.log('🚀 ChatNow Backend API başlatıldı');
  const port = process.env.PORT || '3000';
  console.log(`📡 Server: http://localhost:${port}`);
  console.log(`📊 Admin Panel: http://localhost:${port}/admin`);
});

// Bun runtime otomatik olarak PORT environment variable'ını kullanır
export default {
  port: parseInt(process.env.PORT || '3000'),
  hostname: '0.0.0.0',
  fetch: app.fetch
};
