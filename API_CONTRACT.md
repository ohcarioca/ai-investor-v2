# API Contract - Kira Investor Agent

## Webhook Endpoint

**URL**: `https://n8n.balampay.com/webhook/investor_agent`

**Método**: `POST`

**Autenticação**: Nenhuma (por enquanto)

---

## Request Format

### Headers

```
Content-Type: application/json
```

### Body

```json
{
  "message": "string - mensagem do usuário",
  "timestamp": "string - ISO 8601 timestamp"
}
```

### Exemplo de Request

```json
{
  "message": "Quanto tenho investido em fundos?",
  "timestamp": "2025-12-09T18:30:00.000Z"
}
```

---

## Response Format

### Success Response (200 OK)

```json
{
  "response": "string - resposta do agente"
}
```

### Exemplo de Response

```json
{
  "response": "Você tem $8,450.00 investidos em fundos USDC. Seu portfólio está rendendo 6.2% APY no momento."
}
```

---

## Error Handling

### Client Side

O frontend trata os seguintes casos de erro:

1. **Network Error**: Falha na conexão com o endpoint
2. **HTTP Error**: Status code diferente de 2xx
3. **Invalid Response**: Resposta sem o campo `response`

Quando ocorre um erro, o chat exibe a mensagem:

```
"Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente."
```

### Expected Error Responses

#### 400 Bad Request

```json
{
  "error": "Invalid request format",
  "message": "Missing required field: message"
}
```

#### 500 Internal Server Error

```json
{
  "error": "Internal server error",
  "message": "Failed to process message"
}
```

---

## Exemplos de Uso

### Exemplo 1: Consulta de Saldo

**Request:**

```json
{
  "message": "Qual é meu saldo total?",
  "timestamp": "2025-12-09T10:00:00.000Z"
}
```

**Response:**

```json
{
  "response": "Seu saldo total é de $24,563.00, com um crescimento de 12.5% em relação ao mês passado."
}
```

### Exemplo 2: Transferência

**Request:**

```json
{
  "message": "Como faço para receber uma transferência bancária?",
  "timestamp": "2025-12-09T10:05:00.000Z"
}
```

**Response:**

```json
{
  "response": "Para receber transferências, você precisa fornecer ao pagador suas informações bancárias dedicadas. Gostaria que eu enviasse seus dados bancários por email?"
}
```

### Exemplo 3: Conversão de Moeda

**Request:**

```json
{
  "message": "Converter 1000 USDC para BRL",
  "timestamp": "2025-12-09T10:10:00.000Z"
}
```

**Response:**

```json
{
  "response": "1000 USDC equivalem a R$ 4,925.00 BRL na cotação atual (R$ 4.925 por USDC). Deseja prosseguir com essa conversão?"
}
```

---

## Implementação Frontend

### Hook useChat

Localização: `hooks/useChat.ts`

O hook gerencia:

- Estado das mensagens
- Loading state
- Error handling
- Envio de mensagens ao webhook

### Fluxo de Mensagem

1. Usuário digita mensagem e pressiona Enter/botão enviar
2. Mensagem é adicionada imediatamente ao chat (otimistic update)
3. Request é enviado ao webhook n8n
4. Loading state é exibido
5. Resposta é recebida e adicionada ao chat
6. Chat faz scroll automático para última mensagem

---

## Considerações Futuras

### Autenticação

Quando autenticação for implementada, o request deve incluir:

```json
{
  "message": "mensagem do usuário",
  "timestamp": "2025-12-09T10:00:00.000Z",
  "userId": "uuid-do-usuario",
  "sessionId": "uuid-da-sessao"
}
```

### Context Tracking

Para manter contexto da conversa:

```json
{
  "message": "mensagem do usuário",
  "timestamp": "2025-12-09T10:00:00.000Z",
  "conversationId": "uuid-da-conversa",
  "messageHistory": [
    {
      "role": "user",
      "content": "mensagem anterior"
    },
    {
      "role": "assistant",
      "content": "resposta anterior"
    }
  ]
}
```

### Rich Responses

Para respostas com dados estruturados:

```json
{
  "response": "Aqui está um resumo do seu portfólio:",
  "data": {
    "totalBalance": 24563.0,
    "usdcBalance": 8450.0,
    "apy": 6.2,
    "growth": 12.5
  },
  "actions": [
    {
      "type": "button",
      "label": "Investir mais",
      "action": "open_invest_modal"
    }
  ]
}
```
