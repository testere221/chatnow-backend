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
echo.
set /p update_choice="Seciminiz (1/2/3/4): "

if /i "%update_choice%"=="1" goto frontend_only
if /i "%update_choice%"=="2" goto backend_only
if /i "%update_choice%"=="3" goto both_update
if /i "%update_choice%"=="4" goto icon_only
echo Gecersiz secim! Program kapaniyor...
pause
exit /b 1

:frontend_only
echo.
echo ========================================
echo    FRONTEND GUNCELLEMESI
echo ========================================
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
echo Render otomatik deploy baslayacak...
echo URL: https://chatnow-app.onrender.com
echo.
echo Deploy durumunu kontrol etmek icin Render dashboard'a git.
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
echo Backend: Render'da otomatik deploy basladi
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
echo Backend URL: https://chatnow-app.onrender.com
echo APK Konumu: android\app\build\outputs\apk\release\app-release.apk
echo.
pause
