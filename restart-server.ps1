# Script para reiniciar o servidor Vite
Write-Host "🔄 Parando servidores existentes..." -ForegroundColor Yellow

# Matar processos na porta 3001
$port = 3001
$process = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($process) {
    Stop-Process -Id $process -Force -ErrorAction SilentlyContinue
    Write-Host "✅ Processo na porta $port finalizado" -ForegroundColor Green
}

# Matar processos na porta 8080 (caso ainda esteja rodando)
$port2 = 8080
$process2 = Get-NetTCPConnection -LocalPort $port2 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($process2) {
    Stop-Process -Id $process2 -Force -ErrorAction SilentlyContinue
    Write-Host "✅ Processo na porta $port2 finalizado" -ForegroundColor Green
}

# Limpar cache do Vite
Write-Host "🧹 Limpando cache do Vite..." -ForegroundColor Yellow
if (Test-Path "node_modules\.vite") {
    Remove-Item -Recurse -Force "node_modules\.vite" -ErrorAction SilentlyContinue
    Write-Host "✅ Cache limpo" -ForegroundColor Green
}

Start-Sleep -Seconds 2

# Iniciar servidor
Write-Host "🚀 Iniciando servidor na porta 3001..." -ForegroundColor Cyan
npm run dev


