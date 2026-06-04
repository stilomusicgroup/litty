import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { getUsernames } from '@/lib/collections/usernames';
import ProfilePage from '@/components/ProfilePage';

const NEON_GREEN = '#00FF41';

const UsernameResolver: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const [userAddress, setUserAddress] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    if (!username) {
      setUserAddress(null);
      return;
    }
    getUsernames(username).then((result) => {
      if (cancelled) return;
      setUserAddress(result?.userAddress ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [username]);

  if (userAddress === undefined) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Loader2 size={28} className="animate-spin" style={{ color: NEON_GREEN }} />
        <p className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.5)', fontFamily: "'Archivo Black', monospace" }}>
          Resolving...
        </p>
      </div>
    );
  }

  if (userAddress === null) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
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
            <span className="text-3xl" style={{ color: NEON_GREEN }}>?</span>
          </div>
          <h1
            className="text-2xl font-black mb-2"
            style={{ fontFamily: "'Archivo Black', monospace", color: '#fff' }}
          >
            Profile not found
          </h1>
          <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.5)' }}>
            No user found for @{username}
          </p>
          <motion.button
            onClick={() => navigate(-1)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.96 }}
            className="px-6 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 mx-auto"
            style={{
              background: `linear-gradient(135deg, ${NEON_GREEN}, #00e013)`,
              color: '#000',
              fontFamily: "'Archivo Black', monospace",
            }}
          >
            <ArrowLeft size={14} />
            Go Back
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return <ProfilePage resolvedAddress={userAddress} />;
};

export default UsernameResolver;
