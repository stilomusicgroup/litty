import { useEffect, useState } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
  minDuration?: number;
}

export default function SplashScreen({ onComplete, minDuration = 2000 }: SplashScreenProps) {
  const [phase, setPhase] = useState<'visible' | 'fading' | 'done'>('visible');

  useEffect(() => {
    const timer = setTimeout(() => {
      setPhase('fading');
      const fadeTimer = setTimeout(() => {
        setPhase('done');
        onComplete();
      }, 600);
      return () => clearTimeout(fadeTimer);
    }, minDuration);

    return () => clearTimeout(timer);
  }, [minDuration, onComplete]);

  if (phase === 'done') return null;

  return (
    <>
      <style>{`
        @keyframes pulse-glow {
          0%, 100% {
            box-shadow:
              0 0 40px 8px rgba(139, 92, 246, 0.4),
              0 0 80px 20px rgba(139, 92, 246, 0.2),
              0 0 120px 40px rgba(139, 92, 246, 0.08);
            filter: brightness(1);
          }
          50% {
            box-shadow:
              0 0 60px 16px rgba(192, 38, 211, 0.55),
              0 0 110px 30px rgba(139, 92, 246, 0.3),
              0 0 160px 60px rgba(139, 92, 246, 0.12);
            filter: brightness(1.12);
          }
        }

        @keyframes text-glow-pulse {
          0%, 100% {
            text-shadow:
              0 0 20px rgba(139, 92, 246, 0.8),
              0 0 50px rgba(139, 92, 246, 0.4),
              0 0 90px rgba(139, 92, 246, 0.15);
          }
          50% {
            text-shadow:
              0 0 30px rgba(192, 38, 211, 0.9),
              0 0 70px rgba(139, 92, 246, 0.55),
              0 0 120px rgba(192, 38, 211, 0.2);
          }
        }

        @keyframes sub-glow-pulse {
          0%, 100% {
            text-shadow:
              0 0 10px rgba(192, 38, 211, 0.5),
              0 0 25px rgba(192, 38, 211, 0.2);
            opacity: 0.7;
          }
          50% {
            text-shadow:
              0 0 18px rgba(192, 38, 211, 0.75),
              0 0 40px rgba(192, 38, 211, 0.35);
            opacity: 0.95;
          }
        }

        @keyframes bar-fill {
          0%   { width: 0%; opacity: 0.6; }
          15%  { opacity: 1; }
          80%  { width: 88%; }
          100% { width: 100%; opacity: 0.9; }
        }

        @keyframes bar-shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }

        @keyframes dot-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.3; }
          40%            { transform: translateY(-6px); opacity: 1; }
        }

        @keyframes cosmic-drift {
          0%   { transform: translate(0, 0) scale(1); }
          33%  { transform: translate(20px, -15px) scale(1.05); }
          66%  { transform: translate(-15px, 10px) scale(0.97); }
          100% { transform: translate(0, 0) scale(1); }
        }

        @keyframes ring-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }

        @keyframes ring-spin-rev {
          from { transform: rotate(0deg); }
          to   { transform: rotate(-360deg); }
        }

        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @keyframes splash-fade-out {
          from { opacity: 1; }
          to   { opacity: 0; }
        }

        .splash-fade-out {
          animation: splash-fade-out 0.6s ease-out forwards !important;
        }
      `}</style>

      <div
        className={phase === 'fading' ? 'splash-fade-out' : ''}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'hsl(260 85% 4%)',
          overflow: 'hidden',
        }}
      >
        {/* Ambient background blobs */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '20%',
              left: '15%',
              width: '45vw',
              height: '45vw',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)',
              animation: 'cosmic-drift 12s ease-in-out infinite',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: '15%',
              right: '10%',
              width: '40vw',
              height: '40vw',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(192,38,211,0.1) 0%, transparent 70%)',
              animation: 'cosmic-drift 15s ease-in-out infinite reverse',
            }}
          />
        </div>

        {/* Logo container */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0',
            animation: 'fade-in-up 0.8s ease-out forwards',
          }}
        >
          {/* Lit logo image */}
          <img
            src="https://tarobase-app-storage-public-v2-prod.s3.amazonaws.com/tarobase-app-storage-69cfc41e56840f6b0224904e/69d734be21f73302c16fe66b"
            alt="Lit Studios"
            style={{
              width: 'clamp(220px, 60vw, 320px)',
              height: 'auto',
              objectFit: 'contain',
              marginBottom: 24,
              animation: 'text-glow-pulse 2.4s ease-in-out infinite',
              filter: 'drop-shadow(0 0 24px rgba(139,92,246,0.55)) drop-shadow(0 0 60px rgba(217,70,239,0.3))',
            }}
          />

          {/* Divider line */}
          <div
            style={{
              width: 120,
              height: 1,
              background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.6), rgba(192,38,211,0.6), transparent)',
              marginTop: 24,
              marginBottom: 28,
            }}
          />

          {/* Loading bar */}
          <div
            style={{
              width: 200,
              height: 2,
              background: 'rgba(139,92,246,0.15)',
              borderRadius: 99,
              overflow: 'hidden',
              marginBottom: 20,
            }}
          >
            <div
              style={{
                height: '100%',
                borderRadius: 99,
                background: 'linear-gradient(90deg, hsl(263 80% 65%), hsl(295 85% 62%), hsl(263 80% 65%))',
                backgroundSize: '200% 100%',
                animation: `bar-fill ${minDuration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards, bar-shimmer 1.5s linear infinite`,
              }}
            />
          </div>

          {/* Pulsing dots */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: i === 1 ? 'hsl(295 85% 62%)' : 'hsl(263 80% 65%)',
                  animation: `dot-bounce 1.2s ease-in-out infinite`,
                  animationDelay: `${i * 0.18}s`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
