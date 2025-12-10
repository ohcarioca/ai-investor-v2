import { Chain } from 'wagmi/chains';

export interface WalletState {
  address: `0x${string}` | undefined;
  isConnected: boolean;
  isConnecting: boolean;
  chain: Chain | undefined;
}

export type WalletErrorType =
  | 'USER_REJECTED'
  | 'NO_METAMASK'
  | 'WRONG_NETWORK'
  | 'UNKNOWN';

export interface WalletError {
  type: WalletErrorType;
  code?: number;
  message: string;
}

export interface Balance {
  currency: string;
  available: number;
  frozen: number;
  usdValue: number;
}

export interface AccountBalance {
  balances: Balance[];
  totalEquity: number;
  lastUpdated: Date;
}

declare global {
  interface Window {
    ethereum?: any;
  }
}
