# Script para verificar se o servidor está rodando na porta 3000
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   VERIFICANDO SERVIDOR - PORTA 3000" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

$port = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue

if ($port) {
    Write-Host "✅ SERVIDOR RODANDO!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Status: Ativo" -ForegroundColor White
    Write-Host "Porta: 3000" -ForegroundColor White
    Write-Host "URL: http://localhost:3000" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Processos Node:" -ForegroundColor Yellow
    Get-Process -Name node -ErrorAction SilentlyContinue | Format-Table Id, ProcessName, StartTime
} else {
    Write-Host "❌ SERVIDOR NÃO ESTÁ RODANDO!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Para iniciar o servidor:" -ForegroundColor Yellow
    Write-Host "  1. Execute: npm run dev" -ForegroundColor White
    Write-Host "  2. Ou execute: .\INICIAR_SERVIDOR_3000.ps1" -ForegroundColor White
    Write-Host "  3. Ou execute: .\INICIAR_SERVIDOR_3000.bat" -ForegroundColor White
    Write-Host ""
}

Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""



