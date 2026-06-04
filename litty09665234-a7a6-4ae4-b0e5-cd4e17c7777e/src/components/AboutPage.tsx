import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { Particles } from '@/components/effects';
// ─── Animation helpers ────────────────────────────────────────────────────────

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0 },
};

function FadeSection({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div
      ref={ref}
      variants={fadeUp}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Problem / Solution cards ─────────────────────────────────────────────────

function GlassCard({
  icon,
  text,
  accentColor,
  delay,
}: {
  icon: string;
  text: string;
  accentColor: string;
  delay?: number;
}) {
  return (
    <FadeSection delay={delay}>
      <div
        className="flex flex-col gap-4 p-6 rounded-2xl h-full"
        style={{
          background: 'rgba(255,255,255,0.03)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderTop: `3px solid ${accentColor}`,
        }}
      >
        <span style={{ fontSize: '2rem' }}>{icon}</span>
        <p className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.75)' }}>
          {text}
        </p>
      </div>
    </FadeSection>
  );
}

// ─── How It Works step ────────────────────────────────────────────────────────

function StepCard({ num, text, icon, delay }: { num: number; text: string; icon: string; delay?: number }) {
  return (
    <FadeSection delay={delay} className="relative flex flex-col items-center text-center">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-4 relative z-10"
        style={{
          background: 'linear-gradient(135deg, rgba(0, 255, 65, 0.15), rgba(0,212,255,0.1))',
          border: '1px solid rgba(0, 255, 65, 0.35)',
          boxShadow: '0 0 24px rgba(0, 255, 65, 0.2)',
        }}
      >
        {icon}
      </div>
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black mb-3"
        style={{ background: '#00FF41', color: '#000' }}
      >
        {num}
      </div>
      <p className="text-sm leading-relaxed max-w-48" style={{ color: 'rgba(255,255,255,0.7)' }}>
        {text}
      </p>
    </FadeSection>
  );
}

// ─── Stat counter ─────────────────────────────────────────────────────────────

function StatCard({ value, label, delay }: { value: string; label: string; delay?: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  return (
    <motion.div
      ref={ref}
      variants={fadeUp}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      transition={{ duration: 0.6, delay }}
      className="flex flex-col items-center p-6 rounded-2xl"
      style={{
        background: 'rgba(0, 255, 65, 0.06)',
        border: '1px solid rgba(0, 255, 65, 0.2)',
      }}
    >
      <p
        className="text-3xl sm:text-4xl font-black mb-2"
        style={{
          background: 'linear-gradient(90deg, #00FF41, #00D4FF)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        {value}
      </p>
      <p className="text-sm text-center" style={{ color: 'rgba(255,255,255,0.55)' }}>
        {label}
      </p>
    </motion.div>
  );
}

// ─── Token Split Card ─────────────────────────────────────────────────────────

function TokenSplitCard({
  emoji,
  label,
  pct,
  color,
  description,
  delay,
}: {
  emoji: string;
  label: string;
  pct: string;
  color: string;
  description: string;
  delay?: number;
}) {
  return (
    <FadeSection delay={delay}>
      <div
        className="flex flex-col gap-3 p-6 rounded-2xl h-full"
        style={{
          background: 'rgba(255,255,255,0.03)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderTop: `3px solid ${color}`,
        }}
      >
        <div className="flex items-center gap-3">
          <span style={{ fontSize: '1.75rem' }}>{emoji}</span>
          <span
            className="text-3xl font-black font-mono"
            style={{ color, textShadow: `0 0 12px ${color}80` }}
          >
            {pct}
          </span>
        </div>
        <p className="text-sm font-black text-white">{label}</p>
        <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>
          {description}
        </p>
      </div>
    </FadeSection>
  );
}

// ─── Comparison Table ─────────────────────────────────────────────────────────

const TABLE_ROWS = [
  { feature: 'Music free to stream', spotify: '✓', audius: '✓', lit: '✓' },
  { feature: 'Song token ownership', spotify: '✗', audius: '~', lit: '✓' },
  { feature: 'Token trading / price upside', spotify: '✗', audius: '✗', lit: '✓' },
  { feature: 'NFT collectibles', spotify: '✗', audius: '✗', lit: '✓' },
  { feature: 'Apple Pay / fiat onramp', spotify: '✗', audius: '✗', lit: '✓' },
  { feature: 'Artist gets 5% tokens at mint + 2% on every trade forever', spotify: '✗', audius: '~', lit: '✓' },
  { feature: 'Community Arena chat', spotify: '✗', audius: '✗', lit: '✓' },
];

function ComparisonTable() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  return (
    <motion.div
      ref={ref}
      variants={fadeUp}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      transition={{ duration: 0.6 }}
      className="overflow-x-auto rounded-2xl"
      style={{ border: '1px solid rgba(0, 255, 65, 0.2)' }}
    >
      <table className="w-full min-w-[480px]">
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(0, 255, 65, 0.12)' }}>
            <th className="text-left px-6 py-4 text-sm font-bold" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Feature
            </th>
            <th className="text-center px-4 py-4 text-sm font-bold" style={{ color: 'rgba(255,255,255,0.35)' }}>Spotify</th>
            <th className="text-center px-4 py-4 text-sm font-bold" style={{ color: 'rgba(255,255,255,0.45)' }}>Audius</th>
            <th
              className="text-center px-6 py-4 text-sm font-black"
              style={{
                background: 'rgba(0, 255, 65, 0.08)',
                color: '#00FF41',
              }}
            >
              Lit Studio
            </th>
          </tr>
        </thead>
        <tbody>
          {TABLE_ROWS.map((row, i) => (
            <tr
              key={i}
              style={{
                borderBottom: i < TABLE_ROWS.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                background: i % 2 === 0 ? 'rgba(0, 255, 65, 0.02)' : 'transparent',
              }}
            >
              <td className="px-6 py-3.5 text-sm font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>
                {row.feature}
              </td>
              <td className="px-4 py-3.5 text-center text-base" style={{ color: row.spotify === '✓' ? '#00FF41' : '#ef4444' }}>
                {row.spotify}
              </td>
              <td className="px-4 py-3.5 text-center text-base" style={{ color: row.audius === '✓' ? '#00FF41' : row.audius === '~' ? '#f59e0b' : '#ef4444' }}>
                {row.audius}
              </td>
              <td
                className="px-6 py-3.5 text-center text-base font-bold"
                style={{
                  background: 'rgba(0, 255, 65, 0.06)',
                  color: '#00FF41',
                }}
              >
                {row.lit}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </motion.div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const AboutPage: React.FC = () => {
  const sectionStyle = {
    padding: '80px 0',
  };

  return (
    <div className="min-h-screen" style={{ background: 'transparent', color: '#ffffff' }}>
      
      {/* ── HERO ── */}
      <section
        className="relative flex flex-col items-center justify-center text-center overflow-hidden"
        style={{ minHeight: '100vh', paddingTop: '80px' }}
      >
        <Particles className="absolute inset-0 pointer-events-none" quantity={120} color="#00FF41" />

        {/* Radial glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(0, 255, 65, 0.1) 0%, transparent 70%)',
          }}
        />

        <div className="relative z-10 max-w-3xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <div
              className="inline-block text-xs font-black uppercase tracking-[0.3em] px-4 py-2 rounded-full mb-8"
              style={{
                background: 'rgba(0, 255, 65, 0.1)',
                border: '1px solid rgba(0, 255, 65, 0.3)',
                color: '#00FF41',
              }}
            >
              Music Finance — MuFi
            </div>

            <h1
              className="text-5xl sm:text-7xl font-black leading-[1.05] mb-6"
              style={{
                background: 'linear-gradient(135deg, #fff 30%, #00FF41 65%, #00D4FF 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '-0.03em',
              }}
            >
              Songs Are Charts.
              <br />
              Own the Music.
            </h1>

            <p
              className="text-lg sm:text-xl leading-relaxed mb-10 max-w-xl mx-auto"
              style={{ color: 'rgba(255,255,255,0.6)' }}
            >
              Lit Studio is a Music Finance (MuFi) platform. Every song has a tradable token whose price is driven by demand. Music streams free — the upside comes from owning the token.
            </p>

            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                to="/"
                className="px-8 py-3.5 rounded-xl font-bold text-sm transition-all"
                style={{
                  background: 'linear-gradient(135deg, #00FF41, #06d6a0)',
                  color: '#000',
                  boxShadow: '0 0 32px rgba(0, 255, 65, 0.5)',
                }}
              >
                Browse Songs
              </Link>
              <Link
                to="/tokenomics"
                className="px-8 py-3.5 rounded-xl font-bold text-sm transition-all"
                style={{
                  background: 'rgba(0, 255, 65, 0.06)',
                  border: '1px solid rgba(0, 255, 65, 0.3)',
                  color: '#00FF41',
                }}
              >
                Read Whitepaper
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Scroll line */}
        <div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-40"
        >
          <div className="w-px h-16" style={{ background: 'linear-gradient(to bottom, transparent, rgba(0, 255, 65, 0.6))' }} />
        </div>
      </section>

      {/* ── THE PROBLEM ── */}
      <section style={{ ...sectionStyle, background: '#060A06' }}>
        <div className="max-w-5xl mx-auto px-6">
          <FadeSection>
            <h2
              className="text-3xl sm:text-4xl font-black text-center mb-4"
              style={{ color: '#fff' }}
            >
              The Problem with Music Today
            </h2>
            <p className="text-center text-base mb-12 max-w-xl mx-auto" style={{ color: 'rgba(255,255,255,0.5)' }}>
              The music industry is broken. Here's what's wrong.
            </p>
          </FadeSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <GlassCard
              icon="💸"
              text="Spotify pays $0.004 per stream. 250,000 streams = $1,000. Artists grind for pennies."
              accentColor="#ef4444"
              delay={0}
            />
            <GlassCard
              icon="🖼️"
              text="Most NFT platforms have no streaming, no utility, no fans. JPEGs that go nowhere."
              accentColor="#f97316"
              delay={0.1}
            />
            <GlassCard
              icon="🔐"
              text="Web3 music requires wallets and seed phrases. Most fans never onboard. Adoption dies."
              accentColor="#f59e0b"
              delay={0.2}
            />
          </div>
        </div>
      </section>

      {/* ── THE SOLUTION ── */}
      <section
        style={{
          ...sectionStyle,
          background: 'linear-gradient(180deg, #060A06 0%, #0A1A0E 100%)',
        }}
      >
        <div className="max-w-5xl mx-auto px-6">
          <FadeSection>
            <h2
              className="text-3xl sm:text-4xl font-black text-center mb-4"
              style={{ color: '#fff' }}
            >
              How Lit Studio Fixes It
            </h2>
            <p className="text-center text-base mb-12 max-w-xl mx-auto" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Three breakthroughs that change everything.
            </p>
          </FadeSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <GlassCard
              icon="🎵"
              text="Music plays free — always. No paywalls, no gated streams. Listening is open to everyone."
              accentColor="#00FF41"
              delay={0}
            />
            <GlassCard
              icon="📈"
              text="Every song is a chart. Its token trades on a bonding curve — early fans pay less, demand drives the price up."
              accentColor="#00D4FF"
              delay={0.1}
            />
            <GlassCard
              icon="🪙"
              text="Owning the token is the investment. Hold, trade, and grow your portfolio as the artist grows. Cultural assets you can own."
              accentColor="#f59e0b"
              delay={0.2}
            />
          </div>
        </div>
      </section>

      {/* ── MUFI POSITIONING ── */}
      <section
        style={{
          ...sectionStyle,
          background: 'linear-gradient(180deg, #0A1A0E 0%, #060A06 100%)',
        }}
      >
        <div className="max-w-4xl mx-auto px-6">
          <FadeSection>
            <div
              className="inline-block text-xs font-black uppercase tracking-[0.3em] px-4 py-2 rounded-full mb-6"
              style={{
                background: 'rgba(0,212,255,0.1)',
                border: '1px solid rgba(0,212,255,0.3)',
                color: '#00D4FF',
              }}
            >
              Music Finance — MuFi
            </div>
            <h2
              className="text-3xl sm:text-4xl font-black mb-6"
              style={{ color: '#fff' }}
            >
              Songs Are Charts.
            </h2>
          </FadeSection>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FadeSection delay={0.1}>
              <div className="space-y-4">
                <p className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.75)' }}>
                  Lit Studio is a <span style={{ color: '#00D4FF', fontWeight: 700 }}>Music Finance (MuFi)</span> platform. The core thesis is simple: every song is a financial chart. Each track has a tradable token whose price is driven purely by demand. More fans buying = higher price. Early holders win.
                </p>
                <p className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.75)' }}>
                  <span style={{ color: '#00FF41', fontWeight: 700 }}>Music always plays free.</span> There are no paywalls, no gated streams. Listening is — and will always be — open to everyone. The investment isn't access to the music. The investment is owning the token.
                </p>
                <p className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.75)' }}>
                  Think of it as a new asset class: <span style={{ color: '#00D4FF', fontWeight: 700 }}>cultural assets you can actually own a piece of.</span> Not merch. Not a subscription. An on-chain stake in the cultural impact of a song.
                </p>
              </div>
            </FadeSection>
            <FadeSection delay={0.2}>
              <div className="space-y-3">
                {[
                  { icon: '🎵', title: 'Free forever', body: 'Every song streams free. No paywalls. The music belongs to everyone.' },
                  { icon: '📈', title: 'The token is the play', body: 'Buy tokens early. As the artist grows, demand pushes the price up. Sell or hold — your call.' },
                  { icon: '🌐', title: 'A new asset class', body: 'Cultural assets on-chain. Songs you believe in, owned and traded like any financial instrument.' },
                  { icon: '⚡', title: 'Instant, frictionless', body: 'Apple Pay in, Solana tokens out. No seed phrases. No exchange accounts. One tap.' },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex gap-4 p-4 rounded-xl"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.07)',
                    }}
                  >
                    <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>{item.icon}</span>
                    <div>
                      <p className="text-sm font-black text-white mb-0.5">{item.title}</p>
                      <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>{item.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </FadeSection>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section
        style={{
          ...sectionStyle,
          background: '#0A1A0E',
        }}
      >
        <div className="max-w-5xl mx-auto px-6">
          <FadeSection>
            <h2
              className="text-3xl sm:text-4xl font-black text-center mb-16"
              style={{ color: '#fff' }}
            >
              How It Works
            </h2>
          </FadeSection>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-0 relative">
            {/* Connecting line (desktop only) */}
            <div
              className="absolute top-7 left-[12.5%] right-[12.5%] h-px hidden lg:block"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(0, 255, 65, 0.4), rgba(0,212,255,0.3), transparent)' }}
            />

            <StepCard
              num={1}
              icon="🎵"
              text="Artist uploads, sets a ticker symbol, and launches their song token on the bonding curve"
              delay={0}
            />
            <StepCard
              num={2}
              icon="💳"
              text="Fan buys in with Apple Pay — gets Song Coins at live SOL/USD price + a Metaplex NFT instantly"
              delay={0.1}
            />
            <StepCard
              num={3}
              icon="🚀"
              text="92% → fan tokens at live price • 5% → artist tokens (artist wins alongside fans) • 1.5% → infrastructure • 1.5% → treasury"
              delay={0.2}
            />
            <StepCard
              num={4}
              icon="📊"
              text="Stream free, join Arena chat, watch your portfolio grow as demand pushes the token price up"
              delay={0.3}
            />
          </div>
        </div>
      </section>

      {/* ── THE NUMBERS ── */}
      <section
        style={{
          ...sectionStyle,
          background: 'linear-gradient(180deg, #0A1A0E 0%, #060A06 100%)',
        }}
      >
        <div className="max-w-4xl mx-auto px-6">
          <FadeSection>
            <h2
              className="text-3xl sm:text-4xl font-black text-center mb-12"
              style={{ color: '#fff' }}
            >
              The Numbers
            </h2>
          </FadeSection>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard value="92%" label="of purchase allocated to fan tokens" delay={0} />
            <StatCard value="5%" label="goes directly to the artist on every sale" delay={0.1} />
            <StatCard value="3%" label="total platform fee (1.5% infra + 1.5% treasury)" delay={0.2} />
            <StatCard value="Live" label="token price set by SOL/USD oracle at purchase" delay={0.3} />
          </div>
        </div>
      </section>

      {/* ── v20 TOKENOMICS ── */}
      <section
        style={{
          ...sectionStyle,
          background: '#0A1A0E',
        }}
      >
        <div className="max-w-5xl mx-auto px-6">
          <FadeSection>
            <h2
              className="text-3xl sm:text-4xl font-black text-center mb-4"
              style={{ color: '#fff' }}
            >
              Where Every Purchase Goes
            </h2>
            <p className="text-center text-base mb-12 max-w-xl mx-auto" style={{ color: 'rgba(255,255,255,0.5)' }}>
              v20 tokenomics — every dollar is allocated transparently at the moment of purchase. Token amounts are calculated live using the SOL/USD oracle price, not fixed numbers.
            </p>
          </FadeSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <TokenSplitCard
              emoji="🪙"
              label="Fan Allocation"
              pct="92%"
              color="#00FF41"
              description="Goes directly to the buyer as song tokens. The more demand, the higher the price — your tokens appreciate with the artist."
              delay={0}
            />
            <TokenSplitCard
              emoji="🎤"
              label="Artist Allocation"
              pct="5%"
              color="#00D4FF"
              description="Tokens and/or SOL go directly to the song's artist on every purchase. No middlemen, no delays."
              delay={0.1}
            />
            <TokenSplitCard
              emoji="⚙️"
              label="Infrastructure"
              pct="1.5%"
              color="#9CA3AF"
              description="Funds the platform infrastructure — NFT minting, token delivery, bonding curve liquidity, and developer tooling."
              delay={0.2}
            />
            <TokenSplitCard
              emoji="🏛"
              label="Treasury"
              pct="1.5%"
              color="#8B5CF6"
              description="Protocol treasury for future development, grants, and community initiatives. Governed transparently."
              delay={0.3}
            />
          </div>

          {/* Segmented bar */}
          <FadeSection delay={0.4}>
            <div
              className="rounded-xl p-5"
              style={{
                background: 'rgba(255,255,255,0.03)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderTop: '3px solid #00FF41',
              }}
            >
              <div className="w-full h-3 rounded-full overflow-hidden flex mb-3" style={{ gap: '1px' }}>
                <div style={{ width: '92%', background: '#00FF41', boxShadow: '0 0 8px rgba(0, 255, 65, 0.4)' }} />
                <div style={{ width: '5%', background: '#00D4FF', boxShadow: '0 0 8px rgba(0,212,255,0.4)' }} />
                <div style={{ width: '1.5%', background: '#9CA3AF' }} />
                <div style={{ width: '1.5%', background: '#8B5CF6' }} />
              </div>
              <div className="flex items-center justify-center gap-3 flex-wrap mt-2">
                {[
                  { emoji: '🪙', label: 'Fan tokens', color: '#00FF41', pct: '92%' },
                  { emoji: '🎤', label: 'Artist', color: '#00D4FF', pct: '5%' },
                  { emoji: '⚙️', label: 'Infrastructure', color: '#9CA3AF', pct: '1.5%' },
                  { emoji: '🏛', label: 'Treasury', color: '#8B5CF6', pct: '1.5%' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <span style={{ fontSize: '12px' }}>{item.emoji}</span>
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                    <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.5)' }}>{item.label}</span>
                    <span className="text-[11px] font-bold font-mono" style={{ color: item.color }}>{item.pct}</span>
                  </div>
                ))}
              </div>
            </div>
          </FadeSection>

          {/* Footer */}
          <FadeSection delay={0.5}>
            <div className="text-center space-y-2 pt-4">
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>
                Token price is set live by the <span style={{ color: '#00FF41', fontWeight: 700 }}>SOL/USD oracle</span> at purchase time — no fixed amounts, no stale numbers.{' '}
                Artists earn <span style={{ color: '#00D4FF', fontWeight: 700 }}>2% perpetual creator fees</span> on every trade, forever (plus 1.5% infra + 1.5% treasury = 5% total trading fee).
              </p>
              <p
                className="text-xs font-black uppercase tracking-widest"
                style={{
                  color: '#00D4FF',
                  textShadow: '0 0 8px rgba(0,212,255,0.3)',
                  fontFamily: "'Archivo Black', sans-serif",
                }}
              >
                Transparent • Sustainable • Fan-First
              </p>
            </div>
          </FadeSection>
        </div>
      </section>

      {/* ── COMPARISON TABLE ── */}
      <section style={{ ...sectionStyle, background: '#060A06' }}>
        <div className="max-w-4xl mx-auto px-6">
          <FadeSection>
            <h2
              className="text-3xl sm:text-4xl font-black text-center mb-12"
              style={{ color: '#fff' }}
            >
              How We Stack Up
            </h2>
          </FadeSection>
          <ComparisonTable />
        </div>
      </section>

      {/* ── CTA ── */}
      <section
        style={{
          ...sectionStyle,
          background: 'linear-gradient(180deg, #060A06 0%, #0A1A0E 100%)',
        }}
      >
        <div className="max-w-2xl mx-auto px-6 text-center">
          <FadeSection>
            <h2
              className="text-3xl sm:text-5xl font-black mb-6"
              style={{
                background: 'linear-gradient(135deg, #fff 0%, #00FF41 60%, #00D4FF 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '-0.02em',
              }}
            >
              Ready to own music?
            </h2>
            <p className="text-base mb-10" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Join thousands of fans already building portfolios from the music they love.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link
                to="/"
                className="px-8 py-3.5 rounded-xl font-bold text-sm transition-all hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, #00FF41, #06d6a0)',
                  color: '#000',
                  boxShadow: '0 0 32px rgba(0, 255, 65, 0.5)',
                }}
              >
                Browse Songs
              </Link>
              <Link
                to="/create"
                className="px-8 py-3.5 rounded-xl font-bold text-sm transition-all hover:scale-105"
                style={{
                  background: 'rgba(0, 255, 65, 0.06)',
                  border: '1px solid rgba(0, 255, 65, 0.35)',
                  color: '#00FF41',
                }}
              >
                Launch Your Song
              </Link>
            </div>
            <p className="mt-8 text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Also read:{' '}
              <Link to="/tokenomics" style={{ color: '#00FF41' }}>
                Tokenomics Whitepaper
              </Link>
            </p>
          </FadeSection>
        </div>
      </section>
    </div>
  );
};

export default AboutPage;
