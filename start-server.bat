@echo off
echo ========================================
echo   INICIANDO SERVIDOR DE DESENVOLVIMENTO
echo ========================================
echo.

cd /d "%~dp0"

echo Verificando Node.js...
node --version
if %errorlevel% neq 0 (
    echo ERRO: Node.js nao encontrado!
    echo Instale Node.js 20 ou superior
    pause
    exit /b 1
)

echo.
echo Limpando cache do Vite...
if exist node_modules\.vite (
    rmdir /s /q node_modules\.vite
)

echo.
echo Verificando porta 3001...
netstat -ano | findstr :3001 >nul
if %errorlevel% equ 0 (
    echo AVISO: Porta 3001 ja esta em uso!
    echo Tentando liberar a porta...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001') do (
        taskkill /F /PID %%a >nul 2>&1
    )
    timeout /t 2 >nul
)

echo.
echo Iniciando servidor na porta 3001...
echo.
npm run dev

pause


