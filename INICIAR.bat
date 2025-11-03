@echo off
title Iniciando Servidor - Porta 3001
color 0A

echo.
echo ============================================
echo   SERVIDOR DE DESENVOLVIMENTO - VITE
echo ============================================
echo.
echo Pasta do projeto: %CD%
echo.

if not exist "package.json" (
    echo [ERRO] package.json nao encontrado!
    echo.
    echo Certifique-se de executar este arquivo na pasta:
    echo C:\cursor app\ceusia-ai-hub
    echo.
    pause
    exit /b 1
)

echo [OK] package.json encontrado
echo.

echo Iniciando servidor na porta 3001...
echo.
echo ============================================
echo   QUANDO VER "ready", ACESSE:
echo   http://localhost:3001/analytics
echo ============================================
echo.
echo Para PARAR o servidor: Pressione Ctrl+C
echo.

npm run dev

pause


