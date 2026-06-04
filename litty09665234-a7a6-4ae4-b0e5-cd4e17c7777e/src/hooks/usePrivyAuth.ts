import { useLogin, usePrivy, useLogout } from '@privy-io/react-auth';
import { useAuth as usePoofAuth } from '@pooflabs/web';
import { useMemo } from 'react';

export function usePrivyAuth() {
  const { user: poofUser, loading: poofLoading, logout: poofLogout } = usePoofAuth();
  const privy = usePrivy();
  const { login: privyLogin } = useLogin();
  const { logout: privyLogout } = useLogout();

  const isAuthenticated = !!poofUser;
  const ready = privy.ready && !poofLoading;
  const walletAddress = poofUser?.address ?? null;

  // Check for embedded wallet in Privy linked accounts
  const hasEmbeddedWallet = useMemo(() => {
    if (!privy.user) return false;
    return privy.user.linkedAccounts.some(
      (account) =>
        account.type === 'wallet' &&
        (account as any).walletClientType === 'privy'
    );
  }, [privy.user]);

  // Get email from Privy linked accounts
  const email = useMemo(() => {
    if (!privy.user) return null;
    const emailAccount = privy.user.linkedAccounts.find(
      (account) => account.type === 'email'
    );
    return (emailAccount as any)?.address ?? null;
  }, [privy.user]);

  const displayName = email
    ? email.split('@')[0]
    : walletAddress
      ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
      : 'Anonymous';

  const login = () => {
    privyLogin();
  };

  const logout = () => {
    privyLogout();
    poofLogout();
  };

  return {
    user: poofUser,
    privyUser: privy.user,
    isAuthenticated,
    isLoading: poofLoading || !privy.ready,
    ready,
    login,
    logout,
    walletAddress,
    email,
    displayName,
    hasEmbeddedWallet,
    linkedAccounts: privy.user?.linkedAccounts ?? [],
  };
}
