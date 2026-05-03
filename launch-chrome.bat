@echo off
REM This script launches Chrome with remote debugging enabled
REM It will open Chrome and keep it running for Puppeteer to connect to

echo.
echo ============================================================
echo Starting Google Chrome with Remote Debugging...
echo ============================================================
echo.
echo Chrome will open in a new window
echo Keep this window open - it will launch Chrome for you
echo.
echo In another terminal/PowerShell, run: node server.js
echo.
echo ============================================================
echo.

start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222

REM Keep this window open
echo Chrome has been launched on port 9222
echo Do NOT close this window while running the scraper!
echo.
pause