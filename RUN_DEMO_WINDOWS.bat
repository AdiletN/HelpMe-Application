@echo off
cd /d "%~dp0"
echo =============================
echo       HELPME DEMO
 echo =============================
where node >nul 2>nul
if errorlevel 1 (
 echo Install Node.js 20 or 22 LTS from https://nodejs.org and try again.
 pause
 exit /b 1
)
echo Installing required dependencies (first run only)...
call npm install
if errorlevel 1 ( echo Dependency install failed. & pause & exit /b 1 )
echo Preparing demonstration accounts...
call npm run demo
if errorlevel 1 ( echo Demo setup failed. & pause & exit /b 1 )
echo.
echo Open http://localhost:3000 in your browser.
echo Close this window to stop HelpMe.
call npm start
pause
