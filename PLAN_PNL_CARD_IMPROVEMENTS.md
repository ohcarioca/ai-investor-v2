# Plano de Melhorias - Investment Performance Card

## Resumo
O card "Investment Performance" (`PNLCard.tsx`) possui problemas de cálculo, lógica e UI que precisam ser corrigidos para garantir consistência visual e precisão nos dados exibidos.

---

## 1. Correções de UI (Padronização Visual)

### 1.1 Padronizar cor de fundo do card
**Arquivo:** `components/PNLCard.tsx`

**Problema:** O card muda de cor baseado no PNL (verde/vermelho/cinza), enquanto todos os outros cards usam `bg-gray-50 border border-gray-200`.

**Solução:** Usar cor fixa `bg-gray-50 border border-gray-200` como os outros cards. Manter as cores apenas nos valores de PNL (texto), não no fundo do card.

**Antes (linhas 90-96):**
```tsx
const bgColor = isNeutral ? 'bg-gray-50' : isPositive ? 'bg-green-50' : 'bg-red-50';
const borderColor = isNeutral ? 'border-gray-200' : isPositive ? 'border-green-200' : 'border-red-200';
```

**Depois:**
```tsx
// Remover bgColor e borderColor dinâmicos
// Usar classe fixa: "bg-gray-50 border border-gray-200 rounded-xl p-5 mb-4"
```

---

## 2. Correções de Cálculo/Lógica

### 2.1 Corrigir formatação de valores negativos
**Arquivo:** `components/PNLCard.tsx`

**Problema:** A função `formatUsd` não exibe o sinal negativo corretamente. Valores negativos aparecem como positivos sem sinal.

**Antes (linhas 100-103):**
```tsx
const formatUsd = (value: number) => {
  const prefix = value >= 0 ? '+' : '';
  return `${prefix}$${Math.abs(value).toLocaleString(...)}`;
};
```

**Depois:**
```tsx
const formatUsd = (value: number) => {
  const prefix = value >= 0 ? '+' : '-';
  return `${prefix}$${Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
```

### 2.2 Corrigir cor do Accumulated Yield negativo
**Arquivo:** `components/PNLCard.tsx`

**Problema:** Yield negativo aparece em cinza ao invés de vermelho.

**Antes (linhas 154-156):**
```tsx
className={`font-medium ${pnlData.accumulatedYieldUsdc >= 0 ? 'text-green-600' : 'text-gray-900'}`}
```

**Depois:**
```tsx
className={`font-medium ${pnlData.accumulatedYieldUsdc >= 0 ? 'text-green-600' : 'text-red-600'}`}
```

### 2.3 Remover prefixo "+" da projeção anual
**Arquivo:** `components/PNLCard.tsx`

**Problema:** Projeção anual usa `formatUsd` que adiciona "+" para valores positivos, mas projeções não são ganhos realizados.

**Antes (linha 168):**
```tsx
{formatUsd(pnlData.projectedAnnualYieldUsdc)}
```

**Depois:**
```tsx
${pnlData.projectedAnnualYieldUsdc.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
```

---

## 3. Correções no Service (Lógica de Cálculo)

### 3.1 Corrigir cálculo de `totalPnlPercent` quando `netInvestedUsdc <= 0`
**Arquivo:** `lib/services/pnl/PNLService.ts`

**Problema:** Se o usuário retirou mais do que investiu, o percentual fica 0, o que não é informativo.

**Antes (linha 182):**
```tsx
const totalPnlPercent = netInvestedUsdc > 0 ? (totalPnlUsdc / netInvestedUsdc) * 100 : 0;
```

**Depois:**
```tsx
// Usar totalInvestedUsdc como base para percentual quando há histórico
const totalPnlPercent = totalInvestedUsdc > 0 ? (totalPnlUsdc / totalInvestedUsdc) * 100 : 0;
```

### 3.2 Melhorar tratamento de transferências recebidas
**Arquivo:** `lib/services/pnl/PNLService.ts`

**Problema:** Transferências recebidas usam preço atual como cost basis, distorcendo o PNL se foram recebidas há muito tempo.

**Solução:** Adicionar flag `hasUnknownCostBasis` no resultado e exibir aviso no UI quando aplicável.

**Alterações:**
1. Adicionar campo `hasUnknownCostBasis: boolean` no tipo `PNLResult`
2. Setar `true` quando houver transferências sem preço histórico
3. Exibir tooltip ou nota no card quando `hasUnknownCostBasis === true`

---

## 4. Melhorias de UX

### 4.1 Adicionar tooltip explicativo para "Accumulated Yield"
**Problema:** Usuários podem confundir "Accumulated Yield" (teórico baseado no APY) com "Unrealized PNL" (valorização real).

**Solução:** Adicionar ícone de info com tooltip explicando a diferença.

### 4.2 Melhorar estado de loading
**Problema:** O skeleton atual é genérico.

**Solução:** Criar skeleton que reflete a estrutura real do card.

### 4.3 Adicionar indicador visual de última atualização
**Solução:** Mostrar timestamp de quando o PNL foi calculado (já existe no tipo: `calculatedAt`).

---

## 5. Ordem de Implementação

1. **[ALTA]** Corrigir `formatUsd` para valores negativos (bug crítico)
2. **[ALTA]** Padronizar cor de fundo do card
3. **[MÉDIA]** Corrigir cor do yield negativo
4. **[MÉDIA]** Corrigir cálculo de `totalPnlPercent`
5. **[MÉDIA]** Remover "+" da projeção anual
6. **[BAIXA]** Adicionar `hasUnknownCostBasis` e aviso
7. **[BAIXA]** Melhorar skeleton de loading
8. **[BAIXA]** Adicionar tooltips explicativos

---

## Arquivos Afetados

| Arquivo | Tipo de Alteração |
|---------|-------------------|
| `components/PNLCard.tsx` | UI, formatação, cores |
| `lib/services/pnl/PNLService.ts` | Lógica de cálculo |
| `types/pnl.ts` | Adicionar campo opcional |

---

## Estimativa de Complexidade

- **Correções simples (1-5):** Baixa complexidade, alterações pontuais
- **Correções de lógica (3.1-3.2):** Média complexidade, requer testes
- **Melhorias UX (4.1-4.3):** Baixa complexidade, mas requer design
