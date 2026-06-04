import { useOAuth } from '@/hooks/useOAuth';
import { useAuth } from '@/hooks/use-privy-auth';
import { Mail, X, Wallet, Check, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

const PROVIDERS = [
  {
    id: 'google' as const,
    name: 'Google',
    icon: Mail,
    color: '#EA4335',
    bgColor: 'rgba(234, 67, 53, 0.1)',
  },
  {
    id: 'twitter' as const,
    name: 'X (Twitter)',
    icon: X,
    color: '#1DA1F2',
    bgColor: 'rgba(29, 161, 242, 0.1)',
  },
];

export function SocialLogin() {
  const { connect, disconnect, isVerified, loading, getLink } = useOAuth();
  const { user, login, loading: authLoading } = useAuth();
  const [connecting, setConnecting] = useState<string | null>(null);

  const handleConnect = async (provider: 'google' | 'twitter') => {
    if (!user?.address) {
      toast.error('Please connect your wallet first');
      return;
    }
    setConnecting(provider);
    try {
      await connect(provider);
    } finally {
      setConnecting(null);
    }
  };

  const handleDisconnect = async (provider: 'google' | 'twitter') => {
    setConnecting(provider);
    try {
      await disconnect(provider);
    } finally {
      setConnecting(null);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        width: '100%',
        maxWidth: '400px',
      }}
    >
      <h3
        style={{
          margin: 0,
          fontSize: '16px',
          fontWeight: 600,
          color: '#ffffff',
          fontFamily: 'var(--font-heading, sans-serif)',
        }}
      >
        Connect Accounts
      </h3>

      {/* Phantom / Wallet */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px',
          borderRadius: '12px',
          background: user?.address
            ? 'rgba(0, 255, 102, 0.08)'
            : 'rgba(255, 255, 255, 0.04)',
          border: `1px solid ${user?.address ? 'rgba(0, 255, 102, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(153, 69, 255, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Wallet size={18} color="#9945FF" />
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff' }}>
              Phantom Wallet
            </div>
            <div style={{ fontSize: '12px', color: '#a1a1aa' }}>
              {authLoading
                ? 'Checking...'
                : user?.address
                  ? `${user.address.slice(0, 6)}...${user.address.slice(-4)}`
                  : 'Not connected'}
            </div>
          </div>
        </div>
        {authLoading ? (
          <Loader2 size={18} className="animate-spin" color="#a1a1aa" />
        ) : user?.address ? (
          <Check size={20} color="#00FF66" />
        ) : (
          <button
            onClick={login}
            style={{
              padding: '6px 16px',
              borderRadius: '8px',
              border: '1px solid #00FF66',
              background: 'transparent',
              color: '#00FF66',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Connect
          </button>
        )}
      </div>

      {/* Google and X (Twitter) */}
      {PROVIDERS.map(({ id, name, icon: Icon, color, bgColor }) => {
        const connected = isVerified(id);
        const link = getLink(id);
        const isBusy = connecting === id;

        return (
          <div
            key={id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px',
              borderRadius: '12px',
              background: connected ? bgColor : 'rgba(255, 255, 255, 0.04)',
              border: `1px solid ${connected ? `${color}40` : 'rgba(255, 255, 255, 0.1)'}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: `${color}20`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon size={18} color={color} />
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff' }}>
                  {name}
                </div>
                <div style={{ fontSize: '12px', color: '#a1a1aa' }}>
                  {connected
                    ? link?.profile?.username || `@${id}`
                    : 'Not connected'}
                </div>
              </div>
            </div>
            {loading || isBusy ? (
              <Loader2 size={20} className="animate-spin" color={color} />
            ) : connected ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Check size={18} color="#00FF66" />
                <button
                  onClick={() => handleDisconnect(id)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    background: 'transparent',
                    color: '#a1a1aa',
                    fontSize: '11px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleConnect(id)}
                disabled={!user?.address}
                style={{
                  padding: '6px 16px',
                  borderRadius: '8px',
                  border: `1px solid ${color}`,
                  background: `${color}15`,
                  color,
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: user?.address ? 'pointer' : 'not-allowed',
                  opacity: user?.address ? 1 : 0.5,
                  fontFamily: 'inherit',
                }}
              >
                Connect
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
