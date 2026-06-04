/**
 * RecentPayoutsStrip — live scrolling ticker of artist SOL payouts.
 * Self-contained component subscribing to transactionAudits + fetching song metadata.
 */
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Coins } from 'lucide-react';
import { subscribeManyTransactionAudits } from '@/lib/collections/transactionAudits';
import type { TransactionAuditsResponse } from '@/lib/collections/transactionAudits';
import { getSongDetails } from '@/lib/collections/songDetails';
import { getSongs } from '@/lib/collections/songs';
import { orbitronFont } from '@/theme';

const SOL_DECIMALS = 1_000_000_000;

interface SongInfo {
  title?: string;
  artist?: string;
  symbol?: string;
}

function timeAgo(seconds: number): string {
  const now = Date.now() / 1000;
  const diff = now - seconds;
  if (diff < 5) return 'just now';
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatSol(lamports: number): string {
  const sol = lamports / SOL_DECIMALS;
  if (sol < 0.0001) return `${lamports} lamports`;
  return sol.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

function formatUsd(amount: number): string {
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function RecentPayoutsStrip() {
  const [audits, setAudits] = useState<TransactionAuditsResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [songInfoCache, setSongInfoCache] = useState<Record<string, SongInfo>>({});
  const fetchedIdsRef = useRef<Set<string>>(new Set());
  const [tick, setTick] = useState(0);

  // Recompute "time ago" every 30 seconds
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  // Subscribe to transaction audits
  useEffect(() => {
    let unsub: (() => Promise<void>) | undefined;

    const setup = async () => {
      unsub = await subscribeManyTransactionAudits((data) => {
        const passed = data.filter(
          a => a.artistPayoutStatus === 'passed' || a.artistPayoutStatus === 'completed'
        );
        passed.sort((a, b) => b.createdAt - a.createdAt);
        setAudits(passed.slice(0, 50));
        setLoading(false);
      }, "artistPayoutStatus is passed or completed order by createdAt desc limit 50");
    };

    setup();
    return () => {
      if (unsub) unsub();
    };
  }, []);

  // Fetch song info for any new songIds
  useEffect(() => {
    if (!audits.length) return;

    const missingIds = audits
      .map(a => a.songId)
      .filter((id, i, arr) => arr.indexOf(id) === i && !fetchedIdsRef.current.has(id));

    if (missingIds.length === 0) return;

    missingIds.forEach(id => fetchedIdsRef.current.add(id));

    Promise.all(
      missingIds.map(async (id) => {
        const [details, song] = await Promise.all([
          getSongDetails(id),
          getSongs(id),
        ]);
        return {
          id,
          info: {
            title: details?.title || song?.name,
            artist: details?.artist,
            symbol: song?.symbol,
          } as SongInfo,
        };
      })
    ).then(results => {
      setSongInfoCache(prev => {
        const next = { ...prev };
        results.forEach(({ id, info }) => {
          if (info.title || info.artist || info.symbol) {
            next[id] = info;
          }
        });
        return next;
      });
    });
  }, [audits]);

  const items = useMemo(() => {
    if (loading || audits.length === 0) return null;
    return audits.map((audit) => {
      const info = songInfoCache[audit.songId];
      const artistName = info?.artist || info?.symbol || 'An artist';
      const songName = info?.title || info?.symbol || 'a track';
      return {
        artistName,
        songName,
        sol: formatSol(audit.artistPayoutSOL),
        usd: formatUsd(audit.artistPayoutUSD),
        time: timeAgo(audit.createdAt),
      };
    });
  }, [audits, songInfoCache, loading, tick]);

  const renderItems = (data: NonNullable<typeof items>) => (
    <>
      {data.map((item, i) => (
        <span
          key={i}
          style={{
            display: 'inline-block',
            marginRight: 48,
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ marginRight: 6 }}>💰</span>
          <span style={{ color: '#fff', fontWeight: 500 }}>{item.artistName}</span>
          <span style={{ color: 'rgba(255,255,255,0.45)', margin: '0 6px' }}>earned</span>
          <span style={{ color: '#00FF41', fontFamily: orbitronFont, fontWeight: 700, marginRight: 4 }}>
            {item.sol} SOL
          </span>
          <span style={{ color: 'rgba(255,255,255,0.45)', marginRight: 6 }}>
            (${item.usd})
          </span>
          <span style={{ color: 'rgba(255,255,255,0.45)', margin: '0 6px' }}>for</span>
          <span style={{ color: '#fff', fontWeight: 500 }}>{item.songName}</span>
          <span style={{ color: 'rgba(255,255,255,0.25)', marginLeft: 8 }}>
            · {item.time}
          </span>
        </span>
      ))}
    </>
  );

  const hasContent = !loading && audits.length > 0;

  return (
    <div className="recent-payouts-strip" style={{
      background: '#0A0A0A',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      padding: '8px 16px',
      display: 'flex',
      alignItems: 'center',
      overflow: 'hidden',
      width: '100%',
      height: 40,
    }}>
      {/* Left badge */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        flexShrink: 0,
        marginRight: 12,
      }}>
        <Coins size={14} color="#00FF41" style={{ flexShrink: 0 }} />
        <span style={{
          fontFamily: "'Archivo Black', sans-serif",
          fontSize: 10,
          color: '#00FF41',
          marginLeft: 6,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          whiteSpace: 'nowrap',
        }}>
          Payouts
        </span>
      </div>

      {/* Marquee */}
      <div style={{ overflow: 'hidden', flex: 1 }}>
        {hasContent && items ? (
          <div className="payout-marquee" style={{
            whiteSpace: 'nowrap',
            fontSize: 13,
            color: '#fff',
            fontFamily: orbitronFont,
            fontWeight: 500,
            animation: 'payoutTickerScroll 40s linear infinite',
            display: 'inline-block',
          }}>
            {renderItems(items)}
            {renderItems(items)}
            {renderItems(items)}
          </div>
        ) : (
          <div style={{
            whiteSpace: 'nowrap',
            fontSize: 13,
            color: 'rgba(255,255,255,0.35)',
            fontFamily: "'Inter', sans-serif",
            paddingLeft: 8,
          }}>
            {loading ? 'Loading recent payouts...' : 'Waiting for first payout...'}
          </div>
        )}
      </div>

      <style>{`
        @keyframes payoutTickerScroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
        @media (min-width: 641px) {
          .recent-payouts-strip {
            padding-left: 32px !important;
            padding-right: 32px !important;
          }
        }
      `}</style>
    </div>
  );
}
