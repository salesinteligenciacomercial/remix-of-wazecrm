# Script PowerShell para iniciar o servidor na porta 3000
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  INICIANDO SERVIDOR - PORTA 3000" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Mudar para o diretório do script
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

# Verificar Node.js
Write-Host "Verificando Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js encontrado: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ ERRO: Node.js não encontrado!" -ForegroundColor Red
    Write-Host "Instale Node.js 20 ou superior de https://nodejs.org" -ForegroundColor Yellow
    pause
    exit 1
}

# Parar processos Node travados
Write-Host ""
Write-Host "Limpando processos Node travados..." -ForegroundColor Yellow
$nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    $nodeProcesses | ForEach-Object {
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
        Write-Host "  Processo $($_.Id) finalizado" -ForegroundColor Yellow
    }
    Start-Sleep -Seconds 2
    Write-Host "✓ Processos limpos!" -ForegroundColor Green
} else {
    Write-Host "✓ Nenhum processo Node encontrado" -ForegroundColor Green
}

# Verificar porta 3000
Write-Host ""
Write-Host "Verificando porta 3000..." -ForegroundColor Yellow
$portInUse = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($portInUse) {
    Write-Host "  Porta 3000 está em uso. Liberando..." -ForegroundColor Yellow
    $portInUse | ForEach-Object {
        $pid = $_.OwningProcess
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        Write-Host "  Processo $pid finalizado" -ForegroundColor Yellow
    }
    Start-Sleep -Seconds 2
}

# Iniciar servidor
Write-Host ""
Write-Host "Iniciando servidor Vite na porta 3000..." -ForegroundColor Cyan
Write-Host "Aguarde alguns segundos..." -ForegroundColor Yellow
Write-Host ""
Write-Host "Quando ver 'ready', acesse:" -ForegroundColor Green
Write-Host "  → http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "Para parar o servidor, pressione Ctrl+C" -ForegroundColor Yellow
Write-Host ""
Write-Host "----------------------------------------" -ForegroundColor Gray
Write-Host ""

# Iniciar o servidor usando npx
npm run dev

