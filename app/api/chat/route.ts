/**
 * Chat API Route Handler (Modular Version)
 * Refactored from 1088 lines to ~150 lines
 * Uses modular tool system with feature flag for rollback
 */

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getConfig, getSystemPrompt } from '@/lib/config';
import { isValidAddress } from '@/lib/wallet-validation';
import { getToolRegistry, ToolContext } from '@/lib/tools';

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

/**
 * Check if modular tools feature is enabled
 */
function isModularToolsEnabled(): boolean {
  try {
    return getConfig<boolean>('features.experimental.modular_tools') ?? true;
  } catch {
    return true; // Default to enabled
  }
}

export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const { messages, walletAddress, chainId } = (await req.json()) as {
      messages: Message[];
      walletAddress?: string;
      chainId?: number;
    };

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
    }

    // Determine network - default to Ethereum (1)
    const currentChainId = chainId || 1;
    const isSolana = currentChainId === 101;
    const networkName = isSolana ? 'Solana' : currentChainId === 1 ? 'Ethereum' : 'Avalanche';

    // Log wallet and network info for debugging
    console.log(
      '[Chat API] Wallet address received:',
      walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'NOT PROVIDED'
    );
    console.log('[Chat API] Chain ID:', currentChainId, `(${networkName})`);

    // Build tool context
    // For Solana, we don't use isValidAddress (which is EVM-specific)
    const isWalletConnected = isSolana
      ? !!walletAddress && walletAddress.length >= 32 && walletAddress.length <= 44
      : !!walletAddress && isValidAddress(walletAddress);

    const toolContext: ToolContext = {
      walletAddress,
      chainId: currentChainId,
      isConnected: isWalletConnected,
    };

    // Format messages for OpenAI
    const formattedMessages = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Build system prompt with wallet context
    let systemPromptWithContext = SYSTEM_PROMPT;
    if (toolContext.isConnected) {
      if (isSolana) {
        // Solana-specific context with onboarding instructions
        systemPromptWithContext += `\n\n**CURRENT USER CONTEXT:**
- Connected Wallet Address: ${walletAddress}
- Connected Network: Solana (Chain ID: 101)
- Wallet Type: Solana (USDC)

**SOLANA ONBOARDING FLOW:**
O usuário está conectado com uma carteira Solana. Para investir, ele precisa:
1. Criar ou informar uma carteira EVM (Ethereum ou Avalanche) - recomende AVAX por menor custo
2. Usar a função solana_invest para enviar USDC da carteira Solana para nossa carteira de depósito
3. O valor será disponibilizado na carteira EVM informada em algumas horas

Quando o usuário quiser investir:
- Pergunte quanto USDC ele quer investir
- Pergunte o endereço da carteira destino (ETH ou AVAX) - deve começar com 0x
- Pergunte qual rede prefere (recomende AVAX)
- Use a tool solana_invest com os parâmetros coletados`;
      } else {
        systemPromptWithContext += `\n\n**CURRENT USER CONTEXT:**\n- Connected Wallet Address: ${walletAddress}\n- Connected Network: ${networkName} (Chain ID: ${currentChainId})\n- When the user asks about their balance or wallet, use this address on the ${networkName} network: ${walletAddress}`;
      }
    } else {
      systemPromptWithContext += `\n\n**CURRENT USER CONTEXT:**\n- Wallet Status: NOT CONNECTED\n- If the user asks about balance or wallet operations, inform them they need to connect their wallet first.`;
    }

    // Get tool registry and configuration
    const registry = getToolRegistry();
    const nlConfig = getConfig<{ model: string; temperature: number; max_tokens: number }>(
      'capabilities.natural_language'
    );

    console.log(`[Chat API] Using modular tools: ${isModularToolsEnabled()}`);
    console.log(`[Chat API] Registered tools: ${registry.getToolNames().join(', ')}`);

    // Call OpenAI API with function calling
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || nlConfig.model,
      messages: [{ role: 'system', content: systemPromptWithContext }, ...formattedMessages],
      tools: registry.getDefinitions(),
      tool_choice: 'auto',
      temperature: nlConfig.temperature,
      max_tokens: nlConfig.max_tokens,
    });

    let responseMessage = completion.choices[0]?.message;
    let swapDataResult = null;
    let chartDataResult = null;

    // Handle tool calls
    if (responseMessage?.tool_calls && responseMessage.tool_calls.length > 0) {
      const toolCall = responseMessage.tool_calls[0];

      if (toolCall.type === 'function') {
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);

        console.log(`[Chat API] Executing tool: ${functionName}`, functionArgs);

        // Execute tool via registry
        const toolResult = await registry.execute(functionName, functionArgs, toolContext);

        // Extract swap and chart data from result
        if (toolResult.success && toolResult.data) {
          const data = toolResult.data as Record<string, unknown>;

          // Handle swap data (from confirm_* tools ONLY)
          // Only pass swap data to frontend if it has transactions (swapTransaction)
          // Quote-only results (from invest, withdraw, swap_tokens preview) should NOT be passed
          if (data.swap) {
            const swapData = data.swap as Record<string, unknown>;

            // Only pass to frontend if it has actual transactions to execute
            if (swapData.swapTransaction) {
              swapDataResult = data.swap;
              console.log('[Chat API] Passing swap data to frontend:', {
                needsApproval: swapData.needsApproval,
                hasApprovalTx: !!swapData.approvalTransaction,
                hasSwapTx: !!swapData.swapTransaction,
              });
            } else {
              console.log(
                '[Chat API] Swap data is quote-only (no transactions), not passing to frontend'
              );
            }
          }

          // Handle Solana transaction data (from confirm_solana_invest)
          if (data.solanaTransaction) {
            swapDataResult = {
              isSolana: true,
              ...(data.solanaTransaction as object),
            };
            console.log('[Chat API] Passing Solana transaction to frontend');
          }

          // Handle chart data (from generate_chart tool)
          if (data.chartConfig) {
            chartDataResult = data.chartConfig;
          }
        }

        // Build function result for GPT (flatten for backwards compatibility)
        const functionResult = toolResult.success
          ? {
              success: true,
              ...(toolResult.data as object),
            }
          : {
              success: false,
              error: toolResult.error,
              code: toolResult.errorCode,
            };

        // Send function result back to GPT for natural language response
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

    const responseContent =
      responseMessage?.content || 'Desculpe, não consegui gerar uma resposta.';

    // Return response (compatible with existing UI)
    return NextResponse.json({
      response: responseContent,
      swapData: swapDataResult,
      chartData: chartDataResult,
    });
  } catch (error) {
    console.error('Error calling OpenAI API:', error);

    return NextResponse.json(
      {
        error: 'Erro ao processar sua mensagem. Tente novamente.',
      },
      { status: 500 }
    );
  }
}
