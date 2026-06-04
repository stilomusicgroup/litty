import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Upload } from 'lucide-react';
import SectionBanner from '@/components/SectionBanner';
import { orbitronFont } from '@/theme';
import { useCountUp } from '@/hooks/use-count-up';
import {
  subscribeAllSongsPayouts,
  getAllSongsPayouts,
  type SongsPayoutsResponse,
} from '@/lib/collections/songs';
import {
  subscribeAllPackPurchasesPayouts,
  getAllPackPurchasesPayouts,
  type PackPurchasesPayoutsResponse,
} from '@/lib/collections/packPurchases';
import {
  subscribeManyArtists,
  getManyArtists,
  type ArtistsResponse,
} from '@/lib/collections/artists';
import {
  subscribeManyUsers,
  getManyUsers,
  type UsersResponse,
} from '@/lib/collections/users';

const SOL_DECIMALS = 1_000_000_000;
const NEON_GREEN = '#00FF41';
const CARD_BG = '#111111';
const BORDER_COLOR = 'rgba(255,255,255,0.06)';
const INTERACTION_GREEN = '#00FF41';

function formatSol(lamports: number): string {
  const sol = lamports / SOL_DECIMALS;
  return `${sol.toFixed(3)}`;
}

function truncateAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr ?? '';
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}

function AnimatedSolAmount({
  lamports,
  delay = 0,
  enabled,
}: {
  lamports: number;
  delay?: number;
  enabled: boolean;
}) {
  const value = useCountUp(lamports, { duration: 1800, delay, enabled });
  return <>◎{formatSol(value)}</>;
}

interface Earner {
  rank: number;
  walletAddress: string;
  displayName: string;
  hasProfile: boolean;
  profileImage: string | null;
  totalSol: number;
}

/* ─── Atmospheric Background ───────────────────────────────────────── */
function AtmosphericBg() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      {/* Base dark gradient */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse 80% 60% at 50% 10%, rgba(0, 255, 65, 0.06) 0%, transparent 60%)',
        }}
      />
      {/* Central green glow behind trophy area */}
      <div
        style={{
          position: 'absolute',
          top: '-10%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '50%',
          height: '60%',
          background: 'radial-gradient(ellipse 50% 40% at 50% 30%, rgba(0, 255, 65, 0.12) 0%, transparent 70%)',
          filter: 'blur(20px)',
        }}
      />
      {/* Subtle green grid */}
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: 0.035 }}>
        <defs>
          <pattern id="greenGrid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke={INTERACTION_GREEN} strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#greenGrid)" />
      </svg>
      {/* Floating particles */}
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            width: 2 + (i % 3),
            height: 2 + (i % 3),
            borderRadius: '50%',
            background: INTERACTION_GREEN,
            opacity: 0.15 + (i % 3) * 0.05,
            left: `${15 + (i * 13) % 70}%`,
            top: `${10 + (i * 17) % 60}%`,
            filter: 'blur(1px)',
            animation: `floatParticle ${4 + i * 0.8}s ease-in-out infinite alternate`,
            animationDelay: `${i * 0.6}s`,
          }}
        />
      ))}
      {/* Bottom crowd silhouette feel */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '30%',
          background: 'linear-gradient(to top, rgba(0, 255, 65, 0.03) 0%, transparent 100%)',
          maskImage: 'radial-gradient(ellipse 60% 50% at 50% 100%, black 0%, transparent 80%)',
          WebkitMaskImage: 'radial-gradient(ellipse 60% 50% at 50% 100%, black 0%, transparent 80%)',
        }}
      />
    </div>
  );
}

