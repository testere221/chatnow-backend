@echo off
echo ========================================
echo    CHATNOW OTOMATIK GUNCELLEYICI
echo ========================================
echo.
echo Hangi degisiklikleri yaptiniz?
echo 1 - Sadece Frontend (APK olustur)
echo 2 - Sadece Backend (Git push + Deploy)
echo 3 - Her ikisi de (Frontend + Backend)
echo 4 - Sadece Icon degistirdim
echo 5 - AAB (App Bundle) olustur
echo.
set /p update_choice="Seciminiz (1/2/3/4/5): "

if /i "%update_choice%"=="1" goto frontend_only
if /i "%update_choice%"=="2" goto backend_only
if /i "%update_choice%"=="3" goto both_update
if /i "%update_choice%"=="4" goto icon_only
if /i "%update_choice%"=="5" goto aab_only
echo Gecersiz secim! Program kapaniyor...
pause
exit /b 1

:frontend_only
echo.
echo ========================================
echo    FRONTEND GUNCELLEMESI
echo ========================================
echo.
echo 1. APK olusturuluyor...
cd android
call gradlew.bat assembleRelease
cd ..
if %errorlevel% neq 0 (
    echo APK olusturma hatasi! Program kapaniyor...
    pause
    exit /b 1
)
echo.
echo ========================================
echo APK basariyla olusturuldu!
echo ========================================
echo.
echo Telefona yuklemek ister misiniz?
echo E - Evet, telefona yukle
echo H - Hayir, sadece APK olustur
echo.
set /p choice="Seciminiz (E/H): "
if /i "%choice%"=="E" (
    echo.
    echo APK telefona yukleniyor...
    adb install -r android\app\build\outputs\apk\release\app-release.apk
    if %errorlevel% equ 0 (
        echo.
        echo ========================================
        echo APK basariyla telefona yuklendi!
        echo ========================================
    ) else (
        echo.
        echo HATA: Telefona yukleme basarisiz!
        echo Telefon bagli mi? USB Debugging acik mi?
    )
) else if /i "%choice%"=="H" (
    echo.
    echo APK olusturuldu ama telefona yuklenmedi.
    echo APK konumu: android\app\build\outputs\apk\release\app-release.apk
) else (
    echo.
    echo Gecersiz secim! Program kapaniyor...
)
goto end

:aab_only
echo.
echo ========================================
echo    AAB (APP BUNDLE) OLUSTURMA
echo ========================================
echo.
echo NOT: Surum numarasini manuel olarak android\app\build.gradle dosyasinda degistirin!
echo.
echo.
echo AAB olusturuluyor...
cd android
call gradlew.bat bundleRelease
cd ..
if %errorlevel% neq 0 (
    echo AAB olusturma hatasi! Program kapaniyor...
    pause
    exit /b 1
)
echo.
echo ========================================
echo AAB basariyla olusturuldu!
echo ========================================
echo.
echo AAB konumu: android\app\build\outputs\bundle\release\app-release.aab
echo Bu dosyayi Google Play Console'a yukleyebilirsiniz.
goto end

:backend_only
echo.
echo ========================================
echo    BACKEND GUNCELLEMESI
echo ========================================
echo.
echo Backend degisiklikleri GitHub'a push ediliyor...
git add backend/
git add update-icon.bat
git commit -m "Backend update: %date% %time%"
git push --force origin master
if %errorlevel% neq 0 (
    echo Git push hatasi! Program kapaniyor...
    pause
    exit /b 1
)
echo.
echo ========================================
echo Backend basariyla push edildi!
echo ========================================
echo.
echo Railway otomatik deploy baslayacak...
echo URL: https://observant-wisdom-production-ee9f.up.railway.app
echo.
echo Deploy durumunu kontrol etmek icin Railway dashboard'a git.
goto end

