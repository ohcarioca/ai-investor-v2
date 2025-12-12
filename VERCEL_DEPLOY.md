# 🚀 Guia de Deploy na Vercel - AI Investor Agent

## ⚠️ Problema Comum: Funções do Agente não funcionam após deploy

Se as funções do agente funcionam no localhost mas não na Vercel, siga este guia completo.

---

## 📋 Checklist Pré-Deploy

### 1. ✅ Variáveis de Ambiente na Vercel

Acesse: **Vercel Dashboard → Seu Projeto → Settings → Environment Variables**

Adicione TODAS as variáveis abaixo:

#### **Obrigatórias:**

```bash
# OpenAI API Key
OPENAI_API_KEY=sk-proj-...
# Copie da sua conta OpenAI: https://platform.openai.com/api-keys

# OpenAI Model (opcional, padrão: gpt-4o)
OPENAI_MODEL=gpt-4o

# App URL (URL do seu deploy)
NEXT_PUBLIC_APP_URL=https://seu-app.vercel.app
# ⚠️ IMPORTANTE: Atualize após o primeiro deploy com a URL real

# WalletConnect Project ID
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=seu_project_id
# Obtenha em: https://cloud.walletconnect.com/

# Webhook URL
NEXT_PUBLIC_WEBHOOK_URL=https://n8n.balampay.com/webhook/investor_agent

# OKX DEX API Credentials
OKX_API_KEY=8c998255-5281-46f2-810d-dae6a5e173ab
OKX_SECRET_KEY=F09CD4FF89D06B4671EC51CE23A8BD50
OKX_API_PASSPHRASE=iy1^Q2I}E|P2((C
OKX_PROJECT_ID=933b52c4bbf9934f6cdeee772426c630
```

#### **Configuração das Variáveis:**
- Para cada variável, marque todos os ambientes: **Production, Preview, Development**
- Clique em "Save" após adicionar cada variável

---

## 🔧 Configurações Necessárias

### 2. ✅ Arquivo `vercel.json` (já criado)

```json
{
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 60
    }
  },
  "env": {
    "NEXT_PUBLIC_APP_URL": "@next_public_app_url"
  }
}
```

**O que faz:**
- Define timeout de 60s para APIs (necessário para OpenAI)
- Configura variável de ambiente

### 3. ✅ Arquivo `next.config.ts` (já atualizado)

Configurações para compatibilidade com Vercel.

---

## 🚨 Problemas Comuns e Soluções

### ❌ Problema 1: "Failed to fetch" ou timeout

**Causa:** Timeout padrão da Vercel (10s no plano Hobby, 60s no Pro)

**Solução:**
1. Vercel.json configurado com `maxDuration: 60`
2. Se no plano Hobby, considere upgrade para Pro
3. Ou otimize as chamadas da API

### ❌ Problema 2: Variável `OPENAI_API_KEY` não definida

**Causa:** Variáveis de ambiente não configuradas na Vercel

**Solução:**
1. Acesse Settings → Environment Variables
2. Adicione `OPENAI_API_KEY` com sua chave
3. **Importante:** Marque todos os ambientes (Production, Preview, Development)
4. Faça redeploy após adicionar

### ❌ Problema 3: `NEXT_PUBLIC_APP_URL` undefined ou localhost

**Causa:** Variável não configurada ou usando valor local

**Solução:**
1. Configure na Vercel: `NEXT_PUBLIC_APP_URL=https://seu-app.vercel.app`
2. Use a URL real do deploy (não localhost)
3. Redeploy após configurar

### ❌ Problema 4: Funções do agente não respondem

**Causa:** Múltiplas possíveis:
- Timeout
- Variáveis de ambiente faltando
- CORS issues
- API da OpenAI não acessível

**Solução:**
1. Verifique logs da Vercel: **Dashboard → Deployments → [último deploy] → Functions**
2. Procure por erros específicos
3. Teste endpoints individualmente:
   - `https://seu-app.vercel.app/api/chat` (POST)
   - `https://seu-app.vercel.app/api/wallet/balance` (POST)
   - `https://seu-app.vercel.app/api/swap/quote` (GET)

### ❌ Problema 5: Build falha na Vercel

**Causa:** Dependências ou configurações incompatíveis

**Solução:**
1. Verifique package.json (todas as deps instaladas)
2. Execute `npm run build` localmente primeiro
3. Verifique logs de build na Vercel
4. Certifique-se que o arquivo `vercel.json` está commitado

---

## 📝 Passo a Passo Completo de Deploy

### Passo 1: Preparar o Código

