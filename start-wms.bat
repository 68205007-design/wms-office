@echo off
REM เปิดระบบ WMS: MySQL ในเครื่อง + Backend + Frontend
cd /d "%~dp0"
start "WMS MySQL" powershell.exe -NoExit -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-local-mysql.ps1"
timeout /t 8 >nul
start "WMS App" cmd /k "cd /d %~dp0 && npm.cmd run dev"
timeout /t 8 >nul
start http://localhost:5173