:both_update
echo.
echo ========================================
echo    FRONTEND + BACKEND GUNCELLEMESI
echo ========================================
echo.
echo 1. Backend degisiklikleri push ediliyor...
git add backend/
git add update-icon.bat
git commit -m "Full update: Frontend + Backend %date% %time%"
git push --force origin master
if %errorlevel% neq 0 (
    echo Git push hatasi! Program kapaniyor...
    pause
    exit /b 1
)
echo.
echo 2. Frontend APK olusturuluyor...
cd android
call gradlew.bat assembleRelease
cd ..
if %errorlevel% neq 0 (
    echo APK olusturma hatasi! Program kapaniyor...
    pause
    exit /b 1
)
echo.
echo ========================================
echo Her sey basariyla tamamlandi!
echo ========================================
echo.
echo Backend: Railway'de otomatik deploy basladi
echo Frontend: APK olusturuldu
echo.
echo Telefona yuklemek ister misiniz?
echo E - Evet, telefona yukle
echo H - Hayir, sadece APK olustur
echo.
set /p choice="Seciminiz (E/H): "
if /i "%choice%"=="E" (
    echo.
    echo APK telefona yukleniyor...
    adb install -r android\app\build\outputs\apk\release\app-release.apk
    if %errorlevel% equ 0 (
        echo.
        echo ========================================
        echo APK basariyla telefona yuklendi!
        echo ========================================
    ) else (
        echo.
        echo HATA: Telefona yukleme basarisiz!
        echo Telefon bagli mi? USB Debugging acik mi?
    )
) else if /i "%choice%"=="H" (
    echo.
    echo APK olusturuldu ama telefona yuklenmedi.
    echo APK konumu: android\app\build\outputs\apk\release\app-release.apk
) else (
    echo.
    echo Gecersiz secim! Program kapaniyor...
)
goto end

:icon_only
echo.
echo ========================================
echo    ICON GUNCELLEMESI
echo ========================================
echo.
echo Icon guncelleniyor...
copy "assets\images\icon.png" "android\app\src\main\res\mipmap-hdpi\ic_launcher.png"
copy "assets\images\icon.png" "android\app\src\main\res\mipmap-mdpi\ic_launcher.png"
copy "assets\images\icon.png" "android\app\src\main\res\mipmap-xhdpi\ic_launcher.png"
copy "assets\images\icon.png" "android\app\src\main\res\mipmap-xxhdpi\ic_launcher.png"
copy "assets\images\icon.png" "android\app\src\main\res\mipmap-xxxhdpi\ic_launcher.png"
copy "assets\images\icon.png" "android\app\src\main\res\mipmap-hdpi\ic_launcher_round.png"
copy "assets\images\icon.png" "android\app\src\main\res\mipmap-mdpi\ic_launcher_round.png"
copy "assets\images\icon.png" "android\app\src\main\res\mipmap-xhdpi\ic_launcher_round.png"
copy "assets\images\icon.png" "android\app\src\main\res\mipmap-xxhdpi\ic_launcher_round.png"
copy "assets\images\icon.png" "android\app\src\main\res\mipmap-xxxhdpi\ic_launcher_round.png"
echo Icon guncellendi!
echo.
echo APK olusturuluyor...
cd android
call gradlew.bat assembleRelease
cd ..
if %errorlevel% neq 0 (
    echo APK olusturma hatasi! Program kapaniyor...
    pause
    exit /b 1
)
echo.
echo ========================================
echo APK basariyla olusturuldu!
echo ========================================
echo.
echo Telefona yuklemek ister misiniz?
echo E - Evet, telefona yukle
echo H - Hayir, sadece APK olustur
echo.
set /p choice="Seciminiz (E/H): "
if /i "%choice%"=="E" (
    echo.
    echo APK telefona yukleniyor...
    adb install -r android\app\build\outputs\apk\release\app-release.apk
    if %errorlevel% equ 0 (
        echo.
        echo ========================================
        echo APK basariyla telefona yuklendi!
        echo ========================================
    ) else (
        echo.
        echo HATA: Telefona yukleme basarisiz!
        echo Telefon bagli mi? USB Debugging acik mi?
    )
) else if /i "%choice%"=="H" (
    echo.
    echo APK olusturuldu ama telefona yuklenmedi.
    echo APK konumu: android\app\build\outputs\apk\release\app-release.apk
) else (
    echo.
    echo Gecersiz secim! Program kapaniyor...
)
goto end

:end
echo.
echo ========================================
echo    GUNCELLEME TAMAMLANDI!
echo ========================================
echo.
echo Backend URL: https://observant-wisdom-production-ee9f.up.railway.app
echo APK Konumu: android\app\build\outputs\apk\release\app-release.apk
echo.
pause
