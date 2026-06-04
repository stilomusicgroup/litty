import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Edit3, Link2, ExternalLink, Check, X, ChevronDown } from 'lucide-react';
import { updateUsers, setUsers } from '@/lib/collections/users';
import type { UsersResponse } from '@/lib/collections/users';
import { Address } from '@/lib/db-client';

// react-icons brands
import {
  FaXTwitter,
  FaInstagram,
  FaSpotify,
  FaTiktok,
  FaYoutube,
  FaTwitch,
  FaSoundcloud,
  FaFacebook,
  FaLinkedin,
  FaTelegram,
  FaGlobe,
} from 'react-icons/fa6';
import { SiKick } from 'react-icons/si';

const NEON_GREEN = '#00FF41';
const GLASS_CARD: Record<string, string> = {
  background: 'rgba(255, 255, 255, 0.05)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
};

interface SocialLinks {
  twitter?: string;
  instagram?: string;
  spotify?: string;
  tiktok?: string;
  youtube?: string;
  twitch?: string;
  kick?: string;
  soundcloud?: string;
  facebook?: string;
  linkedin?: string;
  telegram?: string;
  website?: string;
}

interface SocialLinksCardProps {
  userProfile: UsersResponse | null;
  isOwn: boolean;
  userAddress: string;
}

type PlatformKey = keyof SocialLinks;

interface PlatformConfig {
  key: PlatformKey;
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string; style?: React.CSSProperties }>;
  placeholder: string;
  baseUrl: string;
}

const PLATFORM_CONFIG: PlatformConfig[] = [
  {
    key: 'twitter',
    label: 'Twitter / X',
    icon: FaXTwitter,
    placeholder: 'username or full URL',
    baseUrl: 'https://x.com/',
  },
  {
    key: 'instagram',
    label: 'Instagram',
    icon: FaInstagram,
    placeholder: 'username or full URL',
    baseUrl: 'https://instagram.com/',
  },
  {
    key: 'spotify',
    label: 'Spotify',
    icon: FaSpotify,
    placeholder: 'artist URL or username',
    baseUrl: 'https://open.spotify.com/artist/',
  },
  {
    key: 'tiktok',
    label: 'TikTok',
    icon: FaTiktok,
    placeholder: 'username or full URL',
    baseUrl: 'https://tiktok.com/@',
  },
  {
    key: 'youtube',
    label: 'YouTube',
    icon: FaYoutube,
    placeholder: 'handle or full URL',
    baseUrl: 'https://youtube.com/@',
  },
  {
    key: 'twitch',
    label: 'Twitch',
    icon: FaTwitch,
    placeholder: 'channel or full URL',
    baseUrl: 'https://twitch.tv/',
  },
  {
    key: 'kick',
    label: 'Kick',
    icon: SiKick,
    placeholder: 'channel or full URL',
    baseUrl: 'https://kick.com/',
  },
  {
    key: 'soundcloud',
    label: 'SoundCloud',
    icon: FaSoundcloud,
    placeholder: 'username or full URL',
    baseUrl: 'https://soundcloud.com/',
  },
  {
    key: 'facebook',
    label: 'Facebook',
    icon: FaFacebook,
    placeholder: 'username or full URL',
    baseUrl: 'https://facebook.com/',
  },
  {
    key: 'linkedin',
    label: 'LinkedIn',
    icon: FaLinkedin,
    placeholder: 'username or full URL',
    baseUrl: 'https://linkedin.com/in/',
  },
  {
    key: 'telegram',
    label: 'Telegram',
    icon: FaTelegram,
    placeholder: 'username or full URL',
    baseUrl: 'https://t.me/',
  },
  {
    key: 'website',
    label: 'Website',
    icon: FaGlobe,
    placeholder: 'https://yoursite.com',
    baseUrl: '',
  },
];

const SECTIONS: { title: string; keys: PlatformKey[] }[] = [
  { title: 'Social', keys: ['twitter', 'instagram', 'facebook', 'linkedin'] },
  { title: 'Music', keys: ['spotify', 'soundcloud', 'youtube'] },
  { title: 'Live', keys: ['twitch', 'kick'] },
  { title: 'Pro', keys: ['telegram', 'website'] },
];

