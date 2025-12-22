# Kira AI Investor Agent

Interface conversacional de agente de IA para assistência financeira, desenvolvida com Next.js 16, React 19 e TypeScript.

## Funcionalidades

### Interface Agêntica

- **Chat conversacional em tempo real** integrado com OpenAI GPT-4
- **Sistema de Tools modular** com 11 ferramentas disponíveis
- **Histórico de mensagens** com scroll automático
- **Estados de loading** com animações durante processamento
- **Tratamento de erros** com mensagens amigáveis

### Funcionalidades do Agente (Tools)

#### Balance & Portfolio

- 💰 **get_wallet_balance** - Obtém saldo completo da carteira (ETH/AVAX + USDC + SIERRA)
- 📊 **get_investment_data** - Dados de investimento e APY do protocolo
- 📈 **generate_chart** - Gera gráficos de portfolio, crescimento e lucro

#### Investimentos

- 🏦 **invest** - Solicita investimento em SIERRA
- ✅ **confirm_invest** - Confirma e executa investimento
- 💸 **withdraw** - Solicita resgate de SIERRA
- ✅ **confirm_withdraw** - Confirma e executa resgate

#### Swaps

- 💱 **swap_tokens** - Solicita cotação para troca de tokens (via OKX DEX)
- ✅ **confirm_swap** - Confirma e executa swap com gas otimizado

#### Histórico

- 📜 **get_transaction_history** - Obtém histórico de transações USDC/SIERRA
  - Filtra por token (USDC, SIERRA ou ambos)
  - Filtra por direção (recebidas, enviadas ou todas)
  - Inclui resumo estatístico

### Otimização de Gas

- **Margens dinâmicas** por tipo de operação (15% approval, 25-50% swaps)
- **Aprovações seguras** com valor exato + 20% margem (não expõe todo saldo)
- **Estimativa de custo em USD** antes da transação
- **Indicador de congestionamento** da rede

### Redes Suportadas

- **Ethereum Mainnet** (Chain ID: 1)
- **Avalanche C-Chain** (Chain ID: 43114)

### Portfolio Overview

- **Total Balance**: Saldo em tempo real via blockchain
- **Token Balances**: USDC, SIERRA com valores em USD
- **APY Performance**: Dados do protocolo SIERRA

## Stack Tecnológico

- **Framework**: Next.js 16.0.8 (App Router + Turbopack)
- **UI**: React 19.2.1
- **Linguagem**: TypeScript 5
- **Estilização**: Tailwind CSS 4
- **Ícones**: Lucide React
- **Qualidade de Código**: ESLint

## Estrutura do Projeto

```
ai-investor-agent/
├── app/
│   ├── page.tsx          # Página principal com lógica de chat
│   ├── layout.tsx        # Layout raiz
│   └── globals.css       # Estilos globais
├── components/
│   ├── Header.tsx        # Cabeçalho com logo e controles
│   ├── FeatureCard.tsx   # Cards de funcionalidades
│   ├── PortfolioOverview.tsx  # Sidebar com dados do portfólio
│   ├── ChatInput.tsx     # Input de mensagens
│   ├── ChatMessage.tsx   # Componente individual de mensagem
│   └── ChatHistory.tsx   # Histórico completo do chat
├── hooks/
│   └── useChat.ts        # Hook customizado para gerenciar chat
└── types/
    └── chat.ts           # Tipos TypeScript do chat
```

## Integração com Webhook

O sistema envia todas as mensagens do usuário para o endpoint:

```
https://n8n.balampay.com/webhook/investor_agent
```

### Formato da Requisição

```typescript
POST https://n8n.balampay.com/webhook/investor_agent
Content-Type: application/json

{
  "message": "mensagem do usuário",
  "timestamp": "2025-12-09T18:00:00.000Z"
}
```

### Formato da Resposta Esperada

```typescript
{
  "response": "resposta do agente"
}
```

## Como Executar

### Instalação

```bash
# Instalar dependências
npm install
```

### Desenvolvimento

```bash
# Iniciar servidor de desenvolvimento
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000) no navegador.

### Build para Produção

```bash
# Criar build otimizado
npm run build

# Executar em produção
npm start
```

### Linting

```bash
npm run lint
```

## Componentes Principais

### useChat Hook

Hook customizado que gerencia todo o estado do chat:

- Armazenamento de mensagens
- Envio de mensagens ao webhook
- Estados de loading e erro
- Scroll automático

### ChatHistory

Exibe o histórico completo de mensagens com:

- Distinção visual entre usuário e assistente
- Timestamps
- Animação de loading durante respostas
- Auto-scroll para novas mensagens

### PortfolioOverview

Sidebar com dados mockados do portfólio:

- Cards de balanço total e USDC
- Gráfico de performance APY
- Indicadores de crescimento

## Personalização

### Alterar Endpoint do Webhook

Edite o arquivo `hooks/useChat.ts`:

```typescript
const WEBHOOK_URL = 'sua-url-aqui';
```

### Modificar Dados do Portfolio

Edite o arquivo `components/PortfolioOverview.tsx` para alterar valores mockados.

## Design System

### Cores Principais

- **Purple**: #9333EA (Purple-600)
- **Pink**: #EC4899 (Pink-500)
- **Gradiente**: Purple-600 → Pink-500

## Licença

Propriedade de KiraFin
