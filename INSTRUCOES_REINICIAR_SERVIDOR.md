# 🔄 INSTRUÇÕES PARA REINICIAR O SERVIDOR

## ✅ CORREÇÕES APLICADAS:

1. ✅ Porta configurada para **3001** no `vite.config.ts`
2. ✅ Isolamento por empresa em todas as queries do Analytics
3. ✅ Tratamento de erros robusto
4. ✅ Timeout de 8 segundos para evitar loading infinito

## 🚀 PASSO A PASSO PARA REINICIAR:

### **Opção 1: PowerShell Script (Recomendado)**

```powershell
# Execute no PowerShell:
.\restart-server.ps1
```

### **Opção 2: Manual**

1. **Pare o servidor atual** (Ctrl+C no terminal)

2. **Mate processos nas portas 3001 e 8080:**
```powershell
# Porta 3001
Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force }

# Porta 8080 (caso ainda esteja rodando)
Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force }
```

3. **Limpe o cache:**
```powershell
Remove-Item -Recurse -Force node_modules\.vite -ErrorAction SilentlyContinue
```

4. **Inicie o servidor:**
```powershell
npm run dev
```

5. **Acesse:** `http://localhost:3001`

## 🔍 VERIFICAÇÃO DE PROBLEMAS:

Se ainda não funcionar:

1. **Verifique erros no terminal** onde rodou `npm run dev`
2. **Abra o Console do navegador** (F12 > Console)
3. **Copie os erros** e me envie para correção

## 📝 NOTAS:

- O servidor agora roda na porta **3001**
- Todas as queries estão com isolamento por empresa
- Se a página ficar em branco, aguarde 8 segundos - ela aparecerá com dados parciais
- Erros serão exibidos na interface se ocorrerem


