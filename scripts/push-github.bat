@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion
cd /d "%~dp0.."
set "LOG=%CD%\scripts\push.log"
echo ==== push %DATE% %TIME% > "%LOG%"

where git >nul 2>&1 || (echo [X] ไม่พบ Git - ติดตั้งจาก https://git-scm.com แล้วรันใหม่ & echo NO_GIT>>"%LOG%" & pause & exit /b 1)

REM ย้าย workflow เข้าโฟลเดอร์ .github
if exist "_github_workflows" (
  if not exist ".github\workflows" mkdir ".github\workflows"
  copy /y "_github_workflows\*.yml" ".github\workflows\" >nul
  rmdir /s /q "_github_workflows"
)

if not exist ".git" (
  git init -b main >>"%LOG%" 2>&1
)
git config user.name >nul 2>&1 || (
  set /p "GNAME=ชื่อสำหรับ git commit: "
  git config user.name "!GNAME!"
)
git config user.email >nul 2>&1 || (
  set /p "GMAIL=อีเมล GitHub: "
  git config user.email "!GMAIL!"
)
git add -A >>"%LOG%" 2>&1
git commit -m "ระบบเบิก-จ่ายวัสดุสำนักงาน (WMS): React + Express + Prisma + MySQL" >>"%LOG%" 2>&1

set "REPO=wms-office"
where gh >nul 2>&1
if not errorlevel 1 (
  gh auth status >>"%LOG%" 2>&1 || gh auth login --web --git-protocol https
  git remote get-url origin >nul 2>&1 || gh repo create !REPO! --public --source . --remote origin >>"%LOG%" 2>&1
  git push -u origin main >>"%LOG%" 2>&1 || (echo [X] push ไม่สำเร็จ ดู scripts\push.log & pause & exit /b 1)
  for /f %%o in ('gh api user --jq .login') do set "OWNER=%%o"
  gh api -X POST repos/!OWNER!/!REPO!/pages -f build_type=workflow >>"%LOG%" 2>&1
  echo PUSHED https://github.com/!OWNER!/!REPO!>>"%LOG%"
  echo PAGES https://!OWNER!.github.io/!REPO!/>>"%LOG%"
  echo.
  echo [OK] Repo: https://github.com/!OWNER!/!REPO!
  echo [OK] เว็บไซต์: https://!OWNER!.github.io/!REPO!/  ^(รอ GitHub Actions build 1-3 นาที^)
) else (
  echo ไม่พบ GitHub CLI ^(gh^) - สร้าง repo เปล่าชื่อ wms-office ที่ https://github.com/new ^(Public^) แล้ววาง URL ที่นี่
  set /p "URL=Repo URL (เช่น https://github.com/username/wms-office.git): "
  git remote get-url origin >nul 2>&1 && git remote set-url origin "!URL!" || git remote add origin "!URL!"
  git push -u origin main >>"%LOG%" 2>&1 || (echo [X] push ไม่สำเร็จ ดู scripts\push.log & pause & exit /b 1)
  echo PUSHED !URL!>>"%LOG%"
  echo [OK] push เรียบร้อย - ไปที่ Settings ^> Pages ^> Source เลือก "GitHub Actions"
)
echo ==== PUSH_DONE>>"%LOG%"
pause
