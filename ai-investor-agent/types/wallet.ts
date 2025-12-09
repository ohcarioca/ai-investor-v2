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

declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      request: (request: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, handler: (...args: any[]) => void) => void;
      removeListener: (event: string, handler: (...args: any[]) => void) => void;
    };
  }
}
