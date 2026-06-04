import React from 'react';
import { useAuth } from '@/hooks/use-privy-auth';
import { motion } from 'framer-motion';
import { Wallet } from 'lucide-react';

const NEON_GREEN = '#00FF66';

interface AuthGateProps {
  children: React.ReactNode;
}

const AuthGate: React.FC<AuthGateProps> = ({ children }) => {
  const { login, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'transparent' }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
          style={{
            width: 40,
            height: 40,
            border: `3px solid ${NEON_GREEN}20`,
            borderTopColor: NEON_GREEN,
            borderRadius: '50%',
          }}
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-6 pb-24"
        style={{ background: 'transparent' }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          className="text-center max-w-xs"
        >
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6"
            style={{
              background: `linear-gradient(135deg, ${NEON_GREEN}20, transparent)`,
              border: `1px solid ${NEON_GREEN}40`,
              boxShadow: `0 0 40px ${NEON_GREEN}20`,
            }}
          >
            <Wallet size={32} style={{ color: NEON_GREEN }} />
          </div>
          <h1
            className="text-2xl font-black mb-2"
            style={{
              fontFamily: "'Archivo Black', sans-serif",
              background: `linear-gradient(90deg, ${NEON_GREEN}, #00e013)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Sign In
          </h1>
          <p
            className="text-sm mb-6"
            style={{ color: 'rgba(255,255,255,0.5)', fontFamily: "'Inter', sans-serif" }}
          >
            Sign in with Google, X, Email, or Phantom — an embedded wallet will be created automatically
          </p>
          <motion.button
            onClick={login}
            whileHover={{ scale: 1.05, boxShadow: `0 0 24px ${NEON_GREEN}40` }}
            whileTap={{ scale: 0.96 }}
            className="px-8 py-3 rounded-2xl font-bold text-sm"
            style={{
              background: `linear-gradient(135deg, ${NEON_GREEN}, #00e013)`,
              color: '#000',
              fontFamily: "'Archivo Black', monospace",
              letterSpacing: '0.06em',
            }}
          >
            Sign In
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AuthGate;
