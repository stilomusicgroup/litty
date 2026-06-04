import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/use-privy-auth';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Upload, Music, Image, ArrowLeft, Rocket, Check, Loader2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { setSongs, getManySongs } from '@/lib/collections/songs';
import { setSongDetails } from '@/lib/collections/songDetails';
import { setArenas, updateArenas, getArenas } from '@/lib/collections/arenas';
import { uploadAppFiles, getAppFiles } from '@/lib/collections/appFiles';
import { getUsernames } from '@/lib/collections/usernames';
import { Address, Time, Increment } from '@/lib/db-client';
import AuthGate from '@/components/AuthGate';
import { triggerHapticFeedback, triggerSuccessHaptic } from '@/utils/haptic';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MAX_RETRIES = 10;
const RETRY_DELAY_MS = 1000;
const ACCENT = '#00FF41';
const BG = '#000000';
const CARD_BG = '#111111';
const CARD_BORDER = '1px solid rgba(255,255,255,0.06)';
const INPUT_BG = '#111111';
const INPUT_BORDER = '1px solid rgba(255,255,255,0.08)';

async function uploadAndGetUrl(fileId: string, file: File): Promise<string> {
  const success = await uploadAppFiles(fileId, file);
  if (!success) return '';
  for (let i = 0; i < MAX_RETRIES; i++) {
    await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
    const item = await getAppFiles(fileId);
    if (item?.url) return item.url;
  }
  return '';
}

function validateSquareImage(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const img = document.createElement('img');
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      resolve(img.naturalWidth === img.naturalHeight);
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      resolve(false);
    };
    img.src = URL.createObjectURL(file);
  });
}

function generateId(prefix: string, title: string): string {
  const slug = title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim()
    .replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 40);
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${slug || prefix}-${suffix}`;
}

function autoTicker(title: string): string {
  if (!title.trim()) return '';
  const cleaned = title.replace(/[^a-zA-Z0-9\s]/g, '').trim();
  if (!cleaned) return '';
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 1) return cleaned.slice(0, 8).toUpperCase();
  // First letter of each word + first word chars
  const initials = words.map(w => w[0]).join('') + words[0].slice(1);
  return initials.replace(/[^A-Z0-9]/g, '').slice(0, 10).toUpperCase();
}

function truncateAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

// ─── Types ─────────────────────────────────────────────────────────────────────

interface FormState {
  audioFile: File | null;
  audioDuration: number | null;
  audioDurationFormatted: string;
  coverFile: File | null;
  coverPreview: string | null;
  tokenName: string;
  tokenSymbol: string;
  description: string;
  artistName: string;
  pairCurrency: 'SOL' | 'USDC';
  // Preserved for submit logic compatibility
  tokenImageFile: File | null;
  tokenImagePreview: string | null;
}

type SubmitStage = 'idle' | 'uploading-audio' | 'uploading-cover' | 'minting-spl' | 'saving-details' | 'success';

const STAGE_LABELS: Record<SubmitStage, string> = {
  idle: '',
  'uploading-cover': 'Uploading cover art...',
  'uploading-audio': 'Uploading audio...',
  'minting-spl': 'Minting token...',
  'saving-details': 'Saving details...',
  success: 'Done!',
};

// ─── Sparkline (animated pseudo-random for pre-launch preview) ───────────────

const TokenSparkline: React.FC = () => {
  const [points, setPoints] = React.useState<string>('');

  React.useEffect(() => {
    const generate = () => {
      const count = 20;
      const vals: number[] = [];
      let v = 0.5;
      for (let i = 0; i < count; i++) {
        v = Math.max(0.1, Math.min(0.9, v + (Math.random() - 0.45) * 0.25));
        vals.push(v);
      }
      const pts = vals.map((val, i) => {
        const x = (i / (count - 1)) * 200;
        const y = 32 - val * 28 - 2;
        return `${x},${y}`;
      });
      setPoints(pts.join(' '));
    };
    generate();
    const id = setInterval(generate, 2500);
    return () => clearInterval(id);
  }, []);

  return (
    <svg width="100%" height="32" viewBox="0 0 200 32" preserveAspectRatio="none" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00FF41" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#00FF41" stopOpacity="0" />
        </linearGradient>
      </defs>
      {points && (
        <>
          <polyline
            points={points}
            fill="none"
            stroke="#00FF41"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.6"
            style={{ transition: 'points 2s ease' } as React.CSSProperties}
          />
          <polygon
            points={`${points} 200,32 0,32`}
            fill="url(#sparkFill)"
            opacity="0.4"
            style={{ transition: 'points 2s ease' } as React.CSSProperties}
          />
        </>
      )}
    </svg>
  );
};

// ─── Waveform bars ─────────────────────────────────────────────────────────────

const WAVE_HEIGHTS = [22, 38, 52, 30, 60, 42, 70, 47, 62, 36, 55, 31, 64, 48, 34, 72, 44, 58, 28, 50, 66, 39, 46, 62, 37, 54, 42, 68, 27, 58, 44, 51, 35, 64, 40, 55, 49, 31, 60, 46, 41, 68, 33, 52, 59, 44, 29, 63, 37, 56];

const WaveformBars: React.FC<{ isActive: boolean }> = ({ isActive }) => (
  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '36px', width: '100%', overflow: 'hidden' }}>
    <style>{`
      @keyframes wv1 { from { transform: scaleY(0.4); } to { transform: scaleY(1); } }
      @keyframes wv2 { from { transform: scaleY(0.5); } to { transform: scaleY(0.85); } }
      @keyframes wv3 { from { transform: scaleY(0.3); } to { transform: scaleY(0.95); } }
      @keyframes wv4 { from { transform: scaleY(0.6); } to { transform: scaleY(0.75); } }
      @keyframes wv5 { from { transform: scaleY(0.25); } to { transform: scaleY(0.9); } }
    `}</style>
    {WAVE_HEIGHTS.map((h, i) => (
      <div
        key={i}
        style={{
          flex: '1 0 0',
          height: `${h}%`,
          borderRadius: '2px 2px 0 0',
          background: isActive ? ACCENT : 'rgba(255,255,255,0.06)',
          opacity: isActive ? (0.35 + (h / 72) * 0.65) : 0.6,
          transformOrigin: 'bottom',
          animation: isActive ? `wv${(i % 5) + 1} ${1.3 + (i % 5) * 0.15}s ease-in-out infinite alternate` : 'none',
          transition: 'background 500ms ease, opacity 500ms ease',
        }}
      />
    ))}
  </div>
);

// ─── Audio mini player ─────────────────────────────────────────────────────────

const AudioMiniPlayer: React.FC<{ audioUrl: string; fileName: string; duration: string }> = ({ audioUrl, fileName, duration }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    return () => { if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; } };
  }, []);

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); }
      else { audioRef.current.play(); setIsPlaying(true); }
    } else {
      const audio = new Audio(audioUrl);
      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => setIsPlaying(false);
      audioRef.current = audio;
      audio.play();
      setIsPlaying(true);
    }
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '10px 14px',
      borderRadius: '10px',
      background: CARD_BG,
      border: CARD_BORDER,
    }}>
      <button
        type="button"
        onClick={handlePlayPause}
        style={{
          width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
          background: isPlaying ? ACCENT : 'rgba(255,255,255,0.06)',
          border: `1px solid ${isPlaying ? ACCENT : 'rgba(255,255,255,0.08)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'all 200ms ease',
        }}
      >
        {isPlaying ? <Pause size={14} color="#000" /> : <Play size={14} color={ACCENT} fill={ACCENT} />}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <WaveformBars isActive={isPlaying} />
      </div>
      <div style={{
        fontFamily: "'Inter', monospace", fontSize: '10px',
        color: 'rgba(255,255,255,0.4)', flexShrink: 0,
      }}>
        {duration || '0:00'}
      </div>
    </div>
  );
};

