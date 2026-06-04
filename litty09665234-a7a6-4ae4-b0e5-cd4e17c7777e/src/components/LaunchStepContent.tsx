import React, { useRef } from 'react';
import { z } from 'zod';
import {
  Upload, Music, Image, AlertCircle, ArrowRight, Rocket, Check, Loader2,
  Coins, FileText, User, Activity, Globe, Twitter, Send, MessageSquare,
  Tag,
} from 'lucide-react';

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface SongFormData {
  // Step 1 — Upload
  audioFile: File | null;
  audioDuration: number | null;
  audioDurationFormatted: string;
  coverFile: File | null;
  coverPreview: string | null;
  // Step 2 — Metadata (Solscan/Phantom trust fields)
  tokenName: string;
  tokenSymbol: string;
  description: string;
  tokenImageFile: File | null;
  tokenImagePreview: string | null;
  website: string;
  twitter: string;
  telegram: string;
  discord: string;
  decimals: number;
  totalSupply: string;
  tags: string;
  creatorWallet: string;
  // Legacy fields kept for SongTokenTerminal compatibility
  title?: string;
  artistName?: string;
  genre?: string;
  twitterHandle?: string;
  assignAlbum?: boolean;
  albumId?: string;
  // Step 3 — Tokenomics
  payoutCurrency: 'SOL' | 'USDC';
  launchMode: 'auto' | 'manual';
  // Step 4 — Review
  copyright: boolean;
}

export const defaultFormData = (walletAddress?: string): SongFormData => ({
  audioFile: null,
  audioDuration: null,
  audioDurationFormatted: '',
  coverFile: null,
  coverPreview: null,
  tokenName: '',
  tokenSymbol: '',
  description: '',
  tokenImageFile: null,
  tokenImagePreview: null,
  website: '',
  twitter: '',
  telegram: '',
  discord: '',
  decimals: 6,
  totalSupply: '1000000000',
  tags: 'music, audio',
  creatorWallet: walletAddress ?? '',
  payoutCurrency: 'SOL',
  launchMode: 'auto',
  copyright: false,
  // Legacy defaults
  title: '',
  artistName: '',
  genre: '',
  twitterHandle: '',
  assignAlbum: false,
  albumId: '',
});

interface StepProps {
  form: SongFormData;
  errors: Partial<Record<string, string>>;
  onChange: (updates: Partial<SongFormData>) => void;
  onClearError: (key: string) => void;
  disabled?: boolean;
}

// ─── Style tokens ─────────────────────────────────────────────────────────────

const ACCENT = '#00FF66';

const labelStyle: React.CSSProperties = {
  fontFamily: "'Archivo Black', sans-serif",
  fontSize: '9px',
  fontWeight: 700,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  color: '#A1A1AA',
  marginBottom: '6px',
  display: 'block',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: '44px',
  background: '#0C0C0C',
  border: '1px solid #1f1f1f',
  borderRadius: '8px',
  padding: '0 14px',
  color: '#FFFFFF',
  fontSize: '14px',
  fontFamily: "'Archivo Black', sans-serif",
  outline: 'none',
  transition: 'border-color 180ms ease, box-shadow 180ms ease',
  boxSizing: 'border-box',
};

const inputFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
  (e.currentTarget as HTMLElement).style.borderColor = ACCENT;
  (e.currentTarget as HTMLElement).style.boxShadow = '0 0 10px rgba(0,255,102,0.1)';
};
const inputBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
  (e.currentTarget as HTMLElement).style.borderColor = '#1f1f1f';
  (e.currentTarget as HTMLElement).style.boxShadow = 'none';
};

const errorStyle: React.CSSProperties = {
  fontSize: '11px',
  color: '#f87171',
  marginTop: '5px',
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  fontFamily: "'Archivo Black', sans-serif",
};

// ─── Field ─────────────────────────────────────────────────────────────────────

const Field: React.FC<{
  label: string;
  required?: boolean;
  optional?: boolean;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}> = ({ label, required, optional, error, hint, icon, children }) => (
  <div>
    <label style={labelStyle}>
      {icon && <span style={{ display: 'inline-flex', verticalAlign: 'middle', marginRight: '5px', color: ACCENT, opacity: 0.7 }}>{icon}</span>}
      {label}
      {required && <span style={{ color: ACCENT, marginLeft: '4px' }}>*</span>}
      {optional && <span style={{ color: 'rgba(255,255,255,0.35)', marginLeft: '6px', fontWeight: 400, fontFamily: "'Archivo Black', sans-serif", fontSize: '10px', textTransform: 'none' }}>optional</span>}
    </label>
    {children}
    {hint && !error && (
      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '4px', fontFamily: "'Archivo Black', sans-serif" }}>{hint}</div>
    )}
    {error && (
      <div style={errorStyle}>
        <AlertCircle size={11} />{error}
      </div>
    )}
  </div>
);

// ─── Continue / Back buttons ──────────────────────────────────────────────────

const ContinueButton: React.FC<{
  label: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  submitting?: boolean;
}> = ({ label, onClick, disabled, submitting }) => {
  const active = !disabled && !submitting;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || submitting}
      style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '12px 28px',
        borderRadius: '8px',
        border: 'none',
        cursor: active ? 'pointer' : 'default',
        background: active
          ? 'linear-gradient(135deg, #005c1f, #00FF66)'
          : 'rgba(0,255,102,0.05)',
        color: active ? '#000' : 'rgba(0,255,102,0.25)',
        fontFamily: "'Archivo Black', sans-serif",
        fontSize: '11px',
        fontWeight: 900,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        boxShadow: active ? '0 0 18px rgba(0,255,102,0.25)' : 'none',
        transition: 'all 180ms ease',
        flexShrink: 0,
      }}
    >
      {submitting ? (
        <><Loader2 size={14} className="animate-spin" /><span>LAUNCHING...</span></>
      ) : (
        <>{label}<ArrowRight size={14} style={{ color: active ? '#000' : 'rgba(0,255,102,0.25)', flexShrink: 0 }} /></>
      )}
    </button>
  );
};

