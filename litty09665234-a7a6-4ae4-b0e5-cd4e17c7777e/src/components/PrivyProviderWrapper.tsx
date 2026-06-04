import { PrivyProvider } from '@privy-io/react-auth';
import { toSolanaWalletConnectors } from '@privy-io/react-auth/solana';
import { PRIVY_APP_ID } from '@/lib/constants';
import { installRpcNoiseSuppressor } from '@/utils/suppress-rpc-noise';

// Install console filter early — before Privy/Solana SDKs initialize
installRpcNoiseSuppressor();

const appId = import.meta.env.VITE_PRIVY_APP_ID || PRIVY_APP_ID || 'cmnmkfvmp00y60cl5vctkkmsz';

// Safely initialize Solana connectors — some wallet adapters return non-standard
// JSON-RPC responses that trigger Zod parsing errors. If initialization fails,
// the externalWallets.solana section is omitted entirely (email login still works).
let solanaConnectors: ReturnType<typeof toSolanaWalletConnectors> | null = null;
try {
  solanaConnectors = toSolanaWalletConnectors({
    shouldAutoConnect: false,
  });
} catch (err) {
  console.warn('[PrivyProviderWrapper] toSolanaWalletConnectors failed, disabling external Solana wallets:', err);
}

export function PrivyProviderWrapper({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={appId}
      config={{
        appearance: {
          theme: 'dark',
          accentColor: '#00FF41',
          showWalletLoginFirst: true,
          walletList: ['phantom', 'detected_wallets'],
          walletChainType: 'solana-only',
          // TODO: Add logo URL here when available
          // logo: '/path/to/logo.png',
        },
        loginMethods: ['wallet', 'google', 'twitter'],
        embeddedWallets: {
          solana: {
            createOnLogin: 'users-without-wallets',
          },
        },
        externalWallets: solanaConnectors
          ? { solana: { connectors: solanaConnectors } }
          : undefined,
      }}
    >
      {children}
    </PrivyProvider>
  );
}

export default PrivyProviderWrapper;
