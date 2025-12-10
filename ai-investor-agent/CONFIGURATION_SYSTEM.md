# 🎛️ Sistema de Configuração do AI Investor Agent

## 📌 Resumo Executivo

Implementamos um **sistema de configuração dinâmico e completo** que permite customizar todo o comportamento do agente sem modificar código. O sistema é **type-safe**, **validado** e **documentado**.

## ✅ O Que Foi Implementado

### 1. **Arquivos de Configuração**

| Arquivo | Descrição |
|---------|-----------|
| `config/agent.config.json` | Configuração principal (edite aqui!) |
| `config/agent.config.schema.json` | Schema JSON para validação |
| `lib/config.ts` | Sistema de carregamento e utilities |
| `hooks/useAgentConfig.ts` | React hooks para acesso à config |

### 2. **Documentação Completa**

| Documento | Conteúdo |
|-----------|----------|
| `config/README.md` | Guia completo de configuração |
| `config/EXAMPLES.md` | 16 cenários práticos de uso |
| `config/INTEGRATION_EXAMPLE.tsx` | 12 exemplos de código |
| `CONFIG_GUIDE.md` | Guia rápido de início |
| `AGENT_SPECIFICATION.md` | Especificação do comportamento |

### 3. **Áreas Configuráveis**

#### **Personalidade do Agente**
```json
{
  "agent": {
    "personality": {
      "tone": "professional-friendly",
      "style": "educational",
      "verbosity": "balanced",
      "emoji_usage": "minimal"
    }
  }
}
```

#### **Parâmetros de Trading**
```json
{
  "capabilities": {
    "token_swaps": {
      "default_slippage": 0.5,
      "max_slippage": 5.0,
      "price_impact_warning_threshold": 5.0
    }
  }
}
```

#### **Comportamento de IA**
```json
{
  "capabilities": {
    "natural_language": {
      "model": "gpt-4o",
      "temperature": 0.7,
      "max_tokens": 500
    }
  }
}
```

#### **Redes e Tokens**
```json
{
  "blockchain": {
    "networks": [...],
    "default_network_id": 43114
  },
  "tokens": {
    "supported": [...]
  }
}
```

#### **Segurança**
```json
{
  "security": {
    "limits": {
      "max_transaction_amount_usd": 10000,
      "min_transaction_amount_usd": 0.01
    }
  }
}
```

#### **Feature Flags**
```json
{
  "features": {
    "experimental": {
      "multi_chain_swaps": false
    },
    "beta": {
      "transaction_history": true
    }
  }
}
```

## 🚀 Como Usar

### Editar Configuração

1. Abra `config/agent.config.json`
2. Modifique os valores desejados
3. Reinicie o servidor: `npm run dev`
4. As mudanças entram em vigor

### Em Componentes React

```typescript
import { useAgentConfig } from '@/hooks/useAgentConfig';

function MyComponent() {
  const { config, getTokenConfig } = useAgentConfig();

  const slippage = config.capabilities.token_swaps.default_slippage;
  const usdc = getTokenConfig('USDC');

  return <div>Slippage: {slippage}%</div>;
}
```

### Em API Routes

```typescript
import { getConfig, getSystemPrompt } from '@/lib/config';

export async function POST(request: Request) {
  const model = getConfig<string>('capabilities.natural_language.model');
  const systemPrompt = getSystemPrompt();

  // Use na chamada da API...
}
```

## 📊 Funções Disponíveis

### Getters Básicos
```typescript
getConfig<T>(path: string): T
isFeatureEnabled(path: string): boolean
getTokenConfig(symbol: string)
getNetworkConfig(chainId: number)
getEnabledTokens(chainId?: number)
```

### Prompts e Mensagens
```typescript
getSystemPrompt(): string
getWelcomeMessage(): string
getDisclaimer(): string
getErrorMessage(key: string): string
getConfirmationPrompt(key: string, vars?: object): string
```

### Validação
```typescript
validatePriceImpact(impact: number)
shouldShowDisclaimer(context: string): boolean
validateConfig()
```

### API Config
```typescript
getTimeout(operation: string): number
getRetryConfig()
getCacheDuration(resource: string): number
isCachingEnabled(resource?: string): boolean
```

## 🎨 Exemplos de Uso

### Exemplo 1: Mudar Personalidade para Casual

```json
{
  "agent": {
    "personality": {
      "tone": "casual",
      "emoji_usage": "frequent"
    }
  },
  "prompts": {
    "welcome_message": "Hey! 👋 Ready to trade? Let's go! 🚀"
  }
}
```

### Exemplo 2: Modo Conservador

```json
{
  "capabilities": {
    "token_swaps": {
      "default_slippage": 0.3,
      "max_slippage": 1.0
    }
  },
  "behavior": {
    "transaction_safety": {
      "price_impact_warning_threshold": 1.0,
      "price_impact_block_threshold": 5.0
    }
  }
}
```

### Exemplo 3: Adicionar Novo Token

```json
{
  "tokens": {
    "supported": [
      {
        "symbol": "WAVAX",
        "name": "Wrapped AVAX",
        "address": "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
        "decimals": 18,
        "chain_id": 43114,
        "enabled": true
      }
    ]
  }
}
```

### Exemplo 4: Habilitar Features Beta

```json
{
  "features": {
    "beta": {
      "transaction_history": true,
      "advanced_charts": true
    }
  }
}
```

