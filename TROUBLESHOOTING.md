# 🔧 Troubleshooting - AI Investor Agent

## 🚨 Problema: Funções do Agente não funcionam na Vercel

### ✅ Solução Rápida (Checklist de 5 minutos)

1. **Verificar variáveis de ambiente na Vercel:**
   - Acesse: Dashboard → Projeto → Settings → Environment Variables
   - Confirme que estas variáveis estão definidas:
     - ✅ `OPENAI_API_KEY`
     - ✅ `NEXT_PUBLIC_APP_URL` (com URL real, não localhost)
     - ✅ `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`
     - ✅ `OKX_API_KEY`, `OKX_SECRET_KEY`, `OKX_API_PASSPHRASE`, `OKX_PROJECT_ID`

2. **Verificar se todas as variáveis têm todos os ambientes marcados:**
   - Production ✅
   - Preview ✅
   - Development ✅

3. **Atualizar `NEXT_PUBLIC_APP_URL`:**
   - Após o primeiro deploy, atualize com a URL real
   - Exemplo: `https://seu-app.vercel.app`
   - **IMPORTANTE:** Faça redeploy após atualizar

4. **Verificar timeout:**
   - Confirme que `vercel.json` está no repositório
   - Se no plano Hobby da Vercel, limite é 10s
   - Se no plano Pro, limite é 60s

5. **Redeploy:**
   - Após qualquer mudança nas variáveis, faça redeploy
   - Dashboard → Deployments → [...] → Redeploy

---

## 📊 Diagnóstico por Sintoma

### Sintoma: "Network Error" ou "Failed to fetch"

**Possíveis Causas:**
1. Timeout da API (OpenAI demorou muito)
2. `NEXT_PUBLIC_APP_URL` incorreta
3. CORS issues

**Solução:**
```bash
# 1. Verifique logs da Vercel
# Dashboard → Deployments → [deployment] → Functions → /api/chat

# 2. Confirme NEXT_PUBLIC_APP_URL
# Deve ser: https://seu-app.vercel.app
# NÃO deve ser: http://localhost:3000

# 3. Verifique vercel.json está commitado
git status
git add vercel.json
git commit -m "Add vercel.json"
git push
```

### Sintoma: Agente não responde nada

**Possíveis Causas:**
1. `OPENAI_API_KEY` não configurada
2. Quota da OpenAI esgotada
3. Timeout

**Solução:**
```bash
# 1. Teste sua API key localmente
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer sua-api-key"

# 2. Verifique quota
# https://platform.openai.com/usage

# 3. Verifique créditos
# https://platform.openai.com/account/billing
```

### Sintoma: "Wallet not connected" mesmo conectada

**Possíveis Causas:**
1. `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` incorreto
2. RainbowKit não inicializado

**Solução:**
1. Obtenha novo Project ID em https://cloud.walletconnect.com/
2. Atualize na Vercel
3. Redeploy

### Sintoma: Swap não funciona

**Possíveis Causas:**
1. Credenciais OKX incorretas
2. Token não suportado
3. Liquidez insuficiente

**Solução:**
1. Verifique todas as 4 variáveis OKX estão configuradas
2. Teste apenas com USDC ↔ SIERRA
3. Verifique logs: Dashboard → Functions → /api/swap

---

## 🔍 Como Ver Logs na Vercel

### Passo 1: Acessar Logs
1. Dashboard → Seu Projeto
2. Deployments tab
3. Clique no deployment ativo (com ✓)
4. Clique em "Functions"

### Passo 2: Ver Logs de Função Específica
1. Clique em `/api/chat`
2. Role para ver logs em tempo real
3. Procure por:
   - ❌ `Error:`
   - ❌ `undefined`
   - ❌ `timeout`
   - ✅ `[Chat API] ...`

### Passo 3: Filtrar Logs
- Use o campo de busca
- Filtre por tipo: Errors, Warnings, Info
- Exporte logs se necessário

---

## 🧪 Como Testar Manualmente

### Teste 1: API de Chat

```bash
curl -X POST https://seu-app.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "hello"}
    ],
    "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
  }'
```

**Resposta esperada:**
```json
{
  "response": "Hello! I'm your AI investment assistant..."
}
```

### Teste 2: API de Balance

```bash
curl -X POST https://seu-app.vercel.app/api/wallet/balance \
  -H "Content-Type: application/json" \
  -d '{
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
    "chainId": 43114
  }'
```

### Teste 3: API de Quote

```bash
curl "https://seu-app.vercel.app/api/swap/quote?chainId=43114&fromToken=0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E&toToken=0x6E6080e15f8C0010d333D8CAeEaD29292ADb78f7&amount=1000000&slippage=0.1"
```

---

## 🎯 Checklist de Debug

Use este checklist para debug sistemático:

### Frontend
- [ ] App carrega sem erros no console
- [ ] Wallet conecta (botão fica verde)
- [ ] Input de chat aparece
- [ ] Mensagens aparecem na tela
- [ ] SwapApprovalCard renderiza (se houver swap)
- [ ] Gráficos aparecem (se solicitado)

### Backend
- [ ] `/api/chat` retorna 200
- [ ] `/api/wallet/balance` retorna 200
- [ ] `/api/swap/quote` retorna 200
- [ ] Logs mostram `[Chat API]` messages
- [ ] Sem erros de `undefined` nos logs
- [ ] Sem timeouts nos logs

### Variáveis de Ambiente
- [ ] `OPENAI_API_KEY` definida
- [ ] `NEXT_PUBLIC_APP_URL` correta
- [ ] `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` definida
- [ ] Todas OKX variables definidas
- [ ] Todos ambientes marcados (Prod, Preview, Dev)

### Configuração
- [ ] `vercel.json` existe e está commitado
- [ ] `next.config.ts` atualizado
- [ ] `.env.example` completo
- [ ] README com instruções

---

## 💡 Dicas Pro

### Dica 1: Use Environment Groups
Crie um grupo de variáveis na Vercel para reutilizar em múltiplos projetos.

### Dica 2: Ative Preview Deployments
Teste mudanças em preview antes de produção.

### Dica 3: Configure Notifications
Receba alertas quando deployments falharem.

### Dica 4: Use Vercel Analytics
Monitore performance e erros em tempo real.

### Dica 5: Edge Functions
Para menor latência, considere usar Edge Functions.

---

## 📞 Precisa de Ajuda?

### Recursos Oficiais
- [Vercel Support](https://vercel.com/support)
- [Vercel Docs](https://vercel.com/docs)
- [OpenAI Support](https://help.openai.com/)
- [Next.js Docs](https://nextjs.org/docs)

### Community
- [Vercel Discord](https://discord.gg/vercel)
- [Next.js Discord](https://discord.gg/nextjs)
- [GitHub Issues](https://github.com/seu-repo/issues)

---

## ✅ Tudo Funcionando?

Se tudo estiver funcionando:
- ✅ Agente responde em português/inglês/espanhol
- ✅ `get_wallet_balance` retorna saldos
- ✅ `invest` cria cotação USDC → SIERRA
- ✅ `withdraw` cria cotação SIERRA → USDC
- ✅ `generate_chart` mostra gráficos
- ✅ Swaps executam com sucesso
- ✅ Mensagens de confirmação no idioma correto

**Parabéns! Seu deploy está perfeito! 🎉**
