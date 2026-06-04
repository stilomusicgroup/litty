import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity } from 'lucide-react';
import { orbitronFont } from '@/theme';
import { useCountUp } from '@/hooks/use-count-up';
import {
  subscribeManyArtists,
  getManyArtists,
  type ArtistsResponse,
} from '@/lib/collections/artists';
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
  subscribeManyUsers,
  getManyUsers,
  type UsersResponse,
} from '@/lib/collections/users';

const SOL_DECIMALS = 1_000_000_000;
const NEON_GREEN = '#00FF41';
const CARD_BG = '#141414';
const BORDER_COLOR = 'rgba(255,255,255,0.06)';

function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

function formatSol(lamports: number): string {
  return (lamports / SOL_DECIMALS).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/* ─── Stat Card ─────────────────────────────────────────────────────── */
const StatCard: React.FC<{
  numericValue: number;
  formatter: (n: number) => string;
  label: string;
  loading: boolean;
  delay?: number;
}> = ({ numericValue, formatter, label, loading, delay = 0 }) => {
  const animated = useCountUp(numericValue, {
    duration: 1800,
    delay,
    enabled: !loading,
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="flex-1 min-w-[200px]"
    >
      <div
        className="rounded-2xl p-6 sm:p-8 text-center"
        style={{
          background: CARD_BG,
          border: `1px solid ${BORDER_COLOR}`,
        }}
      >
        <div
          style={{
            fontFamily: orbitronFont,
            fontSize: 'clamp(1.6rem, 4.5vw, 2.6rem)',
            fontWeight: 700,
            color: NEON_GREEN,
            lineHeight: 1.1,
            letterSpacing: '-0.01em',
            textShadow: '0 0 16px rgba(0, 255, 65, 0.25)',
          }}
        >
          {loading ? '—' : formatter(animated)}
        </div>
        <div
          className="mt-2"
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.75rem',
            fontWeight: 500,
            color: '#a1a1aa',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          {label}
        </div>
      </div>
    </motion.div>
  );
};

/* ─── Platform Health Section ───────────────────────────────────────── */
const PlatformHealthSection: React.FC = () => {
  const [artists, setArtists] = useState<ArtistsResponse[]>([]);
  const [songsPayouts, setSongsPayouts] = useState<SongsPayoutsResponse[]>([]);
  const [packPayouts, setPackPayouts] = useState<PackPurchasesPayoutsResponse[]>([]);
  const [users, setUsers] = useState<UsersResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function init() {
      // Artists
      try {
        const a = await getManyArtists();
        if (mounted) setArtists(a ?? []);
      } catch (e) {
        console.warn('getManyArtists failed:', e);
      }

      // Songs payouts
      try {
        const sp = await getAllSongsPayouts('', '');
        if (mounted) setSongsPayouts(sp ?? []);
      } catch (e) {
        console.warn('getAllSongsPayouts failed:', e);
      }

      // Pack purchase payouts
      try {
        const pp = await getAllPackPurchasesPayouts('', '');
        if (mounted) setPackPayouts(pp ?? []);
      } catch (e) {
        console.warn('getAllPackPurchasesPayouts failed:', e);
      }

      // Users (proxy for active token holders)
      try {
        const u = await getManyUsers();
        if (mounted) setUsers(u ?? []);
      } catch (e) {
        console.warn('getManyUsers failed:', e);
      }

      if (!mounted) return;
      setLoading(false);

      // Subscriptions
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

      try {
        const unsubUsers = await subscribeManyUsers((data) => {
          if (mounted) setUsers(data ?? []);
        });
        unsubs.push(unsubUsers);
      } catch (e) {
        console.warn('subscribeManyUsers failed:', e);
      }

      return () => {
        mounted = false;
        unsubs.forEach((fn) => fn().catch(() => {}));
      };
    }

    init();
    return () => { mounted = false; };
  }, []);

  const creatorCount = artists.length;

  const totalRoyaltiesLamports =
    songsPayouts.reduce((sum, p) => sum + (p.solAmt ?? 0), 0) +
    packPayouts.reduce((sum, p) => sum + (p.solAmt ?? 0), 0);

  const activeHoldersCount = users.length;

  return (
    <div className="mx-4 sm:mx-6 md:mx-8 py-6">
      {/* Section Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="flex items-center gap-3 mb-5"
      >
        <h2
          style={{
            fontFamily: "'Archivo Black', sans-serif",
            fontSize: '1rem',
            fontWeight: 900,
            color: '#ffffff',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          Platform Health
        </h2>
        {/* Live pulse indicator */}
        <span
          className="relative flex h-2.5 w-2.5"
          title="Live data"
        >
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
            style={{ backgroundColor: NEON_GREEN }}
          />
          <span
            className="relative inline-flex rounded-full h-2.5 w-2.5"
            style={{ backgroundColor: NEON_GREEN }}
          />
        </span>
        <Activity size={14} color={NEON_GREEN} className="ml-0.5" />
      </motion.div>

      {/* Stats Grid */}
      <div className="flex flex-col sm:flex-row gap-4">
        <StatCard
          numericValue={creatorCount}
          formatter={(n) => formatNumber(Math.round(n))}
          label="Total Creators Onboarded"
          loading={loading}
          delay={0.05}
        />
        <StatCard
          numericValue={totalRoyaltiesLamports}
          formatter={(n) => `${formatSol(n)} SOL`}
          label="Total Royalties Distributed"
          loading={loading}
          delay={0.15}
        />
        <StatCard
          numericValue={activeHoldersCount}
          formatter={(n) => formatNumber(Math.round(n))}
          label="Active Token Holders"
          loading={loading}
          delay={0.25}
        />
      </div>
    </div>
  );
};

export default PlatformHealthSection;
