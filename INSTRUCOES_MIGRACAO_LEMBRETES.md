# 🔧 INSTRUÇÕES PARA CORRIGIR ERRO DE LEMBRETES

## ⚠️ PROBLEMA
A coluna `horas_antecedencia` na tabela `lembretes` está como INTEGER, mas precisa ser NUMERIC para aceitar valores decimais (ex: 1.0833 horas = 1h 5min).

## ✅ SOLUÇÃO

### Passo 1: Acesse o Supabase Dashboard
1. Acesse https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **SQL Editor** (menu lateral)

### Passo 2: Execute o SQL
Copie e cole o seguinte SQL no editor e clique em **RUN**:

```sql
ALTER TABLE public.lembretes 
ALTER COLUMN horas_antecedencia TYPE NUMERIC(10, 4);
```

### Passo 3: Verificar
Execute este SQL para confirmar que funcionou:

```sql
SELECT 
    column_name, 
    data_type, 
    numeric_precision, 
    numeric_scale
FROM information_schema.columns 
WHERE table_name = 'lembretes' 
  AND column_name = 'horas_antecedencia';
```

**Resultado esperado:**
- `data_type` deve ser `numeric`
- `numeric_precision` deve ser `10`
- `numeric_scale` deve ser `4`

## 🎯 APÓS APLICAR A MIGRAÇÃO

Após executar o SQL acima, os lembretes serão criados automaticamente quando você agendar um compromisso!

## 📝 ARQUIVO SQL COMPLETO

O arquivo `APLICAR_MIGRACAO_LEMBRETES.sql` na raiz do projeto contém o SQL completo para aplicar.

