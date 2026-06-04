import React, { useState, useCallback } from 'react';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useJupiterPrice } from '@/hooks/useJupiterPrice';
import { setSongs, getManySongs } from '@/lib/collections/songs';
import { setSongDetails } from '@/lib/collections/songDetails';
import { getArenas, setArenas, updateArenas } from '@/lib/collections/arenas';
import { uploadAppFiles, getAppFiles } from '@/lib/collections/appFiles';
import { Address, Increment, Time } from '@/lib/db-client';

import RiskDisclaimerBanner from '@/components/RiskDisclaimerBanner';
import LaunchHeroCard, { HeroState } from './LaunchHeroCard';
import LaunchStepIndicator, { LaunchStep } from './LaunchStepIndicator';
import {
  StepUpload,
  StepMetadata,
  StepTokenomics,
  StepReview,
  SongFormData,
} from './LaunchStepContent';

// ─── Types ────────────────────────────────────────────────────────────────────

type SubmitStage =
  | 'idle'
  | 'uploading-cover'
  | 'uploading-audio'
  | 'uploading-metadata'
  | 'minting-spl'
  | 'saving-details'
  | 'success';

const STAGE_LABELS: Record<SubmitStage, string> = {
  idle: '',
  'uploading-cover': 'Uploading cover art...',
  'uploading-audio': 'Uploading audio...',
  'uploading-metadata': 'Uploading metadata...',
  'minting-spl': 'Launching token on-chain...',
  'saving-details': 'Saving details...',
  success: 'Done!',
};

const MAX_RETRIES = 6;
const RETRY_DELAY_MS = 800;

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

