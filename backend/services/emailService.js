const nodemailer = require('nodemailer');

// Email konfigürasyonu - Environment variables kullan
const emailConfig = {
  host: process.env.SMTP_HOST || 'srvc03.trwww.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false, // TLS kullan
  auth: {
    user: process.env.SMTP_USER || 'repass@chatnow.com.tr',
    pass: process.env.SMTP_PASS || 'chatnowchat'
  },
  tls: {
    rejectUnauthorized: false // Self-signed sertifika için
  }
};

// Email transporter oluştur
const transporter = nodemailer.createTransport(emailConfig);

// Email gönderme fonksiyonu
const sendEmail = async (to, subject, html) => {
  try {
    const mailOptions = {
      from: 'ChatNow <repass@chatnow.com.tr>',
      to: to,
      subject: subject,
      html: html
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Email gönderildi:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Email gönderme hatası:', error);
    return { success: false, error: error.message };
  }
};

// Şifre sıfırlama emaili gönder
const sendPasswordResetEmail = async (email, resetToken) => {
  const resetUrl = `https://chatnow.com.tr/reset-password.html?token=${resetToken}`;
  
  const html = `
    <!DOCTYPE html>
    <html lang="tr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Şifre Sıfırlama - ChatNow</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5; }
            .container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: bold; color: #007AFF; }
            .title { font-size: 20px; color: #333; margin: 20px 0; }
            .content { line-height: 1.6; color: #666; margin-bottom: 30px; }
            .button { display: inline-block; background: #007AFF; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .button:hover { background: #0056b3; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 14px; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; color: #856404; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">ChatNow</div>
                <h1 class="title">Şifre Sıfırlama</h1>
            </div>
            
            <div class="content">
                <p>Merhaba,</p>
                <p>ChatNow hesabınız için şifre sıfırlama talebinde bulundunuz. Şifrenizi sıfırlamak için aşağıdaki butona tıklayın:</p>
                
                <div style="text-align: center;">
                    <a href="${resetUrl}" class="button">Şifremi Sıfırla</a>
                </div>
                
                <div class="warning">
                    <strong>Önemli:</strong> Bu link 24 saat geçerlidir. Eğer bu talebi siz yapmadıysanız, bu emaili görmezden gelebilirsiniz.
                </div>
                
                <p>Eğer buton çalışmıyorsa, aşağıdaki linki kopyalayıp tarayıcınıza yapıştırın:</p>
                <p style="word-break: break-all; background: #f8f9fa; padding: 10px; border-radius: 5px; font-family: monospace;">${resetUrl}</p>
            </div>
            
            <div class="footer">
                <p>Bu email ChatNow tarafından otomatik olarak gönderilmiştir.</p>
                <p>© 2024 ChatNow. Tüm hakları saklıdır.</p>
            </div>
        </div>
    </body>
    </html>
  `;

  return await sendEmail(email, 'ChatNow - Şifre Sıfırlama', html);
};

module.exports = {
  sendEmail,
  sendPasswordResetEmail
};
