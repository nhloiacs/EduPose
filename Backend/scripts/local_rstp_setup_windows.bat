
@echo off
SETLOCAL Enabledelayexpansion

REM 1. Cek apakah FFmpeg sudah terinstal
where ffmpeg >nul 2>nul
if %errorlevel% equ 0 (
    echo [INFO] FFmpeg sudah terinstal. Melewati instalasi...
    goto :RUN_STREAM
)

echo [INFO] FFmpeg tidak ditemukan. Memulai instalasi otomatis...

REM 2. Tentukan lokasi instalasi (Folder FFmpeg di C:\ffmpeg)
set "INSTALL_DIR=C:\ffmpeg"
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"

REM 3. Download dan ekstrak FFmpeg versi Windows resmi menggunakan PowerShell
echo [INFO] Mengunduh FFmpeg...
powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://gyan.dev' -OutFile '%TEMP%\ffmpeg.zip'"

echo [INFO] Mengekstrak file...
powershell -Command "Expand-Archive -Path '%TEMP%\ffmpeg.zip' -DestinationPath '%TEMP%\ffmpeg_extracted' -Force"

REM 4. Pindahkan file bin ke folder tujuan dan atur PATH untuk sesi ini
move /y "%TEMP%\ffmpeg_extracted\ffmpeg-*-essentials_build\bin\*" "%INSTALL_DIR%" >nul
set "PATH=%PATH%;%INSTALL_DIR%"

REM 5. Tambahkan ke PATH Windows secara permanen (Membutuhkan akses Administrator)
echo [INFO] Mendaftarkan FFmpeg ke Environment Variables...
setx PATH "%PATH%;%INSTALL_DIR%" /M >nul 2>&1
if %errorlevel% neq 0 (
    setx PATH "%PATH%;%INSTALL_DIR%" >nul
    echo [PERINGATAN] Berhasil mendaftarkan ke PATH Pengguna. Jika gagal, jalankan script sebagai Administrator.
)

REM 6. Jalankan Streaming RTSP
:RUN_STREAM
echo [INFO] Memulai streaming RTSP...
ffmpeg -f dshow -i video="Integrated Camera" -c:v libx264 -preset ultrafast -tune zerolatency -f rtsp rtsp://localhost:8554/cam

pause
ENDLOCAL
ause
