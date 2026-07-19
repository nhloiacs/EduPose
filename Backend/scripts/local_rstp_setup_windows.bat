
@echo off
REM Script untuk menjalankan streaming RTSP di Windows
REM Membuka kamera default (index 0) menggunakan dshow

ffmpeg -f dshow -i video="Integrated Camera" -c:v libx264 -preset ultrafast -tune zerolatency -f rtsp rtsp://localhost:8554/cam

pause
