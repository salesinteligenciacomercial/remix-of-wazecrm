# Script para iniciar servidor na porta 4000
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   🚀 INICIANDO SERVIDOR NA PORTA 4000" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Mudar para o diretório do projeto
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

Write-Host "✅ Diretório: $PWD" -ForegroundColor Green
Write-Host ""

# Verificar se há processo na porta 4000
$portCheck = netstat -ano | findstr :4000
if ($portCheck) {
    Write-Host "⚠️  Porta 4000 já está em uso!" -ForegroundColor Yellow
    Write-Host "🔄 Tentando liberar porta..." -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "🔄 Iniciando servidor Vite na porta 4000..." -ForegroundColor Yellow
Write-Host ""

# Iniciar servidor na porta 4000
npm run dev -- --port 4000 --strictPort


