/**
 * LaunchPage — "Launch Your Project" hub
 * Dark neon theme with #00FF41 green accents, Orbitron headings
 */
import { PageLayout, HeroSection, FeatureCard } from '@/components/poof-ui';
import { Rocket, Shield, Music, Wallet, Coins, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
const orbitronFont = "'Archivo Black', sans-serif";
const NEON_GREEN = '#00FF41';

const features = [
  {
    icon: Music,
    title: 'Mint Music NFTs',
    description: 'Turn your tracks into collectible editions on Solana. Set supply, pricing, and royalty splits.',
  },
  {
    icon: Shield,
    title: 'Own Your Rights',
    description: 'Smart contracts enforce ownership and royalties automatically. No middlemen, no disputes.',
  },
  {
    icon: Coins,
    title: 'Instant Payouts',
    description: 'Earn SOL directly from fans. Revenue splits execute on-chain the moment a purchase is made.',
  },
  {
    icon: Zap,
    title: 'One-Click Launch',
    description: 'Upload your art, set your terms, and go live. The entire pipeline is handled for you.',
  },
];

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.4 },
  }),
};

export default function LaunchPage() {
  const navigate = useNavigate();

  return (
    <PageLayout>
      <div style={{ minHeight: '100vh' }}>
        {/* Hero Section */}
        <div
          style={{
            position: 'relative',
            padding: '80px 20px 60px',
            textAlign: 'center',
            background: 'linear-gradient(180deg, rgba(0, 255, 65, 0.06) 0%, transparent 60%)',
            overflow: 'hidden',
          }}
        >
          {/* Glow effect behind title */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 400,
              height: 400,
              borderRadius: '50%',
              background: `radial-gradient(circle, rgba(0, 255, 65, 0.15) 0%, transparent 70%)`,
              filter: 'blur(60px)',
              pointerEvents: 'none',
            }}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            style={{ position: 'relative', zIndex: 1 }}
          >
            {/* Rocket icon */}
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: 'rgba(0, 255, 65, 0.1)',
                border: `1.5px solid rgba(0, 255, 65, 0.3)`,
                marginBottom: 24,
                boxShadow: `0 0 30px rgba(0, 255, 65, 0.15)`,
              }}
            >
              <Rocket size={32} color={NEON_GREEN} />
            </motion.div>

            {/* Title */}
            <h1
              style={{
                fontSize: 'clamp(2rem, 6vw, 3.5rem)',
                fontWeight: 800,
                fontFamily: orbitronFont,
                color: '#ffffff',
                margin: '0 0 8px',
                letterSpacing: '0.02em',
                textShadow: `0 0 20px rgba(0, 255, 65, 0.3)`,
              }}
            >
              Launch Your{' '}
              <span style={{ color: NEON_GREEN }}>Project</span>
            </h1>

            {/* Subtitle */}
            <p
              style={{
                fontSize: 'clamp(0.9rem, 2.5vw, 1.15rem)',
                color: '#a1a1aa',
                maxWidth: 560,
                margin: '0 auto 32px',
                lineHeight: 1.6,
              }}
            >
              Mint music, albums, and collectibles on Solana. Set your own terms, own your rights, and connect directly with fans.
            </p>

            {/* CTA Button */}
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: `0 0 30px rgba(0, 255, 65, 0.35)` }}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate('/create')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                padding: '14px 36px',
                fontSize: '1rem',
                fontWeight: 700,
                fontFamily: orbitronFont,
                color: '#0a0a0a',
                background: NEON_GREEN,
                border: 'none',
                borderRadius: '999px',
                cursor: 'pointer',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                boxShadow: `0 0 20px rgba(0, 255, 65, 0.25)`,
                transition: 'box-shadow 0.2s',
              }}
            >
              <Rocket size={18} />
              Start Creating
            </motion.button>
          </motion.div>
        </div>

        {/* Features Grid */}
        <div style={{ padding: '40px 20px 80px', maxWidth: 900, margin: '0 auto' }}>
          <h2
            style={{
              fontSize: 'clamp(1.2rem, 3vw, 1.6rem)',
              fontWeight: 700,
              fontFamily: orbitronFont,
              color: '#ffffff',
              textAlign: 'center',
              marginBottom: 40,
              letterSpacing: '0.04em',
            }}
          >
            How It <span style={{ color: NEON_GREEN }}>Works</span>
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 20,
            }}
          >
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                custom={index}
                initial="hidden"
                animate="visible"
                variants={itemVariants}
              >
                <FeatureCard
                  icon={<feature.icon size={24} color={NEON_GREEN} />}
                  title={feature.title}
                  description={feature.description}
                />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Bottom CTA Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
          style={{
            margin: '0 20px 80px',
            maxWidth: 700,
            marginLeft: 'auto',
            marginRight: 'auto',
            padding: '32px 24px',
            borderRadius: 16,
            background: 'linear-gradient(135deg, rgba(0, 255, 65, 0.08) 0%, rgba(0, 255, 65, 0.02) 100%)',
            border: '1px solid rgba(0, 255, 65, 0.15)',
            textAlign: 'center',
          }}
        >
          <Wallet
            size={28}
            color={NEON_GREEN}
            style={{ marginBottom: 12 }}
          />
          <h3
            style={{
              fontSize: '1.2rem',
              fontWeight: 700,
              fontFamily: orbitronFont,
              color: '#ffffff',
              margin: '0 0 8px',
            }}
          >
            Ready to Go Live?
          </h3>
          <p
            style={{
              fontSize: '0.9rem',
              color: '#a1a1aa',
              margin: '0 0 20px',
              lineHeight: 1.5,
            }}
          >
            Connect your wallet, upload your project, and launch to the world in minutes.
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/create')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 28px',
              fontSize: '0.85rem',
              fontWeight: 600,
              fontFamily: orbitronFont,
              color: NEON_GREEN,
              background: 'transparent',
              border: `1.5px solid rgba(0, 255, 65, 0.4)`,
              borderRadius: '999px',
              cursor: 'pointer',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              transition: 'all 0.2s',
            }}
          >
            <Rocket size={16} />
            Launch Now
          </motion.button>
        </motion.div>
      </div>
    </PageLayout>
  );
}
