import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { formatUnits } from 'viem';
import { getConfig, getSystemPrompt, getTimeout } from '@/lib/config';
import {
  isValidAddress,
  isRealAddress
} from '@/lib/wallet-validation';

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

// Helper functions for token operations
function getTokenAddress(symbol: string): string {
  const tokenMap: Record<string, string> = {
    'AVAX': '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    'USDC': '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
    'SIERRA': '0x6E6080e15f8C0010d333D8CAeEaD29292ADb78f7',
  };
  return tokenMap[symbol];
}

function getTokenDecimals(symbol: string): number {
  const decimalsMap: Record<string, number> = {
    'AVAX': 18,
    'USDC': 6,
    'SIERRA': 18,
  };
  return decimalsMap[symbol];
}

// Function definitions for GPT
const functions = [
  {
    name: 'get_wallet_balance',
    description: 'Obtém o saldo completo da carteira conectada, incluindo tokens nativos (AVAX) e ERC20 (USDC, SIERRA). Retorna valores em USD e quantidade de cada token.',
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
  {
    name: 'swap_tokens',
    description: 'Execute a token swap on Avalanche C-Chain using OKX DEX. Supports USDC, SIERRA, and AVAX only. Returns transaction data for user to sign.',
    parameters: {
      type: 'object',
      properties: {
        fromToken: {
          type: 'string',
          description: 'Token symbol to swap from (USDC, SIERRA, or AVAX)',
          enum: ['USDC', 'SIERRA', 'AVAX'],
        },
        toToken: {
          type: 'string',
          description: 'Token symbol to swap to (USDC, SIERRA, or AVAX)',
          enum: ['USDC', 'SIERRA', 'AVAX'],
        },
        amount: {
          type: 'string',
          description: 'Amount to swap in human-readable format (e.g., "10.5" for 10.5 USDC)',
        },
        slippage: {
          type: 'string',
          description: 'Slippage tolerance in percentage (default: 0.5)',
          default: '0.5',
        },
      },
      required: ['fromToken', 'toToken', 'amount'],
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

    // Log wallet address for debugging
    console.log('[Chat API] Wallet address received:', walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'NOT PROVIDED');

    // Format messages for OpenAI (convert to OpenAI format)
    const formattedMessages = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Call OpenAI API with function calling
    // Get configuration values
    const nlConfig = getConfig<{ model: string; temperature: number; max_tokens: number }>('capabilities.natural_language');
    const timeout = getTimeout('chat_response_ms');

    // Build system prompt with wallet context if available
    let systemPromptWithContext = SYSTEM_PROMPT;
    if (walletAddress && isValidAddress(walletAddress)) {
      systemPromptWithContext += `\n\n**CURRENT USER CONTEXT:**\n- Connected Wallet Address: ${walletAddress}\n- When the user asks about their balance or wallet, use this address: ${walletAddress}`;
    } else {
      systemPromptWithContext += `\n\n**CURRENT USER CONTEXT:**\n- Wallet Status: NOT CONNECTED\n- If the user asks about balance or wallet operations, inform them they need to connect their wallet first.`;
    }

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || nlConfig.model,
      messages: [
        { role: 'system', content: systemPromptWithContext },
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
          console.log('[Chat API] get_wallet_balance called with args:', functionArgs);
          console.log('[Chat API] Connected wallet:', walletAddress);

          // CRITICAL: Always use the connected wallet address
          // The GPT provides the address parameter, but we override it with the connected wallet
          const addressToUse = walletAddress || functionArgs.address;

          // Check if wallet is connected
          if (!walletAddress) {
            functionResult = {
              error: 'Wallet not connected. Please connect your wallet to check balance.',
              code: 'WALLET_NOT_CONNECTED',
              message: 'To check your balance, you need to connect your wallet first. Click the wallet button in the top right corner.'
            };
          }
          // Validate address format
          else if (!isValidAddress(addressToUse)) {
            functionResult = {
              error: 'Invalid wallet address format. Please check your wallet connection.',
              code: 'INVALID_ADDRESS'
            };
          }
          // Validate not a placeholder address
          else if (!isRealAddress(addressToUse)) {
            functionResult = {
              error: 'Cannot use placeholder or example addresses. Please connect your real wallet.',
              code: 'PLACEHOLDER_ADDRESS'
            };
          }
          // All validations passed - fetch balance using connected wallet
          else {
            console.log('[Chat API] Fetching balance for:', addressToUse);
            functionResult = await getWalletBalance(addressToUse, functionArgs.chainId || 43114);
            console.log('[Chat API] Balance result:', functionResult);
          }
        }
        else if (functionName === 'swap_tokens') {
          const { fromToken, toToken, amount, slippage = '0.5' } = functionArgs;

          console.log('[Chat API] swap_tokens called:', { fromToken, toToken, amount, slippage });

          // 1. Validar wallet conectada
          if (!walletAddress) {
            functionResult = {
              success: false,
              error: 'Wallet must be connected to perform swaps',
              code: 'WALLET_NOT_CONNECTED'
            };
          } else {
            try {
              // 2. Converter símbolos para endereços
              const fromTokenAddress = getTokenAddress(fromToken);
              const toTokenAddress = getTokenAddress(toToken);
              const fromDecimals = getTokenDecimals(fromToken);

              // 3. Converter amount para base units
              const baseAmount = Math.floor(parseFloat(amount) * (10 ** fromDecimals));

              const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

              // 4. Obter Quote
              const quoteUrl = new URL(`${baseUrl}/api/swap/quote`);
              quoteUrl.searchParams.append('chainId', '43114');
              quoteUrl.searchParams.append('fromToken', fromTokenAddress);
              quoteUrl.searchParams.append('toToken', toTokenAddress);
              quoteUrl.searchParams.append('amount', baseAmount.toString());
              quoteUrl.searchParams.append('slippage', slippage);

              const quoteRes = await fetch(quoteUrl.toString());
              const quoteData = await quoteRes.json();

              if (!quoteRes.ok) {
                functionResult = { success: false, error: quoteData.error || 'Failed to get quote' };
              } else {
                // 5. Verificar se precisa de approval (apenas para tokens não-nativos)
                let needsApproval = false;
                let approvalTx = null;

                if (fromToken !== 'AVAX') {
                  const approvalRes = await fetch(`${baseUrl}/api/swap/approval`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      chainId: 43114,
                      tokenAddress: fromTokenAddress,
                      amount: baseAmount.toString(),
                      userAddress: walletAddress
                    })
                  });

                  const approvalData = await approvalRes.json();

                  if (approvalRes.ok && !approvalData.status.isApproved) {
                    needsApproval = true;
                    approvalTx = approvalData.transaction;
                  }
                }

                // 6. Construir transação de swap
                const buildRes = await fetch(`${baseUrl}/api/swap/build`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    chainId: 43114,
                    fromToken: fromTokenAddress,
                    toToken: toTokenAddress,
                    amount: baseAmount.toString(),
                    slippage,
                    userAddress: walletAddress
                  })
                });

                const buildData = await buildRes.json();

                if (!buildRes.ok) {
                  functionResult = { success: false, error: buildData.error || 'Failed to build swap transaction' };
                } else {
                  // 7. Retornar resultado estruturado
                  const toAmount = formatUnits(BigInt(quoteData.quote.toAmount), getTokenDecimals(toToken));

                  functionResult = {
                    success: true,
                    swap: {
                      fromToken,
                      toToken,
                      fromAmount: amount,
                      toAmount,
                      exchangeRate: quoteData.quote.exchangeRate,
                      priceImpact: quoteData.quote.priceImpact,
                      needsApproval,
                      approvalTransaction: approvalTx,
                      swapTransaction: buildData.transaction,
                      estimatedGas: quoteData.quote.estimatedGas
                    }
                  };

                  console.log('[Chat API] Swap prepared successfully:', functionResult);
                }
              }
            } catch (error) {
              console.error('[Chat API] Swap error:', error);
              functionResult = {
                success: false,
                error: error instanceof Error ? error.message : 'Swap failed'
              };
            }
          }
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
