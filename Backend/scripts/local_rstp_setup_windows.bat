@echo off
SETLOCAL EnableDelayedExpansion

REM 1. Cek apakah FFmpeg sudah terinstal
where ffmpeg >nul 2>nul
if %errorlevel% equ 0 (
    echo [INFO] FFmpeg sudah terinstal. Melewati instalasi...
    goto :RUN_STREAM
)

echo [INFO] FFmpeg tidak ditemukan. Memulai instalasi otomatis...

REM 2. Tentukan lokasi instalasi
set "INSTALL_DIR=C:\ffmpeg"
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"

REM 3. Download dan ekstrak FFmpeg
echo [INFO] Mengunduh FFmpeg...
powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip' -OutFile '%TEMP%\ffmpeg.zip'"

echo [INFO] Mengekstrak file...
powershell -Command "Expand-Archive -Path '%TEMP%\ffmpeg.zip' -DestinationPath '%TEMP%\ffmpeg_extracted' -Force"

REM 4. Salin FFmpeg ke folder instalasi
echo [INFO] Menyalin file FFmpeg...
xcopy "%TEMP%\ffmpeg_extracted\ffmpeg-*\bin\*" "%INSTALL_DIR%\" /E /Y >nul

REM 5. Tambahkan ke PATH untuk sesi ini
set "PATH=%PATH%;%INSTALL_DIR%"

echo [INFO] Mendaftarkan FFmpeg ke Environment Variables...
setx PATH "%PATH%;%INSTALL_DIR%" >nul

REM 6. Jalankan Streaming RTSP
:RUN_STREAM
echo [INFO] Memulai streaming RTSP...

ffmpeg ^
-f dshow ^
-rtbufsize 512M ^
-i video="FHD Camera" ^
-c:v libx264 ^
-preset ultrafast ^
-tune zerolatency ^
-f rtsp ^
rtsp://localhost:8554/cam

pause
ENDLOCAL