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

REM 6. Siapkan MediaMTX sebagai RTSP server.
REM FFmpeg tidak dapat dipakai secara andal sebagai RTSP server untuk pemutar
REM seperti VLC; FFmpeg hanya mem-publish video ke MediaMTX.
:RUN_STREAM
set "MEDIAMTX_DIR=C:\mediamtx"
set "MEDIAMTX_EXE=%MEDIAMTX_DIR%\mediamtx.exe"
set "MEDIAMTX_CONFIG=%MEDIAMTX_DIR%\edupose-mediamtx.yml"

netstat -ano | findstr /R /C:":8554 .*LISTENING" >nul
if not errorlevel 1 goto :PUBLISH_STREAM

if not exist "%MEDIAMTX_EXE%" (
    echo [INFO] MediaMTX belum ada. Mengunduh RTSP server...
    if not exist "%MEDIAMTX_DIR%" mkdir "%MEDIAMTX_DIR%"
    powershell -NoProfile -ExecutionPolicy Bypass -Command "$release = Invoke-RestMethod -Uri 'https://api.github.com/repos/bluenviron/mediamtx/releases/latest'; $url = $null; foreach ($asset in $release.assets) { if ($asset.name -like '*windows_amd64.zip') { $url = $asset.browser_download_url; break } }; if (-not $url) { throw 'Asset MediaMTX untuk Windows amd64 tidak ditemukan.' }; Invoke-WebRequest -Uri $url -OutFile '%TEMP%\mediamtx.zip'; Expand-Archive -Path '%TEMP%\mediamtx.zip' -DestinationPath '%MEDIAMTX_DIR%' -Force"
    if errorlevel 1 (
        echo [ERROR] Gagal mengunduh atau mengekstrak MediaMTX.
        pause
        exit /b 1
    )
)

REM Paksa RTSP melalui TCP. Ini menghindari kegagalan RTP/UDP pada VLC atau firewall Windows.
(
    echo rtspTransports: [tcp]
    echo hls: yes
    echo hlsAddress: :8888
    echo paths:
    echo   cam:
    echo     source: publisher
) > "%MEDIAMTX_CONFIG%"

echo [INFO] Menjalankan MediaMTX RTSP server pada port 8554...
echo [INFO] RTSP dipaksa memakai TCP; HLS tersedia di http://127.0.0.1:8888/cam/index.m3u8
start "MediaMTX RTSP Server" /D "%MEDIAMTX_DIR%" "%MEDIAMTX_EXE%" "%MEDIAMTX_CONFIG%"
timeout /t 2 /nobreak >nul

netstat -ano | findstr /R /C:":8554 .*LISTENING" >nul
if errorlevel 1 (
    echo [ERROR] MediaMTX tidak berhasil membuka port 8554.
    echo [INFO] Periksa jendela "MediaMTX RTSP Server" untuk detail error.
    pause
    exit /b 1
)

:PUBLISH_STREAM
echo [INFO] Mem-publish kamera ke rtsp://127.0.0.1:8554/cam
echo [INFO] Biarkan jendela ini tetap terbuka selama aplikasi memakai kamera.
echo [INFO] Untuk menguji, buka VLC lalu gunakan URL di atas.

ffmpeg ^
	-hide_banner ^
	-loglevel level+info ^
	-f dshow ^
	-rtbufsize 512M ^
	-video_size 640x480 ^
	-framerate 30 ^
	-i video="FHD Camera" ^
	-an ^
	-c:v libx264 ^
	-preset ultrafast ^
	-tune zerolatency ^
	-pix_fmt yuv420p ^
	-g 30 ^
	-keyint_min 30 ^
	-rtsp_transport tcp ^
	-f rtsp ^
	rtsp://127.0.0.1:8554/cam

if errorlevel 1 (
	 echo.
	 echo [ERROR] RTSP server berhenti. Salin seluruh log di atas untuk diperiksa.
)

pause
ENDLOCAL
