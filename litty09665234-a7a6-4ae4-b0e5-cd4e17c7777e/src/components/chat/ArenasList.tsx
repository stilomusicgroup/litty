import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, ChevronRight, Shield } from 'lucide-react';
import { useRealtimeData } from '@/hooks/use-realtime-data';
import { subscribeManyArenas, type ArenasResponse } from '@/lib/collections/arenas';
import { getManyChatMessages, type ChatMessagesResponse } from '@/lib/collections/chatMessages';
import { useArtistTier } from '@/hooks/useArtistTier';
import { formatRelativeTime } from '@/utils/chatUtils';

// ── Single arena row with tier-gating and last message preview ──────────────

interface ArenaRowProps {
  arena: ArenasResponse;
  userAddress?: string;
  isSelected: boolean;
  onClick: () => void;
}

function ArenaRow({ arena, userAddress, isSelected, onClick }: ArenaRowProps) {
  const { tier } = useArtistTier(arena.artistAddress, userAddress);
  const isUnlocked = tier !== 'none';

  const [lastMsg, setLastMsg] = useState<ChatMessagesResponse | null>(null);

  useEffect(() => {
    let mounted = true;
    getManyChatMessages(
      `where arenaId = '${arena.artistAddress}' order by createdAt desc limit 1`
    )
      .then((msgs) => {
        if (mounted && msgs.length > 0) setLastMsg(msgs[0]);
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, [arena.artistAddress]);

  const hue = useMemo(() => {
    return (
      Math.abs(
        arena.artistAddress
          .split('')
          .reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0)
      ) % 360
    );
  }, [arena.artistAddress]);

  const avatarLetter = arena.artistName[0]?.toUpperCase() ?? '?';

  return (
    <motion.button
      onClick={isUnlocked ? onClick : undefined}
      whileTap={isUnlocked ? { scale: 0.98 } : {}}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        background: isSelected
          ? `hsla(${hue},70%,30%,0.18)`
          : isUnlocked
          ? 'transparent'
          : 'transparent',
        border: 'none',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        cursor: isUnlocked ? 'pointer' : 'default',
        textAlign: 'left',
        transition: 'background 0.15s',
        opacity: isUnlocked ? 1 : 0.45,
      }}
      onMouseEnter={(e) => {
        if (isUnlocked && !isSelected) {
          (e.currentTarget as HTMLButtonElement).style.background = `hsla(${hue},70%,30%,0.08)`;
        }
      }}
      onMouseLeave={(e) => {
        if (isUnlocked && !isSelected) {
          (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
        }
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          overflow: 'hidden',
          flexShrink: 0,
          background: `linear-gradient(135deg, hsla(${hue},70%,30%,0.7), hsla(${(hue + 60) % 360},80%,20%,0.5))`,
          border: isSelected
            ? `1.5px solid hsl(${hue},70%,55%)`
            : `1px solid hsla(${hue},60%,50%,0.3)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
          fontWeight: 800,
          color: `hsl(${hue},80%,80%)`,
          fontFamily: "'Inter', sans-serif",
          boxShadow: isSelected ? `0 0 16px hsla(${hue},70%,50%,0.3)` : 'none',
          position: 'relative',
        }}
      >
        {arena.coverImage ? (
          <img src={arena.coverImage} alt={arena.artistName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          avatarLetter
        )}
        {/* Lock overlay */}
        {!isUnlocked && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.55)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Lock size={16} style={{ color: 'rgba(255,255,255,0.6)' }} />
          </div>
        )}
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
          <span
            style={{
              fontFamily: "'Inter', sans-serif",
              fontWeight: 700,
              fontSize: 14,
              color: isUnlocked ? '#fff' : 'rgba(255,255,255,0.45)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {arena.artistName}
          </span>
          {!isUnlocked && (
            <span
              style={{
                fontSize: 9,
                fontFamily: "'Inter', monospace",
                color: 'rgba(255,255,255,0.3)',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                flexShrink: 0,
              }}
            >
              Locked
            </span>
          )}
        </div>
        {isUnlocked && lastMsg ? (
          <p
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 12,
              color: 'rgba(255,255,255,0.38)',
              margin: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {lastMsg.content}
          </p>
        ) : !isUnlocked ? (
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: 'rgba(255,255,255,0.22)', margin: 0 }}>
            Own a song to unlock
          </p>
        ) : (
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: 'rgba(255,255,255,0.22)', margin: 0 }}>
            No messages yet
          </p>
        )}
      </div>

      {/* Right side */}
      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
        {lastMsg && isUnlocked && (
          <span style={{ fontFamily: "'Inter', monospace", fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>
            {formatRelativeTime(lastMsg.createdAt)}
          </span>
        )}
        {isUnlocked && (
          <ChevronRight size={14} style={{ color: 'rgba(255,255,255,0.25)' }} />
        )}
        {!isUnlocked && (
          <Lock size={12} style={{ color: 'rgba(255,255,255,0.2)' }} />
        )}
      </div>
    </motion.button>
  );
}

// ── ArenasList main component ───────────────────────────────────────────────

interface ArenasListProps {
  userAddress?: string;
  selectedArenaId: string | null;
  onSelectArena: (arenaId: string) => void;
}

export function ArenasList({ userAddress, selectedArenaId, onSelectArena }: ArenasListProps) {
  const { data: arenas } = useRealtimeData<ArenasResponse[]>(
    subscribeManyArenas,
    true
  );

  const sortedArenas = useMemo(() => {
    if (!arenas) return [];
    return [...arenas];
  }, [arenas]);

  if (!arenas) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'Inter', sans-serif",
          color: 'rgba(255,255,255,0.3)',
          fontSize: 13,
        }}
      >
        Loading Arenas...
      </div>
    );
  }

  if (sortedArenas.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          padding: 32,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: '50%',
            background: 'rgba(147,51,234,0.12)',
            border: '1px solid rgba(147,51,234,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Shield size={24} style={{ color: 'rgba(147,51,234,0.5)' }} />
        </div>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.6)', margin: 0 }}>
          No Arenas yet
        </p>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: 'rgba(255,255,255,0.3)', margin: 0 }}>
          Arenas are created when artists launch their first song
        </p>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: 'rgba(147,51,234,0.3) transparent' }}>
      {sortedArenas.map((arena) => (
        <ArenaRow
          key={arena.id}
          arena={arena}
          userAddress={userAddress}
          isSelected={selectedArenaId === arena.artistAddress}
          onClick={() => onSelectArena(arena.artistAddress)}
        />
      ))}
    </div>
  );
}

export default ArenasList;
