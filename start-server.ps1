# Script PowerShell para iniciar o servidor de desenvolvimento
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  INICIANDO SERVIDOR DE DESENVOLVIMENTO" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Mudar para o diretório do script
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

# Verificar Node.js
Write-Host "Verificando Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "Node.js encontrado: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "ERRO: Node.js nao encontrado!" -ForegroundColor Red
    Write-Host "Instale Node.js 20 ou superior de https://nodejs.org" -ForegroundColor Yellow
    pause
    exit 1
}

# Limpar cache do Vite
Write-Host ""
Write-Host "Limpando cache do Vite..." -ForegroundColor Yellow
if (Test-Path "node_modules\.vite") {
    Remove-Item -Recurse -Force "node_modules\.vite" -ErrorAction SilentlyContinue
    Write-Host "Cache limpo!" -ForegroundColor Green
}

# Verificar porta 3001
Write-Host ""
Write-Host "Verificando porta 3001..." -ForegroundColor Yellow
$portInUse = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
if ($portInUse) {
    Write-Host "Porta 3001 esta em uso. Liberando..." -ForegroundColor Yellow
    $portInUse | ForEach-Object {
        $pid = $_.OwningProcess
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        Write-Host "Processo $pid finalizado" -ForegroundColor Green
    }
    Start-Sleep -Seconds 2
}

# Iniciar servidor
Write-Host ""
Write-Host "Iniciando servidor na porta 3001..." -ForegroundColor Cyan
Write-Host "Aguarde alguns segundos..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Quando ver 'ready', acesse: http://localhost:3001/analytics" -ForegroundColor Green
Write-Host ""
Write-Host "Para parar o servidor, pressione Ctrl+C" -ForegroundColor Yellow
Write-Host ""
Write-Host "----------------------------------------" -ForegroundColor Gray
Write-Host ""

# Iniciar o servidor
npm run dev


