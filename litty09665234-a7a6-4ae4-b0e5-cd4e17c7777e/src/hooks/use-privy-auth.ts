/**
 * Privy -> Poof auth bridge hook.
 *
 * Bridges Privy authentication to Poof's useAuth() interface.
 * Returns { login, logout, user, loading } where `user.address` is the
 * Privy embedded Solana wallet address. This address flows through to
 * Poof policy rules (@user.address) and API headers (X-Wallet-Address).
 *
 * Usage:
 *   // Instead of: import { useAuth } from '@pooflabs/web';
 *   import { useAuth } from '@/hooks/use-privy-auth';
 *
 *   const { login, logout, user, loading } = useAuth();
 *   if (user) { console.log(user.address); } // Privy embedded wallet address
 */

import type { ConnectedWallet } from '@privy-io/react-auth';
import { usePrivy, useLogin, useLogout, useWallets } from '@privy-io/react-auth';
import { useAuth as usePoofAuth } from '@pooflabs/web';
import { useMemo, useState, useEffect } from 'react';

/** Extended wallet type with chainType (missing from current SDK types) */
interface ExtendedWallet extends ConnectedWallet {
  chainType?: string;
}

/** Linked wallet account from Privy's user object */
interface LinkedWalletAccount {
  type: 'wallet';
  address: string;
  chainType?: string;
}

function isSolanaPrivyWallet(w: ConnectedWallet): boolean {
  const extended = w as ExtendedWallet;
  // Accept explicit 'solana' chainType OR wallets with no chainType (e.g. Phantom external wallets)
  return extended.chainType === 'solana' || !extended.chainType;
}

function isSolanaLinkedAccount(acc: unknown): acc is LinkedWalletAccount {
  if (!acc || typeof acc !== 'object') return false;
  const a = acc as Record<string, unknown>;
  return (
    a.type === 'wallet' &&
    typeof a.address === 'string' &&
    (a.chainType === 'solana' || a.chainType === undefined)
  );
}

export function useAuth() {
  const { ready: privyReady, user: privyUser, authenticated } = usePrivy();
  const { login: privyLogin } = useLogin();
  const { logout: privyLogout } = useLogout();
  const { wallets } = useWallets();
  const { user: poofUser, loading: poofLoading, logout: poofLogout } = usePoofAuth();
  const [localLoadingTimeout, setLocalLoadingTimeout] = useState(false);

  // Safety timeout: if Poof auth hangs, unfreeze the UI after 15 seconds
  useEffect(() => {
    if (!poofLoading) {
      setLocalLoadingTimeout(false);
      return;
    }
    const timer = setTimeout(() => setLocalLoadingTimeout(true), 15000);
    return () => clearTimeout(timer);
  }, [poofLoading]);

  // Get the embedded Solana wallet address from Privy
  const embeddedWalletAddress = useMemo(() => {
    if (wallets && wallets.length > 0) {
      const embeddedSolana = wallets.find(isSolanaPrivyWallet);
      if (embeddedSolana?.address) return embeddedSolana.address;
    }

    // Fallback: when wallets array is empty but Privy session is active,
    // resolve address from linkedAccounts (e.g. iframe failed to load).
    if (authenticated && privyUser?.linkedAccounts) {
      const linkedSolana = (privyUser.linkedAccounts as unknown[]).find(isSolanaLinkedAccount);
      if (linkedSolana?.address) return linkedSolana.address;
    }

    return null;
  }, [wallets, authenticated, privyUser]);

  // Construct a user object that matches Poof's interface
  const user = useMemo(() => {
    // Prefer the Privy embedded wallet address
    const address = embeddedWalletAddress ?? poofUser?.address ?? null;

    if (!address) return null;

    // Return a user object that matches Poof's { address } interface.
    // Spread poofUser FIRST so the Privy address always overrides.
    return {
      ...poofUser,
      address,
    };
  }, [embeddedWalletAddress, poofUser]);

  const loading = (poofLoading && !localLoadingTimeout) || !privyReady;

  const login = () => {
    try {
      privyLogin();
    } catch (err) {
      console.error('Privy login failed:', err);
    }
  };

  const logout = () => {
    try {
      privyLogout();
    } catch (err) {
      console.error('Privy logout failed:', err);
    }
    try {
      poofLogout();
    } catch (err) {
      console.error('Poof logout failed:', err);
    }
  };

  return { login, logout, user, loading, isPrivyAuthenticated: authenticated };
}

/**
 * Get the Privy embedded Solana wallet address directly.
 * Useful for components that need the address for API calls or display.
 */
export function usePrivyWalletAddress(): string | null {
  const { wallets } = useWallets();
  const { user: poofUser } = usePoofAuth();
  const { authenticated, user: privyUser } = usePrivy();

  return useMemo(() => {
    if (wallets && wallets.length > 0) {
      const embeddedSolana = wallets.find(isSolanaPrivyWallet);
      if (embeddedSolana?.address) return embeddedSolana.address;
    }

    if (authenticated && privyUser?.linkedAccounts) {
      const linkedSolana = (privyUser.linkedAccounts as unknown[]).find(isSolanaLinkedAccount);
      if (linkedSolana?.address) return linkedSolana.address;
    }

    return poofUser?.address ?? null;
  }, [wallets, authenticated, privyUser, poofUser]);
}
