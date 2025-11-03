# 🚀 COMO INICIAR O SERVIDOR

## ❌ PROBLEMA
O erro `ERR_CONNECTION_REFUSED` significa que o servidor **não está rodando**.

## ✅ SOLUÇÃO RÁPIDA

### **Opção 1: Usar o Script Automático (Windows)**

1. **Navegue até a pasta do projeto:**
   ```
   C:\cursor app\ceusia-ai-hub
   ```

2. **Clique duas vezes em:**
   ```
   start-server.bat
   ```

3. **Aguarde o servidor iniciar** - Você verá mensagens como:
   ```
   VITE v5.x.x  ready in xxx ms
   ➜  Local:   http://localhost:3001/
   ```

### **Opção 2: Manual (PowerShell ou Terminal)**

1. **Abra o PowerShell ou Terminal**

2. **Navegue até a pasta:**
   ```powershell
   cd "C:\cursor app\ceusia-ai-hub"
   ```

3. **Inicie o servidor:**
   ```powershell
   npm run dev
   ```

4. **Aguarde até ver:**
   ```
   VITE v5.x.x  ready in xxx ms
   ➜  Local:   http://localhost:3001/
   ```

5. **Abra o navegador e acesse:**
   ```
   http://localhost:3001/analytics
   ```

## 🔍 VERIFICAÇÕES

### Se o servidor não iniciar:

1. **Verifique se o Node.js está instalado:**
   ```powershell
   node --version
   ```
   Deve mostrar v20.0.0 ou superior.

2. **Verifique se as dependências estão instaladas:**
   ```powershell
   npm install
   ```

3. **Verifique se a porta 3001 está livre:**
   ```powershell
   netstat -ano | findstr :3001
   ```
   Se houver algo, mate o processo:
   ```powershell
   taskkill /F /PID [número_do_PID]
   ```

4. **Limpe o cache:**
   ```powershell
   Remove-Item -Recurse -Force node_modules\.vite -ErrorAction SilentlyContinue
   ```

## 📝 NOTAS IMPORTANTES

- **Mantenha o terminal aberto** enquanto usar a aplicação
- **Não feche o terminal** - isso fecha o servidor
- **Para parar o servidor:** Pressione `Ctrl+C` no terminal
- **Após iniciar:** Aguarde até ver a mensagem "ready"
- **Acesse:** `http://localhost:3001/analytics`

## ⚠️ SE AINDA NÃO FUNCIONAR

Envie uma captura de tela do terminal mostrando os erros que aparecem quando você executa `npm run dev`.


