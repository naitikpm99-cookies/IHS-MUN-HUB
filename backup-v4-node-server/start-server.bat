@echo off
cd /d "%~dp0"
title DXB MUN portal
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Download it from https://nodejs.org and run this again.
  pause
  exit /b 1
)
echo Starting the DXB MUN portal...
echo.
node server.js
echo.
echo The server has stopped.
pause