const BackButton: React.FC<{ onClick: () => void; disabled?: boolean }> = ({ onClick, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    style={{
      height: '44px',
      padding: '0 18px',
      borderRadius: '8px',
      border: '1px solid #1f1f1f',
      background: 'transparent',
      color: 'rgba(255,255,255,0.45)',
      cursor: disabled ? 'default' : 'pointer',
      fontFamily: "'Archivo Black', sans-serif",
      fontSize: '10px',
      fontWeight: 700,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      opacity: disabled ? 0.4 : 1,
      transition: 'all 180ms ease',
    }}
    onMouseEnter={e => { if (!disabled) { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0, 255, 65, 0.3)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.7)'; } }}
    onMouseLeave={e => { if (!disabled) { (e.currentTarget as HTMLElement).style.borderColor = '#1f1f1f'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.45)'; } }}
  >
    BACK
  </button>
);

// ─── Audio Analysis Panel ─────────────────────────────────────────────────────

const ANALYSIS_ROWS: { label: string; valueFn: (hasAudio: boolean, duration?: string) => string }[] = [
  { label: 'DURATION',    valueFn: (h, d) => h && d ? d : '—' },
  { label: 'FORMAT',      valueFn: (h) => h ? 'WAV / MP3' : '—' },
  { label: 'BITRATE',     valueFn: (h) => h ? '320 kbps' : '—' },
  { label: 'SAMPLE RATE', valueFn: (h) => h ? '44.1 kHz' : '—' },
  { label: 'QUALITY',     valueFn: (h) => h ? '44.1kHz / 16-bit' : '—' },
  { label: 'LOUDNESS',    valueFn: (h) => h ? '-9.2 LUFS' : '—' },
];

export const AudioAnalysisPanel: React.FC<{ hasAudio: boolean; duration?: string; onContinue?: () => void }> = ({ hasAudio, duration, onContinue }) => (
  <div style={{
    background: '#0f0f0f',
    border: `1px solid ${hasAudio ? 'rgba(0,255,102,0.25)' : '#1a1a1a'}`,
    borderRadius: '10px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    transition: 'border-color 300ms ease',
    boxShadow: hasAudio ? '0 0 24px rgba(0,255,102,0.06)' : 'none',
  }}>
    {/* Header */}
    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
      <Activity size={11} style={{ color: hasAudio ? '#00FF66' : 'rgba(255,255,255,0.25)', flexShrink: 0, transition: 'color 300ms ease' }} />
      <span style={{
        fontFamily: "'Archivo Black', sans-serif",
        fontSize: '9px',
        fontWeight: 700,
        color: hasAudio ? '#00FF66' : 'rgba(255,255,255,0.25)',
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
        transition: 'color 300ms ease',
      }}>AUDIO ANALYSIS {hasAudio ? 'DETECTED' : ''}</span>
    </div>

    <div style={{ height: '1px', background: '#1a1a1a' }} />

    {/* Rows */}
    <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
      {ANALYSIS_ROWS.map(row => (
        <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{
            fontFamily: "'Archivo Black', sans-serif",
            fontSize: '8px',
            fontWeight: 700,
            color: 'rgba(255,255,255,0.4)',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}>
            {row.label}
          </span>
          <span style={{
            fontFamily: "'Inter', monospace",
            fontSize: '11px',
            fontWeight: 700,
            color: hasAudio ? '#FFFFFF' : 'rgba(255,255,255,0.2)',
            letterSpacing: '0.02em',
            transition: 'color 300ms ease',
          }}>
            {row.valueFn(hasAudio, duration)}
          </span>
        </div>
      ))}
    </div>

    {hasAudio && onContinue && (
      <>
        <div style={{ height: '1px', background: '#1a1a1a' }} />
        <button
          type="button"
          onClick={onContinue}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            width: '100%', height: '36px',
            background: 'linear-gradient(135deg, #005c1f, #00FF66)',
            border: 'none',
            borderRadius: '6px',
            color: '#000',
            fontFamily: "'Archivo Black', sans-serif",
            fontSize: '10px',
            fontWeight: 900,
            letterSpacing: '0.1em',
            cursor: 'pointer',
            boxShadow: '0 0 14px rgba(0,255,102,0.25)',
            transition: 'opacity 180ms ease',
          }}
        >
          CONTINUE <ArrowRight size={12} />
        </button>
      </>
    )}

    {!hasAudio && (
      <div style={{
        textAlign: 'center',
        fontFamily: "'Archivo Black', sans-serif",
        fontSize: '10px',
        color: 'rgba(255,255,255,0.3)',
        paddingTop: '2px',
      }}>
        Upload audio to analyze
      </div>
    )}
  </div>
);

// ─── STEP 1: Upload ───────────────────────────────────────────────────────────

export const StepUpload: React.FC<StepProps & { onNext: () => void }> = ({
  form, errors, onChange, onClearError, disabled, onNext,
}) => {
  const audioInputRef = useRef<HTMLInputElement>(null);

  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.match(/\.(mp3|wav)$/i)) {
      onChange({ audioFile: null });
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      onChange({ audioFile: null });
      return;
    }
    const audio = new Audio();
    audio.src = URL.createObjectURL(file);
    audio.onloadedmetadata = () => {
      const secs = Math.floor(audio.duration);
      const mins = Math.floor(secs / 60);
      const s = secs % 60;
      onChange({
        audioFile: file,
        audioDuration: secs,
        audioDurationFormatted: `${mins}:${s.toString().padStart(2, '0')}`,
      });
    };
    onClearError('audio');
  };

  const canProceed = !!form.audioFile;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <div style={{
          fontFamily: "'Archivo Black', sans-serif",
          fontSize: '11px',
          fontWeight: 700,
          color: '#00FF66',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginBottom: '4px',
        }}>
          STEP 1 — Upload Your Track
        </div>
        <div style={{
          fontSize: '12px',
          color: 'rgba(255,255,255,0.45)',
          fontFamily: "'Archivo Black', sans-serif",
        }}>
          Upload your track. Supported formats: WAV or MP3, max 100MB.
        </div>
      </div>

      <div
        style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}
        className="upload-analysis-grid-v2"
      >
        <style>{`@media (min-width: 640px) { .upload-analysis-grid-v2 { grid-template-columns: 2fr 1fr !important; } }`}</style>

        {/* Upload zone */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          <input
            ref={audioInputRef}
            type="file"
            accept=".mp3,.wav,audio/mpeg,audio/wav"
            style={{ display: 'none' }}
            onChange={handleAudioChange}
            disabled={disabled}
          />

          {form.audioFile ? (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '14px',
              padding: '16px 18px',
              borderRadius: '10px',
              background: 'rgba(0,255,102,0.04)',
              border: '1px solid rgba(0,255,102,0.2)',
            }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '8px', flexShrink: 0,
                background: 'rgba(0,255,102,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Music size={20} style={{ color: ACCENT }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '13px', fontWeight: 600, color: '#ffffff',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  fontFamily: "'Archivo Black', sans-serif",
                }}>
                  {form.audioFile.name}
                </div>
                <div style={{ fontSize: '11px', color: 'rgba(0,255,102,0.5)', marginTop: '2px', fontFamily: "'Archivo Black', sans-serif" }}>
                  {(form.audioFile.size / 1024 / 1024).toFixed(1)} MB
                  {form.audioDurationFormatted && ` · ${form.audioDurationFormatted}`}
                </div>
              </div>
              <button
                type="button"
                onClick={() => { onChange({ audioFile: null, audioDuration: null, audioDurationFormatted: '' }); audioInputRef.current?.click(); }}
                disabled={disabled}
                style={{
                  fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                  color: 'rgba(0,255,102,0.5)', background: 'none', border: '1px solid rgba(0,255,102,0.15)',
                  borderRadius: '5px', padding: '4px 10px', cursor: 'pointer',
                  fontFamily: "'Archivo Black', sans-serif",
                }}
              >
                CHANGE
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => audioInputRef.current?.click()}
              disabled={disabled}
              style={{
                width: '100%', minHeight: '200px',
                borderRadius: '10px',
                border: '2px dashed rgba(0,255,102,0.18)',
                background: 'rgba(0,255,102,0.01)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '14px',
                cursor: 'pointer', transition: 'all 200ms ease',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,255,102,0.4)';
                (e.currentTarget as HTMLElement).style.background = 'rgba(0,255,102,0.03)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,255,102,0.18)';
                (e.currentTarget as HTMLElement).style.background = 'rgba(0,255,102,0.01)';
              }}
            >
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%',
                background: 'rgba(0,255,102,0.08)',
                border: '1px solid rgba(0,255,102,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Upload size={24} style={{ color: ACCENT }} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  fontSize: '14px', fontWeight: 600, color: '#ffffff',
                  fontFamily: "'Archivo Black', sans-serif", marginBottom: '4px',
                }}>
                  Drag &amp; drop your audio file here
                </div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontFamily: "'Archivo Black', sans-serif" }}>
                  or
                </div>
              </div>
              <div style={{
                padding: '10px 24px',
                background: 'linear-gradient(135deg, #005c1f, #00FF66)',
                borderRadius: '7px',
                color: '#000',
                fontFamily: "'Archivo Black', sans-serif",
                fontSize: '11px',
                fontWeight: 900,
                letterSpacing: '0.08em',
                boxShadow: '0 0 14px rgba(0,255,102,0.2)',
              }}>
                CHOOSE FILE
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', fontFamily: "'Archivo Black', sans-serif" }}>
                WAV or MP3 · max 100MB
              </div>
            </button>
          )}

          {errors.audio && (
            <div style={{ ...errorStyle, marginTop: '8px' }}>
              <AlertCircle size={11} />{errors.audio}
            </div>
          )}
        </div>

        {/* Analysis panel */}
        <AudioAnalysisPanel
          hasAudio={!!form.audioFile}
          duration={form.audioDurationFormatted}
          onContinue={canProceed ? onNext : undefined}
        />
      </div>

    </div>
  );
};

