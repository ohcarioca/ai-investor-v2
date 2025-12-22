/**
 * EVMTransferService
 * Executes ERC20 USDC transfers on Ethereum and Avalanche networks
 * Uses hot wallet private keys from environment variables
 */

import {
  createWalletClient,
  createPublicClient,
  http,
  parseUnits,
  erc20Abi,
  type Chain,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { mainnet, avalanche } from 'viem/chains';
import {
  CHAIN_IDS,
  EVM_USDC_ADDRESSES,
  NETWORK_TARGET_TO_CHAIN_ID,
} from '@/lib/constants/blockchain';
import type { EVMTransferParams, EVMTransferResult } from '@/types/bridge';

interface ChainConfig {
  chainId: number;
  chain: Chain;
  privateKey: string;
  rpcUrl?: string;
  usdcAddress: string;
}

export class EVMTransferService {
  /**
   * Get chain configuration based on network target
   */
  private getChainConfig(networkTarget: 'ETH' | 'AVAX'): ChainConfig {
    const chainId = NETWORK_TARGET_TO_CHAIN_ID[networkTarget];
    const isEthereum = chainId === CHAIN_IDS.ETHEREUM;

    const privateKey = isEthereum
      ? process.env.BRIDGE_ETH_PRIVATE_KEY
      : process.env.BRIDGE_AVAX_PRIVATE_KEY;

    if (!privateKey) {
      throw new Error(
        `Missing private key for ${networkTarget}. Set BRIDGE_${networkTarget}_PRIVATE_KEY in environment.`
      );
    }

    const rpcUrl = isEthereum
      ? process.env.QUICKNODE_ETH_RPC_URL
      : process.env.QUICKNODE_AVAX_RPC_URL;

    const usdcAddress = EVM_USDC_ADDRESSES[chainId];
    if (!usdcAddress) {
      throw new Error(`USDC address not configured for chain ${chainId}`);
    }

    return {
      chainId,
      chain: isEthereum ? mainnet : avalanche,
      privateKey,
      rpcUrl,
      usdcAddress,
    };
  }

  /**
   * Create wallet and public clients for the specified network
   */
  private createClients(config: ChainConfig) {
    const account = privateKeyToAccount(config.privateKey as `0x${string}`);

    const transport = config.rpcUrl ? http(config.rpcUrl) : http();

    const walletClient = createWalletClient({
      account,
      chain: config.chain,
      transport,
    });

    const publicClient = createPublicClient({
      chain: config.chain,
      transport,
    });

    return { walletClient, publicClient, account };
  }

  /**
   * Check hot wallet USDC balance
   */
  async checkBalance(
    networkTarget: 'ETH' | 'AVAX'
  ): Promise<{ balance: bigint; formatted: string }> {
    const config = this.getChainConfig(networkTarget);
    const { publicClient, account } = this.createClients(config);

    const balance = await publicClient.readContract({
      address: config.usdcAddress as `0x${string}`,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [account.address],
    });

    // USDC has 6 decimals
    const formatted = (Number(balance) / 1_000_000).toFixed(2);

    return { balance, formatted };
  }

  /**
   * Send USDC to target wallet
   */
  async sendUSDC(params: EVMTransferParams): Promise<EVMTransferResult> {
    const { targetWallet, networkTarget, amountUsdc } = params;

    console.log(
      `[EVMTransferService] Initiating transfer: ${amountUsdc} USDC to ${targetWallet} on ${networkTarget}`
    );

    try {
      const config = this.getChainConfig(networkTarget);
      const { walletClient, publicClient, account } = this.createClients(config);

      // Convert amount to wei (6 decimals for USDC)
      const amountWei = parseUnits(amountUsdc.toString(), 6);

      // Check balance before transfer
      const { balance, formatted } = await this.checkBalance(networkTarget);
      if (balance < amountWei) {
        return {
          success: false,
          error: `Insufficient USDC balance. Have: ${formatted}, need: ${amountUsdc}`,
        };
      }

      console.log(`[EVMTransferService] Hot wallet balance: ${formatted} USDC`);

      // Estimate gas
      const gasEstimate = await publicClient.estimateContractGas({
        address: config.usdcAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: 'transfer',
        args: [targetWallet as `0x${string}`, amountWei],
        account: account.address,
      });

      // Add 20% margin to gas estimate
      const gasLimit = (gasEstimate * BigInt(120)) / BigInt(100);

      console.log(`[EVMTransferService] Gas estimate: ${gasEstimate}, using limit: ${gasLimit}`);

      // Send the transfer transaction
      const hash = await walletClient.writeContract({
        address: config.usdcAddress as `0x${string}`,
        abi: erc20Abi,
        functionName: 'transfer',
        args: [targetWallet as `0x${string}`, amountWei],
        gas: gasLimit,
        chain: config.chain,
      });

      console.log(`[EVMTransferService] Transaction sent: ${hash}`);

      // Wait for confirmation
      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        confirmations: 1,
        timeout: 60_000, // 1 minute timeout
      });

      const success = receipt.status === 'success';

      console.log(`[EVMTransferService] Transaction ${success ? 'confirmed' : 'failed'}: ${hash}`);

      return {
        success,
        txHash: hash,
        gasUsed: receipt.gasUsed,
        blockNumber: Number(receipt.blockNumber),
        error: success ? undefined : 'Transaction reverted',
      };
    } catch (error) {
      console.error('[EVMTransferService] Transfer error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown transfer error',
      };
    }
  }

  /**
   * Get hot wallet address for a network
   */
  getHotWalletAddress(networkTarget: 'ETH' | 'AVAX'): string {
    const config = this.getChainConfig(networkTarget);
    const account = privateKeyToAccount(config.privateKey as `0x${string}`);
    return account.address;
  }
}
