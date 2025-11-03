# Script para verificar se o servidor está rodando
Write-Host ""
Write-Host "Verificando se o servidor está rodando na porta 3001..." -ForegroundColor Yellow
Write-Host ""

$port = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue

if ($port) {
    Write-Host "[OK] Servidor está RODANDO na porta 3001!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Acesse no navegador:" -ForegroundColor Cyan
    Write-Host "  http://localhost:3001/analytics" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "[AVISO] Servidor NÃO está rodando na porta 3001" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Para iniciar o servidor, execute:" -ForegroundColor Yellow
    Write-Host "  npm run dev" -ForegroundColor White
    Write-Host ""
}


