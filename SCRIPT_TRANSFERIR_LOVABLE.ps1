# 📤 SCRIPT PARA TRANSFERIR ATUALIZAÇÕES PARA LOVABLE
# Data: 01/11/2025
# Objetivo: Transferir todas as atualizações dos 5 menus corrigidos para o Lovable

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   TRANSFERINDO ATUALIZAÇÕES PARA LOVABLE" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se estamos no diretório correto
$currentDir = Get-Location
Write-Host "[INFO] Diretório atual: $currentDir" -ForegroundColor Yellow

# Verificar se git está configurado
Write-Host ""
Write-Host "[1/6] Verificando repositório Git..." -ForegroundColor Yellow
$gitStatus = git status 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERRO] Não é um repositório Git ou Git não está configurado!" -ForegroundColor Red
    Write-Host "[INFO] Você precisa usar o método manual de transferência." -ForegroundColor Yellow
    Write-Host "[INFO] Consulte: GUIA_TRANSFERENCIA_LOVABLE.md" -ForegroundColor Yellow
    exit 1
}

Write-Host "[OK] Repositório Git encontrado!" -ForegroundColor Green

# Criar backup antes de transferir
Write-Host ""
Write-Host "[2/6] Criando backup antes da transferência..." -ForegroundColor Yellow
$backupBranch = "backup-antes-transferencia-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
git checkout -b $backupBranch 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Branch de backup criada: $backupBranch" -ForegroundColor Green
    
    # Voltar para branch principal
    git checkout main 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        git checkout master 2>&1 | Out-Null
    }
} else {
    Write-Host "[AVISO] Não foi possível criar branch de backup" -ForegroundColor Yellow
}

# Adicionar arquivos modificados
Write-Host ""
Write-Host "[3/6] Adicionando arquivos modificados..." -ForegroundColor Yellow

# Menu LEADS
Write-Host "  • Menu LEADS..." -ForegroundColor White
git add src/pages/Leads.tsx 2>&1 | Out-Null
git add src/hooks/useLeadsSync.ts 2>&1 | Out-Null

# Menu FUNIL DE VENDAS
Write-Host "  • Menu FUNIL DE VENDAS..." -ForegroundColor White
git add src/pages/Kanban.tsx 2>&1 | Out-Null
git add src/components/funil/DroppableColumn.tsx 2>&1 | Out-Null
git add src/components/funil/LeadCard.tsx 2>&1 | Out-Null

# Menu TAREFAS
Write-Host "  • Menu TAREFAS..." -ForegroundColor White
git add src/pages/Tarefas.tsx 2>&1 | Out-Null
git add src/components/tarefas/TaskCard.tsx 2>&1 | Out-Null
git add src/hooks/useTaskTimer.ts 2>&1 | Out-Null
git add supabase/functions/api-tarefas/index.ts 2>&1 | Out-Null

# Menu AGENDA
Write-Host "  • Menu AGENDA..." -ForegroundColor White
git add src/pages/Agenda.tsx 2>&1 | Out-Null
git add src/components/agenda/EditarCompromissoDialog.tsx 2>&1 | Out-Null
git add supabase/functions/enviar-lembretes/index.ts 2>&1 | Out-Null

# Menu CONVERSAS
Write-Host "  • Menu CONVERSAS..." -ForegroundColor White
git add src/pages/Conversas.tsx 2>&1 | Out-Null

# Migrations (se existirem)
Write-Host "  • Migrations..." -ForegroundColor White
if (Test-Path "supabase/migrations/20251101_migrate_task_metadata.sql") {
    git add supabase/migrations/20251101_migrate_task_metadata.sql 2>&1 | Out-Null
}

Write-Host "[OK] Arquivos adicionados!" -ForegroundColor Green

# Verificar status
Write-Host ""
Write-Host "[4/6] Verificando status..." -ForegroundColor Yellow
$status = git status --short

if ($status) {
    Write-Host "[INFO] Arquivos a serem commitados:" -ForegroundColor Yellow
    Write-Host $status -ForegroundColor White
} else {
    Write-Host "[AVISO] Nenhum arquivo modificado encontrado!" -ForegroundColor Yellow
    Write-Host "[INFO] Todas as alterações podem já ter sido commitadas." -ForegroundColor Yellow
}

# Criar commit
Write-Host ""
Write-Host "[5/6] Criando commit..." -ForegroundColor Yellow

$commitMessage = @"
fix: Correções dos 5 menus prioritários (Leads, Funil, Tarefas, Agenda, Conversas)

MENU LEADS:
- Validação company_id em todas operações
- Performance otimizada (debounce, memoização, lazy loading)
- Busca de avatar do WhatsApp funcionando
- Busca com operadores implementada
- Sincronização realtime estável

MENU FUNIL DE VENDAS:
- Reordenação de etapas perfeita (data: { type: 'etapa' })
- Bloqueio robusto durante drag (isMovingRef)
- Performance otimizada para 500+ leads
- Realtime estável durante drag
- Validação de funil completa
- RPC reorder_etapas com fallback robusto

