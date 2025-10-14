const bcrypt = require('bcrypt');

async function testPassword() {
    const plainPassword = '123456';
    const hashedPassword = '$2b$10$r/fyn3kGm5DZu5sCWqAbT.VSBowmmJ8uYNav.15lxE1qABNdgRDoW';
    
    console.log('🔍 Şifre Testi:');
    console.log('Orijinal şifre:', plainPassword);
    console.log('Hash\'lenmiş şifre:', hashedPassword);
    
    // Hash'leme testi
    const newHash = await bcrypt.hash(plainPassword, 10);
    console.log('Yeni hash:', newHash);
    
    // Doğrulama testi
    const isValid = await bcrypt.compare(plainPassword, hashedPassword);
    console.log('Hash doğrulama:', isValid);
    
    // Yeni hash doğrulama
    const isNewValid = await bcrypt.compare(plainPassword, newHash);
    console.log('Yeni hash doğrulama:', isNewValid);
}

testPassword().catch(console.error);
