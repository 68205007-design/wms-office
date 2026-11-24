@echo off
REM เปิด Backend และ Frontend พร้อมกันบน Windows
start "WMS Backend" cmd /k "cd /d %~dp0backend && npm run dev"
start "WMS Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"
timeout /t 5 >nul
start http://localhost:5173