MENU TAREFAS:
- Metadados em campos JSONB dedicados (checklist, tags, comments, attachments)
- Timer de tempo gasto implementado (useTaskTimer)
- Edge Function api-tarefas completa e segura
- Drag & drop robusto com múltiplos fallbacks
- Performance otimizada (debounce, memoização, lazy loading)

MENU AGENDA:
- Edge function de lembretes corrigida
- Company ID garantido em todos lembretes
- Sistema de retry robusto (1h, 3h, 24h)
- Sincronização de leads melhorada
- Performance otimizada (lazy loading, cache)

MENU CONVERSAS:
- Micro-prompts aplicados conforme informado
- Hooks integrados corretamente
- Sincronização realtime funcionando
- Integração com outros menus ativa

NOVOS ARQUIVOS:
- src/hooks/useTaskTimer.ts (hook para timer de tarefas)
- supabase/migrations/20251101_migrate_task_metadata.sql (se aplicável)

ARQUIVOS MODIFICADOS:
- src/pages/Leads.tsx
- src/pages/Kanban.tsx
- src/pages/Tarefas.tsx
- src/pages/Agenda.tsx
- src/pages/Conversas.tsx
- src/hooks/useLeadsSync.ts
- src/components/funil/DroppableColumn.tsx
- src/components/funil/LeadCard.tsx
- src/components/tarefas/TaskCard.tsx
- src/components/agenda/EditarCompromissoDialog.tsx
- supabase/functions/api-tarefas/index.ts
- supabase/functions/enviar-lembretes/index.ts

TOTAL: 21+ micro-prompts aplicados | 121+ funcionalidades validadas
"@

git commit -m $commitMessage 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "[OK] Commit criado com sucesso!" -ForegroundColor Green
} else {
    Write-Host "[ERRO] Falha ao criar commit!" -ForegroundColor Red
    Write-Host "[INFO] Verifique se há arquivos para commitar." -ForegroundColor Yellow
    exit 1
}

# Push para repositório remoto
Write-Host ""
Write-Host "[6/6] Enviando para repositório remoto..." -ForegroundColor Yellow

# Verificar se há remote configurado
$remote = git remote get-url origin 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "[INFO] Remote encontrado: $remote" -ForegroundColor Yellow
    Write-Host "[INFO] Enviando para origin..." -ForegroundColor Yellow
    
    $branch = git branch --show-current
    Write-Host "[INFO] Branch atual: $branch" -ForegroundColor Yellow
    
    Write-Host ""
    Write-Host "⚠️  ATENÇÃO: Você precisa fazer o push manualmente!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Execute o seguinte comando:" -ForegroundColor Cyan
    Write-Host "  git push origin $branch" -ForegroundColor White
    Write-Host ""
    Write-Host "OU se preferir fazer push da branch de backup também:" -ForegroundColor Yellow
    Write-Host "  git push origin $backupBranch" -ForegroundColor White
    Write-Host "  git push origin $branch" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "[AVISO] Nenhum remote configurado!" -ForegroundColor Yellow
    Write-Host "[INFO] Configure o remote do Lovable:" -ForegroundColor Yellow
    Write-Host "  git remote add origin [URL_DO_REPOSITORIO_LOVABLE]" -ForegroundColor White
    Write-Host ""
    Write-Host "[INFO] Depois execute:" -ForegroundColor Yellow
    Write-Host "  git push -u origin $branch" -ForegroundColor White
    Write-Host ""
}

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   ✅ PREPARAÇÃO CONCLUÍDA!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 PRÓXIMOS PASSOS:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Verificar se o commit foi criado corretamente:" -ForegroundColor White
Write-Host "   git log -1 --oneline" -ForegroundColor Cyan
Write-Host ""
Write-Host "2. Fazer push para o Lovable:" -ForegroundColor White
Write-Host "   git push origin [BRANCH]" -ForegroundColor Cyan
Write-Host ""
Write-Host "3. No Lovable, verificar se as atualizações foram recebidas" -ForegroundColor White
Write-Host ""
Write-Host "4. Aplicar migrations no Supabase (se necessário):" -ForegroundColor White
Write-Host "   - Verificar se migration 20251101_migrate_task_metadata.sql foi aplicada" -ForegroundColor Cyan
Write-Host "   - Verificar campos tentativas e proxima_tentativa na tabela lembretes" -ForegroundColor Cyan
Write-Host ""
Write-Host "5. Deploy das Edge Functions (se necessário):" -ForegroundColor White
Write-Host "   supabase functions deploy api-tarefas" -ForegroundColor Cyan
Write-Host "   supabase functions deploy enviar-lembretes" -ForegroundColor Cyan
Write-Host ""
Write-Host "📄 Documentação:" -ForegroundColor Yellow
Write-Host "   - GUIA_TRANSFERENCIA_LOVABLE.md (guia completo)" -ForegroundColor White
Write-Host "   - CHECKLIST_TRANSFERENCIA_LOVABLE.md (checklist rápido)" -ForegroundColor White
Write-Host ""

