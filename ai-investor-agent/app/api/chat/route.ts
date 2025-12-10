import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getConfig, getSystemPrompt, getTimeout } from '@/lib/config';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Load system prompt from configuration
const SYSTEM_PROMPT = getSystemPrompt();

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// Function definitions for GPT
const functions = [
  {
    name: 'get_wallet_balance',
    description: 'Obtém o saldo completo da carteira conectada, incluindo tokens nativos (AVAX) e ERC20 (USDC, WETH.e, SIERRA). Retorna valores em USD e quantidade de cada token.',
    parameters: {
      type: 'object',
      properties: {
        address: {
          type: 'string',
          description: 'Endereço da carteira (formato 0x...)',
        },
        chainId: {
          type: 'number',
          description: 'ID da chain (43114 para Avalanche)',
          default: 43114,
        },
      },
      required: ['address'],
    },
  },
];

// Function to call the wallet balance API
async function getWalletBalance(address: string, chainId: number = 43114) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/wallet/balance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, chainId }),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch wallet balance');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching wallet balance:', error);
    return { error: 'Failed to fetch wallet balance' };
  }
}

export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const { messages, walletAddress } = await req.json() as {
      messages: Message[];
      walletAddress?: string;
    };

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    // Format messages for OpenAI (convert to OpenAI format)
    const formattedMessages = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Call OpenAI API with function calling
    // Get configuration values
    const nlConfig = getConfig<{ model: string; temperature: number; max_tokens: number }>('capabilities.natural_language');
    const timeout = getTimeout('chat_response_ms');

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || nlConfig.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...formattedMessages,
      ],
      tools: functions.map(fn => ({
        type: 'function' as const,
        function: fn,
      })),
      tool_choice: 'auto',
      temperature: nlConfig.temperature,
      max_tokens: nlConfig.max_tokens,
    });

    let responseMessage = completion.choices[0]?.message;

    // Handle function calls
    if (responseMessage?.tool_calls && responseMessage.tool_calls.length > 0) {
      const toolCall = responseMessage.tool_calls[0];

      // Type guard to check if this is a function tool call
      if (toolCall.type === 'function') {
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);

        let functionResult;

        if (functionName === 'get_wallet_balance') {
          // Use provided wallet address or fallback to function argument
          const address = walletAddress || functionArgs.address;
          functionResult = await getWalletBalance(address, functionArgs.chainId);
        }

        // Send function result back to GPT
        const secondCompletion = await openai.chat.completions.create({
          model: process.env.OPENAI_MODEL || 'gpt-4o',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...formattedMessages,
            responseMessage,
            {
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify(functionResult),
            },
          ],
          temperature: 0.7,
          max_tokens: 1000,
        });

        responseMessage = secondCompletion.choices[0]?.message;
      }
    }

    const responseContent = responseMessage?.content ||
      'Desculpe, não consegui gerar uma resposta.';

    // Return response in format compatible with existing UI
    return NextResponse.json({
      response: responseContent
    });

  } catch (error) {
    console.error('Error calling OpenAI API:', error);

    return NextResponse.json(
      {
        error: 'Erro ao processar sua mensagem. Tente novamente.'
      },
      { status: 500 }
    );
  }
}