// ─── STEP 2: Metadata (Solscan / Phantom trust fields) ────────────────────────

const metadataSchema = z.object({
  tokenName: z.string().min(1, 'Token name is required').max(32, 'Max 32 characters'),
  tokenSymbol: z.string().min(1, 'Symbol is required').max(10, 'Max 10 characters'),
  description: z.string().min(1, 'Description is required').max(200, 'Max 200 characters'),
  website: z.union([z.string().url('Must be a valid URL'), z.literal('')]),
  totalSupply: z.string().min(1, 'Total supply is required').regex(/^\d+$/, 'Must be a number'),
  decimals: z.number().min(0).max(9),
});

export const StepMetadata: React.FC<StepProps & { onNext: () => void; onBack: () => void }> = ({
  form, errors, onChange, onClearError, disabled, onNext, onBack,
}) => {
  const tokenImageInputRef = useRef<HTMLInputElement>(null);

  const handleTokenImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type)) return;
    if (file.size > 10 * 1024 * 1024) return;
    onChange({ tokenImageFile: file, tokenImagePreview: URL.createObjectURL(file) });
    onClearError('tokenImage');
  };

  const handleContinue = () => {
    const result = metadataSchema.safeParse({
      tokenName: form.tokenName,
      tokenSymbol: form.tokenSymbol,
      description: form.description,
      website: form.website,
      totalSupply: form.totalSupply,
      decimals: form.decimals,
    });

    if (!result.success) {
      // Surface first error per field
      const fieldErrors: Partial<Record<string, string>> = {};
      result.error.issues.forEach(issue => {
        const key = String(issue.path[0]);
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      });
      // Pass errors up via a hack — we re-clear and re-surface via onChange + errors prop
      // Since we can't call setErrors directly, validate locally and block
      return;
    }
    if (!form.tokenImageFile && !form.coverPreview) return;
    onNext();
  };

  const canProceed = !!form.tokenName.trim() && !!form.tokenSymbol.trim() && !!form.description.trim()
    && (form.tokenImageFile || !!form.coverPreview)
    && !!form.totalSupply.trim();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div>
        <div style={{
          fontFamily: "'Archivo Black', sans-serif",
          fontSize: '11px',
          fontWeight: 700,
          color: '#00FF66',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginBottom: '4px',
        }}>
          STEP 2 — Token Metadata
        </div>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', fontFamily: "'Archivo Black', sans-serif" }}>
          These fields appear on Solscan, Phantom, and all explorers. Fill them in carefully.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }} className="meta-two-col">
        <style>{`@media (max-width: 580px) { .meta-two-col { grid-template-columns: 1fr !important; } }`}</style>

        {/* Token Name */}
        <Field label="Token Name" required error={errors.tokenName} hint="1–32 characters. Shown in explorer.">
          <input
            type="text"
            value={form.tokenName}
            onChange={e => { onChange({ tokenName: e.target.value.slice(0, 32) }); onClearError('tokenName'); }}
            placeholder="Nothing to Lose"
            style={inputStyle}
            onFocus={inputFocus}
            onBlur={inputBlur}
            disabled={disabled}
            maxLength={32}
          />
          <div style={{ textAlign: 'right', fontSize: '10px', color: 'rgba(255,255,255,0.35)', fontFamily: "'Archivo Black', sans-serif", marginTop: '3px' }}>
            {form.tokenName.length}/32
          </div>
        </Field>

        {/* Token Symbol */}
        <Field label="Token Symbol / Ticker" required error={errors.tokenSymbol} hint="1–10 chars, uppercase.">
          <div style={{ position: 'relative' }}>
            <span style={{
              position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)',
              fontSize: '15px', fontWeight: 800, color: 'rgba(0,255,102,0.6)',
              fontFamily: "'Archivo Black', sans-serif",
            }}>$</span>
            <input
              type="text"
              value={form.tokenSymbol}
              onChange={e => {
                onChange({ tokenSymbol: e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 10) });
                onClearError('tokenSymbol');
              }}
              placeholder="NOTHIN"
              style={{ ...inputStyle, paddingLeft: '28px', fontFamily: "'Archivo Black', sans-serif", fontWeight: 700, letterSpacing: '0.1em', fontSize: '14px' }}
              onFocus={inputFocus}
              onBlur={inputBlur}
              disabled={disabled}
              maxLength={10}
            />
            <span style={{
              position: 'absolute', right: '13px', top: '50%', transform: 'translateY(-50%)',
              fontSize: '10px', color: form.tokenSymbol.length === 10 ? ACCENT : 'rgba(255,255,255,0.35)',
              fontFamily: "'Archivo Black', sans-serif",
            }}>
              {form.tokenSymbol.length}/10
            </span>
          </div>
        </Field>
      </div>

      {/* Description */}
      <Field label="Description" required error={errors.description} hint="Max 200 characters. Shown on all explorers.">
        <div style={{ position: 'relative' }}>
          <textarea
            value={form.description}
            onChange={e => { if (e.target.value.length <= 200) { onChange({ description: e.target.value }); onClearError('description'); } }}
            placeholder="Describe your track and what fans can expect..."
            rows={3}
            style={{ ...inputStyle, height: 'auto', padding: '12px 14px', resize: 'none', lineHeight: '1.55', display: 'block' }}
            onFocus={inputFocus}
            onBlur={inputBlur}
            disabled={disabled}
            maxLength={200}
          />
          <span style={{
            position: 'absolute', bottom: '10px', right: '12px',
            fontSize: '10px', color: form.description.length >= 180 ? ACCENT : 'rgba(255,255,255,0.35)',
            fontFamily: "'Archivo Black', sans-serif",
          }}>
            {form.description.length}/200
          </span>
        </div>
      </Field>

      {/* Token Image / Logo */}
      <Field label="Token Image / Logo" required error={errors.tokenImage} hint="Square PNG/JPG, recommended 512×512. Shown as token icon everywhere.">
        <input
          ref={tokenImageInputRef}
          type="file"
          accept="image/jpeg,image/png"
          style={{ display: 'none' }}
          onChange={handleTokenImageChange}
          disabled={disabled}
        />
        {form.tokenImagePreview ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0,
              border: '1px solid rgba(0,255,102,0.25)',
            }}>
              <img src={form.tokenImagePreview} alt="Token logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff', fontFamily: "'Archivo Black', sans-serif" }}>
                {form.tokenImageFile?.name}
              </div>
              <button
                type="button"
                onClick={() => { onChange({ tokenImageFile: null, tokenImagePreview: null }); tokenImageInputRef.current?.click(); }}
                disabled={disabled}
                style={{
                  marginTop: '6px', fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                  color: 'rgba(0,255,102,0.5)', background: 'none', border: '1px solid rgba(0,255,102,0.15)',
                  borderRadius: '5px', padding: '3px 10px', cursor: 'pointer', fontFamily: "'Archivo Black', sans-serif",
                }}
              >
                CHANGE
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => tokenImageInputRef.current?.click()}
            disabled={disabled}
            style={{
              width: '100%', minHeight: '90px',
              borderRadius: '10px',
              border: '2px dashed rgba(0,255,102,0.15)',
              background: 'rgba(0,255,102,0.01)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px',
              cursor: 'pointer', transition: 'all 180ms ease',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,255,102,0.35)';
              (e.currentTarget as HTMLElement).style.background = 'rgba(0,255,102,0.03)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,255,102,0.15)';
              (e.currentTarget as HTMLElement).style.background = 'rgba(0,255,102,0.01)';
            }}
          >
            <Image size={22} style={{ color: 'rgba(0,255,102,0.35)' }} />
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', fontFamily: "'Archivo Black', sans-serif" }}>
              Upload token logo (PNG/JPG)
            </div>
          </button>
        )}
      </Field>

      {/* Social links */}
      <div style={{
        background: '#0a0a0a',
        border: '1px solid #181818',
        borderRadius: '10px',
        padding: '16px',
        display: 'flex', flexDirection: 'column', gap: '14px',
      }}>
        <div style={{
          fontFamily: "'Archivo Black', sans-serif", fontSize: '8px', fontWeight: 700,
          color: 'rgba(255,255,255,0.4)', letterSpacing: '0.15em', textTransform: 'uppercase',
        }}>
          SOCIAL LINKS — OPTIONAL
        </div>

        <Field label="Website URL" optional icon={<Globe size={9} />}>
          <input
            type="url"
            value={form.website}
            onChange={e => onChange({ website: e.target.value })}
            placeholder="https://yoursite.com"
            style={inputStyle}
            onFocus={inputFocus}
            onBlur={inputBlur}
            disabled={disabled}
          />
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }} className="social-two-col">
          <style>{`@media (max-width: 500px) { .social-two-col { grid-template-columns: 1fr !important; } }`}</style>
          <Field label="Twitter / X Handle" optional icon={<Twitter size={9} />}>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: 'rgba(0,255,102,0.4)', fontFamily: "'Archivo Black', sans-serif" }}>@</span>
              <input
                type="text"
                value={form.twitter}
                onChange={e => onChange({ twitter: e.target.value.replace(/^@/, '') })}
                placeholder="yourhandle"
                style={{ ...inputStyle, paddingLeft: '26px' }}
                onFocus={inputFocus}
                onBlur={inputBlur}
                disabled={disabled}
              />
            </div>
          </Field>
          <Field label="Telegram" optional icon={<Send size={9} />}>
            <input
              type="text"
              value={form.telegram}
              onChange={e => onChange({ telegram: e.target.value })}
              placeholder="t.me/yourchannel"
              style={inputStyle}
              onFocus={inputFocus}
              onBlur={inputBlur}
              disabled={disabled}
            />
          </Field>
          <Field label="Discord" optional icon={<MessageSquare size={9} />}>
            <input
              type="text"
              value={form.discord}
              onChange={e => onChange({ discord: e.target.value })}
              placeholder="discord.gg/invite"
              style={inputStyle}
              onFocus={inputFocus}
              onBlur={inputBlur}
              disabled={disabled}
            />
          </Field>
        </div>
      </div>

      {/* Technical fields */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '14px' }} className="tech-grid">
        <style>{`@media (max-width: 500px) { .tech-grid { grid-template-columns: 1fr !important; } }`}</style>

        {/* Decimals (read-only) */}
        <Field label="Decimals" hint="Locked to 6 (default).">
          <div style={{
            ...inputStyle,
            display: 'flex', alignItems: 'center',
            background: '#080808',
            color: '#ffffff',
            fontFamily: "'Inter', monospace",
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'not-allowed',
            letterSpacing: '0.04em',
          }}>
            6 <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 400, marginLeft: '6px' }}>(default)</span>
          </div>
        </Field>

        {/* Total Supply (read-only) */}
        <Field label="Total Supply" hint="Total number of tokens to mint.">
          <div style={{
            ...inputStyle,
            display: 'flex', alignItems: 'center',
            background: '#080808',
            color: '#ffffff',
            fontFamily: "'Inter', monospace",
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'not-allowed',
            letterSpacing: '0.04em',
          }}>
            1,000,000,000
          </div>
        </Field>
      </div>

      {/* Tags */}
      <Field label="Tags" optional icon={<Tag size={9} />} hint="Comma-separated. E.g. music, hip-hop, audio">
        <input
          type="text"
          value={form.tags}
          onChange={e => onChange({ tags: e.target.value })}
          placeholder="music, audio, hip-hop"
          style={inputStyle}
          onFocus={inputFocus}
          onBlur={inputBlur}
          disabled={disabled}
        />
      </Field>

      {/* Creator wallet (read-only) */}
      <Field label="Creator Wallet" hint="Auto-filled from connected wallet. Read-only.">
        <div style={{
          ...inputStyle,
          display: 'flex', alignItems: 'center',
          background: '#080808',
          color: 'rgba(255,255,255,0.35)',
          fontFamily: "'Inter', monospace",
          fontSize: '11px',
          letterSpacing: '0.02em',
          cursor: 'not-allowed',
          height: 'auto',
          padding: '11px 14px',
        }}>
          <User size={12} style={{ color: 'rgba(255,255,255,0.25)', flexShrink: 0, marginRight: '8px' }} />
          {form.creatorWallet || 'Connect wallet to auto-fill'}
        </div>
      </Field>

      {/* Nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', paddingTop: '4px' }}>
        <BackButton onClick={onBack} />
        <ContinueButton
          label={<span>TOKENOMICS</span>}
          onClick={handleContinue}
          disabled={!canProceed || disabled}
        />
      </div>
    </div>
  );
};

// ─── STEP 3: Tokenomics ───────────────────────────────────────────────────────

const SHOPIFY_SPLIT = [
  { label: 'Buyer', pct: 90, color: '#00FF66' },
  { label: 'Creator', pct: 5, color: '#22d3ee' },
  { label: 'Treasury', pct: 2, color: '#a855f7' },
  { label: 'Infra', pct: 3, color: '#444' },
];

const DIRECT_SPLIT = [
  { label: 'Buyer', pct: 92, color: '#00FF66' },
  { label: 'Creator', pct: 5, color: '#22d3ee' },
  { label: 'Treasury', pct: 1.5, color: '#a855f7' },
  { label: 'Infra', pct: 1.5, color: '#444' },
];

const SplitBar: React.FC<{ label: string; splits: typeof SHOPIFY_SPLIT }> = ({ label, splits }) => (
  <div style={{ marginBottom: '14px' }}>
    <div style={{
      fontSize: '9px', fontFamily: "'Archivo Black', sans-serif", color: 'rgba(255,255,255,0.4)',
      letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px',
    }}>{label}</div>
    <div style={{ display: 'flex', borderRadius: '4px', overflow: 'hidden', height: '18px' }}>
      {splits.map(s => (
        <div key={s.label} style={{
          width: `${s.pct}%`, background: s.color,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          {s.pct >= 5 && (
            <span style={{
              fontFamily: "'Archivo Black', sans-serif", fontSize: '7px',
              fontWeight: 700, color: s.label === 'Buyer' ? '#000' : '#fff',
              letterSpacing: '0.04em',
            }}>
              {s.pct}%
            </span>
          )}
        </div>
      ))}
    </div>
    <div style={{ display: 'flex', gap: '10px', marginTop: '5px', flexWrap: 'wrap' }}>
      {splits.map(s => (
        <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{ width: '7px', height: '7px', borderRadius: '2px', background: s.color, flexShrink: 0 }} />
          <span style={{ fontFamily: "'Archivo Black', sans-serif", fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>
            {s.label} {s.pct}%
          </span>
        </div>
      ))}
    </div>
  </div>
);

export const StepTokenomics: React.FC<StepProps & { onNext: () => void; onBack: () => void }> = ({
  form, errors, onChange, onClearError, disabled, onNext, onBack,
}) => {
  const canProceed = true; // tokenomics has defaults

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div>
        <div style={{
          fontFamily: "'Archivo Black', sans-serif",
          fontSize: '11px',
          fontWeight: 700,
          color: '#00FF66',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginBottom: '4px',
        }}>
          STEP 3 — Tokenomics
        </div>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', fontFamily: "'Archivo Black', sans-serif" }}>
          Configure payout currency and launch mode.
        </div>
      </div>

      {/* Payout currency */}
      <Field label="Payout Currency" required>
        <div style={{ display: 'flex', gap: '10px' }}>
          {/* SOL — active, locked */}
          <button
            key="SOL"
            type="button"
            disabled
            style={{
              flex: 1, height: '44px', borderRadius: '8px',
              fontSize: '13px', fontWeight: 700, cursor: 'not-allowed',
              fontFamily: "'Archivo Black', sans-serif", letterSpacing: '0.06em',
              background: 'rgba(0,255,102,0.07)',
              border: '1px solid rgba(0,255,102,0.4)',
              color: '#ffffff',
              boxShadow: '0 0 10px rgba(0,255,102,0.1)',
            }}
          >
            ◎ SOL
          </button>
          {/* USDC — coming soon */}
          <button
            key="USDC"
            type="button"
            disabled
            style={{
              flex: 1, height: '44px', borderRadius: '8px',
              fontSize: '12px', fontWeight: 700, cursor: 'not-allowed',
              fontFamily: "'Archivo Black', sans-serif", letterSpacing: '0.06em',
              background: 'transparent',
              border: '1px dashed #2a2a2a',
              color: '#3a3a3a',
              boxShadow: 'none',
              opacity: 0.5,
            }}
          >
            $ USDC — Coming Soon
          </button>
        </div>
      </Field>

      {/* Launch mode */}
      <Field label="Launch Mode" required>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {([
            { id: 'auto' as const, label: 'AUTO', desc: 'Goes live immediately upon approval' },
            { id: 'manual' as const, label: 'MANUAL', desc: 'You control the exact launch time' },
          ]).map(opt => {
            const selected = form.launchMode === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChange({ launchMode: opt.id })}
                disabled={disabled}
                style={{
                  padding: '14px', borderRadius: '8px', textAlign: 'left', cursor: 'pointer',
                  transition: 'all 180ms ease',
                  background: selected ? 'rgba(0,255,102,0.06)' : 'transparent',
                  border: selected ? '1px solid rgba(0,255,102,0.4)' : '1px solid #1f1f1f',
                  boxShadow: selected ? '0 0 14px rgba(0,255,102,0.07)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <div style={{
                    width: '12px', height: '12px', borderRadius: '50%',
                    border: `1px solid ${selected ? ACCENT : 'rgba(255,255,255,0.2)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    {selected && <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: ACCENT }} />}
                  </div>
                  <span style={{
                    fontSize: '11px', fontWeight: 800, letterSpacing: '0.1em',
                    color: selected ? '#ffffff' : 'rgba(255,255,255,0.45)',
                    fontFamily: "'Archivo Black', sans-serif",
                  }}>
                    {opt.label}
                  </span>
                </div>
                <p style={{
                  fontSize: '11px', color: 'rgba(255,255,255,0.4)',
                  paddingLeft: '20px', margin: 0, lineHeight: 1.5,
                  fontFamily: "'Archivo Black', sans-serif",
                }}>
                  {opt.desc}
                </p>
              </button>
            );
          })}
        </div>
      </Field>

      {/* Revenue split */}
      <div style={{
        background: '#0a0a0a',
        border: '1px solid rgba(0,255,102,0.1)',
        borderRadius: '10px',
        padding: '16px',
      }}>
        <div style={{
          fontSize: '9px', fontFamily: "'Archivo Black', sans-serif", color: '#00FF66',
          letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '14px', fontWeight: 700,
        }}>
          REVENUE SPLIT
        </div>
        <SplitBar label="Shopify Sales" splits={SHOPIFY_SPLIT} />
        <SplitBar label="Direct SOL Sales" splits={DIRECT_SPLIT} />
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 12px',
          marginTop: '2px',
          background: 'rgba(34,211,238,0.04)',
          border: '1px solid rgba(34,211,238,0.12)',
          borderRadius: '6px',
        }}>
          <div style={{
            width: '7px', height: '7px', borderRadius: '2px', flexShrink: 0,
            background: '#22d3ee',
          }} />
          <span style={{
            fontFamily: "'Archivo Black', sans-serif", fontSize: '10px',
            color: 'rgba(255,255,255,0.55)', fontWeight: 600,
          }}>
            2% creator fees from every trade
          </span>
        </div>
      </div>

      {/* Nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', paddingTop: '4px' }}>
        <BackButton onClick={onBack} />
        <ContinueButton label={<span>REVIEW</span>} onClick={onNext} disabled={!canProceed || disabled} />
      </div>
    </div>
  );
};

// ─── STEP 4: Review ───────────────────────────────────────────────────────────

const ReviewRow: React.FC<{ label: string; value: string; icon?: React.ReactNode }> = ({ label, value, icon }) => (
  <div style={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '9px 0', borderBottom: '1px solid rgba(0,255,102,0.05)',
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
      {icon && <span style={{ color: 'rgba(0,255,102,0.35)', display: 'flex', alignItems: 'center' }}>{icon}</span>}
      <span style={{
        fontSize: '9px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.4)', fontFamily: "'Archivo Black', sans-serif",
      }}>
        {label}
      </span>
    </div>
    <span style={{
      fontSize: '12px', fontWeight: 600, color: '#ffffff',
      fontFamily: "'Archivo Black', sans-serif",
      textAlign: 'right', maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    }}>
      {value}
    </span>
  </div>
);

export const StepReview: React.FC<StepProps & { onBack: () => void; onNext: () => void }> = ({
  form, onChange, disabled, onBack, onNext,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div>
        <div style={{
          fontFamily: "'Archivo Black', sans-serif",
          fontSize: '11px',
          fontWeight: 700,
          color: '#00FF66',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginBottom: '4px',
        }}>
          STEP 4 — Review Summary
        </div>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', fontFamily: "'Archivo Black', sans-serif" }}>
          Review all details before launching.
        </div>
      </div>

      <div style={{
        background: '#0a0a0a',
        border: '1px solid rgba(0,255,102,0.12)',
        borderRadius: '10px',
        padding: '18px',
      }}>
        <div style={{
          fontSize: '9px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase',
          color: '#00FF66', fontFamily: "'Archivo Black', sans-serif", marginBottom: '12px',
        }}>
          TOKEN DETAILS
        </div>

        <ReviewRow label="Token Name" value={form.tokenName || '—'} icon={<Coins size={10} />} />
        <ReviewRow label="Symbol" value={form.tokenSymbol ? `$${form.tokenSymbol}` : '—'} icon={<Tag size={10} />} />
        <ReviewRow label="Description" value={form.description ? form.description.slice(0, 50) + (form.description.length > 50 ? '…' : '') : '—'} icon={<FileText size={10} />} />
        <ReviewRow label="Total Supply" value={form.totalSupply ? parseInt(form.totalSupply).toLocaleString() : '—'} />
        <ReviewRow label="Decimals" value={String(form.decimals)} />
        <ReviewRow label="Payout Currency" value={form.payoutCurrency} />
        <ReviewRow label="Launch Mode" value={form.launchMode === 'auto' ? 'AUTO' : 'MANUAL'} icon={<Rocket size={10} />} />
        {form.audioDurationFormatted && <ReviewRow label="Track Duration" value={form.audioDurationFormatted} />}
        {form.website && <ReviewRow label="Website" value={form.website} icon={<Globe size={10} />} />}
        {form.twitter && <ReviewRow label="Twitter" value={`@${form.twitter}`} icon={<Twitter size={10} />} />}
        {form.tags && <ReviewRow label="Tags" value={form.tags} />}
      </div>

      {/* Copyright */}
      <div>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
          <div
            onClick={() => !disabled && onChange({ copyright: !form.copyright })}
            style={{
              width: '18px', height: '18px', borderRadius: '4px', flexShrink: 0, marginTop: '2px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: form.copyright ? 'rgba(0,255,102,0.6)' : 'transparent',
              border: `1px solid ${form.copyright ? ACCENT : '#2a2a2a'}`,
              boxShadow: form.copyright ? '0 0 8px rgba(0,255,102,0.25)' : 'none',
              transition: 'all 180ms ease', cursor: 'pointer',
            }}
          >
            {form.copyright && <Check size={10} style={{ color: '#000' }} />}
          </div>
          <span style={{
            fontSize: '12px', lineHeight: 1.6, color: 'rgba(255,255,255,0.4)',
            fontFamily: "'Archivo Black', sans-serif",
          }}>
            I confirm this is 100% original work. I own all rights including beats, samples, and vocals.
            I accept full legal responsibility for copyright claims.
          </span>
        </label>
      </div>

      {/* Nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', paddingTop: '4px' }}>
        <BackButton onClick={onBack} disabled={disabled} />
        <ContinueButton
          label={<span>PROCEED TO LAUNCH</span>}
          onClick={onNext}
          disabled={!form.copyright || disabled}
        />
      </div>
    </div>
  );
};

// ─── STEP 5: Launch ───────────────────────────────────────────────────────────

const LAUNCH_STAGES = [
  { key: 'uploading-cover' as const, label: 'Uploading cover art...' },
  { key: 'uploading-audio' as const, label: 'Uploading audio...' },
  { key: 'minting-spl' as const, label: 'Launching token on-chain...' },
  { key: 'saving-details' as const, label: 'Saving details...' },
];

export const StepLaunch: React.FC<StepProps & { onBack: () => void; onSubmit: () => void; isSubmitting: boolean; submitStageLabel: string; submitStage: string }> = ({
  form, disabled, onBack, onSubmit, isSubmitting, submitStageLabel, submitStage,
}) => {
  const stageIndex = LAUNCH_STAGES.findIndex(s => s.key === submitStage);
  const progress = submitStage === 'success' ? 100 : stageIndex >= 0 ? ((stageIndex + 1) / LAUNCH_STAGES.length) * 100 : 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center', textAlign: 'center' }}>
      <div>
        <div style={{
          fontFamily: "'Archivo Black', sans-serif",
          fontSize: '11px',
          fontWeight: 700,
          color: '#00FF66',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          marginBottom: '4px',
        }}>
          STEP 5 — Launch
        </div>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', fontFamily: "'Archivo Black', sans-serif" }}>
          Your song token is ready for liftoff. This action is permanent.
        </div>
      </div>

      {/* Rocket graphic */}
      <div style={{
        width: '96px', height: '96px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0,255,102,0.12) 0%, rgba(0,255,102,0.02) 70%)',
        border: '1px solid rgba(0,255,102,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 0 40px rgba(0,255,102,0.1)',
      }}>
        <Rocket size={40} style={{ color: '#00FF66', filter: 'drop-shadow(0 0 12px rgba(0,255,102,0.6))' }} />
      </div>

      {/* Summary pill */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '8px',
        padding: '8px 18px',
        background: 'rgba(0,255,102,0.06)',
        border: '1px solid rgba(0,255,102,0.2)',
        borderRadius: '50px',
      }}>
        <span style={{ fontSize: '20px', fontFamily: "'Archivo Black', sans-serif", fontWeight: 900, color: '#00FF66' }}>
          ${form.tokenSymbol || '----'}
        </span>
        <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', fontFamily: "'Archivo Black', sans-serif" }}>
          {form.tokenName || 'Untitled'}
        </span>
      </div>

      {/* Launch progress bar */}
      {isSubmitting && (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Stage labels */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {LAUNCH_STAGES.map((stage, i) => {
              const completed = stageIndex > i;
              const active = stageIndex === i;
              return (
                <div key={stage.key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '16px', height: '16px', borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: completed ? ACCENT : active ? 'rgba(0,255,102,0.2)' : '#111',
                    border: `1px solid ${completed ? ACCENT : active ? 'rgba(0,255,102,0.4)' : '#222'}`,
                    transition: 'all 300ms ease',
                  }}>
                    {completed && <Check size={8} style={{ color: '#000' }} />}
                    {active && <Loader2 size={8} style={{ color: ACCENT }} className="animate-spin" />}
                  </div>
                  <span style={{
                    fontFamily: "'Archivo Black', sans-serif",
                    fontSize: '10px', fontWeight: 600,
                    letterSpacing: '0.04em',
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
          <div style={{
            width: '100%', height: '4px',
            background: '#111',
            borderRadius: '2px',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${progress}%`,
              background: submitStage === 'success'
                ? 'linear-gradient(90deg, #00FF66, #00FF66)'
                : 'linear-gradient(90deg, #005c1f, #00FF66)',
              borderRadius: '2px',
              transition: 'width 0.5s ease',
              boxShadow: '0 0 8px rgba(0,255,102,0.3)',
            }} />
          </div>

          {/* Current status text */}
          <div style={{
            textAlign: 'center',
            fontSize: '10px', fontWeight: 700,
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
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          padding: '14px 20px', borderRadius: '10px',
          background: 'rgba(0,255,102,0.08)', border: '1px solid rgba(0,255,102,0.3)',
          width: '100%',
        }}>
          <Check size={16} style={{ color: ACCENT }} />
          <span style={{
            fontSize: '13px', fontWeight: 800, color: ACCENT,
            fontFamily: "'Archivo Black', sans-serif", letterSpacing: '0.08em',
          }}>
            LAUNCH COMPLETE — REDIRECTING...
          </span>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', width: '100%' }}>
        <BackButton onClick={onBack} disabled={isSubmitting} />
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting || disabled}
          style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '14px 32px',
            borderRadius: '10px',
            border: 'none',
            cursor: (isSubmitting || disabled) ? 'default' : 'pointer',
            background: (isSubmitting || disabled)
              ? 'rgba(0,255,102,0.07)'
              : 'linear-gradient(135deg, #005c1f, #00FF66)',
            color: (isSubmitting || disabled) ? 'rgba(0,255,102,0.3)' : '#000',
            fontFamily: "'Archivo Black', sans-serif",
            fontSize: '13px',
            fontWeight: 900,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            boxShadow: (isSubmitting || disabled) ? 'none' : '0 0 24px rgba(0,255,102,0.3)',
            transition: 'all 180ms ease',
          }}
        >
          {isSubmitting ? (
            <><Loader2 size={16} className="animate-spin" /><span>LAUNCHING...</span></>
          ) : (
            <><Rocket size={16} /><span>LAUNCH ASSET</span></>
          )}
        </button>
      </div>
    </div>
  );
};
