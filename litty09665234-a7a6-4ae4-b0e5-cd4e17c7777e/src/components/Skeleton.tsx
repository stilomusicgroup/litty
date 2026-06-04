import { CSSProperties } from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  style?: CSSProperties;
}

/**
 * Skeleton loader — animated shimmer, dark-theme compatible.
 * Use only for content with a genuinely perceptible loading delay.
 */
export function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = 8,
  className = '',
  style,
}: SkeletonProps) {
  return (
    <>
      <style>{`
        @keyframes lit-shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .lit-skeleton {
          background: linear-gradient(
            90deg,
            hsla(258, 30%, 12%, 1) 25%,
            hsla(263, 40%, 20%, 0.6) 50%,
            hsla(258, 30%, 12%, 1) 75%
          );
          background-size: 200% 100%;
          animation: lit-shimmer 1.8s ease-in-out infinite;
        }
      `}</style>
      <div
        className={`lit-skeleton ${className}`}
        style={{
          width,
          height,
          borderRadius,
          ...style,
        }}
        aria-hidden="true"
      />
    </>
  );
}

/** Skeleton for a song card (cover + title + artist rows) */
export function SongCardSkeleton() {
  return (
    <div
      style={{
        background: 'hsla(258, 30%, 8%, 0.8)',
        borderRadius: 16,
        padding: 12,
        border: '1px solid hsla(258, 30%, 18%, 0.4)',
      }}
    >
      {/* Album art */}
      <Skeleton height={140} borderRadius={12} style={{ marginBottom: 10 }} />
      {/* Title */}
      <Skeleton height={14} width="75%" borderRadius={6} style={{ marginBottom: 6 }} />
      {/* Artist */}
      <Skeleton height={11} width="50%" borderRadius={6} style={{ marginBottom: 10 }} />
      {/* Price row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Skeleton height={20} width={60} borderRadius={10} />
        <Skeleton height={28} width={64} borderRadius={14} />
      </div>
    </div>
  );
}

/** Skeleton for a horizontal song row */
export function SongRowSkeleton() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0' }}>
      <Skeleton width={48} height={48} borderRadius={10} />
      <div style={{ flex: 1 }}>
        <Skeleton height={13} width="60%" borderRadius={5} style={{ marginBottom: 5 }} />
        <Skeleton height={11} width="40%" borderRadius={5} />
      </div>
      <Skeleton width={48} height={22} borderRadius={8} />
    </div>
  );
}

/** Skeleton for a collection/profile page header */
export function ProfileHeaderSkeleton() {
  return (
    <div style={{ textAlign: 'center', padding: '24px 16px 16px' }}>
      <Skeleton width={80} height={80} borderRadius="50%" style={{ margin: '0 auto 12px' }} />
      <Skeleton height={18} width={140} borderRadius={8} style={{ margin: '0 auto 8px' }} />
      <Skeleton height={13} width={100} borderRadius={6} style={{ margin: '0 auto' }} />
    </div>
  );
}

/** Grid of song card skeletons */
export function SongGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: 12,
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <SongCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** List of song row skeletons */
export function SongListSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <SongRowSkeleton key={i} />
      ))}
    </div>
  );
}
