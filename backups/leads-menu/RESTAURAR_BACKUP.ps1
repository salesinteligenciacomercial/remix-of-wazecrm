# Script para Restaurar Backup do Menu Leads
# Execute este script no PowerShell para restaurar os arquivos do backup

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "RESTAURAR BACKUP DO MENU LEADS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se estamos no diretório correto
if (-not (Test-Path "backups\leads-menu\Leads.tsx.backup")) {
    Write-Host "ERRO: Execute este script a partir da raiz do projeto!" -ForegroundColor Red
    Write-Host "Caminho atual: $(Get-Location)" -ForegroundColor Yellow
    exit 1
}

Write-Host "Fazendo backup dos arquivos atuais..." -ForegroundColor Yellow

# Criar pasta de backup temporária
$tempBackupPath = "backups\temp-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
New-Item -ItemType Directory -Path $tempBackupPath -Force | Out-Null

# Fazer backup dos arquivos atuais
try {
    if (Test-Path "src\pages\Leads.tsx") {
        Copy-Item "src\pages\Leads.tsx" "$tempBackupPath\Leads.tsx.backup" -Force
        Write-Host "✓ Backup de Leads.tsx criado" -ForegroundColor Green
    }
    
    if (Test-Path "src\components\leads\LeadQuickActions.tsx") {
        Copy-Item "src\components\leads\LeadQuickActions.tsx" "$tempBackupPath\LeadQuickActions.tsx.backup" -Force
        Write-Host "✓ Backup de LeadQuickActions.tsx criado" -ForegroundColor Green
    }
    
    if (Test-Path "src\components\funil\EditarLeadDialog.tsx") {
        Copy-Item "src\components\funil\EditarLeadDialog.tsx" "$tempBackupPath\EditarLeadDialog.tsx.backup" -Force
        Write-Host "✓ Backup de EditarLeadDialog.tsx criado" -ForegroundColor Green
    }
    
    if (Test-Path "src\components\leads\ConversaPopup.tsx") {
        Copy-Item "src\components\leads\ConversaPopup.tsx" "$tempBackupPath\ConversaPopup.tsx.backup" -Force
        Write-Host "✓ Backup de ConversaPopup.tsx criado" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "Backup dos arquivos atuais salvo em: $tempBackupPath" -ForegroundColor Cyan
    Write-Host ""
} catch {
    Write-Host "ERRO ao fazer backup dos arquivos atuais: $_" -ForegroundColor Red
    exit 1
}

Write-Host "Restaurando arquivos do backup..." -ForegroundColor Yellow

# Restaurar arquivos do backup
try {
    Copy-Item "backups\leads-menu\Leads.tsx.backup" "src\pages\Leads.tsx" -Force
    Write-Host "✓ Leads.tsx restaurado" -ForegroundColor Green
    
    Copy-Item "backups\leads-menu\LeadQuickActions.tsx.backup" "src\components\leads\LeadQuickActions.tsx" -Force
    Write-Host "✓ LeadQuickActions.tsx restaurado" -ForegroundColor Green
    
    Copy-Item "backups\leads-menu\EditarLeadDialog.tsx.backup" "src\components\funil\EditarLeadDialog.tsx" -Force
    Write-Host "✓ EditarLeadDialog.tsx restaurado" -ForegroundColor Green
    
    Copy-Item "backups\leads-menu\ConversaPopup.tsx.backup" "src\components\leads\ConversaPopup.tsx" -Force
    Write-Host "✓ ConversaPopup.tsx restaurado" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "BACKUP RESTAURADO COM SUCESSO!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Arquivos restaurados:" -ForegroundColor Yellow
    Write-Host "  - src\pages\Leads.tsx" -ForegroundColor White
    Write-Host "  - src\components\leads\LeadQuickActions.tsx" -ForegroundColor White
    Write-Host "  - src\components\funil\EditarLeadDialog.tsx" -ForegroundColor White
    Write-Host "  - src\components\leads\ConversaPopup.tsx" -ForegroundColor White
    Write-Host ""
    Write-Host "Backup dos arquivos anteriores salvo em: $tempBackupPath" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Próximos passos:" -ForegroundColor Yellow
    Write-Host "  1. Verifique se todos os imports estão corretos" -ForegroundColor White
    Write-Host "  2. Teste todas as funcionalidades" -ForegroundColor White
    Write-Host "  3. Se algo der errado, restaure da pasta: $tempBackupPath" -ForegroundColor White
    Write-Host ""
    
} catch {
    Write-Host "ERRO ao restaurar backup: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Se necessário, restaure os arquivos de: $tempBackupPath" -ForegroundColor Yellow
    exit 1
}

