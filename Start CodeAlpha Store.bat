@echo off
setlocal
title CodeAlpha Store Launcher
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo  Node.js was not found on this computer.
  echo  Install it from https://nodejs.org and double-click this file again.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules\express\package.json" (
  echo.
  echo  Installing the store's dependencies for the first time...
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo.
    echo  Dependency installation failed. Check your internet connection and try again.
    echo.
    pause
    exit /b 1
  )
)

echo.
echo  Starting CodeAlpha Store...
echo  The store will open in your browser automatically.
echo.

start "CodeAlpha Store Server" cmd /k node server.js
timeout /t 2 >nul
exit /b 0