// ─── Progress Dots ─────────────────────────────────────────────────────────────

const StepProgressBar: React.FC<{ current: number; total: number }> = ({ current, total }) => {
  const pct = (current / total) * 100;
  const labels = ['Upload', 'Details', 'Launch'] as const;
  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{
          fontFamily: "'Archivo Black', sans-serif",
          fontSize: '10px',
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.5)',
          flexShrink: 0,
        }}>
          Step {current} of {total}
        </span>
        <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${pct}%`,
            background: ACCENT,
            borderRadius: '3px',
            transition: 'width 400ms cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 0 10px rgba(0, 255, 65, 0.25)',
          }} />
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
        {labels.map((label, i) => {
          const stepNum = i + 1;
          const isActive = stepNum === current;
          const isCompleted = stepNum < current;
          return (
            <span key={label} style={{
              fontFamily: "'Archivo Black', sans-serif",
              fontSize: '9px',
              fontWeight: 700,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: isActive ? ACCENT : isCompleted ? 'rgba(0, 255, 65, 0.5)' : 'rgba(255,255,255,0.2)',
              transition: 'color 300ms ease',
            }}>
              {isCompleted ? '✓ ' : ''}{label}
            </span>
          );
        })}
      </div>
    </div>
  );
};

// ─── SCREEN 1: Upload ─────────────────────────────────────────────────────────

interface UploadScreenProps {
  form: FormState;
  onFormChange: (updates: Partial<FormState>) => void;
  onAutoAdvance: () => void;
}

const UploadScreen: React.FC<UploadScreenProps> = ({ form, onFormChange, onAutoAdvance }) => {
  const audioInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const audioPreviewUrl = useMemo(() => {
    if (!form.audioFile) return null;
    return URL.createObjectURL(form.audioFile);
  }, [form.audioFile]);

  // Handle audio file selection
  const handleAudioFile = useCallback((file: File) => {
    const validTypes = ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/ogg'];
    const validExt = /\.(mp3|wav|m4a|aac|ogg|flac)$/i;
    if (!validTypes.includes(file.type) && !validExt.test(file.name)) return;
    if (file.size > 100 * 1024 * 1024) return;

    const audio = new Audio();
    audio.src = URL.createObjectURL(file);
    audio.onloadedmetadata = () => {
      const secs = Math.floor(audio.duration);
      const mins = Math.floor(secs / 60);
      const s = secs % 60;
      onFormChange({
        audioFile: file,
        audioDuration: secs,
        audioDurationFormatted: `${mins}:${s.toString().padStart(2, '0')}`,
      });
    };
  }, [onFormChange]);

  // Auto-advance when both files are uploaded
  useEffect(() => {
    if (form.audioFile && form.coverFile) {
      const timer = setTimeout(() => {
        triggerHapticFeedback([30, 30, 30]);
        onAutoAdvance();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [form.audioFile, form.coverFile, onAutoAdvance]);

  // Drag and drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      const isAudio = files[0].type.startsWith('audio/') || /\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(files[0].name);
      const isImage = files[0].type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(files[0].name);
      if (isAudio) handleAudioFile(files[0]);
      else if (isImage) handleCoverFile(files[0]);
    }
  };

  const handleCoverFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/') && !file.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)) return;
    if (file.size > 10 * 1024 * 1024) return;
    const isSquare = await validateSquareImage(file);
    if (!isSquare) {
      toast.error('Cover art must be square (1:1 ratio). Please crop and re-upload.');
      return;
    }
    onFormChange({
      coverFile: file,
      coverPreview: URL.createObjectURL(file),
      // Also set token image fields for submit logic compatibility
      tokenImageFile: file,
      tokenImagePreview: URL.createObjectURL(file),
    });
  }, [onFormChange]);

  const allDone = !!form.audioFile && !!form.coverFile;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div>
        <div style={{
          fontFamily: "'Archivo Black', sans-serif",
          fontSize: '11px',
          fontWeight: 700,
          color: ACCENT,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginBottom: '4px',
        }}>
          Step 1 of 3 — Drop It Here
        </div>
        <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', fontFamily: "'Inter', sans-serif" }}>
          Upload your track and cover art to get started.
        </div>
      </div>

      {/* Audio upload zone */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{
          fontFamily: "'Archivo Black', sans-serif",
          fontSize: '9px',
          fontWeight: 700,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.5)',
          marginBottom: '2px',
        }}>
          Audio Track <span style={{ color: ACCENT }}>*</span>
        </label>

        <input
          ref={audioInputRef}
          type="file"
          accept=".mp3,.wav,.m4a,.aac,.ogg,.flac,audio/*"
          style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) handleAudioFile(f); }}
        />

        {form.audioFile ? (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '14px 16px',
            borderRadius: '12px',
            background: CARD_BG,
            border: CARD_BORDER,
          }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '8px', flexShrink: 0,
              background: 'rgba(255,255,255,0.04)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Music size={18} style={{ color: ACCENT }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '13px', fontWeight: 600, color: '#fff',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                fontFamily: "'Archivo Black', sans-serif",
              }}>
                {form.audioFile.name}
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '2px', fontFamily: "'Inter', monospace" }}>
                {(form.audioFile.size / 1024 / 1024).toFixed(1)} MB
                {form.audioDurationFormatted && ` · ${form.audioDurationFormatted}`}
              </div>
            </div>
            <button
              type="button"
              onClick={() => audioInputRef.current?.click()}
              style={{
                fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.35)', background: 'none', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '5px', padding: '10px 14px', cursor: 'pointer',
                fontFamily: "'Archivo Black', sans-serif",
                minHeight: '44px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              Change
            </button>
          </div>
        ) : (
          <button
            type="button"
            onDragOver={handleDrag}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => audioInputRef.current?.click()}
            style={{
              width: '100%', minHeight: '160px',
              borderRadius: '14px',
              border: `2px dashed ${dragActive ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)'}`,
              background: dragActive ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.01)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px',
              cursor: 'pointer', transition: 'all 200ms ease',
              padding: '20px',
            }}
          >
            <div style={{
              width: '48px', height: '48px', borderRadius: '50%',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Upload size={20} style={{ color: 'rgba(255,255,255,0.4)' }} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <div className="create-flow-desktop" style={{ fontSize: '13px', fontWeight: 600, color: '#fff', fontFamily: "'Archivo Black', sans-serif", marginBottom: '4px' }}>
                Drop your audio here
              </div>
              <div className="create-flow-mobile" style={{ fontSize: '13px', fontWeight: 600, color: '#fff', fontFamily: "'Archivo Black', sans-serif", marginBottom: '4px', display: 'none' }}>
                Tap to upload audio
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', fontFamily: "'Inter', sans-serif" }}>
                <span className="create-flow-desktop">or tap to browse</span>
                <span className="create-flow-mobile" style={{ display: 'none' }}>MP3 · WAV · M4A · max 100MB</span>
              </div>
            </div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', fontFamily: "'Inter', monospace" }}>
              MP3 · WAV · M4A · AAC · OGG · FLAC · max 100MB
            </div>
          </button>
        )}
      </div>

      {/* Audio preview player */}
      {audioPreviewUrl && form.audioFile && (
        <AudioMiniPlayer audioUrl={audioPreviewUrl} fileName={form.audioFile.name} duration={form.audioDurationFormatted} />
      )}

      {/* Cover art upload */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <label style={{
          fontFamily: "'Archivo Black', sans-serif",
          fontSize: '9px',
          fontWeight: 700,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.5)',
          marginBottom: '2px',
        }}>
          Cover Art <span style={{ color: ACCENT }}>*</span>
        </label>

        <input
          ref={coverInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) handleCoverFile(f); }}
        />

        {form.coverPreview ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0,
              border: CARD_BORDER,
            }}>
              <img src={form.coverPreview} alt="Cover art" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff', fontFamily: "'Archivo Black', sans-serif" }}>
                Cover art uploaded
              </div>
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                style={{
                  marginTop: '4px', fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                  color: 'rgba(0, 255, 65, 0.5)', background: 'none', border: '1px solid rgba(0, 255, 65, 0.15)',
                  borderRadius: '5px', padding: '10px 14px', cursor: 'pointer', fontFamily: "'Archivo Black', sans-serif",
                  minHeight: '44px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                Change
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onDragOver={handleDrag}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => coverInputRef.current?.click()}
            style={{
              width: '100%', minHeight: '100px',
              borderRadius: '14px',
              border: `2px dashed ${dragActive ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)'}`,
              background: dragActive ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.01)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px',
              cursor: 'pointer', transition: 'all 200ms ease',
              padding: '16px',
            }}
          >
            <Image size={18} style={{ color: 'rgba(255,255,255,0.3)' }} />
            <div className="create-flow-desktop" style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', fontFamily: "'Archivo Black', sans-serif" }}>
              Upload cover art (square)
            </div>
            <div className="create-flow-mobile" style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', fontFamily: "'Archivo Black', sans-serif", display: 'none' }}>
              Tap to upload cover
            </div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', fontFamily: "'Inter', monospace" }}>
              <span className="create-flow-desktop">PNG or JPG · recommended 512×512</span>
              <span className="create-flow-mobile" style={{ display: 'none' }}>Square PNG/JPG · 512×512</span>
            </div>
          </button>
        )}
      </div>

      {/* Auto-advance indicator */}
      <AnimatePresence>
        {allDone && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              padding: '10px',
              borderRadius: '10px',
              background: CARD_BG,
              border: CARD_BORDER,
            }}
          >
            <div style={{
              width: '8px', height: '8px', borderRadius: '50%', background: ACCENT,
              animation: 'pulseDot 1.5s ease-in-out infinite',
            }} />
            <style>{`@keyframes pulseDot { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
            <span style={{
              fontSize: '12px', fontWeight: 700, color: ACCENT,
              fontFamily: "'Archivo Black', sans-serif", letterSpacing: '0.06em',
            }}>
              Going to next step...
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── SCREEN 2: Name It ────────────────────────────────────────────────────────

interface NameScreenProps {
  form: FormState;
  onFormChange: (updates: Partial<FormState>) => void;
  onNext: () => void;
  onBack: () => void;
  walletAddress: string;
  tickerError: string | null;
  tickerChecking: boolean;
  onTickerBlur: () => void;
}

const NameScreen: React.FC<NameScreenProps> = ({ form, onFormChange, onNext, onBack, walletAddress, tickerError, tickerChecking, onTickerBlur }) => {
  const inputStyle: React.CSSProperties = {
    width: '100%',
    height: '48px',
    background: INPUT_BG,
    border: INPUT_BORDER,
    borderRadius: '10px',
    padding: '0 14px',
    color: '#FFFFFF',
    fontSize: '14px',
    fontFamily: "'Archivo Black', sans-serif",
    outline: 'none',
    transition: 'border-color 180ms ease, box-shadow 180ms ease',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: "'Archivo Black', sans-serif",
    fontSize: '9px',
    fontWeight: 700,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: '6px',
    display: 'block',
  };

  const canProceed = form.tokenName.trim().length > 0 && form.tokenSymbol.trim().length > 0 && !tickerError && !tickerChecking;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div>
        <div style={{
          fontFamily: "'Archivo Black', sans-serif",
          fontSize: '11px',
          fontWeight: 700,
          color: ACCENT,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginBottom: '4px',
        }}>
          Step 2 of 3 — Name It
        </div>
        <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', fontFamily: "'Inter', sans-serif" }}>
          Give your track a name and ticker symbol.
        </div>
      </div>

      {/* Track Title */}
      <div>
        <label style={labelStyle}>Track Title <span style={{ color: ACCENT }}>*</span></label>
        <input
          type="text"
          value={form.tokenName}
          onChange={e => {
            const val = e.target.value.slice(0, 32);
            const tickerUpdate: Partial<FormState> = { tokenName: val };
            // Auto-generate ticker if user hasn't customized it
            if (!form.tokenSymbol || form.tokenSymbol === autoTicker(form.tokenName)) {
              tickerUpdate.tokenSymbol = autoTicker(val);
            }
            onFormChange(tickerUpdate);
          }}
          placeholder="Enter track title..."
          style={inputStyle}
          maxLength={32}
          onFocus={e => { (e.target as HTMLInputElement).style.borderColor = ACCENT; (e.target as HTMLInputElement).style.boxShadow = `0 0 10px rgba(255,255,255,0.05)`; }}
          onBlur={e => { (e.target as HTMLInputElement).style.borderColor = '#1f1f1f'; (e.target as HTMLInputElement).style.boxShadow = 'none'; }}
        />
        <div style={{ textAlign: 'right', fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontFamily: "'Inter', monospace", marginTop: '4px' }}>
          {form.tokenName.length}/32
        </div>
      </div>

      {/* Artist Name */}
      <div>
        <label style={labelStyle}>Artist Name</label>
        <input
          type="text"
          value={form.artistName}
          onChange={e => onFormChange({ artistName: e.target.value.slice(0, 32) })}
          placeholder={truncateAddress(walletAddress)}
          style={inputStyle}
          maxLength={32}
          onFocus={e => { (e.target as HTMLInputElement).style.borderColor = ACCENT; (e.target as HTMLInputElement).style.boxShadow = `0 0 10px rgba(255,255,255,0.05)`; }}
          onBlur={e => { (e.target as HTMLInputElement).style.borderColor = '#1f1f1f'; (e.target as HTMLInputElement).style.boxShadow = 'none'; }}
        />
        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', fontFamily: "'Inter', sans-serif", marginTop: '4px' }}>
          Optional · defaults to your wallet address
        </div>
      </div>

      {/* Token Ticker */}
      <div>
        <label style={labelStyle}>Token Ticker <span style={{ color: ACCENT }}>*</span></label>
        <div style={{ position: 'relative' }}>
          <span style={{
            position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)',
            fontSize: '16px', fontWeight: 900, color: 'rgba(0, 255, 65, 0.6)',
            fontFamily: "'Archivo Black', sans-serif",
          }}>$</span>
          <input
            type="text"
            value={form.tokenSymbol}
            onChange={e => onFormChange({ tokenSymbol: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10) })}
            placeholder="TICKER"
            style={{
              ...inputStyle,
              paddingLeft: '30px',
              fontFamily: "'Archivo Black', sans-serif",
              fontWeight: 800,
              letterSpacing: '0.12em',
              fontSize: '16px',
              borderColor: tickerError ? '#f87171' : undefined,
            }}
            maxLength={10}
            onFocus={e => { (e.target as HTMLInputElement).style.borderColor = ACCENT; (e.target as HTMLInputElement).style.boxShadow = `0 0 10px rgba(255,255,255,0.05)`; }}
            onBlur={e => {
              (e.target as HTMLInputElement).style.borderColor = tickerError ? '#f87171' : '#1f1f1f';
              (e.target as HTMLInputElement).style.boxShadow = 'none';
              onTickerBlur();
            }}
          />
          {tickerChecking && (
            <div style={{
              position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
              display: 'flex', alignItems: 'center',
            }}>
              <Loader2 size={14} style={{ color: 'rgba(255,255,255,0.3)' }} className="animate-spin" />
            </div>
          )}
        </div>
        {tickerError && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            marginTop: '6px', fontSize: '11px', color: '#f87171',
            fontFamily: "'Inter', sans-serif",
          }}>
            <AlertCircle size={11} />
            {tickerError}
          </div>
        )}
        {!tickerError && (
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', fontFamily: "'Inter', sans-serif", marginTop: '4px' }}>
            Auto-generated from title · you can edit
          </div>
        )}
      </div>

      {/* Trading Pair Currency Selector */}
      <div>
        <label style={labelStyle}>Trading Pair Currency</label>
        <div style={{
          display: 'flex',
          width: '100%',
          height: '42px',
          background: '#0C0C0C',
          border: '1px solid #1f1f1f',
          borderRadius: '10px',
          padding: '3px',
          boxSizing: 'border-box',
        }}>
          {(['SOL', 'USDC'] as const).map((currency) => {
            const isSelected = form.pairCurrency === currency;
            return (
              <button
                key={currency}
                type="button"
                onClick={() => onFormChange({ pairCurrency: currency })}
                style={{
                  flex: 1,
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontFamily: "'Archivo Black', sans-serif",
                  fontSize: '11px',
                  fontWeight: 800,
                  letterSpacing: '0.1em',
                  transition: 'all 200ms ease',
                  background: isSelected
                    ? ACCENT
                    : 'transparent',
                  color: isSelected ? '#000' : 'rgba(255,255,255,0.35)',
                  boxShadow: isSelected ? '0 0 12px rgba(0,0,0,0.3)' : 'none',
                }}
              >
                {currency}
              </button>
            );
          })}
        </div>
      </div>

      {/* Short Description */}
      <div>
        <label style={labelStyle}>Description</label>
        <div style={{ position: 'relative' }}>
          <textarea
            value={form.description}
            onChange={e => { if (e.target.value.length <= 140) onFormChange({ description: e.target.value }); }}
            placeholder="What's this track about? (optional)"
            rows={2}
            style={{
              ...inputStyle, height: 'auto', padding: '12px 14px', resize: 'none',
              lineHeight: '1.5', display: 'block', fontFamily: "'Inter', sans-serif",
            }}
            maxLength={140}
            onFocus={e => { (e.target as HTMLTextAreaElement).style.borderColor = ACCENT; (e.target as HTMLTextAreaElement).style.boxShadow = `0 0 10px rgba(255,255,255,0.05)`; }}
            onBlur={e => { (e.target as HTMLTextAreaElement).style.borderColor = '#1f1f1f'; (e.target as HTMLTextAreaElement).style.boxShadow = 'none'; }}
          />
          <span style={{
            position: 'absolute', bottom: '10px', right: '12px',
            fontSize: '10px', color: form.description.length >= 120 ? ACCENT : 'rgba(255,255,255,0.25)',
            fontFamily: "'Inter', monospace",
          }}>
            {form.description.length}/140
          </span>
        </div>
      </div>

      {/* Live Preview Card */}
      <div style={{
        background: CARD_BG,
        border: CARD_BORDER,
        borderRadius: '14px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}>
        <div style={{
          fontFamily: "'Archivo Black', sans-serif", fontSize: '8px', fontWeight: 700,
          color: 'rgba(255,255,255,0.3)', letterSpacing: '0.15em', textTransform: 'uppercase',
        }}>
          Live Preview
        </div>
        <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
          {/* Cover */}
          <div style={{
            width: '64px', height: '64px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0,
            background: '#080808',
            border: CARD_BORDER,
          }}>
            {form.coverPreview ? (
              <img src={form.coverPreview} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Music size={16} style={{ color: 'rgba(255,255,255,0.08)' }} />
              </div>
            )}
          </div>
          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: "'Archivo Black', sans-serif", fontSize: '14px', fontWeight: 800,
              color: '#fff', letterSpacing: '-0.01em',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {form.tokenName || 'Untitled Track'}
            </div>
            <div style={{
              fontFamily: "'Archivo Black', sans-serif", fontSize: '10px', fontWeight: 700,
              color: ACCENT, letterSpacing: '0.08em', marginTop: '2px',
            }}>
              {form.artistName ? form.artistName.toUpperCase() : truncateAddress(walletAddress).toUpperCase()}
            </div>
            <div style={{
              fontFamily: "'Archivo Black', sans-serif", fontSize: '18px', fontWeight: 900,
              color: ACCENT, letterSpacing: '-0.02em', marginTop: '6px',
            }}>
              ${form.tokenSymbol || '----'}
            </div>
          </div>
        </div>
        {/* Price + sparkline */}
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span style={{
              fontFamily: "'Inter', monospace", fontSize: '13px', fontWeight: 700,
              color: '#fff',
            }}>
              $0.002158
            </span>
            <span style={{
              fontFamily: "'Archivo Black', sans-serif", fontSize: '10px', fontWeight: 700,
              color: ACCENT,
            }}>
              +17.4%
            </span>
          </div>
          <div style={{ marginTop: '6px', borderRadius: '4px', overflow: 'hidden' }}>
            <TokenSparkline />
          </div>
        </div>
      </div>

      {/* Next button */}
      <button
        type="button"
        onClick={() => { triggerHapticFeedback(); onNext(); }}
        disabled={!canProceed}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          width: '100%',
          padding: '14px 28px',
          borderRadius: '12px',
          border: 'none',
          cursor: canProceed ? 'pointer' : 'default',
          background: canProceed
            ? ACCENT
            : 'rgba(255,255,255,0.04)',
          color: canProceed ? '#000' : 'rgba(255,255,255,0.15)',
          fontFamily: "'Archivo Black', sans-serif",
          fontSize: '13px',
          fontWeight: 900,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          boxShadow: canProceed ? '0 0 20px rgba(0,0,0,0.4)' : 'none',
          transition: 'all 180ms ease',
          marginTop: '4px',
        }}
      >
        Next <ArrowLeft size={14} style={{ transform: 'rotate(180deg)' }} />
      </button>
    </div>
  );
};

// ─── SCREEN 3: Launch ─────────────────────────────────────────────────────────

interface LaunchScreenProps {
  form: FormState;
  onSubmit: () => void;
  onBack: () => void;
  isSubmitting: boolean;
  submitStage: SubmitStage;
  submitStageLabel: string;
  walletAddress: string;
  tickerError: string | null;
}

const LaunchScreen: React.FC<LaunchScreenProps> = ({ form, onSubmit, onBack, isSubmitting, submitStage, submitStageLabel, walletAddress, tickerError }) => {
  const launchStages = [
    { key: 'uploading-cover' as const, label: 'Uploading cover art' },
    { key: 'uploading-audio' as const, label: 'Uploading audio' },
    { key: 'minting-spl' as const, label: 'Minting token on-chain' },
    { key: 'saving-details' as const, label: 'Saving details' },
  ];

  const stageIndex = launchStages.findIndex(s => s.key === submitStage);
  const progress = submitStage === 'success' ? 100 : stageIndex >= 0 ? ((stageIndex + 1) / launchStages.length) * 100 : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontFamily: "'Archivo Black', sans-serif",
          fontSize: '11px',
          fontWeight: 700,
          color: ACCENT,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginBottom: '4px',
        }}>
          Step 3 of 3 — Launch
        </div>
        <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', fontFamily: "'Inter', sans-serif" }}>
          Review and launch your token.
        </div>
      </div>

      {/* Summary Card */}
      <div style={{
        background: CARD_BG,
        border: CARD_BORDER,
        borderRadius: '16px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}>
        {/* Cover + Title */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '12px', overflow: 'hidden', flexShrink: 0,
            background: '#080808',
            border: CARD_BORDER,
          }}>
            {form.coverPreview ? (
              <img src={form.coverPreview} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Music size={20} style={{ color: 'rgba(255,255,255,0.08)' }} />
              </div>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: "'Archivo Black', sans-serif", fontSize: '18px', fontWeight: 900,
              color: '#fff', letterSpacing: '-0.01em', lineHeight: 1.2,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {form.tokenName || 'Untitled'}
            </div>
            <div style={{
              fontFamily: "'Archivo Black', sans-serif", fontSize: '11px', fontWeight: 700,
              color: ACCENT, letterSpacing: '0.08em', marginTop: '4px',
            }}>
              {form.artistName || truncateAddress(walletAddress)}
            </div>
            <div style={{
              fontFamily: "'Archivo Black', sans-serif", fontSize: '22px', fontWeight: 900,
              color: ACCENT, letterSpacing: '-0.02em', marginTop: '6px',
            }}>
              ${form.tokenSymbol || '----'}
            </div>
          </div>
        </div>

        {/* Tagline */}
        <div style={{
          padding: '12px 14px',
          borderRadius: '10px',
          background: 'rgba(255,255,255,0.02)',
          border: CARD_BORDER,
        }}>
          <p style={{
            fontSize: '13px', color: 'rgba(255,255,255,0.6)', fontFamily: "'Inter', sans-serif",
            lineHeight: 1.6, margin: 0,
          }}>
            Your fans can buy, trade, and earn. You earn from every trade.
          </p>
        </div>

        {/* Trading pair */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '8px 0',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}>
          <span style={{
            fontFamily: "'Archivo Black', sans-serif", fontSize: '9px', fontWeight: 700,
            color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>
            Trading pair
          </span>
          <span style={{
            fontFamily: "'Inter', monospace", fontSize: '13px', fontWeight: 700,
            color: ACCENT,
          }}>
            {form.pairCurrency}
          </span>
        </div>

        {/* Platform fee */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '8px 0',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}>
          <span style={{
            fontFamily: "'Archivo Black', sans-serif", fontSize: '9px', fontWeight: 700,
            color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>
            Platform fee
          </span>
          <span style={{
            fontFamily: "'Inter', monospace", fontSize: '13px', fontWeight: 700,
            color: '#fff',
          }}>
            2%
          </span>
        </div>

        {/* Description */}
        {form.description && (
          <div style={{
            fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontFamily: "'Inter', sans-serif",
            lineHeight: 1.5,
          }}>
            {form.description}
          </div>
        )}
      </div>

      {/* Launch progress (only when submitting) */}
      {isSubmitting && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {/* Stage list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {launchStages.map((stage, i) => {
              const completed = stageIndex > i;
              const active = stageIndex === i;
              return (
                <div key={stage.key} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: completed ? ACCENT : active ? 'rgba(0, 255, 65, 0.15)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${completed ? ACCENT : active ? 'rgba(0, 255, 65, 0.3)' : 'rgba(255,255,255,0.06)'}`,
                    transition: 'all 300ms ease',
                  }}>
                    {completed && <Check size={10} style={{ color: '#000' }} />}
                    {active && <Loader2 size={10} style={{ color: ACCENT }} className="animate-spin" />}
                  </div>
                  <span style={{
                    fontFamily: "'Archivo Black', sans-serif",
                    fontSize: '11px', fontWeight: 600,
                    color: completed ? ACCENT : active ? '#fff' : 'rgba(255,255,255,0.25)',
                    transition: 'color 300ms ease',
                  }}>
                    {stage.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Progress bar */}
          <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${progress}%`,
              background: submitStage === 'success' ? ACCENT : 'linear-gradient(90deg, #005c1f, #00FF41)',
              borderRadius: '2px',
              transition: 'width 0.5s ease',
              boxShadow: '0 0 8px rgba(0, 255, 65, 0.3)',
            }} />
          </div>

          {/* Status text */}
          <div style={{
            textAlign: 'center',
            fontSize: '11px', fontWeight: 700,
            color: ACCENT,
            fontFamily: "'Archivo Black', sans-serif",
            letterSpacing: '0.08em',
          }}>
            {submitStageLabel}
          </div>
        </div>
      )}

      {/* Success state */}
      {submitStage === 'success' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            padding: '16px', borderRadius: '12px',
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <Check size={18} style={{ color: ACCENT }} />
          <span style={{
            fontSize: '14px', fontWeight: 800, color: ACCENT,
            fontFamily: "'Archivo Black', sans-serif", letterSpacing: '0.06em',
          }}>
            LAUNCH COMPLETE — REDIRECTING...
          </span>
        </motion.div>
      )}

      {/* Nav buttons */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          style={{
            height: '52px', padding: '0 20px',
            borderRadius: '12px',
            border: '1px solid #1f1f1f',
            background: 'transparent',
            color: isSubmitting ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.5)',
            cursor: isSubmitting ? 'default' : 'pointer',
            fontFamily: "'Archivo Black', sans-serif",
            fontSize: '10px', fontWeight: 700,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            transition: 'all 180ms ease',
            flexShrink: 0,
          }}
        >
          Back
        </button>
        <button
          type="button"
          onClick={() => { triggerHapticFeedback(); onSubmit(); }}
          disabled={isSubmitting || !!tickerError}
          style={{
            flex: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            height: '52px',
            padding: '0 28px',
            borderRadius: '12px',
            border: 'none',
            cursor: (isSubmitting || !!tickerError) ? 'default' : 'pointer',
            background: (isSubmitting || !!tickerError)
              ? 'rgba(255,255,255,0.04)'
              : ACCENT,
            color: (isSubmitting || !!tickerError) ? 'rgba(255,255,255,0.2)' : '#000',
            fontFamily: "'Archivo Black', sans-serif",
            fontSize: '14px',
            fontWeight: 900,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            boxShadow: (isSubmitting || !!tickerError) ? 'none' : '0 0 24px rgba(0,0,0,0.4)',
            transition: 'all 180ms ease',
          }}
        >
          {isSubmitting ? (
            <><Loader2 size={18} className="animate-spin" /><span>Launching...</span></>
          ) : (
            <><Rocket size={18} /><span>Launch Now</span></>
          )}
        </button>
      </div>
    </div>
  );
};

// ─── Main CreatePage ───────────────────────────────────────────────────────────

const CreatePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [screen, setScreen] = useState(1);
  const [form, setForm] = useState<FormState>(() => ({
    audioFile: null,
    audioDuration: null,
    audioDurationFormatted: '',
    coverFile: null,
    coverPreview: null,
    tokenName: '',
    tokenSymbol: '',
    description: '',
    artistName: '',
    pairCurrency: 'SOL' as const,
    tokenImageFile: null,
    tokenImagePreview: null,
  }));
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [submitStage, setSubmitStage] = useState<SubmitStage>('idle');
  const isSubmitting = submitStage !== 'idle' && submitStage !== 'success';

  // Ticker uniqueness validation
  const [tickerError, setTickerError] = useState<string | null>(null);
  const [tickerChecking, setTickerChecking] = useState(false);
  const tickerDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const validateTicker = useCallback(async (ticker: string) => {
    if (!ticker.trim()) {
      setTickerError(null);
      setTickerChecking(false);
      return;
    }
    setTickerChecking(true);
    setTickerError(null);
    try {
      const [songs, username] = await Promise.all([
        getManySongs(`where symbol = "${ticker}"`),
        getUsernames(ticker),
      ]);
      if (songs.length > 0 || username) {
        setTickerError('Ticker already taken — try a different one');
      } else {
        setTickerError(null);
      }
    } catch {
      // Silently fail validation — don't block user on network errors
      setTickerError(null);
    } finally {
      setTickerChecking(false);
    }
  }, []);

  useEffect(() => {
    if (tickerDebounceRef.current) clearTimeout(tickerDebounceRef.current);
    setTickerError(null);
    if (!form.tokenSymbol.trim()) {
      setTickerChecking(false);
      return;
    }
    setTickerChecking(true);
    tickerDebounceRef.current = setTimeout(() => {
      validateTicker(form.tokenSymbol);
    }, 500);
    return () => {
      if (tickerDebounceRef.current) clearTimeout(tickerDebounceRef.current);
    };
  }, [form.tokenSymbol, validateTicker]);

  const handleChange = useCallback((updates: Partial<FormState>) => {
    setForm(prev => ({ ...prev, ...updates }));
  }, []);

  const goNext = () => { triggerHapticFeedback(); setScreen(s => Math.min(s + 1, 3)); };
  const goBack = () => { triggerHapticFeedback(); setScreen(s => Math.max(s - 1, 1)); };

  const handleSubmit = async () => {
    if (!user?.address) {
      toast.error('Please connect your wallet first.');
      return;
    }

    // Validate required fields
    const errs: Partial<Record<string, string>> = {};
    if (!form.tokenName.trim()) errs.tokenName = 'Token name is required.';
    if (!form.tokenSymbol.trim()) errs.tokenSymbol = 'Token symbol is required.';
    if (!form.description.trim()) errs.description = 'Description is required.';
    if (!form.audioFile) errs.audioFile = 'Audio file is required.';
    if (!form.coverFile) errs.coverFile = 'Cover art is required.';
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast.error('Please fix the errors above.');
      return;
    }

    const songId = generateId('song', form.tokenName);
    const twitterClean = ''; // no twitter field in simplified flow

    try {
      setSubmitStage('uploading-cover');
      const coverSource = form.tokenImageFile ?? form.coverFile;
      const coverArtUrl = await uploadAndGetUrl(`cover-${songId}`, coverSource!);
      if (!coverArtUrl) throw new Error('Cover art upload failed.');

      setSubmitStage('uploading-audio');
      const audioUrl = await uploadAndGetUrl(`audio-${songId}`, form.audioFile!);
      if (!audioUrl) throw new Error('Audio upload failed.');

      setSubmitStage('minting-spl');
      const metadata: Record<string, unknown> = {
        name: form.tokenName,
        symbol: form.tokenSymbol,
        description: form.description.trim(),
        image: coverArtUrl,
        animation_url: `${audioUrl}?ext=mp3`,
        external_url: `https://litstudio.online/song/${songId}`,
        properties: {
          category: 'audio',
          files: [{ uri: audioUrl, type: form.audioFile!.type }],
          artist: '',
        },
      };
      const metadataFile = new File([JSON.stringify(metadata)], 'metadata.json', { type: 'application/json' });
      const metadataUrl = await uploadAndGetUrl(`metadata-${songId}`, metadataFile);
      if (!metadataUrl) throw new Error('Metadata upload failed.');

      const songCreated = await setSongs(songId, {
        name: form.tokenName,
        symbol: form.tokenSymbol,
        uri: metadataUrl,
        creator: Address.publicKey(user.address),
        pairCurrency: form.pairCurrency,
      });
      if (!songCreated) throw new Error('Failed to launch song token. Ensure you have enough SOL in your wallet.');

      setSubmitStage('saving-details');
      await setSongDetails(songId, {
        title: form.tokenName,
        artist: form.artistName || '',
        artistAddress: Address.publicKey(user.address),
        genre: undefined,
        coverImage: coverArtUrl,
        audioUrl,
        tokenSymbol: form.tokenSymbol,
        totalEditions: 0,
        currentEditionCount: 0,
        duration: form.audioDuration ?? undefined,
        streamRequirement: 0,
        approved: true,
      });

      try {
        const existingArena = await getArenas(user.address);
        if (!existingArena) {
          await setArenas(user.address, {
            artistAddress: Address.publicKey(user.address),
            artistName: `${user.address.slice(0, 6)}...${user.address.slice(-4)}`,
            coverImage: coverArtUrl || undefined,
            songCount: 1,
            createdAt: Time.Now,
          });
        } else {
          await updateArenas(user.address, { songCount: Increment.by(1) });
        }
      } catch { /* non-critical */ }

      setSubmitStage('success');
      triggerSuccessHaptic();
      toast.success('Token launched successfully!');
      setTimeout(() => {
        navigate(`/song/${songId}`);
      }, 1500);
    } catch (err) {
      setSubmitStage('idle');
      toast.error(err instanceof Error ? err.message : 'Launch failed. Please try again.');
    }
  };

  // Ambient grid background
  const gridBg = `
    linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
  `;

  return (
    <AuthGate>
      <div className="min-h-screen pb-32" style={{ position: 'relative' }}>
        {/* Subtle grid background */}
        <div aria-hidden style={{
          position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
          backgroundImage: gridBg,
          backgroundSize: '48px 48px',
        }} />

        {/* Ambient blobs */}
        <div aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
          <div style={{ position: 'absolute', top: '8%', left: '10%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 65%)', filter: 'blur(80px)' }} />
          <div style={{ position: 'absolute', top: '45%', right: '5%', width: 350, height: 350, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.02) 0%, transparent 65%)', filter: 'blur(70px)' }} />
        </div>

        <div className="relative z-10" style={{ maxWidth: '640px', margin: '0 auto', padding: '16px 20px 40px' }}>
          <style>{`
            .create-flow-desktop { display: block; }
            .create-flow-mobile { display: none; }
            .create-hero-banner { height: 160px; }
            @media (max-width: 640px) {
              .create-flow-desktop { display: none !important; }
              .create-flow-mobile { display: block !important; }
              .create-hero-banner { height: 120px; }
            }
          `}</style>

          {/* ─── Back Button ─── */}
          <div style={{ marginBottom: '16px' }}>
            <button
              type="button"
              onClick={() => navigate('/')}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'transparent', border: 'none',
                cursor: 'pointer', padding: '6px 0',
                color: 'rgba(255,255,255,0.5)',
                fontFamily: "'Archivo Black', sans-serif",
                fontSize: '10px', fontWeight: 700,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                transition: 'color 180ms ease',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = ACCENT; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)'; }}
            >
              <ArrowLeft size={14} /> Back
            </button>
          </div>

          {/* ─── Compact Hero Banner ─── */}
          <div style={{ margin: '0 -20px 24px' }}>
            <div
              className="create-hero-banner"
              style={{
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Background image */}
              <img
                src="https://tarobase-app-storage-public-v2-prod.s3.amazonaws.com/tarobase-app-storage-69cfc41e56840f6b0224904e/6a1f3510d6a3b6c64d1140cb"
                alt=""
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center',
                  display: 'block',
                }}
              />
              {/* Bottom-to-black gradient overlay */}
              <div
                className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/60 to-black md:from-black/90 md:via-black/80 md:to-black"
              />
              {/* Centered text */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 2,
                  padding: '0 20px',
                }}
              >
                <h1 style={{
                  fontFamily: "'Archivo Black', sans-serif",
                  fontSize: 'clamp(18px, 4vw, 26px)',
                  fontWeight: 900,
                  color: '#ffffff',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.1,
                  textTransform: 'uppercase',
                  margin: '0 0 6px',
                  textAlign: 'center',
                }}>
                  Launch Your Song
                </h1>
                <p style={{
                  fontSize: '12px',
                  color: '#00FF41',
                  fontFamily: "'Inter', sans-serif",
                  lineHeight: 1.4,
                  margin: 0,
                  textAlign: 'center',
                }}>
                  Upload, name it, and launch in under 60 seconds.
                </p>
              </div>
            </div>
          </div>

          {/* ─── Step Progress Bar ─── */}
          <div style={{ marginBottom: '28px' }}>
            <StepProgressBar current={screen} total={3} />
          </div>

          {/* ─── Screens ─── */}
          <AnimatePresence mode="wait">
            <motion.div
              key={screen}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
            >
              {screen === 1 && (
                <UploadScreen
                  form={form}
                  onFormChange={handleChange}
                  onAutoAdvance={goNext}
                />
              )}
              {screen === 2 && (
                <NameScreen
                  form={form}
                  onFormChange={handleChange}
                  onNext={goNext}
                  onBack={goBack}
                  walletAddress={user?.address ?? ''}
                  tickerError={tickerError}
                  tickerChecking={tickerChecking}
                  onTickerBlur={() => {
                    if (tickerDebounceRef.current) clearTimeout(tickerDebounceRef.current);
                    validateTicker(form.tokenSymbol);
                  }}
                />
              )}
              {screen === 3 && (
                <LaunchScreen
                  form={form}
                  onSubmit={handleSubmit}
                  onBack={goBack}
                  isSubmitting={isSubmitting}
                  submitStage={submitStage}
                  submitStageLabel={STAGE_LABELS[submitStage]}
                  walletAddress={user?.address ?? ''}
                  tickerError={tickerError}
                />
              )}
            </motion.div>
          </AnimatePresence>

          {/* ─── Inline errors ─── */}
          {Object.keys(errors).length > 0 && (
            <div style={{
              marginTop: '16px', padding: '12px 14px',
              borderRadius: '10px',
              background: 'rgba(248,113,113,0.06)',
              border: '1px solid rgba(248,113,113,0.2)',
              display: 'flex', flexDirection: 'column', gap: '4px',
            }}>
              {Object.values(errors).map((err, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertCircle size={12} style={{ color: '#f87171', flexShrink: 0 }} />
                  <span style={{ fontSize: '12px', color: '#f87171', fontFamily: "'Inter', sans-serif" }}>
                    {err}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AuthGate>
  );
};

export default CreatePage;
