import { useRealtimeData } from '@/hooks/use-realtime-data';
import { subscribeManyEditions, EditionsResponse } from '@/lib/collections/editions';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, Music, Lock } from 'lucide-react';
import { PageLayout } from '@/components/poof-ui';
import { SongGridSkeleton } from '@/components/Skeleton';

const lamportsToSol = (lamports: number) => (lamports / 1_000_000_000).toFixed(3);

const EditionCard = ({ edition }: { edition: EditionsResponse }) => {
  const sold = edition.editionSize - edition.remaining;
  const soldPercent = (sold / edition.editionSize) * 100;
  const isSoldOut = edition.remaining === 0;
  const isAlmostGone = !isSoldOut && edition.remaining <= 3;

  const statusBadge = isSoldOut
    ? { label: 'Sold Out', color: 'bg-red-500/20 text-red-400 border-red-500/30' }
    : isAlmostGone
    ? { label: 'Almost Gone', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' }
    : { label: 'Available', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className="group relative"
    >
      {/* Glow effect for available editions */}
      {!isSoldOut && (
        <div
          className="absolute -inset-0.5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{
            background: 'linear-gradient(135deg, #818cf8 0%, #ec4899 50%, #818cf8 100%)',
            filter: 'blur(12px)',
            zIndex: -1,
          }}
        />
      )}

      <Link
        to={`/edition/${edition.id}`}
        className={`block rounded-2xl overflow-hidden border transition-all duration-300 ${
          isSoldOut
            ? 'bg-card/50 border-white/5 grayscale hover:grayscale-0'
            : 'bg-card border-white/10 hover:border-primary/30'
        }`}
      >
        {/* Cover Art */}
        <div className="relative aspect-square overflow-hidden">
          {edition.coverImage ? (
            <img
              src={edition.coverImage}
              alt={edition.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-violet-900/50 to-fuchsia-900/50 flex items-center justify-center">
              <Music size={64} className="text-white/20" />
            </div>
          )}

          {/* Status Badge Overlay */}
          <div className="absolute top-3 right-3">
            <span
              className={`px-3 py-1 text-xs font-bold rounded-full border ${statusBadge.color}`}
              style={{ fontFamily: "'Inter', monospace" }}
            >
              {statusBadge.label}
            </span>
          </div>

          {/* Edition Size Badge */}
          <div className="absolute bottom-3 left-3">
            <span
              className="px-3 py-1.5 text-sm font-bold rounded-lg backdrop-blur-md"
              style={{
                background: 'rgba(0,0,0,0.7)',
                color: '#818cf8',
                border: '1px solid rgba(129,140,248,0.3)',
                fontFamily: "'Inter', monospace",
              }}
            >
              {edition.remaining} of {edition.editionSize}
            </span>
          </div>

          {/* Sold Out Lock Overlay */}
          {isSoldOut && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <Lock size={48} className="text-white/40" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4 space-y-3">
          <div>
            <h3
              className="font-bold text-lg truncate"
              style={{ color: 'hsl(var(--foreground))' }}
            >
              {edition.title}
            </h3>
            <p className="text-sm text-muted-foreground truncate">{edition.artist}</p>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Sold</span>
              <span
                style={{
                  color: isSoldOut ? '#ef4444' : isAlmostGone ? '#f59e0b' : '#818cf8',
                  fontFamily: "'Inter', monospace",
                }}
              >
                {sold}/{edition.editionSize}
              </span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${soldPercent}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="h-full rounded-full"
                style={{
                  background: isSoldOut
                    ? '#ef4444'
                    : isAlmostGone
                    ? 'linear-gradient(90deg, #f59e0b, #ef4444)'
                    : 'linear-gradient(90deg, #818cf8, #c084fc)',
                }}
              />
            </div>
          </div>

          {/* Price */}
          <div className="flex items-center justify-between pt-2">
            <span
              className="text-xl font-bold"
              style={{
                color: '#818cf8',
                fontFamily: "'Inter', monospace",
              }}
            >
              {lamportsToSol(edition.priceSol)} SOL
            </span>
            <span
              className="text-xs px-2 py-1 rounded"
              style={{
                background: 'rgba(129,140,248,0.1)',
                color: '#a78bfa',
                border: '1px solid rgba(129,140,248,0.2)',
              }}
            >
              {edition.editionTokenSymbol}
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

const CollectiblesPage: React.FC = () => {
  const { data: editions, loading, error } = useRealtimeData<EditionsResponse[]>(
    subscribeManyEditions,
    true,
    ''
  );

  return (
    <PageLayout>
            {/* Hero Section */}
      <section className="relative overflow-hidden pt-24 sm:pt-32 pb-12 sm:pb-20 px-4 sm:px-6">
        {/* Background Effects */}
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background:
              'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(129, 140, 248, 0.4), transparent)',
          }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-20"
          style={{
            background:
              'radial-gradient(circle, rgba(236, 72, 153, 0.3) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />

        <div className="relative container mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
            style={{
              background: 'rgba(129, 140, 248, 0.1)',
              border: '1px solid rgba(129, 140, 248, 0.2)',
            }}
          >
            <Sparkles size={16} className="text-violet-400" />
            <span className="text-sm text-violet-300">Limited Edition Releases</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-5xl md:text-7xl font-black mb-4 sm:mb-6"
            style={{
              background: 'linear-gradient(135deg, #fff 0%, #a78bfa 50%, #f0abfc 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Collect the Music
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-base sm:text-xl text-muted-foreground max-w-2xl mx-auto px-2"
          >
            Exclusive limited-edition collectibles from your favorite artists. Each edition
            is a unique fusion of art and sound, minting an NFT with bundled Song Coins.
          </motion.p>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex justify-center gap-4 sm:gap-8 mt-6 sm:mt-10"
          >
            <div className="text-center">
              <p
                className="text-2xl sm:text-3xl font-bold"
                style={{ color: '#818cf8', fontFamily: "'Inter', monospace" }}
              >
                {editions?.length ?? 0}
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground">Total Editions</p>
            </div>
            <div
              className="w-px"
              style={{ background: 'rgba(255,255,255,0.1)' }}
            />
            <div className="text-center">
              <p
                className="text-2xl sm:text-3xl font-bold"
                style={{ color: '#f0abfc', fontFamily: "'Inter', monospace" }}
              >
                {editions?.filter((e) => e.remaining > 0).length ?? 0}
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground">Available Now</p>
            </div>
            <div
              className="w-px"
              style={{ background: 'rgba(255,255,255,0.1)' }}
            />
            <div className="text-center">
              <p
                className="text-2xl sm:text-3xl font-bold"
                style={{ color: '#34d399', fontFamily: "'Inter', monospace" }}
              >
                1-{editions ? Math.max(...editions.map((e) => e.editionSize), 1) : 20}
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground">Edition Size</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Editions Grid */}
      <section className="container mx-auto px-4 sm:px-6 pb-20">
        {loading ? (
          <SongGridSkeleton count={8} />
        ) : error ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div
              className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-6"
              style={{ background: 'rgba(239, 68, 68, 0.1)' }}
            >
              <Music size={40} className="text-red-400" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Failed to load collectibles</h3>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              Something went wrong while loading editions. Please try again.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 rounded-xl font-bold text-sm"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: 'white' }}
            >
              Retry
            </button>
          </motion.div>
        ) : editions && editions.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
            {editions.map((edition, index) => (
              <motion.div
                key={edition.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <EditionCard edition={edition} />
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div
              className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-6"
              style={{ background: 'rgba(129, 140, 248, 0.1)' }}
            >
              <Music size={40} className="text-violet-400" />
            </div>
            <h3 className="text-2xl font-bold mb-2">No Collectibles Yet</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Be the first to release a limited-edition collectible. Each edition is a unique
              opportunity for fans to own a piece of music history.
            </p>
          </motion.div>
        )}
      </section>
    </PageLayout>
  );
};

export default CollectiblesPage;
