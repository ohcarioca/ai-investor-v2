import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { avalanche } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'Kira AI Investor',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '',
  chains: [avalanche],
  ssr: true,
});
