@echo off
chcp 65001 >nul
echo.
echo ============================================
echo    🚀 INICIANDO SERVIDOR NA PORTA 3000
echo ============================================
echo.
cd /d "%~dp0"
echo ✅ Diretório: %CD%
echo.
echo 🔄 Iniciando servidor Vite...
echo.
npm run dev
pause