```bash
# 1. Certifique-se que está na branch correta
git branch

# 2. Certifique-se que todos os arquivos estão commitados
git status

# 3. Adicione os arquivos de configuração
git add vercel.json
git add next.config.ts
git add VERCEL_DEPLOY.md

# 4. Commit
git commit -m "Add Vercel deployment configuration"

# 5. Push
git push origin main
```

### Passo 2: Criar Projeto na Vercel (primeira vez)

1. Acesse https://vercel.com/dashboard
2. Clique em "Add New Project"
3. Importe seu repositório do GitHub
4. **Não clique em Deploy ainda!**

### Passo 3: Configurar Variáveis de Ambiente

1. Antes do primeiro deploy, vá em "Environment Variables"
2. Adicione TODAS as variáveis listadas acima
3. **Marque todos os ambientes** para cada variável
4. Agora clique em "Deploy"

### Passo 4: Após o Primeiro Deploy

1. Copie a URL do deploy (ex: `https://seu-app.vercel.app`)
2. Volte em Settings → Environment Variables
3. Atualize `NEXT_PUBLIC_APP_URL` com a URL real
4. Clique em "Redeploy" no último deployment

### Passo 5: Testar

1. Acesse sua app na URL do Vercel
2. Conecte sua wallet
3. Teste os comandos do agente:
   - "Qual meu saldo?"
   - "Quero investir 10 USDC"
   - "Mostre um gráfico"
   - "Qual meu APY?"

---

## 🔍 Debug: Como Verificar Logs

### Ver Logs em Tempo Real

1. Acesse Vercel Dashboard
2. Vá em "Deployments"
3. Clique no deployment ativo
4. Clique em "Functions"
5. Clique em qualquer função (ex: `/api/chat`)
6. Veja os logs de execução

### Logs Importantes

Procure por:
- ✅ `[Chat API] Wallet address received:` - Wallet conectada
- ✅ `[Chat API] get_wallet_balance called` - Função chamada
- ❌ `Error:` - Qualquer erro
- ❌ `undefined` - Variáveis não definidas
- ❌ `timeout` - Timeout issues

---

## 🎯 Comandos Úteis para Debug

### Testar API de Chat Localmente

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "hello"}],
    "walletAddress": "0x1234567890123456789012345678901234567890"
  }'
```

### Testar API de Chat na Vercel

```bash
curl -X POST https://seu-app.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "hello"}],
    "walletAddress": "0x1234567890123456789012345678901234567890"
  }'
```

---

## ✅ Checklist Final

Antes de considerar o deploy bem-sucedido, verifique:

- [ ] Todas as variáveis de ambiente configuradas na Vercel
- [ ] `NEXT_PUBLIC_APP_URL` com URL real (não localhost)
- [ ] `OPENAI_API_KEY` válida e configurada
- [ ] Build completou sem erros
- [ ] Wallet conecta sem problemas
- [ ] Função `get_wallet_balance` funciona
- [ ] Função `invest` funciona
- [ ] Função `withdraw` funciona
- [ ] Função `generate_chart` funciona
- [ ] Função `get_investment_data` funciona
- [ ] Swaps executam com sucesso
- [ ] Mensagens em português aparecem corretamente

---

## 🆘 Ainda com Problemas?

### Verificar Status da OpenAI

- https://status.openai.com/
- Pode estar fora do ar ou com rate limits

### Verificar Quota da OpenAI

- https://platform.openai.com/usage
- Pode ter esgotado créditos

### Verificar Rate Limits

- Free tier: 3 RPM (requests per minute)
- Paid tier: 3,500 RPM
- Considere adicionar créditos: https://platform.openai.com/account/billing

### Contato Suporte Vercel

- https://vercel.com/support
- Forneça logs e ID do deployment

---

## 📚 Recursos Adicionais

- [Vercel Docs - Environment Variables](https://vercel.com/docs/projects/environment-variables)
- [Vercel Docs - Functions](https://vercel.com/docs/functions)
- [Next.js Docs - API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [OpenAI API Docs](https://platform.openai.com/docs)

---

## 🔄 Atualizações Futuras

Para deployar atualizações:

```bash
# 1. Faça suas alterações
# 2. Commit
git add .
git commit -m "Sua mensagem"

# 3. Push (Vercel deploya automaticamente)
git push origin main
```

A Vercel vai automaticamente:
- Fazer build
- Executar testes
- Fazer deploy
- Notificar você via email/Discord

---

## 🎉 Deploy Bem-Sucedido!

Se tudo funcionou, você terá:
- ✅ App online e acessível
- ✅ Agente respondendo comandos
- ✅ Swaps funcionando
- ✅ Gráficos renderizando
- ✅ Multi-idioma funcionando

**Parabéns! Seu AI Investor Agent está no ar! 🚀**
