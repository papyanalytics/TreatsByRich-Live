@echo off
REM Double-click this file to serve the WHOLE site (customer + admin) correctly.
REM Admin pages import shared modules from ../services and ../config, so the
REM server root must be the project root, not just this admin/ folder.
REM Do NOT open the .html files directly by double-click; Chrome blocks module scripts over file://.
cd /d "%~dp0"
start "" powershell -NoExit -ExecutionPolicy Bypass -File "serve.ps1" -RootPath ".." -Port 5502
timeout /t 2 >nul
start "" http://127.0.0.1:5502/admin/index.html
