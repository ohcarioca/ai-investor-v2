# 📊 Funcionalidade de Gráficos - AI Investor Agent

## Visão Geral

O agente agora pode gerar gráficos visuais interativos dos dados de investimento do usuário. Esta funcionalidade permite visualizar o desempenho do portfólio, crescimento dos investimentos e lucros ao longo do tempo.

## Como Usar

### Comandos do Usuário

O agente responde automaticamente a solicitações como:

- "Mostre um gráfico do meu portfólio"
- "Crie um gráfico de performance"
- "Quero ver graficamente meu investimento"
- "Visualizar meu crescimento"
- "Mostrar gráfico de lucro"
- "Ver performance dos últimos 3 meses"

### Tipos de Gráficos

#### 1. **Portfolio (Desempenho Geral)**
```
Comando: "Mostre o gráfico do meu portfólio"
```
- Tipo: Gráfico de área
- Mostra: Valor atual vs Valor investido
- Cores: Roxo (#9333ea) e Rosa (#ec4899)
- Ideal para: Visão geral do desempenho

#### 2. **Growth (Crescimento Comparativo)**
```
Comando: "Mostre o crescimento do investimento"
```
- Tipo: Gráfico de linha
- Mostra: Comparação entre valor investido e valor atual
- Cores: Verde (#10b981) e Cinza (#6b7280)
- Ideal para: Análise de crescimento

#### 3. **Profit (Lucro ao Longo do Tempo)**
```
Comando: "Mostre o gráfico de lucro"
```
- Tipo: Gráfico de barras
- Mostra: Lucro líquido por período
- Cor: Verde (#10b981)
- Ideal para: Ver ganhos em cada período

### Períodos Disponíveis

- **7d** - 7 dias
- **1m** - 1 mês (padrão)
- **3m** - 3 meses
- **6m** - 6 meses
- **1y** - 1 ano

### Exemplos de Uso

```
Usuário: "Mostre um gráfico do meu portfólio dos últimos 3 meses"
Agente: [Gera gráfico tipo 'portfolio' com período '3m']

Usuário: "Quero ver meu lucro ao longo do tempo"
Agente: [Gera gráfico tipo 'profit' com período '1m']

Usuário: "Visualizar crescimento do último ano"
Agente: [Gera gráfico tipo 'growth' com período '1y']
```

## Estrutura Técnica

### Arquivos Criados

1. **`components/charts/ChartCard.tsx`**
   - Componente reutilizável de gráfico
   - Suporta 3 tipos: line, area, bar
   - Responsivo e interativo
   - Tooltips customizados
   - Estatísticas de resumo

2. **`app/api/charts/historical/route.ts`**
   - Endpoint GET para dados históricos
   - Gera dados mock com crescimento realista
   - Parâmetros: `wallet_address`, `type`, `period`

3. **`types/chat.ts`** (atualizado)
   - Adiciona `chartData?: ChartConfig` em Message
   - Adiciona `chartData?: ChartConfig` em ChatResponse

### Fluxo de Dados

```
1. Usuário: "Mostre um gráfico"
   ↓
2. useChat → POST /api/chat
   ↓
3. OpenAI detecta intenção → chama generate_chart
   ↓
4. generate_chart → GET /api/charts/historical
   ↓
5. API retorna ChartConfig com dados
   ↓
6. chatData incluído na resposta
   ↓
7. ChatMessage renderiza ChartCard
   ↓
8. Usuário vê gráfico interativo
```

### Função do Agente

```typescript
{
  name: 'generate_chart',
  description: 'Gera um gráfico visual dos dados de investimento...',
  parameters: {
    wallet_address: string,  // Obrigatório
    chart_type: 'portfolio' | 'growth' | 'profit',  // Padrão: 'portfolio'
    period: '7d' | '1m' | '3m' | '6m' | '1y',  // Padrão: '1m'
  }
}
```

## Componente ChartCard

### Props

```typescript
interface ChartConfig {
  title: string;              // Título do gráfico
  description?: string;       // Descrição opcional
  type: ChartType;           // 'line' | 'area' | 'bar'
  data: ChartDataPoint[];    // Dados do gráfico
  dataKeys: {
    x: string;               // Chave para eixo X
    y: string[];             // Chaves para eixo Y
  };
  colors?: string[];         // Cores customizadas
  yAxisLabel?: string;       // Label do eixo Y
  xAxisLabel?: string;       // Label do eixo X
  showLegend?: boolean;      // Mostrar legenda (padrão: true)
  showGrid?: boolean;        // Mostrar grid (padrão: true)
}
```

### Features

- ✅ Responsivo (ResponsiveContainer)
- ✅ Tooltips interativos customizados
- ✅ Indicador de tendência (↑/↓)
- ✅ Percentual de mudança
- ✅ Estatísticas de resumo (início, atual, mudança)
- ✅ Formatação de valores em USD
- ✅ Suporte a múltiplas linhas/áreas/barras
- ✅ Cores customizáveis por dataset

## Geração de Dados Mock

A API `/api/charts/historical` gera dados realistas baseados em:

- **APY**: 5.85% (baseado nos dados reais)
- **Taxa diária**: Calculada a partir do APY anual
- **Flutuação**: ±1% diária para simular volatilidade
- **Investimentos**: Simula aportes periódicos ($5/dia)

### Exemplo de Resposta

```json
{
  "success": true,
  "chartConfig": {
    "title": "Portfolio Performance",
    "description": "Last 1m",
    "type": "area",
    "data": [
      { "name": "Jan 1", "value": 102.5, "invested": 100 },
      { "name": "Jan 2", "value": 105.8, "invested": 105 },
      // ...
    ],
    "dataKeys": { "x": "name", "y": ["value", "invested"] },
    "colors": ["#9333ea", "#ec4899"],
    "yAxisLabel": "Value (USD)",
    "showLegend": true,
    "showGrid": true
  }
}
```

## Customização

### Adicionar Novo Tipo de Gráfico

1. Adicione o tipo em `chart_type` enum na função do agente
2. Crie o case no endpoint `/api/charts/historical`
3. Defina o ChartConfig apropriado

### Alterar Cores

Edite o array `colors` em cada tipo de gráfico:

```typescript
colors: ['#9333ea', '#ec4899'] // Roxo e Rosa
```

### Adicionar Novos Períodos

1. Adicione o período em `period` enum
2. Atualize a lógica de `days` em `generateHistoricalData()`

## Validações

- ✅ Wallet deve estar conectada
- ✅ Endereço deve ser válido (formato 0x...)
- ✅ Endereço não pode ser placeholder
- ✅ Período deve estar na lista válida
- ✅ Tipo de gráfico deve ser válido

## Bibliotecas Utilizadas

- **recharts**: Biblioteca de gráficos React
  - `npm install recharts`
  - Versão: Latest
  - Documentação: https://recharts.org

## Exemplos de Interação

### Exemplo 1: Gráfico Simples
```
👤 Usuário: mostre um gráfico
🤖 Agente: Aqui está o gráfico do seu portfólio no último mês:
           [Gráfico de área com performance]
```

### Exemplo 2: Gráfico Específico
```
👤 Usuário: quero ver o lucro dos últimos 6 meses
🤖 Agente: Aqui está o gráfico de lucro dos últimos 6 meses:
           [Gráfico de barras com lucro mensal]
```

### Exemplo 3: Análise de Crescimento
```
👤 Usuário: comparar investido vs valor atual no último ano
🤖 Agente: Aqui está a comparação entre o valor investido e o valor atual no último ano:
           [Gráfico de linha com 2 datasets]
```

## Melhorias Futuras

- [ ] Dados reais da blockchain (substituir mock)
- [ ] Exportar gráfico como imagem
- [ ] Gráficos adicionais (APY histórico, volume de transações)
- [ ] Comparação com benchmarks (S&P 500, BTC, etc.)
- [ ] Zoom e pan nos gráficos
- [ ] Download de dados em CSV
- [ ] Gráficos de pizza para alocação
- [ ] Indicadores técnicos (RSI, MACD, etc.)

## Troubleshooting

### Gráfico não aparece
- Verificar se a wallet está conectada
- Verificar console do navegador para erros
- Verificar se a API retornou dados válidos

### Dados incorretos
- Atualmente usa dados mock
- Para dados reais, integrar com blockchain/database

### Erro de tipo TypeScript
- Garantir que ChartConfig está importado corretamente
- Verificar tipos em `types/chat.ts`

## Suporte

Para problemas ou sugestões relacionadas aos gráficos, consulte:
- Código: `components/charts/ChartCard.tsx`
- API: `app/api/charts/historical/route.ts`
- Agente: `app/api/chat/route.ts` (função `generate_chart`)