## 📁 Estrutura de Arquivos

```
ai-investor-agent/
├── config/
│   ├── agent.config.json          ← EDITE AQUI
│   ├── agent.config.schema.json   ← Schema de validação
│   ├── README.md                   ← Guia completo
│   ├── EXAMPLES.md                 ← 16 exemplos práticos
│   └── INTEGRATION_EXAMPLE.tsx     ← Exemplos de código
│
├── lib/
│   └── config.ts                   ← Sistema de carregamento
│
├── hooks/
│   └── useAgentConfig.ts          ← React hooks
│
├── CONFIG_GUIDE.md                ← Este arquivo
├── AGENT_SPECIFICATION.md         ← Especificação do agente
└── CONFIGURATION_SYSTEM.md        ← Resumo executivo
```

## 🔍 Validação

O sistema valida automaticamente:
- ✅ Campos obrigatórios presentes
- ✅ Valores dentro dos limites válidos
- ✅ Configurações consistentes
- ✅ Integridade de rede/tokens
- ✅ Sintaxe JSON válida

## 🛡️ Segurança

### Práticas Recomendadas
- ✅ Nunca commitar secrets
- ✅ Usar variáveis de ambiente para dados sensíveis
- ✅ Revisar limites de transação
- ✅ Validar todas as entradas
- ✅ Testar mudanças em desenvolvimento

### Configurações Críticas
```json
{
  "behavior": {
    "financial_advice": {
      "can_recommend": false,        // ⚠️ Manter false
      "can_predict_prices": false    // ⚠️ Manter false
    }
  }
}
```

## 📚 Documentação

### Leia Primeiro
1. **`CONFIG_GUIDE.md`** - Guia rápido
2. **`config/README.md`** - Referência completa
3. **`config/EXAMPLES.md`** - Exemplos práticos

### Para Desenvolvedores
1. **`lib/config.ts`** - Código do sistema
2. **`hooks/useAgentConfig.ts`** - React hooks
3. **`config/INTEGRATION_EXAMPLE.tsx`** - Exemplos de integração

### Para Product Managers
1. **`AGENT_SPECIFICATION.md`** - Comportamento do agente
2. **`config/EXAMPLES.md`** - Casos de uso
3. **`CONFIG_GUIDE.md`** - Guia rápido

## 🎯 Casos de Uso Comuns

| Objetivo | Arquivo | Seção |
|----------|---------|-------|
| Mudar tom do agente | `agent.config.json` | `agent.personality` |
| Ajustar slippage | `agent.config.json` | `capabilities.token_swaps` |
| Adicionar token | `agent.config.json` | `tokens.supported` |
| Habilitar feature | `agent.config.json` | `features` |
| Customizar mensagens | `agent.config.json` | `prompts` |
| Ajustar segurança | `agent.config.json` | `security` |
| Configurar API | `agent.config.json` | `api` |

## 🔧 Troubleshooting

### Configuração não carrega
```bash
# Verificar sintaxe JSON
npm run build

# Reiniciar servidor
npm run dev
```

### Erros de tipo
```typescript
// Usar getters type-safe
const value = getConfig<string>('path.to.value');
```

### Feature não funciona
```typescript
// Verificar se está habilitada
console.log(isFeatureEnabled('features.beta.my_feature'));
```

## 📊 Status da Implementação

| Componente | Status | Integrado |
|------------|--------|-----------|
| Sistema de Config | ✅ | Sim |
| Validação | ✅ | Sim |
| TypeScript Types | ✅ | Sim |
| React Hooks | ✅ | Sim |
| Documentação | ✅ | Sim |
| Exemplos | ✅ | Sim |
| Tests | ⏳ | Pendente |

## 🚀 Próximos Passos

1. **Integrar em mais componentes**
   - Usar config em todos os componentes
   - Remover hardcoded values
   - Centralizar configurações

2. **Adicionar testes**
   - Unit tests para config loading
   - Validation tests
   - Integration tests

3. **Hot reload** (opcional)
   - Config updates sem restart
   - Runtime config changes

4. **Admin UI** (futuro)
   - Interface web para editar config
   - Preview de mudanças
   - Rollback de configurações

## 💡 Dicas

### Desenvolvimento
```json
{
  "logging": { "level": "debug" },
  "behavior": { "error_handling": { "show_technical_details": true } }
}
```

### Produção
```json
{
  "logging": { "level": "warn" },
  "api": { "rate_limiting": { "enabled": true } }
}
```

### Testes
```json
{
  "features": { "experimental": { "my_feature": true } }
}
```

## 📞 Suporte

Precisa de ajuda?
1. Consulte a documentação
2. Veja os exemplos
3. Revise o código em `lib/config.ts`
4. Abra uma issue no GitHub

## 🎉 Conclusão

Você agora tem um **sistema de configuração completo e robusto** que permite:

✅ **Customizar** todo o comportamento do agente
✅ **Validar** configurações automaticamente
✅ **Documentar** todas as opções disponíveis
✅ **Integrar** facilmente em qualquer parte do código
✅ **Escalar** para novos recursos e funcionalidades

**Tudo sem modificar uma linha de código!**

---

**Versão:** 1.0.0
**Última Atualização:** 10 de Dezembro de 2025
**Desenvolvido com ❤️ para flexibilidade e manutenibilidade**