function generateId(prefix: string, title: string): string {
  const slug = title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim()
    .replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 40);
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${slug || prefix}-${suffix}`;
}

function deriveTicker(title: string): string {
  const upper = title.toUpperCase().replace(/[^A-Z]/g, '');
  if (upper.length <= 6) return upper;
  // Strip vowels to shorten
  const noVowels = upper.replace(/[AEIOU]/g, '');
  return (noVowels.length >= 3 ? noVowels : upper).slice(0, 6);
}

const defaultForm = (): SongFormData => ({
  // Legacy fields
  title: '',
  artistName: '',
  description: '',
  twitterHandle: '',
  genre: '',
  assignAlbum: false,
  albumId: '',
  // New fields
  tokenName: '',
  tokenSymbol: '',
  tokenImageFile: null,
  tokenImagePreview: null,
  website: '',
  twitter: '',
  telegram: '',
  discord: '',
  decimals: 6,
  totalSupply: '1000000000',
  tags: 'music, audio',
  creatorWallet: '',
  // Common fields
  payoutCurrency: 'SOL',
  launchMode: 'auto',
  copyright: false,
  coverFile: null,
  coverPreview: null,
  audioFile: null,
  audioDuration: null,
  audioDurationFormatted: '',
});

interface SongTokenTerminalProps {
  walletAddress: string;
  onBack: () => void;
  onSuccess: (id: string, title: string) => void;
}

// ─── Main Component ───────────────────────────────────────────────────────────

const SongTokenTerminal: React.FC<SongTokenTerminalProps> = ({ walletAddress, onBack, onSuccess }) => {
  const [form, setForm] = useState<SongFormData>(defaultForm());
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [step, setStep] = useState<LaunchStep>(1);
  const [maxReached, setMaxReached] = useState<LaunchStep>(1);
  const [stage, setStage] = useState<SubmitStage>('idle');

  const solPrice = useJupiterPrice('So11111111111111111111111111111111111111112');

  const isSubmitting = stage !== 'idle' && stage !== 'success';

  const handleChange = useCallback((updates: Partial<SongFormData>) => {
    setForm(prev => {
      const next = { ...prev, ...updates };
      // Auto-derive ticker from title if ticker hasn't been manually set
      const newTitle = updates.title ?? updates.tokenName;
      if (newTitle !== undefined && !prev.tokenSymbol) {
        next.tokenSymbol = deriveTicker(newTitle);
      }
      return next;
    });
  }, []);

  const clearError = useCallback((key: string) => {
    setErrors(prev => ({ ...prev, [key]: undefined }));
  }, []);

  const goToStep = (s: LaunchStep) => {
    setStep(s);
    setMaxReached(prev => (s > prev ? s : prev));
  };

  // Hero state derivation
  const heroState: HeroState = (() => {
    if (stage === 'success') return 'minted';
    if (step === 4 || step === 5 || (step === 3 && form.tokenSymbol)) return 'tokenomics';
    if (step === 3 || (step === 2 && (form.title ?? form.tokenName))) return 'metadata';
    if (form.audioFile || form.coverFile) return 'active';
    return 'idle';
  })();

  const handleSubmit = async () => {
    // Validate
    const errs: typeof errors = {};
    if (!form.copyright) errs.copyright = 'You must confirm copyright ownership.';
    if (!form.tokenSymbol.trim()) errs.tokenSymbol = 'Token symbol is required.';
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast.error('Please fix the errors above.');
      return;
    }

    // Check ticker uniqueness
    const existing = await getManySongs(`where symbol = '${form.tokenSymbol}'`);
    if (existing.length > 0) {
      setErrors(v => ({ ...v, tokenSymbol: 'This ticker is already taken. Choose another.' }));
      toast.error('That ticker is already taken.');
      goToStep(3);
      return;
    }

    const songId = generateId('song', form.title ?? form.tokenName);
    const twitterClean = (form.twitterHandle ?? form.twitter ?? '').replace(/^@/, '').trim();

    try {
      setStage('uploading-cover');
      const coverSource = form.tokenImageFile ?? form.coverFile;
      if (!coverSource) throw new Error('Cover art is required. Please upload a token image in Step 2.');
      const coverArtUrl = await uploadAndGetUrl(`cover-${songId}`, coverSource);
      if (!coverArtUrl) throw new Error('Cover art upload failed.');

      setStage('uploading-audio');
      const audioUrl = await uploadAndGetUrl(`audio-${songId}`, form.audioFile!);
      if (!audioUrl) throw new Error('Audio upload failed.');

      setStage('uploading-metadata');
      const metadata: Record<string, unknown> = {
        name: form.title ?? form.tokenName,
        symbol: form.tokenSymbol,
        description: form.description.trim() || '',
        image: coverArtUrl,
        animation_url: `${audioUrl}?ext=mp3`,
        external_url: `https://litstudio.online/song/${songId}`,
        properties: {
          category: 'audio',
          files: [{ uri: audioUrl, type: form.audioFile!.type }],
          artist: (form.artistName ?? '').trim(),
          ...(twitterClean ? { twitter: `https://twitter.com/${twitterClean}` } : {}),
        },
      };
      const metadataFile = new File([JSON.stringify(metadata)], 'metadata.json', { type: 'application/json' });
      const metadataUrl = await uploadAndGetUrl(`metadata-${songId}`, metadataFile);
      if (!metadataUrl) throw new Error('Metadata upload failed.');

      const resolvedTitle = form.title ?? form.tokenName ?? '';
      setStage('minting-spl');
      const songCreated = await setSongs(songId, {
        name: resolvedTitle,
        symbol: form.tokenSymbol,
        uri: metadataUrl,
        creator: Address.publicKey(walletAddress),
      });
      if (!songCreated) throw new Error('Failed to launch song token. Ensure you have at least 0.1 SOL in your wallet.');

      setStage('saving-details');
      const detailsSaved = await setSongDetails(songId, {
        title: resolvedTitle,
        artist: (form.artistName ?? '').trim(),
        artistAddress: Address.publicKey(walletAddress),
        genre: form.genre || undefined,
        coverImage: coverArtUrl,
        audioUrl,
        tokenSymbol: form.tokenSymbol,
        totalEditions: 0,
        currentEditionCount: 0,
        duration: form.audioDuration ?? undefined,
        streamRequirement: 0,
        approved: false,
      });
      if (!detailsSaved) throw new Error('Failed to save song details.');

      try {
        const existingArena = await getArenas(walletAddress);
        if (!existingArena) {
          await setArenas(walletAddress, {
            artistAddress: Address.publicKey(walletAddress),
            artistName: `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
            coverImage: coverArtUrl || undefined,
            songCount: 1,
            createdAt: Time.Now,
          });
        } else {
          await updateArenas(walletAddress, { songCount: Increment.by(1) });
        }
      } catch { /* non-critical */ }

      setStage('success');
      onSuccess(songId, resolvedTitle);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Submission failed. Please try again.');
      setStage('idle');
    }
  };

  // Step 1 → 2 validation
  const handleStep1Next = () => {
    const errs: typeof errors = {};
    if (!form.audioFile) errs.audio = 'Audio file is required.';
    setErrors(errs);
    if (Object.keys(errs).length === 0) goToStep(2);
  };

  // Step 2 → 3 validation
  const handleStep2Next = () => {
    const errs: typeof errors = {};
    const title = form.title ?? form.tokenName ?? '';
    const artistName = form.artistName ?? '';
    if (!title.trim()) errs.title = 'Song title is required.';
    if (!artistName.trim()) errs.artistName = 'Artist name is required.';
    if (!form.genre) errs.genre = 'Please select a genre.';
    if (form.description.length > 200) errs.description = 'Description must be 200 characters or fewer.';
    setErrors(errs);
    if (Object.keys(errs).length === 0) goToStep(3);
  };

  // Step 3 → 4 validation
  const handleStep3Next = () => {
    const errs: typeof errors = {};
    if (!form.tokenSymbol.trim()) errs.tokenSymbol = 'Token symbol is required.';
    setErrors(errs);
    if (Object.keys(errs).length === 0) goToStep(4);
  };

  const stepLabels: Record<LaunchStep, { label: string; title: string; desc: string }> = {
    1: { label: 'STEP 01', title: 'Upload Files', desc: 'Drop your track and cover art to get started.' },
    2: { label: 'STEP 02', title: 'Song Metadata', desc: 'Title, artist, genre — the identity of your release.' },
    3: { label: 'STEP 03', title: 'Tokenomics', desc: 'Set your ticker and configure payout settings.' },
    4: { label: 'STEP 04', title: 'Review', desc: 'Final check before going on-chain.' },
    5: { label: 'STEP 05', title: 'Launch', desc: 'Launch your song token on-chain.' },
  };

  const currentStepInfo = stepLabels[step];

  return (
    <>
      <style>{`
        @keyframes ctaPulse {
          0%, 100% { box-shadow: 0 0 8px rgba(0, 255, 65, .35), 0 0 24px rgba(0, 255, 65, .12); }
          50% { box-shadow: 0 0 14px rgba(0, 255, 65, .55), 0 0 36px rgba(0, 255, 65, .22); }
        }
        @keyframes stepFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes dotPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes terminalScroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        /* Mobile step pills scroll */
        .step-pills-scroll {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
          padding-bottom: 4px;
        }
        .step-pills-scroll::-webkit-scrollbar { display: none; }

        /* Responsive grid */
        @media (max-width: 900px) {
          .launch-outer-grid {
            grid-template-columns: 1fr !important;
          }
          .launch-top-card-grid {
            grid-template-columns: 1fr !important;
          }
          .launch-audio-panel {
            display: none !important;
          }
        }
        @media (max-width: 640px) {
          .launch-title-row {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 12px !important;
          }
          .status-bar-center {
            display: none !important;
          }
          .launch-page-title {
            font-size: 26px !important;
          }
        }
      `}</style>

      <RiskDisclaimerBanner />
      {/* Page wrapper — leaves room for fixed status bar */}
      <div style={{
        minHeight: '100vh',
        background: '#000000',
        paddingTop: '72px',
        paddingBottom: '60px',
      }}>
        <div style={{ maxWidth: '1160px', margin: '0 auto', padding: '0 24px' }}>

          {/* ── Back nav ── */}
          <button
            type="button"
            onClick={onBack}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em',
              color: '#666', background: 'none', border: 'none',
              cursor: 'pointer', marginBottom: '28px', padding: 0,
              fontFamily: "'Archivo Black', sans-serif", textTransform: 'uppercase',
              transition: 'color 180ms ease',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#00FF41'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#666'; }}
          >
            <ArrowLeft size={13} />
            Back
          </button>

          {/* ── Page title row ── */}
          <div
            className="launch-title-row"
            style={{
              display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
              marginBottom: '28px', gap: '16px',
            }}
          >
            <div>
              <h1
                className="launch-page-title"
                style={{
                  fontFamily: "'Archivo Black', sans-serif",
                  fontSize: '36px',
                  fontWeight: 900,
                  margin: 0,
                  lineHeight: 1,
                  letterSpacing: '-0.02em',
                }}
              >
                <span style={{ color: '#00FF41' }}>LAUNCH</span>
                <span style={{ color: '#ffffff' }}> YOUR SONG</span>
              </h1>
              <p style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: '14px',
                color: '#666',
                margin: '8px 0 0',
              }}>
                Tokenize your track on Solana with a bonding curve launch.
              </p>
            </div>

            {/* Step indicator — right aligned on desktop */}
            <div style={{ flexShrink: 0 }}>
              <LaunchStepIndicator
                currentStep={step}
                onStepClick={(s) => { if (s <= maxReached) setStep(s); }}
                maxReached={maxReached}
              />
            </div>
          </div>

          {/* ── Top preview card (full width, 3-col) ── */}
          <div style={{
            background: '#0d1a0e',
            border: '1px solid rgba(0, 255, 65, 0.2)',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '20px',
          }}>
            <LaunchHeroCard
              state={heroState}
              coverPreview={form.coverPreview}
              trackTitle={form.title ?? form.tokenName}
              artistName={form.artistName ?? ''}
              genre={form.genre ?? ''}
              ticker={form.tokenSymbol}
              duration={form.audioDurationFormatted}
              disabled={isSubmitting}
            />
          </div>

          {/* ── Main 3-col grid ── */}
          <div
            className="launch-outer-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: '220px 1fr 280px',
              gap: '20px',
              alignItems: 'start',
            }}
          >
            {/* ── Left sidebar steps ── */}
            <div style={{
              background: '#0d1a0e',
              border: '1px solid rgba(0, 255, 65, 0.2)',
              borderRadius: '12px',
              padding: '16px',
              position: 'sticky',
              top: '80px',
            }}>
              <div style={{
                fontFamily: "'Archivo Black', sans-serif",
                fontSize: '9px',
                color: '#333',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                marginBottom: '12px',
              }}>
                STEPS
              </div>
              {([
                { num: 1 as LaunchStep, label: 'Upload', sub: 'Audio + Cover' },
                { num: 2 as LaunchStep, label: 'Metadata', sub: 'Title, Artist, Genre' },
                { num: 3 as LaunchStep, label: 'Tokenomics', sub: 'Ticker + Payout' },
                { num: 4 as LaunchStep, label: 'Launch', sub: 'Review + Submit' },
              ]).map(s => {
                const isActive = step === s.num;
                const isClickable = s.num <= maxReached;
                return (
                  <button
                    key={s.num}
                    type="button"
                    onClick={() => isClickable ? goToStep(s.num) : undefined}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '12px',
                      marginBottom: '4px',
                      borderRadius: '8px',
                      cursor: isClickable ? 'pointer' : 'default',
                      background: isActive ? 'rgba(0, 255, 65, 0.1)' : 'transparent',
                      borderLeft: `3px solid ${isActive ? '#00FF41' : 'transparent'}`,
                      border: 'none',
                      borderLeftWidth: '3px',
                      borderLeftStyle: 'solid',
                      borderLeftColor: isActive ? '#00FF41' : 'transparent',
                      transition: 'all 180ms ease',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: isActive ? '#00FF41' : '#111',
                    }}>
                      <span style={{
                        fontFamily: "'Archivo Black', sans-serif",
                        fontSize: '11px',
                        fontWeight: 700,
                        color: isActive ? '#000' : '#444',
                      }}>
                        {String(s.num).padStart(2, '0')}
                      </span>
                    </div>
                    <div>
                      <div style={{
                        fontFamily: "'Archivo Black', sans-serif",
                        fontSize: '11px',
                        fontWeight: 700,
                        color: isActive ? '#ffffff' : '#555',
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                      }}>
                        {s.label}
                      </div>
                      <div style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '10px',
                        color: isActive ? '#555' : '#333',
                        marginTop: '1px',
                      }}>
                        {s.sub}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* ── Center: step content ── */}
            <div style={{
              background: '#0d1a0e',
              border: '1px solid rgba(0, 255, 65, 0.2)',
              borderRadius: '12px',
              padding: '28px',
            }}>
              {/* Step header */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{
                  fontFamily: "'Archivo Black', sans-serif",
                  fontSize: '10px',
                  color: '#00FF41',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  marginBottom: '4px',
                }}>
                  {currentStepInfo.label}
                </div>
                <h2 style={{
                  fontFamily: "'Archivo Black', sans-serif",
                  fontSize: '24px',
                  fontWeight: 900,
                  color: '#ffffff',
                  margin: '0 0 8px',
                  letterSpacing: '-0.02em',
                }}>
                  {currentStepInfo.title}
                </h2>
                <p style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '14px',
                  color: '#666',
                  margin: 0,
                }}>
                  {currentStepInfo.desc}
                </p>
              </div>

              {/* Step content with fade transition */}
              <div
                key={step}
                style={{ animation: 'stepFadeIn 200ms cubic-bezier(.2,.8,.2,1) forwards' }}
              >
                {step === 1 && (
                  <StepUpload
                    form={form}
                    errors={errors}
                    onChange={handleChange}
                    onClearError={clearError}
                    disabled={isSubmitting}
                    onNext={handleStep1Next}
                  />
                )}
                {step === 2 && (
                  <StepMetadata
                    form={form}
                    errors={errors}
                    onChange={handleChange}
                    onClearError={clearError}
                    disabled={isSubmitting}
                    onNext={handleStep2Next}
                    onBack={() => goToStep(1)}
                  />
                )}
                {step === 3 && (
                  <StepTokenomics
                    form={form}
                    errors={errors}
                    onChange={handleChange}
                    onClearError={clearError}
                    disabled={isSubmitting}
                    onNext={handleStep3Next}
                    onBack={() => goToStep(2)}
                  />
                )}
                {step === 4 && (
                  <StepReview
                    form={form}
                    errors={errors}
                    onChange={handleChange}
                    onClearError={clearError}
                    disabled={isSubmitting}
                    onBack={() => goToStep(3)}
                    onNext={handleSubmit}
                  />
                )}
              </div>
            </div>

            {/* ── Right: audio analysis panel ── */}
            <div
              className="launch-audio-panel"
              style={{
                background: '#0d1a0e',
                border: '1px solid rgba(0, 255, 65, 0.2)',
                borderRadius: '12px',
                padding: '20px',
                position: 'sticky',
                top: '80px',
              }}
            >
              <div style={{
                display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '20px',
              }}>
                <span style={{
                  fontFamily: "'Archivo Black', sans-serif", fontSize: '10px', color: '#00FF41',
                  letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 700,
                }}>
                  AUDIO ANALYSIS
                </span>
                <span style={{
                  fontFamily: "'Archivo Black', sans-serif", fontSize: '10px', color: '#555',
                  letterSpacing: '0.1em',
                }}>
                  (DETECTED)
                </span>
              </div>

              {form.audioFile ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Duration */}
                  <AnalysisRow icon="clock" label="DURATION" value={form.audioDurationFormatted || '—'} />
                  {/* BPM — not detected, placeholder */}
                  <AnalysisRow icon="music" label="BPM" value="—" />
                  {/* Key */}
                  <AnalysisRow icon="key" label="KEY" value="—" />
                  {/* Format */}
                  <AnalysisRow
                    icon="grid"
                    label="FORMAT"
                    value={form.audioFile.name.split('.').pop()?.toUpperCase() ?? '—'}
                  />
                  {/* File size as quality proxy */}
                  <AnalysisRow
                    icon="sparkles"
                    label="SIZE"
                    value={`${(form.audioFile.size / 1024 / 1024).toFixed(1)} MB`}
                  />
                  {/* Loudness bar */}
                  <div>
                    <AnalysisRow icon="wave" label="LOUDNESS" value="-6 LUFS" />
                    <div style={{
                      marginTop: '8px',
                      width: '100%', height: '6px', borderRadius: '3px',
                      background: '#111', overflow: 'hidden',
                    }}>
                      <div style={{
                        width: '68%', height: '100%',
                        background: 'rgba(0, 255, 65, 0.6)',
                        borderRadius: '3px',
                      }} />
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  minHeight: '180px',
                  fontFamily: "'Inter', sans-serif",
                  fontSize: '13px',
                  color: '#333',
                  textAlign: 'center',
                  lineHeight: 1.6,
                }}>
                  Upload a track to<br />see analysis
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* ── Fixed bottom status bar ── */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        height: '40px',
        background: '#0a0a0a',
        borderTop: '1px solid #111',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px',
        zIndex: 100,
      }}>
        {/* Left: SOL price */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '6px', height: '6px', borderRadius: '50%', background: '#00FF41',
            animation: 'dotPulse 2s ease-in-out infinite', flexShrink: 0,
          }} />
          <span style={{
            fontFamily: "'Archivo Black', sans-serif", fontSize: '10px', color: '#666',
            letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>
            SOL PRICE
          </span>
          <span style={{
            fontFamily: "'Inter', sans-serif", fontSize: '12px', color: '#ffffff',
            fontWeight: 700,
          }}>
            {solPrice.loading ? '—' : solPrice.priceStr}
          </span>
          <span style={{
            fontFamily: "'Inter', sans-serif", fontSize: '11px',
            color: solPrice.isPositive ? '#00FF41' : '#FF3333',
            fontWeight: 700,
          }}>
            {solPrice.loading ? '—' : solPrice.changeStr}
          </span>
        </div>

        {/* Center: network info */}
        <div
          className="status-bar-center"
          style={{ display: 'flex', alignItems: 'center', gap: '16px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              fontFamily: "'Archivo Black', sans-serif", fontSize: '10px', color: '#666',
              letterSpacing: '0.1em', textTransform: 'uppercase',
            }}>NETWORK</span>
            <span style={{
              fontFamily: "'Inter', sans-serif", fontSize: '12px', color: '#ffffff',
              fontWeight: 700,
            }}>SOLANA</span>
          </div>
          <div style={{ width: '1px', height: '16px', background: '#222' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              fontFamily: "'Archivo Black', sans-serif", fontSize: '10px', color: '#666',
              letterSpacing: '0.1em', textTransform: 'uppercase',
            }}>TPS</span>
            <span style={{
              fontFamily: "'Inter', sans-serif", fontSize: '12px', color: '#ffffff',
              fontWeight: 700,
            }}>—</span>
          </div>
        </div>

        {/* Right: system status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '6px', height: '6px', borderRadius: '50%', background: '#00FF41',
            animation: 'dotPulse 2s ease-in-out infinite 0.5s', flexShrink: 0,
          }} />
          <span style={{
            fontFamily: "'Archivo Black', sans-serif", fontSize: '10px', color: '#00FF41',
            letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>
            ALL SYSTEMS OPERATIONAL
          </span>
        </div>
      </div>
    </>
  );
};

// ─── Analysis row helper ──────────────────────────────────────────────────────

const ICON_PATHS: Record<string, React.ReactNode> = {
  clock: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00FF41" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  music: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00FF41" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
    </svg>
  ),
  key: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00FF41" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
    </svg>
  ),
  grid: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00FF41" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  ),
  sparkles: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00FF41" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.5 4.5H18l-3.75 2.7 1.5 4.5L12 12l-3.75 2.7 1.5-4.5L6 7.5h4.5z"/>
    </svg>
  ),
  wave: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00FF41" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 13c2-4 4 4 6 0s4-4 6 0 2 4 2 0"/>
    </svg>
  ),
};

const AnalysisRow: React.FC<{ icon: string; label: string; value: string }> = ({ icon, label, value }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
    <div style={{ flexShrink: 0 }}>{ICON_PATHS[icon]}</div>
    <span style={{
      fontFamily: "'Archivo Black', sans-serif", fontSize: '12px', color: '#666',
      letterSpacing: '0.12em', textTransform: 'uppercase', flex: 1,
    }}>
      {label}
    </span>
    <span style={{
      fontFamily: "'Archivo Black', sans-serif", fontSize: '13px', color: '#ffffff',
      fontWeight: 700, letterSpacing: '0.04em',
    }}>
      {value}
    </span>
  </div>
);

export default SongTokenTerminal;
