const admin = require('firebase-admin');

// Firebase Admin SDK başlat
if (!admin.apps.length) {
  const serviceAccount = require('../firebase-service-account.json');
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// Email gönderme fonksiyonu - Firebase Auth kullanarak
const sendPasswordResetEmail = async (email) => {
  try {
    // Firebase Auth ile şifre sıfırlama emaili gönder
    const actionCodeSettings = {
      url: 'https://chatnow.com.tr/reset-password',
      handleCodeInApp: false,
      iOS: {
        bundleId: 'com.ferhatkortak2.chatnow'
      },
      android: {
        packageName: 'com.ferhatkortak2.chatnow',
        installApp: true,
        minimumVersion: '1.0.0'
      }
    };

    const link = await admin.auth().generatePasswordResetLink(email, actionCodeSettings);
    
    console.log('Firebase password reset link generated:', link);
    
    return {
      success: true,
      resetLink: link,
      message: 'Şifre sıfırlama linki oluşturuldu.'
    };
  } catch (error) {
    console.error('Firebase password reset error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Kullanıcı oluşturma fonksiyonu
const createUser = async (email, password, displayName) => {
  try {
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: displayName,
      emailVerified: false
    });

    console.log('Firebase user created:', userRecord.uid);
    
    return {
      success: true,
      uid: userRecord.uid,
      user: userRecord
    };
  } catch (error) {
    console.error('Firebase user creation error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Kullanıcı doğrulama fonksiyonu
const verifyUser = async (idToken) => {
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return {
      success: true,
      uid: decodedToken.uid,
      user: decodedToken
    };
  } catch (error) {
    console.error('Firebase token verification error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  sendPasswordResetEmail,
  createUser,
  verifyUser
};
