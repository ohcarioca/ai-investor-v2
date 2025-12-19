/**
 * Solana Investment Webhook API Route
 * Processes Solana USDC transfers and bridges to ETH/AVAX
 * Also forwards notification to n8n webhook
 */

import { NextRequest, NextResponse } from 'next/server';
import type { SolanaWebhookPayload, SolanaWebhookResponseExtended } from '@/types/solana';
import { BridgeOrchestrator } from '@/lib/services/bridge';

const WEBHOOK_URL = 'https://n8n.balampay.com/webhook/new_wallet';
const MAX_RETRIES = 3;
const BASE_DELAY = 2000; // 2 seconds

export async function POST(req: NextRequest) {
  try {
    const payload: SolanaWebhookPayload = await req.json();

    // Validate required fields
    if (!payload.wallet_solana || !payload.wallet_target || !payload.tx_hash) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate network
    if (!['ETH', 'AVAX'].includes(payload.network_target)) {
      return NextResponse.json(
        { success: false, error: 'Invalid network_target. Must be ETH or AVAX' },
        { status: 400 }
      );
    }

    // =========================================================================
    // BRIDGE PROCESSING - Verify Solana tx and send USDC on EVM
    // =========================================================================
    console.log('[Solana Webhook] Processing bridge request...');

    const orchestrator = new BridgeOrchestrator();
    const bridgeResult = await orchestrator.processBridgeRequest(payload);

    if (!bridgeResult.success) {
      console.error('[Solana Webhook] Bridge failed:', bridgeResult.error);
      return NextResponse.json(
        {
          success: false,
          error: bridgeResult.error,
          bridgeStatus: {
            solanaVerified: bridgeResult.solanaVerification.isValid,
            evmTransferHash: bridgeResult.evmTransfer?.txHash,
            evmTransferStatus: 'failed' as const,
          },
        } satisfies SolanaWebhookResponseExtended,
        { status: 500 }
      );
    }

    console.log('[Solana Webhook] Bridge successful:', {
      solanaHash: payload.tx_hash.slice(0, 20) + '...',
      evmHash: bridgeResult.evmTransfer?.txHash,
      amount: bridgeResult.solanaVerification.details?.amount,
    });

    // =========================================================================
    // N8N WEBHOOK FORWARDING - Continue with existing functionality
    // =========================================================================

    // Send webhook with retry logic
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`[Solana Webhook] Attempt ${attempt}/${MAX_RETRIES}:`, {
          wallet_solana: `${payload.wallet_solana.slice(0, 6)}...${payload.wallet_solana.slice(-4)}`,
          wallet_target: `${payload.wallet_target.slice(0, 6)}...${payload.wallet_target.slice(-4)}`,
          network_target: payload.network_target,
          amount_usdc: payload.amount_usdc,
          tx_hash: payload.tx_hash.slice(0, 20) + '...',
        });

        const response = await fetch(WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          console.log('[Solana Webhook] n8n webhook sent successfully');
          return NextResponse.json({
            success: true,
            attempts: attempt,
            bridgeStatus: {
              solanaVerified: true,
              evmTransferHash: bridgeResult.evmTransfer?.txHash,
              evmTransferStatus: 'success' as const,
            },
          } satisfies SolanaWebhookResponseExtended);
        }

        // Non-200 response
        const errorText = await response.text();
        throw new Error(`Webhook returned ${response.status}: ${errorText}`);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.error(`[Solana Webhook] Attempt ${attempt} failed:`, lastError.message);

        // Don't wait after last attempt
        if (attempt < MAX_RETRIES) {
          const delay = BASE_DELAY * Math.pow(2, attempt - 1);
          console.log(`[Solana Webhook] Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    // All n8n retries failed, but bridge was successful
    // Return partial success since the important part (bridge) succeeded
    console.error('[Solana Webhook] n8n webhook failed after all retries:', lastError?.message);
    console.log('[Solana Webhook] Bridge was successful, returning partial success');
    return NextResponse.json({
      success: true, // Bridge succeeded, so overall success
      warning: `n8n webhook failed: ${lastError?.message}`,
      attempts: MAX_RETRIES,
      bridgeStatus: {
        solanaVerified: true,
        evmTransferHash: bridgeResult.evmTransfer?.txHash,
        evmTransferStatus: 'success' as const,
      },
    } satisfies SolanaWebhookResponseExtended);
  } catch (error) {
    console.error('[Solana Webhook] Error processing request:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