const PLATFORM_MAP = new Map<PlatformKey, PlatformConfig>(
  PLATFORM_CONFIG.map((p) => [p.key, p])
);

function normalizeUrl(value: string, baseUrl: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  if (trimmed.startsWith('@')) {
    if (baseUrl) return baseUrl + trimmed.slice(1);
    return 'https://' + trimmed.slice(1);
  }
  if (baseUrl) return baseUrl + trimmed;
  return 'https://' + trimmed;
}

function displayUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname.replace(/^\//, '') || u.hostname;
  } catch {
    return url;
  }
}

const KickFallbackIcon: React.FC<{ size?: number; color?: string }> = ({ size = 16, color = '#fff' }) => (
  <div
    className="flex items-center justify-center font-black"
    style={{
      width: size,
      height: size,
      fontSize: size * 0.6,
      color,
      fontFamily: "'Archivo Black', sans-serif",
    }}
  >
    K
  </div>
);

const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
  <div className="flex items-center gap-2 mb-2 mt-1">
    <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
    <span
      className="text-[10px] font-black uppercase tracking-widest"
      style={{ color: 'rgba(255,255,255,0.3)' }}
    >
      {title}
    </span>
    <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.06)' }} />
  </div>
);

const SocialLinksCard: React.FC<SocialLinksCardProps> = ({ userProfile, isOwn, userAddress }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    Social: true,
    Music: true,
    Live: true,
    Pro: true,
  });

  const socials: SocialLinks = {
    twitter: (userProfile as any)?.twitter || '',
    instagram: (userProfile as any)?.instagram || '',
    spotify: (userProfile as any)?.spotify || '',
    tiktok: (userProfile as any)?.tiktok || '',
    youtube: (userProfile as any)?.youtube || '',
    twitch: (userProfile as any)?.twitch || '',
    kick: (userProfile as any)?.kick || '',
    soundcloud: (userProfile as any)?.soundcloud || '',
    facebook: (userProfile as any)?.facebook || '',
    linkedin: (userProfile as any)?.linkedin || '',
    telegram: (userProfile as any)?.telegram || '',
    website: (userProfile as any)?.website || '',
  };

  const [form, setForm] = useState<SocialLinks>({ ...socials });

  const hasAnyLink = Object.values(socials).some((v) => Boolean(v));

  const handleSave = async () => {
    setIsSaving(true);

    const socialPayload: Record<string, string> = {};
    PLATFORM_CONFIG.forEach((platform) => {
      const raw = (form[platform.key] as string) || '';
      socialPayload[platform.key] = raw.trim() ? normalizeUrl(raw, platform.baseUrl) : '';
    });

    let success: boolean;
    if (userProfile) {
      success = await updateUsers(userAddress, {
        ...userProfile,
        ...socialPayload,
        walletAddress: Address.publicKey(userAddress),
      } as any);
    } else {
      success = await setUsers(userAddress, {
        ...socialPayload,
        walletAddress: Address.publicKey(userAddress),
      });
    }

    if (success) {
      toast.success('Social links updated');
      setIsEditing(false);
    } else {
      toast.error('Failed to update social links');
    }
    setIsSaving(false);
  };

  const openLink = (url: string) => {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const toggleSection = (title: string) => {
    setExpandedSections((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const startEditing = () => {
    setForm({ ...socials });
    setExpandedSections({ Social: true, Music: true, Live: true, Pro: true });
    setIsEditing(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-2xl p-4 mt-4"
      style={GLASS_CARD}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Link2 size={14} style={{ color: NEON_GREEN }} />
          <h4
            className="text-xs font-black uppercase tracking-widest"
            style={{ color: NEON_GREEN, fontFamily: "'Archivo Black', monospace" }}
          >
            Social Links
          </h4>
        </div>
        {isOwn && !isEditing && (
          <motion.button
            onClick={startEditing}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.6)',
            }}
          >
            <Edit3 size={10} />
            {hasAnyLink ? 'Edit' : 'Add'}
          </motion.button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {isEditing ? (
          <motion.div
            key="edit"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-1"
          >
            {SECTIONS.map((section) => {
              const isExpanded = expandedSections[section.title];
              return (
                <div key={section.title} className="mb-2">
                  <button
                    onClick={() => toggleSection(section.title)}
                    className="w-full flex items-center justify-between py-1"
                  >
                    <SectionHeader title={section.title} />
                    <motion.div
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown size={12} style={{ color: 'rgba(255,255,255,0.3)' }} />
                    </motion.div>
                  </button>
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-2 overflow-hidden"
                      >
                        {section.keys.map((key) => {
                          const platform = PLATFORM_MAP.get(key)!;
                          const Icon = platform.icon;
                          return (
                            <div key={key}>
                              <label
                                className="text-[10px] font-bold uppercase tracking-wider mb-1 block"
                                style={{ color: 'rgba(255,255,255,0.4)' }}
                              >
                                {platform.label}
                              </label>
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                                  style={{
                                    background: 'rgba(255,255,255,0.04)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                  }}
                                >
                                  <Icon size={14} color="rgba(255,255,255,0.5)" />
                                </div>
                                <input
                                  type="text"
                                  value={(form[key] as string) || ''}
                                  onChange={(e) =>
                                    setForm((prev) => ({ ...prev, [key]: e.target.value }))
                                  }
                                  placeholder={platform.placeholder}
                                  className="flex-1 h-9 px-3 rounded-xl text-xs font-bold bg-transparent outline-none"
                                  style={{
                                    border: '1px solid rgba(255,255,255,0.12)',
                                    color: '#fff',
                                    fontFamily: "'Archivo Black', monospace",
                                  }}
                                />
                                <motion.button
                                  type="button"
                                  onClick={() => {
                                    const raw = (form[key] as string) || '';
                                    if (!raw.trim()) return;
                                    const url = normalizeUrl(raw, platform.baseUrl);
                                    window.open(url, '_blank', 'noopener,noreferrer');
                                  }}
                                  whileHover={{ scale: 1.08 }}
                                  whileTap={{ scale: 0.92 }}
                                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                                  style={{
                                    background: 'rgba(0, 255, 65, 0.08)',
                                    border: '1px solid rgba(0, 255, 65, 0.2)',
                                  }}
                                  title="Test link"
                                >
                                  <ExternalLink size={14} style={{ color: NEON_GREEN }} />
                                </motion.button>
                              </div>
                            </div>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
            <div className="flex gap-2 pt-2">
              <motion.button
                onClick={handleSave}
                disabled={isSaving}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 h-9 rounded-xl font-bold text-xs flex items-center justify-center gap-2"
                style={{
                  background: `linear-gradient(135deg, ${NEON_GREEN}, #00e013)`,
                  color: '#000',
                  fontFamily: "'Archivo Black', monospace",
                }}
              >
                {isSaving ? (
                  <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Check size={12} />
                )}
                Save
              </motion.button>
              <motion.button
                onClick={() => setIsEditing(false)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex-1 h-9 rounded-xl font-bold text-xs flex items-center justify-center gap-2"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff',
                  fontFamily: "'Archivo Black', monospace",
                }}
              >
                <X size={12} /> Cancel
              </motion.button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-2"
          >
            {hasAnyLink ? (
              PLATFORM_CONFIG.map((platform) => {
                const url = socials[platform.key];
                if (!url) return null;
                const Icon = platform.icon;
                return (
                  <motion.button
                    key={platform.key}
                    onClick={() => openLink(url)}
                    whileHover={{ scale: 1.01, borderColor: 'rgba(0, 255, 65, 0.25)' }}
                    whileTap={{ scale: 0.99 }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: `${NEON_GREEN}12`, border: `1px solid ${NEON_GREEN}30` }}
                    >
                      <Icon size={14} color={NEON_GREEN} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-[10px] font-bold uppercase tracking-wider"
                        style={{ color: 'rgba(255,255,255,0.35)' }}
                      >
                        {platform.label}
                      </p>
                      <p
                        className="text-xs font-bold truncate"
                        style={{
                          color: 'rgba(255,255,255,0.7)',
                          fontFamily: "'Archivo Black', monospace",
                        }}
                      >
                        {displayUrl(url)}
                      </p>
                    </div>
                    <ExternalLink size={12} style={{ color: 'rgba(255,255,255,0.3)' }} />
                  </motion.button>
                );
              })
            ) : (
              <p className="text-xs text-center py-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {isOwn ? 'Add your social links to connect with fans.' : 'No social links yet.'}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default SocialLinksCard;
