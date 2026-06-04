import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-privy-auth';
import { getIdToken } from '@pooflabs/web';
import { motion } from 'framer-motion';
import { ArrowLeft, UserPlus, Image as ImageIcon, Check, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { setArtists, getArtists } from '@/lib/collections/artists';
import { Address, Time } from '@/lib/db-client';
import { BlurFade } from '@/components/effects';
import { createAuthenticatedApiClient } from '@/lib/api-client';

const NEON_GREEN = '#00FF41';
const CYAN = '#00D4FF';
const NEON_PURPLE = '#8B5CF6';
const NEON_MAGENTA = '#EC4899';

const ArtistSetupPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [profileImage, setProfileImage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [alreadyExists, setAlreadyExists] = useState(false);

  const walletAddress = user?.address ?? null;

  // Redirect if not authenticated
  React.useEffect(() => {
    if (!authLoading && !user) {
      toast.error('Connect your wallet to create an artist profile');
      navigate('/');
    }
  }, [authLoading, user, navigate]);

  // Check if profile already exists
  React.useEffect(() => {
    const checkExisting = async () => {
      if (!walletAddress) return;
      const existing = await getArtists(walletAddress);
      if (existing) {
        setAlreadyExists(true);
      }
    };
    checkExisting();
  }, [walletAddress]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletAddress) {
      toast.error('Please connect your wallet');
      return;
    }
    if (!name.trim()) {
      toast.error('Artist name is required');
      return;
    }

    setSubmitting(true);
    try {
      const success = await setArtists(walletAddress, {
        name: name.trim(),
        bio: bio.trim() || undefined,
        profileImage: profileImage.trim() || undefined,
        walletAddress: Address.publicKey(walletAddress),
        isVerified: false,
      });

      if (success) {
        toast.success('Artist profile created!');
        // Fire-and-forget: provision a Privy embedded wallet for this artist
        (async () => {
          try {
            const token = await getIdToken();
            if (token && walletAddress) {
              const authApi = createAuthenticatedApiClient(token, walletAddress);
              await authApi.post('/api/artists/ensure-wallet', {});
            }
          } catch (err) {
            console.error('[ArtistSetup] Failed to provision creator wallet:', err);
          }
        })();
        navigate('/profile');
      } else {
        toast.error('Failed to create profile. Try again.');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'transparent' }}
      >
        <Loader2 className="animate-spin" size={32} style={{ color: NEON_GREEN }} />
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect via useEffect
  }

  if (alreadyExists) {
    return (
      <div
        className="min-h-screen pb-24"
        style={{ background: 'transparent' }}
      >
        <div className="relative z-10 px-4 pt-16">
          <BlurFade>
            <motion.button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 mb-6 text-sm transition-colors"
              style={{ color: 'rgba(196,181,253,0.5)' }}
              whileHover={{ color: '#c4b5fd' }}
            >
              <ArrowLeft size={15} />
              <span>Back</span>
            </motion.button>
          </BlurFade>

          <BlurFade delay={0.1}>
            <div
              className="rounded-2xl p-8 text-center"
              style={{
                background: 'linear-gradient(145deg, rgba(30,20,60,0.85), rgba(15,10,30,0.9))',
                border: '1px solid rgba(0, 255, 65, 0.2)',
                boxShadow: '0 0 40px rgba(0, 255, 65, 0.08)',
              }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.2 }}
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{
                  background: 'rgba(0, 255, 65, 0.12)',
                  border: '2px solid rgba(0, 255, 65, 0.3)',
                }}
              >
                <Check size={28} style={{ color: NEON_GREEN }} />
              </motion.div>

              <h2
                className="text-xl font-bold mb-2"
                style={{
                  fontFamily: "'Archivo Black', monospace",
                  background: `linear-gradient(90deg, ${NEON_GREEN}, ${CYAN})`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                You Already Have an Artist Profile!
              </h2>
              <p className="text-sm mb-6" style={{ color: 'rgba(220,214,240,0.5)' }}>
                Head over to your dashboard to manage your music.
              </p>

              <motion.button
                onClick={() => navigate('/profile')}
                className="px-6 py-3 rounded-xl font-bold text-sm inline-flex items-center gap-2"
                style={{
                  background: `linear-gradient(135deg, ${NEON_GREEN}, #00e013)`,
                  color: '#000',
                  boxShadow: `0 0 20px rgba(0, 255, 65, 0.35), 0 0 40px rgba(0, 255, 65, 0.1)`,
                  fontFamily: "'Archivo Black', monospace",
                  letterSpacing: '0.04em',
                }}
                whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(0, 255, 65, 0.55), 0 0 60px rgba(0, 255, 65, 0.2)' }}
                whileTap={{ scale: 0.95 }}
              >
                <Sparkles size={16} />
                Go to Dashboard
              </motion.button>
            </div>
          </BlurFade>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen pb-24"
      style={{ background: 'linear-gradient(180deg, #06030f 0%, #08051a 40%, #060318 100%)' }}
    >
      {/* Background grid */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 0,
          backgroundImage: `
            linear-gradient(rgba(0, 255, 65, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 255, 65, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative z-10 px-4 pt-16 max-w-xl mx-auto">
        {/* Back + Header */}
        <BlurFade>
          <motion.button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 mb-4 text-sm transition-colors"
            style={{ color: 'rgba(196,181,253,0.5)' }}
            whileHover={{ color: '#c4b5fd' }}
          >
            <ArrowLeft size={15} />
            <span>Back</span>
          </motion.button>
        </BlurFade>

        <BlurFade delay={0.05}>
          <div className="mb-8">
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1
                className="text-2xl font-black uppercase tracking-wider mb-1"
                style={{
                  fontFamily: "'Archivo Black', monospace",
                  background: `linear-gradient(90deg, ${NEON_GREEN}, ${CYAN})`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  letterSpacing: '0.1em',
                }}
              >
                Artist Setup
              </h1>
              <p className="text-sm" style={{ color: 'rgba(220,214,240,0.45)' }}>
                Create your artist profile to start releasing music on Lit Studios.
              </p>
            </motion.div>
          </div>
        </BlurFade>

        {/* Form Card */}
        <BlurFade delay={0.1}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="rounded-2xl overflow-hidden"
            style={{
              background: 'linear-gradient(145deg, rgba(30,20,60,0.85), rgba(15,10,30,0.9))',
              border: '1px solid rgba(139,92,246,0.18)',
              boxShadow: `0 0 60px rgba(139,92,246,0.08), 0 0 120px rgba(0, 255, 65, 0.04)`,
            }}
          >
            {/* Card header */}
            <div
              className="px-5 py-4 flex items-center gap-3"
              style={{ borderBottom: '1px solid rgba(139,92,246,0.1)' }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background: 'rgba(0, 255, 65, 0.1)',
                  border: '1px solid rgba(0, 255, 65, 0.25)',
                }}
              >
                <UserPlus size={18} style={{ color: NEON_GREEN }} />
              </div>
              <div>
                <h2 className="text-sm font-bold" style={{ color: '#fff' }}>
                  Create Profile
                </h2>
                <p className="text-[11px]" style={{ color: 'rgba(220,214,240,0.4)' }}>
                  Tell us about yourself
                </p>
              </div>
            </div>

            {/* Form body */}
            <form onSubmit={handleSubmit} className="p-5 space-y-5">
              {/* Artist Name */}
              <div>
                <label
                  className="block text-xs font-semibold uppercase tracking-wider mb-2"
                  style={{ color: 'rgba(220,214,240,0.6)' }}
                >
                  Artist Name <span style={{ color: NEON_MAGENTA }}>*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Neon Dreams"
                  required
                  maxLength={80}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                  style={{
                    background: 'rgba(0,0,0,0.35)',
                    border: name.trim() ? '1px solid rgba(0, 255, 65, 0.3)' : '1px solid rgba(139,92,246,0.2)',
                    color: '#fff',
                    boxShadow: name.trim() ? '0 0 12px rgba(0, 255, 65, 0.08)' : 'none',
                    fontFamily: "'Inter', sans-serif",
                  }}
                  onFocus={e => {
                    e.currentTarget.style.borderColor = 'rgba(0, 255, 65, 0.4)';
                    e.currentTarget.style.boxShadow = '0 0 16px rgba(0, 255, 65, 0.1)';
                  }}
                  onBlur={e => {
                    e.currentTarget.style.borderColor = name.trim() ? 'rgba(0, 255, 65, 0.3)' : 'rgba(139,92,246,0.2)';
                    e.currentTarget.style.boxShadow = name.trim() ? '0 0 12px rgba(0, 255, 65, 0.08)' : 'none';
                  }}
                />
              </div>

              {/* Bio */}
              <div>
                <label
                  className="block text-xs font-semibold uppercase tracking-wider mb-2"
                  style={{ color: 'rgba(220,214,240,0.6)' }}
                >
                  Bio <span style={{ color: 'rgba(220,214,240,0.3)' }}>(optional)</span>
                </label>
                <textarea
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="Tell your story..."
                  rows={4}
                  maxLength={500}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none transition-all"
                  style={{
                    background: 'rgba(0,0,0,0.35)',
                    border: '1px solid rgba(139,92,246,0.2)',
                    color: '#fff',
                    fontFamily: "'Inter', sans-serif",
                  }}
                  onFocus={e => {
                    e.currentTarget.style.borderColor = 'rgba(0,212,255,0.4)';
                    e.currentTarget.style.boxShadow = '0 0 16px rgba(0,212,255,0.1)';
                  }}
                  onBlur={e => {
                    e.currentTarget.style.borderColor = 'rgba(139,92,246,0.2)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
                <div className="text-right mt-1" style={{ color: 'rgba(220,214,240,0.25)', fontSize: '10px' }}>
                  {bio.length}/500
                </div>
              </div>

              {/* Profile Image URL */}
              <div>
                <label
                  className="block text-xs font-semibold uppercase tracking-wider mb-2"
                  style={{ color: 'rgba(220,214,240,0.6)' }}
                >
                  Profile Image URL <span style={{ color: 'rgba(220,214,240,0.3)' }}>(optional)</span>
                </label>
                <div className="relative">
                  <ImageIcon
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: 'rgba(220,214,240,0.25)' }}
                  />
                  <input
                    type="url"
                    value={profileImage}
                    onChange={e => setProfileImage(e.target.value)}
                    placeholder="https://example.com/avatar.jpg"
                    className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-all"
                    style={{
                      background: 'rgba(0,0,0,0.35)',
                      border: '1px solid rgba(139,92,246,0.2)',
                      color: '#fff',
                      fontFamily: "'Inter', sans-serif",
                    }}
                    onFocus={e => {
                      e.currentTarget.style.borderColor = 'rgba(0,212,255,0.4)';
                      e.currentTarget.style.boxShadow = '0 0 16px rgba(0,212,255,0.1)';
                    }}
                    onBlur={e => {
                      e.currentTarget.style.borderColor = 'rgba(139,92,246,0.2)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                </div>

                {/* Image preview */}
                {profileImage.trim() && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-3 flex items-center gap-3"
                  >
                    <div
                      className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0"
                      style={{ border: '1px solid rgba(139,92,246,0.3)' }}
                    >
                      <img
                        src={profileImage.trim()}
                        alt="Preview"
                        className="w-full h-full object-cover block"
                        onError={e => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                    <span className="text-xs" style={{ color: 'rgba(220,214,240,0.4)' }}>
                      Image preview
                    </span>
                  </motion.div>
                )}
              </div>

              {/* Wallet display */}
              <div
                className="flex items-center justify-between rounded-xl px-4 py-3"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <span className="text-xs" style={{ color: 'rgba(220,214,240,0.4)' }}>
                  Wallet
                </span>
                <span
                  className="text-xs font-mono"
                  style={{ color: 'rgba(220,214,240,0.3)' }}
                >
                  {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
                </span>
              </div>

              {/* Submit */}
              <motion.button
                type="submit"
                disabled={submitting || !name.trim()}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all"
                style={{
                  background: submitting || !name.trim()
                    ? 'rgba(139,92,246,0.1)'
                    : `linear-gradient(135deg, ${NEON_GREEN}, #00e013)`,
                  color: submitting || !name.trim()
                    ? 'rgba(220,214,240,0.25)'
                    : '#000',
                  border: `1px solid ${submitting || !name.trim() ? 'rgba(139,92,246,0.15)' : 'rgba(0, 255, 65, 0.5)'}`,
                  boxShadow: submitting || !name.trim()
                    ? 'none'
                    : `0 0 20px rgba(0, 255, 65, 0.2), 0 0 40px rgba(0, 255, 65, 0.05)`,
                  fontFamily: "'Archivo Black', monospace",
                  letterSpacing: '0.06em',
                  cursor: submitting || !name.trim() ? 'not-allowed' : 'pointer',
                }}
                whileHover={!submitting && name.trim() ? {
                  boxShadow: '0 0 30px rgba(0, 255, 65, 0.4), 0 0 60px rgba(0, 255, 65, 0.15)',
                  scale: 1.02,
                } : {}}
                whileTap={!submitting && name.trim() ? { scale: 0.98 } : {}}
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <UserPlus size={16} />
                    CREATE ARTIST PROFILE
                  </>
                )}
              </motion.button>
            </form>
          </motion.div>
        </BlurFade>

        {/* Info text */}
        <BlurFade delay={0.2}>
          <p
            className="text-center text-[11px] mt-6 mb-8"
            style={{ color: 'rgba(220,214,240,0.25)' }}
          >
            Your profile will be linked to your wallet address.
            <br />
            You can edit it anytime from your dashboard.
          </p>
        </BlurFade>
      </div>
    </div>
  );
};

export default ArtistSetupPage;
