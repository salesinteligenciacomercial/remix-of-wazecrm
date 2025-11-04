@echo off
chcp 65001 >nul

echo.
echo ============================================
echo    🚀 INICIANDO SERVIDOR NA PORTA 4000
echo ============================================
echo.
cd /d "%~dp0"
echo ✅ Diretório: %CD%
echo.
echo 🔄 Iniciando servidor Vite na porta 4000...
echo.

npm run dev -- --port 4000 --strictPort

pause

