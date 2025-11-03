# 🚀 COMO INICIAR O SERVIDOR - PASSO A PASSO

## ⚠️ PROBLEMA COMUM

Você estava executando na pasta **ERRADA**:
- ❌ **ERRADO:** `C:\cursor app` (pasta pai)
- ✅ **CORRETO:** `C:\cursor app\ceusia-ai-hub` (pasta do projeto)

## ✅ SOLUÇÃO - 3 PASSOS SIMPLES

### **PASSO 1: Abra o PowerShell**

Clique com botão direito no menu Iniciar → **Windows PowerShell** ou **Terminal**

### **PASSO 2: Execute ESTES comandos (um por vez):**

```powershell
cd "C:\cursor app\ceusia-ai-hub"
```

Depois execute:

```powershell
npm run dev
```

### **PASSO 3: Aguarde a mensagem:**

```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:3001/
```

## 📍 VERIFICAÇÃO RÁPIDA

Antes de executar `npm run dev`, certifique-se de estar na pasta correta:

```powershell
pwd
```

Deve mostrar:
```
C:\cursor app\ceusia-ai-hub
```

Se mostrar `C:\cursor app`, você está na pasta errada! Execute:

```powershell
cd "C:\cursor app\ceusia-ai-hub"
```

## 🎯 DEPOIS QUE O SERVIDOR INICIAR

1. **Abra seu navegador**
2. **Acesse:** `http://localhost:3001/analytics`
3. **A página deve carregar!**

## ⚠️ IMPORTANTE

- **Mantenha o terminal aberto** enquanto usar a aplicação
- **NÃO feche o terminal** - isso fecha o servidor
- **Para parar:** Pressione `Ctrl+C` no terminal
- **Para iniciar novamente:** Execute `npm run dev` novamente

## 🔍 SE DER ERRO

Se aparecer erro ao executar `npm run dev`, pode ser que as dependências não estejam instaladas. Execute:

```powershell
npm install
```

Aguarde instalar todas as dependências (pode levar alguns minutos), depois execute:

```powershell
npm run dev
```

## 📝 RESUMO DO QUE FAZER

1. Abra PowerShell
2. Execute: `cd "C:\cursor app\ceusia-ai-hub"`
3. Execute: `npm run dev`
4. Aguarde ver "ready"
5. Acesse: `http://localhost:3001/analytics`

**IMPORTANTE:** Sempre execute na pasta `ceusia-ai-hub`, NÃO na pasta pai `cursor app`!


