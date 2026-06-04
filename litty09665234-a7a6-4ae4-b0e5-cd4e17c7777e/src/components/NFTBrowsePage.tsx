import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useRealtimeData } from '@/hooks/use-realtime-data';
import { subscribeManySongDetails, SongDetailsResponse } from '@/lib/collections/songDetails';
import { subscribe } from '@/lib/db-client';
import { useAuth } from '@/hooks/use-privy-auth';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Clock, DollarSign, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { InfrastructureTooltip, InfrastructureBadge } from '@/components/PlatformFeeTooltip';
import { isSeedSong } from '@/utils/songFilters';

interface SongNftsResponse {
  songId?: string;
  artistAddress?: string;
  collectionName?: string;
  nftName?: string;
  symbol?: string;
  uri?: string;
  supply?: number;
  priceLamports?: number;
  createdAt?: number;
  id: string;
  tarobase_created_at: number;
}

type SortOption = 'trending' | 'newest' | 'price';

const NFTBrowsePage: React.FC = () => {
  const { user, login } = useAuth();
  const isAuthenticated = !!user;
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [nfts, setNfts] = useState<SongNftsResponse[]>([]);

  // Subscribe to NFT data using direct subscribe
  useEffect(() => {
    let unsubscribe: (() => Promise<void>) | undefined;

    subscribe("songNfts", {
      onData: (data) => { setNfts(Array.isArray(data) ? data as SongNftsResponse[] : []); },
      onError: (error) => { console.error(`Error subscribing to songNfts: ${error}`); }
    }).then(fn => { unsubscribe = fn; });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Subscribe to details data
  const { data: allDetails } = useRealtimeData<SongDetailsResponse[]>(
    subscribeManySongDetails,
    true,
  );

  // Build details map for cover image lookup (excluding seed songs)
  const detailsMap = useMemo(() => {
    const map: Record<string, SongDetailsResponse> = {};
    (allDetails ?? []).filter((d) => !isSeedSong(d as any)).forEach(d => { map[d.id] = d; });
    return map;
  }, [allDetails]);

  // Sort NFTs (drop any NFT whose songId is a seed or has no approved details)
  const sortedNfts = useMemo(() => {
    const list = [...(nfts ?? [])].filter((n) => {
      if (n.songId && isSeedSong({ id: n.songId })) return false;
      return true;
    });
    if (sortBy === 'newest') {
      return list.sort((a, b) => (b.tarobase_created_at ?? 0) - (a.tarobase_created_at ?? 0));
    }
    if (sortBy === 'price') {
      return list.sort((a, b) => (a.priceLamports ?? 0) - (b.priceLamports ?? 0));
    }
    // trending - use supply as proxy (lower supply = more exclusive = trending)
    return list.sort((a, b) => (a.supply ?? 0) - (b.supply ?? 0));
  }, [nfts, sortBy]);

  const formatPrice = (lamports: number) => {
    const sol = lamports / 1e9;
    return sol.toFixed(2);
  };

  const shortAddress = (addr: string) => {
    if (!addr || addr.length < 10) return addr;
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };

  const handleMint = async (nft: SongNftsResponse) => {
    if (!isAuthenticated) {
      toast.error('Sign in to mint');
      login();
      return;
    }
    toast.info(`Minting ${nft.nftName}... This would trigger the mint transaction.`);
    // The actual mint flow would call createSongNfts to mint to user's wallet
  };

  return (
    <div className="min-h-screen" style={{ background: 'transparent' }}>
      
      <div className="pt-20 pb-24">
        {/* Hero Section */}
        <div className="relative overflow-hidden py-16 px-4">
          <div
            className="absolute inset-0 opacity-30"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.4) 0%, transparent 70%)',
            }}
          />
          <div className="relative max-w-4xl mx-auto text-center">
            <h1 className="text-5xl font-black mb-4 flex items-center justify-center gap-3">
              <Sparkles size={40} style={{ color: '#a78bfa' }} />
              <span className="bg-clip-text text-transparent" style={{
                backgroundImage: 'linear-gradient(135deg, #e0d7ff, #a78bfa, #f472b6)',
              }}>
                Collect the Music
              </span>
            </h1>
            <p className="text-lg mb-2" style={{ color: 'rgba(220,214,240,0.6)' }}>
              Album bundles, limited editions, and exclusive collectibles from your favorite artists
            </p>
            <p className="text-sm" style={{ color: 'rgba(220,214,240,0.4)' }}>
              Each NFT is a unique piece of music history, minted on Solana
            </p>
          </div>
        </div>

        {/* Sort/Filter Bar */}
        <div className="max-w-6xl mx-auto px-4 mb-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">
              {sortedNfts.length} NFT{sortedNfts.length !== 1 ? 's' : ''} Available
            </h2>
            <div className="flex gap-2">
              {[
                { key: 'newest' as SortOption, label: 'Newest', icon: <Clock size={14} /> },
                { key: 'trending' as SortOption, label: 'Trending', icon: <TrendingUp size={14} /> },
                { key: 'price' as SortOption, label: 'Price', icon: <DollarSign size={14} /> },
              ].map(sort => (
                <button
                  key={sort.key}
                  onClick={() => setSortBy(sort.key)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: sortBy === sort.key ? 'rgba(139,92,246,0.3)' : 'rgba(0,0,0,0.3)',
                    border: `1px solid ${sortBy === sort.key ? 'rgba(139,92,246,0.5)' : 'rgba(139,92,246,0.15)'}`,
                    color: sortBy === sort.key ? '#e0d7ff' : 'rgba(220,214,240,0.5)',
                  }}
                >
                  {sort.icon}
                  {sort.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* NFT Grid */}
        <div className="max-w-6xl mx-auto px-4">
          {sortedNfts.length === 0 ? (
            <div
              className="text-center py-16 rounded-2xl"
              style={{
                background: 'rgba(30,20,60,0.3)',
                border: '1px solid rgba(139,92,246,0.1)',
              }}
            >
              <div className="text-4xl mb-4">🎨</div>
              <h3 className="text-xl font-bold text-white mb-2">No NFTs yet</h3>
              <p className="text-sm" style={{ color: 'rgba(220,214,240,0.5)' }}>
                Be the first to launch an NFT bundle for your song!
              </p>
              <Link to="/create">
                <button
                  className="mt-4 px-6 py-2 rounded-xl font-semibold text-sm"
                  style={{
                    background: 'linear-gradient(135deg, rgba(139,92,246,0.5), rgba(236,72,153,0.35))',
                    border: '1px solid rgba(139,92,246,0.4)',
                    color: '#e0d7ff',
                  }}
                >
                  Create Song with NFT
                </button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedNfts.map(nft => {
                const details = nft.songId ? detailsMap[nft.songId] : undefined;
                return (
                  <div
                    key={nft.id}
                    className="rounded-2xl overflow-hidden transition-all hover:scale-[1.02]"
                    style={{
                      background: 'linear-gradient(145deg, rgba(30,20,60,0.9) 0%, rgba(15,10,30,0.95) 100%)',
                      border: '1px solid rgba(139,92,246,0.2)',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                    }}
                  >
                    {/* Cover Image */}
                    <div className="relative aspect-square overflow-hidden">
                      {details?.coverImage ? (
                        <img
                          src={details.coverImage}
                          alt={nft.nftName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center"
                          style={{ background: 'rgba(139,92,246,0.2)' }}
                        >
                          <span className="text-4xl">🎵</span>
                        </div>
                      )}
                      {/* Supply Badge */}
                      <div className="absolute top-3 right-3">
                        <Badge
                          style={{
                            background: 'rgba(0,0,0,0.7)',
                            border: '1px solid rgba(139,92,246,0.3)',
                            color: '#e0d7ff',
                          }}
                          className="text-xs font-bold"
                        >
                          {nft.supply === 1 ? '1/1 UNIQUE' : `Ed. of ${nft.supply}`}
                        </Badge>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="p-4">
                      <h3 className="font-bold text-white truncate mb-1">{nft.nftName}</h3>
                      <p className="text-xs mb-3" style={{ color: 'rgba(220,214,240,0.5)' }}>
                        {nft.collectionName}
                      </p>

                      {/* Artist */}
                      <div className="flex items-center gap-2 mb-4">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                          style={{ background: 'linear-gradient(135deg, #7c3aed, #ec4899)' }}
                        >
                          {(nft.artistAddress || '?').slice(2, 4).toUpperCase()}
                        </div>
                        <span className="text-xs" style={{ color: 'rgba(220,214,240,0.6)' }}>
                          by @{shortAddress(nft.artistAddress || '')}
                        </span>
                      </div>

                      {/* Price & Mint */}
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <div className="text-xs" style={{ color: 'rgba(220,214,240,0.4)' }}>Price</div>
                            <InfrastructureBadge compact />
                          </div>
                          <div
                            className="font-bold text-lg"
                            style={{ color: '#00D4FF', fontFamily: "'Inter', monospace" }}
                          >
                            {formatPrice(nft.priceLamports ?? 0)} SOL
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px]" style={{ color: 'rgba(220,214,240,0.35)' }}>
                              +3% platform fee
                            </span>
                            <InfrastructureTooltip compact />
                          </div>
                        </div>
                        <button
                          onClick={() => handleMint(nft)}
                          disabled={!isAuthenticated}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
                          style={{
                            background: 'linear-gradient(135deg, #6d28d9, #8b5cf6)',
                            color: 'white',
                            boxShadow: '0 0 15px rgba(139,92,246,0.3)',
                          }}
                        >
                          <Sparkles size={14} />
                          Mint
                        </button>
                      </div>

                      {/* Song Link */}
                      {details && (
                        <Link
                          to={`/song/${nft.songId}`}
                          className="block mt-3 text-xs text-center py-1.5 rounded-lg transition-all"
                          style={{
                            background: 'rgba(0,0,0,0.3)',
                            color: 'rgba(220,214,240,0.5)',
                            border: '1px solid rgba(139,92,246,0.1)',
                          }}
                        >
                          View Song: {details.title}
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NFTBrowsePage;