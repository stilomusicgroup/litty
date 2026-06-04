import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/use-privy-auth';
import { PageLayout } from '@/components/poof-ui';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Music,
  Image,
  CheckCircle,
  AlertCircle,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { setEditions } from '@/lib/collections/editions';
import { uploadAppFiles } from '@/lib/collections/appFiles';
import { Time, Address } from '@/lib/db-client';
import AuthGate from '@/components/AuthGate';

type Step = 1 | 2 | 3 | 4;

const CreateEditionPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const walletAddress = user?.address ?? null;
  const isAuthenticated = !!user;

  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [submitting, setSubmitting] = useState(false);

  // Form Data
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioPreview, setAudioPreview] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [description, setDescription] = useState('');
  const [editionSize, setEditionSize] = useState(10);
  const [priceSol, setPriceSol] = useState('');
  const [tokenName, setTokenName] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('');

  const coverInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverImage(file);
      setCoverImagePreview(URL.createObjectURL(file));
    }
  };

  const handleAudioSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioFile(file);
      setAudioPreview(URL.createObjectURL(file));
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return coverImage !== null;
      case 2:
        return title.trim() !== '' && artist.trim() !== '';
      case 3:
        return editionSize >= 1 && editionSize <= 20 && priceSol !== '' && tokenName.trim() !== '' && tokenSymbol.trim() !== '';
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (canProceed()) {
      setCurrentStep((prev) => Math.min(prev + 1, 4) as Step);
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1) as Step);
  };

  const handleSubmit = async () => {
    if (!isAuthenticated || !walletAddress) {
      toast.error('Please connect your wallet');
      login();
      return;
    }

    if (!coverImage || !title.trim() || !artist.trim()) {
      toast.error('Please complete all required fields');
      return;
    }

    const priceInLamports = Math.round(parseFloat(priceSol) * 1_000_000_000);
    if (isNaN(priceInLamports) || priceInLamports <= 0) {
      toast.error('Please enter a valid price');
      return;
    }

    setSubmitting(true);

    try {
      // Upload cover image
      const coverImageId = `edition-cover-${Date.now()}`;
      const coverUploadSuccess = await uploadAppFiles(coverImageId, coverImage);
      if (!coverUploadSuccess) {
        throw new Error('Failed to upload cover image');
      }
      const coverImageUrl = `appFiles/${coverImageId}`;

      // Upload audio if provided
      let audioUrl: string | undefined;
      if (audioFile) {
        const audioId = `edition-audio-${Date.now()}`;
        const audioUploadSuccess = await uploadAppFiles(audioId, audioFile);
        if (audioUploadSuccess) {
          audioUrl = `appFiles/${audioId}`;
        }
      }

      // Create edition record
      const editionId = `edition-${Date.now()}`;
      const success = await setEditions(editionId, {
        title: title.trim(),
        artist: artist.trim(),
        artistAddress: Address.publicKey(walletAddress),
        description: description.trim() || undefined,
        coverImage: coverImageUrl,
        audioUrl,
        editionSize,
        remaining: editionSize,
        priceSol: priceInLamports,
        editionTokenName: tokenName.trim(),
        editionTokenSymbol: tokenSymbol.trim().toUpperCase(),
        createdAt: Time.Now,
      });

      if (success) {
        toast.success('Collectible edition created successfully!');
        navigate(`/edition/${editionId}`);
      } else {
        throw new Error('Failed to create edition');
      }
    } catch (error) {
      console.error('Submit error:', error);
      toast.error('Failed to create edition. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
      {[1, 2, 3, 4].map((step) => (
        <div key={step} className="flex items-center">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all"
            style={{
              background:
                currentStep >= step
                  ? 'linear-gradient(135deg, #00FF41, #00FF41)'
                  : 'rgba(0, 255, 65, 0.08)',
              color: currentStep >= step ? '#020A02' : 'rgba(200,255,200,0.4)',
            }}
          >
            {currentStep > step ? <CheckCircle size={16} /> : step}
          </div>
          {step < 4 && (
            <div
              className="w-12 h-0.5 mx-1"
              style={{
                background:
                  currentStep > step
                    ? 'linear-gradient(90deg, #00FF41, #00FF41)'
                    : 'rgba(0, 255, 65, 0.15)',
              }}
            />
          )}
        </div>
      ))}
    </div>
  );

  const Step1Upload = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Upload Cover Art</h2>
        <p className="text-muted-foreground">Upload a high-quality cover image for your collectible</p>
      </div>

      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        onChange={handleCoverSelect}
        className="hidden"
      />

      <div
        onClick={() => coverInputRef.current?.click()}
        className="relative aspect-square rounded-2xl border-2 border-dashed cursor-pointer overflow-hidden transition-all hover:border-primary/50"
        style={{
          borderColor: coverImage ? '#00FF41' : 'rgba(0, 255, 65, 0.2)',
          background: 'rgba(0,0,0,0.25)',
        }}
      >
        {coverImagePreview ? (
          <img
            src={coverImagePreview}
            alt="Cover preview"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Image size={64} className="text-white/20 mb-4" />
            <p className="text-muted-foreground">Click to upload cover art</p>
            <p className="text-xs text-white/30 mt-2">PNG, JPG, GIF up to 10MB</p>
          </div>
        )}
      </div>
    </div>
  );

  const Step2Metadata = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Music & Details</h2>
        <p className="text-muted-foreground">Tell us about your collectible</p>
      </div>

      {/* Audio Upload */}
      <div>
        <label className="block text-sm font-medium mb-2">Audio File (Optional)</label>
        <input
          ref={audioInputRef}
          type="file"
          accept="audio/*"
          onChange={handleAudioSelect}
          className="hidden"
        />
        <div
          onClick={() => audioInputRef.current?.click()}
          className="p-4 rounded-xl border cursor-pointer transition-all hover:border-primary/50 flex items-center gap-4"
          style={{
            borderColor: audioFile ? '#00FF41' : 'rgba(0, 255, 65, 0.18)',
            background: 'rgba(0,0,0,0.25)',
          }}
        >
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(0, 255, 65, 0.12)' }}
          >
            <Music size={24} style={{ color: '#00FF41' }} />
          </div>
          <div className="flex-1">
            {audioPreview ? (
              <div className="flex items-center gap-2">
                <audio src={audioPreview} className="hidden" />
                <span className="font-medium">{audioFile?.name}</span>
                <CheckCircle size={16} className="text-emerald-400" />
              </div>
            ) : (
              <>
                <p className="font-medium">Upload Audio Track</p>
                <p className="text-xs text-muted-foreground">MP3, WAV, FLAC up to 50MB</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Title */}
      <div>
        <label className="block text-sm font-medium mb-2">Title *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Midnight Echo"
          className="w-full px-4 py-3 rounded-xl border bg-transparent focus:outline-none focus:ring-2"
          style={{
            borderColor: title ? '#00FF41' : 'rgba(0, 255, 65, 0.18)',
          }}
        />
      </div>

      {/* Artist */}
      <div>
        <label className="block text-sm font-medium mb-2">Artist Name *</label>
        <input
          type="text"
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
          placeholder="Your artist name"
          className="w-full px-4 py-3 rounded-xl border bg-transparent focus:outline-none focus:ring-2"
          style={{
            borderColor: artist ? '#00FF41' : 'rgba(0, 255, 65, 0.18)',
          }}
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium mb-2">Description (Optional)</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Tell the story behind this collectible..."
          rows={4}
          className="w-full px-4 py-3 rounded-xl border bg-transparent focus:outline-none focus:ring-2 resize-none"
          style={{
            borderColor: 'rgba(0, 255, 65, 0.18)',
          }}
        />
      </div>
    </div>
  );

  const Step3EditionSettings = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Edition Settings</h2>
        <p className="text-muted-foreground">Configure your limited edition release</p>
      </div>

      {/* Edition Size */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Edition Size *
          <span className="text-amber-400 ml-1">(1-20)</span>
        </label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={1}
            max={20}
            value={editionSize}
            onChange={(e) => setEditionSize(parseInt(e.target.value))}
            className="flex-1"
          />
          <span
            className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold"
            style={{
              background: 'rgba(0, 255, 65, 0.1)',
              color: '#00FF41',
              border: '1px solid rgba(0, 255, 65, 0.25)',
              fontFamily: "'Inter', monospace",
            }}
          >
            {editionSize}
          </span>
        </div>
        {editionSize <= 5 && (
          <p className="text-xs text-amber-400 mt-2 flex items-center gap-1">
            <AlertCircle size={12} />
            Ultra-limited! Only {editionSize} copies will ever exist.
          </p>
        )}
      </div>

      {/* Price */}
      <div>
        <label className="block text-sm font-medium mb-2">Price per Collectible (SOL) *</label>
        <div className="relative">
          <input
            type="number"
            step="0.001"
            min="0.001"
            value={priceSol}
            onChange={(e) => setPriceSol(e.target.value)}
            placeholder="0.5"
            className="w-full px-4 py-3 rounded-xl border bg-transparent focus:outline-none focus:ring-2 pr-16"
            style={{
              borderColor: priceSol ? '#00FF41' : 'rgba(0, 255, 65, 0.18)',
            }}
          />
          <span
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
            style={{ fontFamily: "'Inter', monospace" }}
          >
            SOL
          </span>
        </div>
      </div>

      {/* Token Name */}
      <div>
        <label className="block text-sm font-medium mb-2">Bundled Token Name *</label>
        <input
          type="text"
          value={tokenName}
          onChange={(e) => setTokenName(e.target.value)}
          placeholder="Midnight Echo Edition"
          className="w-full px-4 py-3 rounded-xl border bg-transparent focus:outline-none focus:ring-2"
          style={{
            borderColor: tokenName ? '#00FF41' : 'rgba(0, 255, 65, 0.18)',
          }}
        />
      </div>

      {/* Token Symbol */}
      <div>
        <label className="block text-sm font-medium mb-2">Bundled Token Symbol *</label>
        <input
          type="text"
          value={tokenSymbol}
          onChange={(e) => setTokenSymbol(e.target.value.toUpperCase())}
          placeholder="MFME"
          maxLength={8}
          className="w-full px-4 py-3 rounded-xl border bg-transparent focus:outline-none focus:ring-2"
          style={{
            borderColor: tokenSymbol ? '#00FF41' : 'rgba(0, 255, 65, 0.18)',
            fontFamily: "'Inter', monospace",
          }}
        />
      </div>
    </div>
  );

  const Step4Review = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Review & Launch</h2>
        <p className="text-muted-foreground">Confirm your collectible details</p>
      </div>

      {/* Preview Card */}
      <div
        className="rounded-2xl border overflow-hidden"
        style={{
          background: 'rgba(255,255,255,0.02)',
          borderColor: 'rgba(255,255,255,0.08)',
        }}
      >
        <div className="flex gap-6 p-6">
          {/* Cover */}
          <div className="w-32 h-32 rounded-xl overflow-hidden flex-shrink-0">
            {coverImagePreview ? (
              <img
                src={coverImagePreview}
                alt="Cover"
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ background: 'rgba(0, 255, 65, 0.1)' }}
              >
                <Image size={32} style={{ color: '#00FF41' }} />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 space-y-2">
            <h3 className="text-xl font-bold">{title || 'Untitled'}</h3>
            <p className="text-muted-foreground">{artist || 'Unknown Artist'}</p>

            <div className="flex gap-4 text-sm">
              <span
                className="px-2 py-1 rounded"
                style={{
                  background: 'rgba(0, 255, 65, 0.1)',
                  color: '#00FF41',
                  fontFamily: "'Inter', monospace",
                }}
              >
                {editionSize} editions
              </span>
              <span
                className="px-2 py-1 rounded"
                style={{
                  background: 'rgba(0, 255, 65, 0.12)',
                  color: '#00FF41',
                  fontFamily: "'Inter', monospace",
                }}
              >
                {priceSol || '0'} SOL
              </span>
              <span
                className="px-2 py-1 rounded"
                style={{
                  background: 'rgba(0, 255, 65, 0.08)',
                  color: 'rgba(200,255,200,0.7)',
                }}
              >
                {tokenSymbol || 'SYMBOL'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div
        className="p-6 rounded-2xl space-y-3"
        style={{
          background: 'rgba(0, 255, 65, 0.05)',
          border: '1px solid rgba(0, 255, 65, 0.2)',
        }}
      >
        <h4 className="font-semibold flex items-center gap-2">
          <Sparkles size={16} style={{ color: '#00FF41' }} />
          What happens when you launch
        </h4>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-center gap-2">
            <CheckCircle size={14} className="text-emerald-400" />
            Your collectible goes live on the marketplace
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle size={14} className="text-emerald-400" />
            Fans can purchase and receive an NFT + bundled Song Coins
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle size={14} className="text-emerald-400" />
            You'll receive SOL directly to your wallet
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle size={14} className="text-emerald-400" />
            Edition supply is permanent and cannot be increased
          </li>
        </ul>
      </div>

      {!isAuthenticated && (
        <div
          className="p-4 rounded-xl text-center"
          style={{
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.2)',
          }}
        >
          <AlertCircle size={20} className="mx-auto text-amber-400 mb-2" />
          <p className="text-sm">Connect your wallet to launch this collectible</p>
        </div>
      )}
    </div>
  );

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1Upload />;
      case 2:
        return <Step2Metadata />;
      case 3:
        return <Step3EditionSettings />;
      case 4:
        return <Step4Review />;
      default:
        return null;
    }
  };

  return (
    <AuthGate>
      <PageLayout>
      <div className="container mx-auto px-6 py-8 max-w-2xl">
        {/* Back Link */}
        <Link
          to="/collectibles"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft size={16} />
          Back to Collectibles
        </Link>

        <StepIndicator />

        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex gap-4 mt-8">
          {currentStep > 1 && (
            <button
              onClick={handleBack}
              className="flex-1 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <ArrowLeft size={18} />
              Back
            </button>
          )}

          {currentStep < 4 ? (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className="flex-1 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              style={{
                background:
                  canProceed()
                    ? 'linear-gradient(135deg, #00FF41 0%, #00FF41 100%)'
                    : 'rgba(0, 255, 65, 0.12)',
                color: canProceed() ? '#020A02' : 'rgba(200,255,200,0.4)',
              }}
            >
              Continue
              <ArrowRight size={18} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting || !isAuthenticated}
              className="flex-1 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, #00FF41 0%, #00FF41 100%)',
                color: '#020A02',
                boxShadow: '0 0 30px rgba(0, 255, 65, 0.35)',
              }}
            >
              {submitting ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Launching...
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  Launch Collectible
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </PageLayout>
    </AuthGate>
  );
};

export default CreateEditionPage;
