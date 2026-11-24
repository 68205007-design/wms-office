@echo off
chcp 65001 >nul
REM เปิดดู/แก้ไขฐานข้อมูล WMS ผ่าน Prisma Studio (http://localhost:5555)
cd /d "%~dp0"
netstat -ano | findstr /r /c:":3306 .*LISTENING" >nul
if errorlevel 1 (
  echo กำลังเปิด MySQL ในเครื่อง...
  start "WMS MySQL" powershell.exe -NoExit -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-local-mysql.ps1"
  timeout /t 10 >nul
)
echo กำลังเปิด Prisma Studio ที่ http://localhost:5555 ...
call npm.cmd run db:studio
pause
