# Script para iniciar servidor na porta 3000
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   🚀 INICIANDO SERVIDOR NA PORTA 3000" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Mudar para o diretório do projeto
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

Write-Host "✅ Diretório: $PWD" -ForegroundColor Green
Write-Host ""

# Verificar se há processo na porta 3000
$portCheck = netstat -ano | findstr :3000
if ($portCheck) {
    Write-Host "⚠️  Porta 3000 já está em uso!" -ForegroundColor Yellow
    Write-Host "🔄 Tentando liberar porta..." -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "🔄 Iniciando servidor Vite..." -ForegroundColor Yellow
Write-Host ""

# Iniciar servidor
npm run dev
