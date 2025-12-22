/**
 * BridgeOrchestrator
 * Coordinates the complete bridge flow:
 * 1. Verify Solana transaction on-chain
 * 2. Check for duplicate processing
 * 3. Execute EVM transfer
 */

import { SolanaVerifier } from './SolanaVerifier';
import { EVMTransferService } from './EVMTransferService';
import { DuplicateTracker } from './DuplicateTracker';
import { BRIDGE_CONFIG } from '@/lib/constants/blockchain';
import type { SolanaWebhookPayload } from '@/types/solana';
import type { BridgeResult } from '@/types/bridge';

export class BridgeOrchestrator {
  private solanaVerifier: SolanaVerifier;
  private evmTransferService: EVMTransferService;
  private duplicateTracker: DuplicateTracker;

  constructor() {
    this.solanaVerifier = new SolanaVerifier();
    this.evmTransferService = new EVMTransferService();
    this.duplicateTracker = DuplicateTracker.getInstance();
  }

  /**
   * Process a bridge request from Solana to EVM
   */
  async processBridgeRequest(payload: SolanaWebhookPayload): Promise<BridgeResult> {
    const timestamp = new Date().toISOString();

    console.log(`[BridgeOrchestrator] Processing bridge request:`, {
      txHash: payload.tx_hash.slice(0, 20) + '...',
      targetWallet: payload.wallet_target.slice(0, 10) + '...',
      network: payload.network_target,
      amount: payload.amount_usdc,
    });

    // Step 1: Check for duplicate transaction
    if (this.duplicateTracker.isProcessed(payload.tx_hash)) {
      console.log(`[BridgeOrchestrator] Duplicate transaction detected`);
      return {
        success: false,
        solanaVerification: { isValid: false, error: 'Transaction already processed' },
        error: 'Duplicate transaction: This Solana transaction has already been bridged',
        timestamp,
      };
    }

    // Step 2: Verify Solana transaction on-chain
    console.log(`[BridgeOrchestrator] Verifying Solana transaction...`);
    const verification = await this.solanaVerifier.verifyTransaction(payload.tx_hash);

    if (!verification.isValid) {
      console.log(`[BridgeOrchestrator] Solana verification failed: ${verification.error}`);
      return {
        success: false,
        solanaVerification: verification,
        error: `Solana verification failed: ${verification.error}`,
        timestamp,
      };
    }

    // Step 3: Validate amount matches webhook payload
    const verifiedAmount = verification.details?.amount || 0;
    if (Math.abs(verifiedAmount - payload.amount_usdc) > 0.01) {
      console.log(
        `[BridgeOrchestrator] Amount mismatch: verified=${verifiedAmount}, payload=${payload.amount_usdc}`
      );
      return {
        success: false,
        solanaVerification: verification,
        error: `Amount mismatch: Transaction shows ${verifiedAmount} USDC but payload claims ${payload.amount_usdc} USDC`,
        timestamp,
      };
    }

    // Step 4: Validate amount limits
    if (verifiedAmount < BRIDGE_CONFIG.MIN_AMOUNT_USDC) {
      return {
        success: false,
        solanaVerification: verification,
        error: `Amount too small: Minimum is ${BRIDGE_CONFIG.MIN_AMOUNT_USDC} USDC`,
        timestamp,
      };
    }

    if (verifiedAmount > BRIDGE_CONFIG.MAX_AMOUNT_USDC) {
      return {
        success: false,
        solanaVerification: verification,
        error: `Amount too large: Maximum is ${BRIDGE_CONFIG.MAX_AMOUNT_USDC} USDC`,
        timestamp,
      };
    }

    // Step 5: Mark as processed BEFORE attempting EVM transfer
    // This prevents race conditions where the same tx could be processed twice
    this.duplicateTracker.markProcessed(payload.tx_hash);

    // Step 6: Execute EVM transfer
    console.log(`[BridgeOrchestrator] Executing EVM transfer...`);
    const evmResult = await this.evmTransferService.sendUSDC({
      targetWallet: payload.wallet_target,
      networkTarget: payload.network_target,
      amountUsdc: verifiedAmount,
    });

    if (!evmResult.success) {
      console.error(`[BridgeOrchestrator] EVM transfer failed: ${evmResult.error}`);
      // Note: We already marked the tx as processed, so manual intervention may be needed
      // In a production system, you'd want to track failed bridges for retry
      return {
        success: false,
        solanaVerification: verification,
        evmTransfer: evmResult,
        error: `EVM transfer failed: ${evmResult.error}. Solana tx was verified but USDC was not sent. Manual intervention required.`,
        timestamp,
      };
    }

    console.log(`[BridgeOrchestrator] Bridge completed successfully:`, {
      solanaHash: payload.tx_hash.slice(0, 20) + '...',
      evmHash: evmResult.txHash,
      amount: verifiedAmount,
      network: payload.network_target,
    });

    return {
      success: true,
      solanaVerification: verification,
      evmTransfer: evmResult,
      timestamp,
    };
  }

  /**
   * Get statistics about processed transactions
   */
  getStats(): { processedCount: number } {
    return {
      processedCount: this.duplicateTracker.getProcessedCount(),
    };
  }

  /**
   * Check hot wallet balances for monitoring
   */
  async checkHotWalletBalances(): Promise<{ eth: string; avax: string }> {
    try {
      const ethBalance = await this.evmTransferService.checkBalance('ETH');
      const avaxBalance = await this.evmTransferService.checkBalance('AVAX');
      return {
        eth: ethBalance.formatted,
        avax: avaxBalance.formatted,
      };
    } catch (error) {
      console.error('[BridgeOrchestrator] Error checking balances:', error);
      return { eth: 'error', avax: 'error' };
    }
  }
}
