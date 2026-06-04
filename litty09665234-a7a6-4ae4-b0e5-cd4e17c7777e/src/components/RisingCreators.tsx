import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, TrendingUp, Upload, Check, Rocket } from 'lucide-react';
import { orbitronFont } from '@/theme';
import SectionBanner from '@/components/SectionBanner';
import { useCountUp } from '@/hooks/use-count-up';
import {
  subscribeManyArtists,
  getManyArtists,
  type ArtistsResponse,
} from '@/lib/collections/artists';
import {
  subscribeManySongs,
  getManySongs,
  type SongsResponse,
} from '@/lib/collections/songs';
import {
  subscribeAllSongsPayouts,
  getAllSongsPayouts,
  type SongsPayoutsResponse,
} from '@/lib/collections/songs';

const NEON_GREEN = '#00FF41';
const INTERACTION_GREEN = '#00FF41';
const CARD_BG = '#111111';
const BORDER_COLOR = 'rgba(255,255,255,0.06)';
const THIRTY_DAYS_SECONDS = 30 * 24 * 60 * 60;

function timeAgo(seconds: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = now - seconds;
  const days = Math.floor(diff / 86400);
  if (days === 0) {
    const hours = Math.floor(diff / 3600);
    if (hours === 0) return 'Just now';
    return `${hours}h ago`;
  }
  if (days === 1) return '1 day ago';
  return `${days} days ago`;
}

function AnimatedSongCount({
  count,
  delay = 0,
  enabled,
}: {
  count: number;
  delay?: number;
  enabled: boolean;
}) {
  const value = useCountUp(count, { duration: 1200, delay, enabled });
  return <>{Math.round(value)}</>;
}

type BadgeType = 'Trending' | 'New Artist' | 'First Payout';

interface RisingCreator {
  artist: ArtistsResponse;
  badge: BadgeType;
  songCount: number;
}