/* ─── Top Earners Leaderboard ─────────────────────────────────────────── */
const TopEarnersLeaderboard: React.FC = () => {
  const navigate = useNavigate();
  const [artists, setArtists] = useState<ArtistsResponse[]>([]);
  const [users, setUsers] = useState<UsersResponse[]>([]);
  const [songsPayouts, setSongsPayouts] = useState<SongsPayoutsResponse[]>([]);
  const [packPayouts, setPackPayouts] = useState<PackPurchasesPayoutsResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function init() {
      // Fetch artists
      try {
        const a = await getManyArtists();
        if (mounted) setArtists(a ?? []);
      } catch (e) {
        console.warn('getManyArtists failed:', e);
      }

      // Fetch users (profiles)
      try {
        const u = await getManyUsers();
        if (mounted) setUsers(u ?? []);
      } catch (e) {
        console.warn('getManyUsers failed:', e);
      }

      // Fetch all song payouts
      try {
        const sp = await getAllSongsPayouts('', '');
        if (mounted) setSongsPayouts(sp ?? []);
      } catch (e) {
        console.warn('getAllSongsPayouts failed:', e);
      }

      // Fetch all pack purchase payouts
      try {
        const pp = await getAllPackPurchasesPayouts('', '');
        if (mounted) setPackPayouts(pp ?? []);
      } catch (e) {
        console.warn('getAllPackPurchasesPayouts failed:', e);
      }

      if (!mounted) return;
      setLoading(false);

      // Real-time subscriptions
      const unsubs: Array<() => Promise<void>> = [];

      try {
        const unsubArtists = await subscribeManyArtists((data) => {
          if (mounted) setArtists(data ?? []);
        });
        unsubs.push(unsubArtists);
      } catch (e) {
        console.warn('subscribeManyArtists failed:', e);
      }

      try {
        const unsubUsers = await subscribeManyUsers((data) => {
          if (mounted) setUsers(data ?? []);
        });
        unsubs.push(unsubUsers);
      } catch (e) {
        console.warn('subscribeManyUsers failed:', e);
      }

      try {
        const unsubSongsPayouts = await subscribeAllSongsPayouts((data) => {
          if (mounted) setSongsPayouts(data ?? []);
        }, '', '');
        unsubs.push(unsubSongsPayouts);
      } catch (e) {
        console.warn('subscribeAllSongsPayouts failed:', e);
      }

      try {
        const unsubPackPayouts = await subscribeAllPackPurchasesPayouts((data) => {
          if (mounted) setPackPayouts(data ?? []);
        }, '', '');
        unsubs.push(unsubPackPayouts);
      } catch (e) {
        console.warn('subscribeAllPackPurchasesPayouts failed:', e);
      }

      return () => {
        mounted = false;
        unsubs.forEach((fn) => fn().catch(() => {}));
      };
    }

    init();
    return () => { mounted = false; };
  }, []);

  const earners: Earner[] = useMemo(() => {
    const userMap = new Map<string, UsersResponse>();
    users.forEach((u) => {
      if (u.walletAddress) userMap.set(u.walletAddress, u);
    });

    const artistMap = new Map<string, ArtistsResponse>();
    artists.forEach((a) => {
      if (a.walletAddress) artistMap.set(a.walletAddress, a);
    });

    const totals = new Map<string, number>();

    songsPayouts.forEach((p) => {
      if (!p.recipient) return;
      totals.set(p.recipient, (totals.get(p.recipient) ?? 0) + (p.solAmt ?? 0));
    });

    packPayouts.forEach((p) => {
      if (!p.recipient) return;
      totals.set(p.recipient, (totals.get(p.recipient) ?? 0) + (p.solAmt ?? 0));
    });

    const sorted = Array.from(totals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return sorted.map(([walletAddress, totalLamports], index) => {
      const user = userMap.get(walletAddress);
      const artist = artistMap.get(walletAddress);

      const displayName = user?.displayName || artist?.name || truncateAddress(walletAddress);
      const hasRealName = !!(user?.displayName || artist?.name);
      const profileImage = user?.profileImage || artist?.profileImage || null;

      return {
        rank: index + 1,
        walletAddress,
        displayName,
        hasProfile: hasRealName,
        profileImage,
        totalSol: totalLamports,
      };
    });
  }, [artists, users, songsPayouts, packPayouts]);

  const hasPayouts = earners.length > 0;

  return (
    <div className="mx-4 sm:mx-6 md:mx-8 py-6">
      {/* Section Banner */}
      <div className="mb-5">
        <SectionBanner
          titleBefore="Top "
          accentWord="Earners"
          subtitle="Highest earning artists this week"
          imageUrl="https://tarobase-app-storage-public-v2-prod.s3.amazonaws.com/tarobase-app-storage-69cfc41e56840f6b0224904e/6a1f1fdf1a25fa0767365b27"
        />
      </div>

      {/* Leaderboard Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.45, delay: 0.05, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="rounded-2xl overflow-hidden relative"
        style={{
          background: CARD_BG,
          border: `1px solid ${BORDER_COLOR}`,
        }}
      >
        <AtmosphericBg />

        {loading ? (
          <div className="relative z-10 py-10 text-center">
            <span
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.875rem',
                color: 'rgba(255,255,255,0.35)',
              }}
            >
              —
            </span>
          </div>
        ) : !hasPayouts ? (
          <div className="relative z-10 py-10 px-6 text-center">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(255,255,255,0.04)', border: `1px dashed ${BORDER_COLOR}` }}
            >
              <Upload size={20} color="rgba(255,255,255,0.25)" />
            </div>
            <h3
              style={{
                fontFamily: "'Archivo Black', sans-serif",
                fontSize: '0.875rem',
                fontWeight: 700,
                color: '#ffffff',
                marginBottom: 6,
              }}
            >
              No royalties distributed yet
            </h3>
            <p
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.75rem',
                color: 'rgba(255,255,255,0.4)',
                lineHeight: 1.5,
                maxWidth: 280,
                margin: '0 auto 16px',
              }}
            >
              Be the first to earn. Upload your track and start collecting royalties.
            </p>
            <button
              onClick={() => navigate('/create')}
              className="rounded-xl transition-all active:scale-95 hover:scale-105"
              style={{
                fontFamily: "'Archivo Black', sans-serif",
                fontSize: '0.7rem',
                fontWeight: 800,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                padding: '10px 24px',
                background: INTERACTION_GREEN,
                color: '#0A0A0F',
                border: 'none',
                borderRadius: '10px',
                boxShadow: '0 0 20px rgba(0, 255, 65, 0.3)',
              }}
            >
              Upload a Song
            </button>
          </div>
        ) : (
          <div className="relative z-10">
            {earners.map((earner, i) => (
              <motion.button
                key={earner.walletAddress}
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: 0.05 + i * 0.06, ease: [0.25, 0.46, 0.45, 0.94] }}
                onClick={() => navigate(`/artist/${earner.walletAddress}`)}
                className="w-full flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 text-left transition-colors"
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderBottom: i < earners.length - 1 ? `1px solid ${BORDER_COLOR}` : 'none',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(0, 255, 65, 0.04)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                }}
              >
                {/* Rank */}
                <div
                  className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
                  style={{
                    background:
                      earner.rank === 1
                        ? 'rgba(255, 215, 0, 0.12)'
                        : earner.rank === 2
                        ? 'rgba(192, 192, 192, 0.12)'
                        : earner.rank === 3
                        ? 'rgba(205, 127, 50, 0.12)'
                        : 'rgba(255,255,255,0.04)',
                    border:
                      earner.rank === 1
                        ? '1px solid rgba(255, 215, 0, 0.3)'
                        : earner.rank === 2
                        ? '1px solid rgba(192, 192, 192, 0.3)'
                        : earner.rank === 3
                        ? '1px solid rgba(205, 127, 50, 0.3)'
                        : `1px solid ${BORDER_COLOR}`,
                  }}
                >
                  <span
                    style={{
                      fontFamily: orbitronFont,
                      fontSize: '0.6rem',
                      fontWeight: 700,
                      color:
                        earner.rank === 1
                          ? '#FFD700'
                          : earner.rank === 2
                          ? '#C0C0C0'
                          : earner.rank === 3
                          ? '#CD7F32'
                          : 'rgba(255,255,255,0.4)',
                    }}
                  >
                    {earner.rank}
                  </span>
                </div>

                {/* Avatar */}
                <div
                  className="flex-shrink-0 w-9 h-9 rounded-full overflow-hidden flex items-center justify-center"
                  style={{
                    background: earner.profileImage ? 'transparent' : 'rgba(255,255,255,0.06)',
                    border: `1px solid ${BORDER_COLOR}`,
                  }}
                >
                  {earner.profileImage ? (
                    <img
                      src={earner.profileImage}
                      alt={earner.displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User size={16} color="rgba(255,255,255,0.35)" />
                  )}
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <span
                    className="block truncate group-hover:underline"
                    style={{
                      fontFamily: "'Archivo Black', sans-serif",
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: '#ffffff',
                      textDecoration: 'none',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.textDecoration = 'underline'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.textDecoration = 'none'; }}
                  >
                    {earner.displayName}
                  </span>
                  {earner.hasProfile && (
                    <span
                      className="block truncate"
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '0.65rem',
                        color: 'rgba(255,255,255,0.3)',
                        marginTop: 1,
                        letterSpacing: '0.01em',
                      }}
                    >
                      {truncateAddress(earner.walletAddress)}
                    </span>
                  )}
                </div>

                {/* SOL Amount */}
                <div className="flex-shrink-0 text-right">
                  <span
                    style={{
                      fontFamily: orbitronFont,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: NEON_GREEN,
                      letterSpacing: '0.02em',
                    }}
                  >
                    <AnimatedSolAmount
                      lamports={earner.totalSol}
                      delay={i * 100}
                      enabled={!loading}
                    />
                  </span>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </motion.div>

      {/* Keyframes for floating particles */}
      <style>{`
        @keyframes floatParticle {
          0% { transform: translateY(0) scale(1); opacity: 0.15; }
          100% { transform: translateY(-12px) scale(1.2); opacity: 0.3; }
        }
      `}</style>
    </div>
  );
};

export default TopEarnersLeaderboard;
