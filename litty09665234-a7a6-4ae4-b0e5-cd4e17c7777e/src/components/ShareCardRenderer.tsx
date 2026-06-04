import React, { useRef, useCallback } from 'react';
import { toast } from 'sonner';
import FanTierBadge, { FanTier, TIER_CONFIGS } from '@/components/FanTierBadge';

interface ShareCardRendererProps {
  songId: string;
  title: string;
  artist: string;
  coverImage?: string;
  tier: FanTier;
  splBalance: number;
  tokenSymbol?: string;
  editionNumber?: number;
  totalEditions?: number;
  onClose: () => void;
}

const ShareCardRenderer: React.FC<ShareCardRendererProps> = ({
  songId,
  title,
  artist,
  coverImage,
  tier,
  splBalance,
  tokenSymbol,
  editionNumber,
  totalEditions,
  onClose,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const tierConfig = TIER_CONFIGS[tier];

  const formatBalance = (bal: number) => {
    if (bal >= 1_000_000) return `${(bal / 1_000_000).toFixed(1)}M`;
    if (bal >= 1_000) return `${(bal / 1_000).toFixed(1)}K`;
    return bal.toString();
  };

  const handleShare = useCallback(async () => {
    const shareUrl = `litstudio.online/song/${songId}`;

    try {
      const html2canvas = (await import('html2canvas')).default;
      if (!cardRef.current) throw new Error('Card not rendered');

      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
      });

      canvas.toBlob(async (blob) => {
        if (!blob) {
          await navigator.clipboard.writeText(`https://${shareUrl}`);
          toast.success('Link copied — share it anywhere');
          return;
        }

        const file = new File([blob], 'lit-studio-collection.png', { type: 'image/png' });

        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          try {
            await navigator.share({
              title: `I own "${title}" on Lit Studio`,
              text: `Check out my music collection on Lit Studio`,
              url: `https://${shareUrl}`,
              files: [file],
            });
          } catch {
            await navigator.clipboard.writeText(`https://${shareUrl}`);
            toast.success('Link copied — share it anywhere');
          }
        } else {
          await navigator.clipboard.writeText(`https://${shareUrl}`);
          toast.success('Link copied — share it anywhere');
        }
      }, 'image/png');
    } catch {
      try {
        await navigator.clipboard.writeText(`https://${shareUrl}`);
        toast.success('Link copied — share it anywhere');
      } catch {
        toast.error('Could not share');
      }
    }
  }, [songId, title]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(12px)',
        padding: '20px',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', maxWidth: '420px', width: '100%' }}>
        {/* Preview label */}
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: "'Inter', monospace" }}>
          Share Preview
        </div>

        {/* The share card (1080×1080 rendered at smaller display size) */}
        <div
          ref={cardRef}
          style={{
            width: '360px',
            height: '360px',
            borderRadius: '20px',
            overflow: 'hidden',
            background: 'linear-gradient(135deg, #0d0820 0%, #150c30 50%, #0a0618 100%)',
            border: `2px solid ${tierConfig.border}`,
            boxShadow: `0 0 40px ${tierConfig.glow}, 0 20px 60px rgba(0,0,0,0.8)`,
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            padding: '28px',
            gap: '16px',
          }}
        >
          {/* Decorative glow blob */}
          <div style={{
            position: 'absolute',
            top: '-40px',
            right: '-40px',
            width: '200px',
            height: '200px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${tierConfig.glow} 0%, transparent 70%)`,
            opacity: 0.4,
            pointerEvents: 'none',
          }} />

          {/* Top row: cover + info */}
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', position: 'relative' }}>
            {/* Cover art */}
            <div style={{
              width: '110px',
              height: '110px',
              borderRadius: '12px',
              overflow: 'hidden',
              flexShrink: 0,
              border: `2px solid ${tierConfig.border}`,
              boxShadow: `0 0 20px ${tierConfig.glow}`,
            }}>
              {coverImage ? (
                <img src={coverImage} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} crossOrigin="anonymous" />
              ) : (
                <div style={{
                  width: '100%',
                  height: '100%',
                  background: 'linear-gradient(135deg, #4c1d95, #1e1b4b)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '36px',
                }}>
                  ♪
                </div>
              )}
            </div>

            {/* Song info */}
            <div style={{ flex: 1, minWidth: 0, paddingTop: '4px' }}>
              <div style={{
                fontSize: '18px',
                fontWeight: 900,
                color: '#fff',
                fontFamily: "'Inter', sans-serif",
                lineHeight: 1.2,
                marginBottom: '6px',
                wordBreak: 'break-word',
              }}>
                {title}
              </div>
              <div style={{
                fontSize: '13px',
                color: '#a78bfa',
                fontFamily: "'Inter', sans-serif",
                marginBottom: '10px',
              }}>
                {artist}
              </div>
              {editionNumber && totalEditions && (
                <div style={{
                  display: 'inline-block',
                  padding: '3px 10px',
                  borderRadius: '20px',
                  background: 'rgba(255,215,0,0.15)',
                  border: '1px solid rgba(255,215,0,0.4)',
                  color: '#FFD700',
                  fontSize: '11px',
                  fontFamily: "'Inter', monospace",
                  fontWeight: 700,
                }}>
                  #{editionNumber} of {totalEditions}
                </div>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div style={{
            display: 'flex',
            gap: '10px',
            padding: '12px',
            background: 'rgba(255,255,255,0.04)',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontFamily: "'Inter', monospace", marginBottom: '2px', textTransform: 'uppercase' }}>Holding</div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: tierConfig.color, fontFamily: "'Inter', monospace" }}>
                {formatBalance(splBalance)}
                <span style={{ fontSize: '10px', marginLeft: '3px', opacity: 0.7 }}>{tokenSymbol ?? ''}</span>
              </div>
            </div>
            <div style={{ width: '1px', background: 'rgba(255,255,255,0.08)' }} />
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', fontFamily: "'Inter', monospace", marginBottom: '4px', textTransform: 'uppercase' }}>Tier</div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 8px',
                borderRadius: '20px',
                background: 'rgba(10,5,24,0.92)',
                border: `1px solid ${tierConfig.border}`,
                color: tierConfig.color,
                fontSize: '11px',
                fontWeight: 700,
                fontFamily: "'Inter', monospace",
                textTransform: 'uppercase',
              }}>
                {tierConfig.label}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{
            marginTop: 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{
              fontSize: '11px',
              color: 'rgba(255,255,255,0.35)',
              fontFamily: "'Inter', sans-serif",
            }}>
              I own this on <span style={{ color: '#a78bfa', fontWeight: 600 }}>Lit Studio</span>
            </div>
            <div style={{
              fontSize: '10px',
              color: 'rgba(255,255,255,0.25)',
              fontFamily: "'Inter', monospace",
            }}>
              litstudio.online
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
          <button
            onClick={handleShare}
            style={{
              flex: 1,
              padding: '12px 20px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
              border: 'none',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 700,
              fontFamily: "'Inter', sans-serif",
              cursor: 'pointer',
              boxShadow: '0 0 20px rgba(139,92,246,0.4)',
            }}
          >
            Share Card
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '12px 20px',
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.6)',
              fontSize: '14px',
              fontWeight: 600,
              fontFamily: "'Inter', sans-serif",
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareCardRenderer;
