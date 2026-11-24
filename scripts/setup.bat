@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion
cd /d "%~dp0.."
set "ROOT=%CD%"
set "LOG=%ROOT%\scripts\setup.log"
echo ==== WMS setup %DATE% %TIME% > "%LOG%"

echo.
echo ============================================
echo   ติดตั้งระบบเบิก-จ่ายวัสดุสำนักงาน (WMS)
echo ============================================
echo.

where node >nul 2>&1 || (echo [X] ไม่พบ Node.js - ติดตั้งจาก https://nodejs.org แล้วรันใหม่ & echo NO_NODE>>"%LOG%" & pause & exit /b 1)
for /f %%v in ('node -v') do echo [OK] Node.js %%v & echo node %%v>>"%LOG%"

REM ---------- .env ----------
for /f %%s in ('node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"') do set "JWT=%%s"
if not exist "backend\.env" (
  echo.
  echo ตั้งค่าการเชื่อมต่อ MySQL ^(กด Enter เพื่อใช้ค่าเริ่มต้นในวงเล็บ^)
  set "DBHOST=localhost"
  set "DBPORT=3306"
  set "DBUSER=root"
  set "DBPASS="
  set "DBNAME=wms_db"
  set /p "DBHOST=  Host (localhost): "
  set /p "DBPORT=  Port (3306): "
  set /p "DBUSER=  User (root): "
  set /p "DBPASS=  Password (ว่าง): "
  set /p "DBNAME=  Database (wms_db): "
  if "!DBPASS!"=="" (set "AUTH=!DBUSER!") else (set "AUTH=!DBUSER!:!DBPASS!")
  (
    echo DATABASE_URL="mysql://!AUTH!@!DBHOST!:!DBPORT!/!DBNAME!"
    echo PORT=4000
    echo NODE_ENV=development
    echo JWT_SECRET="!JWT!"
    echo JWT_EXPIRES_IN="8h"
    echo CORS_ORIGIN="http://localhost:5173"
    echo PUBLIC_URL=""
  ) > "backend\.env"
  echo [OK] สร้าง backend\.env แล้ว
  echo env_created host=!DBHOST! port=!DBPORT! user=!DBUSER! db=!DBNAME!>>"%LOG%"
) else (
  echo [OK] ใช้ backend\.env ที่มีอยู่
  echo env_exists>>"%LOG%"
)

echo.
echo [1/6] ติดตั้ง dependencies ฝั่ง Backend...
echo ---- backend npm install ---->>"%LOG%"
pushd backend
call npm install >>"%LOG%" 2>&1 || (echo [X] npm install backend ล้มเหลว ดู scripts\setup.log & popd & pause & exit /b 1)

echo [2/6] สร้างตารางในฐานข้อมูล MySQL...
echo ---- prisma db push ---->>"%LOG%"
call npx prisma db push --accept-data-loss >>"%LOG%" 2>&1 || (echo [X] เชื่อมต่อ/สร้างตารางไม่สำเร็จ - ตรวจสอบว่า MySQL เปิดอยู่และ backend\.env ถูกต้อง & popd & pause & exit /b 1)

echo [3/6] ใส่ข้อมูลทดสอบ...
echo ---- seed ---->>"%LOG%"
call node prisma\seed.js >>"%LOG%" 2>&1 || (echo [X] seed ล้มเหลว & popd & pause & exit /b 1)

echo [4/6] ทดสอบ API ทั้งระบบ ^(smoke test^)...
echo ---- smoke test ---->>"%LOG%"
call node scripts\run-smoke.js >>"%LOG%" 2>&1
if errorlevel 1 (echo [!] smoke test มีบางข้อไม่ผ่าน ดู scripts\setup.log & echo SMOKE_FAILED>>"%LOG%") else (echo [OK] smoke test ผ่านทั้งหมด & echo SMOKE_PASSED>>"%LOG%")
call node prisma\seed.js >>"%LOG%" 2>&1
popd

echo [5/6] ติดตั้ง dependencies ฝั่ง Frontend...
echo ---- frontend npm install ---->>"%LOG%"
pushd frontend
call npm install >>"%LOG%" 2>&1 || (echo [X] npm install frontend ล้มเหลว & popd & pause & exit /b 1)

echo [6/6] Build Frontend...
echo ---- frontend build ---->>"%LOG%"
call npm run build >>"%LOG%" 2>&1 || (echo [X] build ล้มเหลว ดู scripts\setup.log & echo BUILD_FAILED>>"%LOG%" & popd & pause & exit /b 1)
echo BUILD_OK>>"%LOG%"
popd

echo ==== SETUP_DONE>>"%LOG%"
echo.
echo ============================================
echo  ติดตั้งเสร็จแล้ว! ดับเบิลคลิก start-dev.bat เพื่อเปิดระบบ
echo  แล้วเข้า http://localhost:5173  (admin / Admin@1234)
echo ============================================
pause