/* ─── Rising Creators Section ─────────────────────────────────────────── */
const RisingCreators: React.FC = () => {
  const navigate = useNavigate();
  const [artists, setArtists] = useState<ArtistsResponse[]>([]);
  const [songs, setSongs] = useState<SongsResponse[]>([]);
  const [payouts, setPayouts] = useState<SongsPayoutsResponse[]>([]);
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

      // Fetch songs
      try {
        const s = await getManySongs();
        if (mounted) setSongs(s ?? []);
      } catch (e) {
        console.warn('getManySongs failed:', e);
      }

      // Fetch all payouts
      try {
        const p = await getAllSongsPayouts('', '');
        if (mounted) setPayouts(p ?? []);
      } catch (e) {
        console.warn('getAllSongsPayouts failed:', e);
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
        const unsubSongs = await subscribeManySongs((data) => {
          if (mounted) setSongs(data ?? []);
        });
        unsubs.push(unsubSongs);
      } catch (e) {
        console.warn('subscribeManySongs failed:', e);
      }

      try {
        const unsubPayouts = await subscribeAllSongsPayouts((data) => {
          if (mounted) setPayouts(data ?? []);
        }, '', '');
        unsubs.push(unsubPayouts);
      } catch (e) {
        console.warn('subscribeAllSongsPayouts failed:', e);
      }

      return () => {
        mounted = false;
        unsubs.forEach((fn) => fn().catch(() => {}));
      };
    }

    init();
    return () => {
      mounted = false;
    };
  }, []);

  const risingCreators: RisingCreator[] = useMemo(() => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const cutoff = nowSeconds - THIRTY_DAYS_SECONDS;

    const recentArtists = artists.filter(
      (a) => (a.tarobase_created_at ?? 0) > cutoff
    );

    // Map creator wallet -> published songs
    const songsByCreator = new Map<string, SongsResponse[]>();
    songs.forEach((s) => {
      if (!s.creator) return;
      if (s.hidden === true || s.isPrivate === true) return;
      const list = songsByCreator.get(s.creator) ?? [];
      list.push(s);
      songsByCreator.set(s.creator, list);
    });

    // Map recipient wallet -> has payout
    const payoutRecipients = new Set<string>();
    payouts.forEach((p) => {
      if (p.recipient) payoutRecipients.add(p.recipient);
    });

    const results: RisingCreator[] = [];

    recentArtists.forEach((artist) => {
      const artistSongs = songsByCreator.get(artist.walletAddress) ?? [];
      const hasSong = artistSongs.length > 0;
      const hasPayout = payoutRecipients.has(artist.walletAddress);

      if (hasSong || hasPayout) {
        let badge: BadgeType;
        if (hasSong && hasPayout) badge = 'Trending';
        else if (hasSong) badge = 'New Artist';
        else badge = 'First Payout';

        results.push({
          artist,
          badge,
          songCount: artistSongs.length,
        });
      }
    });

    // Sort: Trending first, then by recency
    const badgeOrder = { Trending: 0, 'New Artist': 1, 'First Payout': 2 };
    return results
      .sort((a, b) => {
        if (badgeOrder[a.badge] !== badgeOrder[b.badge]) {
          return badgeOrder[a.badge] - badgeOrder[b.badge];
        }
        return (
          (b.artist.tarobase_created_at ?? 0) -
          (a.artist.tarobase_created_at ?? 0)
        );
      })
      .slice(0, 8);
  }, [artists, songs, payouts]);

  const hasCreators = risingCreators.length > 0;

  const getBadgeStyle = (badge: BadgeType) => {
    switch (badge) {
      case 'Trending':
        return {
          color: NEON_GREEN,
          borderColor: 'rgba(0, 255, 65, 0.4)',
          background: 'rgba(0, 255, 65, 0.08)',
        };
      case 'New Artist':
        return {
          color: INTERACTION_GREEN,
          borderColor: 'rgba(0, 255, 65, 0.35)',
          background: 'rgba(0, 255, 65, 0.06)',
        };
      case 'First Payout':
        return {
          color: NEON_GREEN,
          borderColor: 'rgba(0, 255, 65, 0.3)',
          background: 'rgba(0, 255, 65, 0.05)',
        };
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="mx-4 sm:mx-6 md:mx-8 py-6"
    >
      <div className="mb-5">
        <SectionBanner
          titleBefore="Rising "
          accentWord="Creators"
          subtitle="Artists gaining momentum."
          imageUrl="https://tarobase-app-storage-public-v2-prod.s3.amazonaws.com/tarobase-app-storage-69cfc41e56840f6b0224904e/6a1f0f4f1a25fa0767365b24"
          ctaText="Discover the Next Wave"
          ctaIcon={<Rocket size={14} />}
          ctaPath="/discover?tab=artists"
        />
      </div>

      {/* Card Container */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{
          duration: 0.45,
          delay: 0.05,
          ease: [0.25, 0.46, 0.45, 0.94],
        }}
        className="rounded-2xl overflow-hidden"
        style={{
          background: CARD_BG,
          border: `1px solid ${BORDER_COLOR}`,
        }}
      >
        {loading ? (
          <div className="py-10 text-center">
            <span
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '0.875rem',
                color: 'rgba(255,255,255,0.35)',
              }}
            >
              &mdash;
            </span>
          </div>
        ) : !hasCreators ? (
          <div className="py-10 px-6 text-center">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: `1px dashed ${BORDER_COLOR}`,
              }}
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
              No rising creators yet
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
              No rising creators yet &mdash; be the first! Upload your track and
              start your journey.
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
          <div
            className="flex md:grid md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-x-auto md:overflow-visible p-4"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {risingCreators.map((creator, i) => {
              const badgeStyle = getBadgeStyle(creator.badge);
              return (
                <motion.button
                  key={creator.artist.walletAddress}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.4,
                    delay: 0.05 + i * 0.06,
                    ease: [0.25, 0.46, 0.45, 0.94],
                  }}
                  whileHover={{ y: -4 }}
                  onClick={() =>
                    navigate(`/artist/${creator.artist.walletAddress}`)
                  }
                  className="flex-shrink-0 min-w-[160px] md:min-w-0 rounded-2xl text-left"
                  style={{
                    background: CARD_BG,
                    border: `1px solid ${BORDER_COLOR}`,
                    cursor: 'pointer',
                    padding: 0,
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor =
                      'rgba(0, 255, 65, 0.25)';
                    (e.currentTarget as HTMLElement).style.boxShadow =
                      '0 0 20px rgba(0, 255, 65, 0.08)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor =
                      BORDER_COLOR;
                    (e.currentTarget as HTMLElement).style.boxShadow = 'none';
                  }}
                >
                  <div className="p-4 flex flex-col items-center text-center gap-3">
                    {/* Avatar */}
                    <div
                      className="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center"
                      style={{
                        background: creator.artist.profileImage
                          ? 'transparent'
                          : 'rgba(255,255,255,0.06)',
                        border: `1px solid ${BORDER_COLOR}`,
                      }}
                    >
                      {creator.artist.profileImage ? (
                        <img
                          src={creator.artist.profileImage}
                          alt={creator.artist.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User
                          size={24}
                          color="rgba(255,255,255,0.35)"
                        />
                      )}
                    </div>

                    {/* Name + Verified */}
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="truncate"
                        style={{
                          fontFamily: "'Archivo Black', sans-serif",
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          color: '#ffffff',
                        }}
                      >
                        {creator.artist.name}
                      </span>
                      {creator.artist.isVerified && (
                        <span
                          className="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center"
                          style={{ background: INTERACTION_GREEN }}
                        >
                          <Check
                            size={10}
                            color="#0A0A0F"
                            strokeWidth={3}
                          />
                        </span>
                      )}
                    </div>

                    {/* Badge */}
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5"
                      style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '0.65rem',
                        fontWeight: 600,
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        ...badgeStyle,
                      }}
                    >
                      {creator.badge === 'Trending' && (
                        <TrendingUp size={10} />
                      )}
                      {creator.badge}
                    </span>

                    {/* Song count + time */}
                    <div className="flex items-center gap-2">
                      {creator.songCount > 0 && (
                        <span
                          style={{
                            fontFamily: orbitronFont,
                            fontSize: '0.65rem',
                            fontWeight: 600,
                            color: 'rgba(255,255,255,0.45)',
                          }}
                        >
                          <AnimatedSongCount
                            count={creator.songCount}
                            delay={i * 80}
                            enabled={!loading}
                          />{' '}
                          song
                          {creator.songCount !== 1 ? 's' : ''}
                        </span>
                      )}
                      {creator.songCount > 0 && (
                        <span
                          style={{
                            fontSize: '0.7rem',
                            color: 'rgba(255,255,255,0.2)',
                          }}
                        >
                          &middot;
                        </span>
                      )}
                      <span
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: '0.7rem',
                          color: 'rgba(255,255,255,0.45)',
                        }}
                      >
                        Joined{' '}
                        {timeAgo(creator.artist.tarobase_created_at ?? 0)}
                      </span>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default RisingCreators;
