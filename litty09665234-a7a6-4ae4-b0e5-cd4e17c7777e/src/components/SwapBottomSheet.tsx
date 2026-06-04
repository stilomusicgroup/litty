import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ArrowUpDown,
  Loader2,
  ChevronDown,
  AlertCircle,
  Check,
  Music,
  Settings2,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { useWallets, type ConnectedWallet } from '@privy-io/react-auth';
import { useAuth } from '@/hooks/use-privy-auth';
import { useSolanaWallet } from '@/hooks/useSolanaWallet';
import { useIsMobile } from '@/hooks/use-mobile';
import { getManySongs, type SongsResponse } from '@/lib/collections/songs';
import { TREASURY_WALLET, USDC } from '@/lib/constants';
import { TAROBASE_CONFIG } from '@/lib/config';
import { api } from '@/lib/api-client';
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  VersionedTransaction,
  TransactionMessage,
  AddressLookupTableAccount,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddressSync,
  createTransferCheckedInstruction,
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token';

/* ── Constants ── */
const SOL_MINT = 'So11111111111111111111111111111111111111112';
const PLATFORM_FEE_BPS = 300; // 3%
const PRIMARY_GREEN = '#00FF41';
const HEADLINE_GREEN = '#00FF41';
const BG = '#000000';

/* ── Types ── */
interface SwapBottomSheetProps {
  open: boolean;
  onClose: () => void;
  defaultOutputMint?: string;
  defaultInputMint?: string;
}

type TokenType = 'native' | 'usdc' | 'song';

interface TokenOption {
  type: TokenType;
  mint: string;
  symbol: string;
  name: string;
  image?: string;
  songId?: string;
}

type SwapStep =
  | 'input'
  | 'preparing'
  | 'waiting_approval'
  | 'confirming'
  | 'success'
  | 'error';

interface JupiterQuote {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  priceImpactPct: string;
  slippageBps: number;
  otherAmountThreshold: string;
  routePlan: unknown[];
}

/* ── Privy wallet helper ── */
interface ExtendedWallet extends ConnectedWallet {
  chainType?: string;
}

function isSolanaPrivyWallet(w: ConnectedWallet): boolean {
  const extended = w as ExtendedWallet;
  return extended.chainType === 'solana' || !extended.chainType;
}

/* ── Helpers ── */
function truncateMint(mint: string): string {
  if (!mint || mint.length < 10) return mint;
  return mint.slice(0, 4) + '...' + mint.slice(-4);
}

function getDecimals(token: TokenOption): number {
  return token.type === 'native' ? 9 : 6;
}

function toRawAmount(amount: number, decimals: number): string {
  return BigInt(Math.round(amount * Math.pow(10, decimals))).toString();
}

function fromRawAmount(raw: string, decimals: number): number {
  return Number(raw) / Math.pow(10, decimals);
}

/* ── Swap transaction validation ── */
const SPL_TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const SYSTEM_PROGRAM_ID = '11111111111111111111111111111111';

function getProgramId(
  message: VersionedTransaction['message'],
  programIdIndex: number
): string | null {
  if (programIdIndex < message.staticAccountKeys.length) {
    return message.staticAccountKeys[programIdIndex].toBase58();
  }
  // In address lookup table — can't resolve without fetching ALT
  return null;
}

function validateSwapTransaction(
  tx: VersionedTransaction
): string | null {
  const message = tx.message;

  for (const ix of message.compiledInstructions) {
    const programId = getProgramId(message, ix.programIdIndex);
    if (!programId) continue;

    // Reject token approval / delegate instructions
    if (programId === SPL_TOKEN_PROGRAM_ID) {
      const instructionType = ix.data[0];
      // 1 = Approve, 13 = ApproveChecked
      if (instructionType === 1 || instructionType === 13) {
        return 'Transaction validation failed — swap cancelled (unexpected token approval)';
      }
    }

    // Reject unexpected SystemProgram transfers to treasury
    if (programId === SYSTEM_PROGRAM_ID) {
      if (ix.data.length >= 4) {
        const view = new DataView(
          ix.data.buffer,
          ix.data.byteOffset,
          ix.data.byteLength
        );
        const discriminator = view.getUint32(0, true);
        if (discriminator === 2) {
          // Transfer instruction — check recipient
          const recipientIndex = ix.accountKeyIndexes[1];
          if (
            recipientIndex < message.staticAccountKeys.length &&
            message.staticAccountKeys[recipientIndex].toBase58() === TREASURY_WALLET
          ) {
            return 'Transaction validation failed — swap cancelled (unexpected fee transfer)';
          }
        }
      }
    }
  }

  return null;
}

function formatTokenAmount(amount: number, symbol: string): string {
  if (symbol === 'SOL') return amount.toFixed(6);
  if (amount < 0.01) return amount.toFixed(6);
  if (amount < 1) return amount.toFixed(4);
  return amount.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

async function fetchSPLBalance(
  rpcUrl: string,
  walletAddress: string,
  mintAddress: string
): Promise<number> {
  try {
    const res = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getTokenAccountsByOwner',
        params: [walletAddress, { mint: mintAddress }, { encoding: 'jsonParsed' }],
      }),
    });
    const data = await res.json();
    let total = 0;
    for (const acc of data?.result?.value ?? []) {
      const info = acc.account?.data?.parsed?.info;
      if (info?.tokenAmount?.amount && info?.tokenAmount?.decimals != null) {
        total += Number(info.tokenAmount.amount) / Math.pow(10, info.tokenAmount.decimals);
      }
    }
    return total;
  } catch (e) {
    console.error('Failed to fetch SPL balance:', e);
    return 0;
  }
}

/* ── Component ── */
const SwapBottomSheet: React.FC<SwapBottomSheetProps> = ({
  open,
  onClose,
  defaultOutputMint,
  defaultInputMint,
}) => {
  const { user } = useAuth();
  const { wallets } = useWallets();
  const { solBalance, usdcBalance, solPriceUsd } = useSolanaWallet();
  const isMobile = useIsMobile();
  const walletAddress = user?.address ?? null;

  /* Tokens */
  const [songs, setSongs] = useState<SongsResponse[]>([]);
  const [tokensLoading, setTokensLoading] = useState(false);

  /* Selection */
  const [fromToken, setFromToken] = useState<TokenOption | null>(null);
  const [toToken, setToToken] = useState<TokenOption | null>(null);
  const [selectingFor, setSelectingFor] = useState<'from' | 'to' | null>(null);
  const [amount, setAmount] = useState('');

  /* Quote */
  const [quote, setQuote] = useState<JupiterQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const quoteDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Execution */
  const [swapStep, setSwapStep] = useState<SwapStep>('input');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [txSignatures, setTxSignatures] = useState<string[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);

  /* Slippage */
  const [slippageBps, setSlippageBps] = useState(50);
  const [showSlippageSettings, setShowSlippageSettings] = useState(false);
  const [customSlippage, setCustomSlippage] = useState('');

  /* Quote expiry */
  const [quoteExpiresIn, setQuoteExpiresIn] = useState<number | null>(null);
  const expiryRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [quoteRefreshSignal, setQuoteRefreshSignal] = useState(0);

  /* SPL balance cache */
  const splBalanceCache = useRef<Map<string, number>>(new Map());
  const [songBalance, setSongBalance] = useState<number | null>(null);
  const [songBalanceLoading, setSongBalanceLoading] = useState(false);

  /* ATA rent */
  const [needsAta, setNeedsAta] = useState(false);

  /* Build curated token list */
  const allTokens = useMemo<TokenOption[]>(() => {
    const base: TokenOption[] = [
      { type: 'native', mint: SOL_MINT, symbol: 'SOL', name: 'Solana' },
      { type: 'usdc', mint: USDC, symbol: 'USDC', name: 'USD Coin' },
    ];
    const songTokens: TokenOption[] = songs
      .filter((s) => !!s.mintAddress && s.mintAddress.trim().length > 0 && s.swapEligible === true)
      .map((s) => ({
        type: 'song',
        mint: s.mintAddress!,
        symbol: s.symbol || s.name?.slice(0, 4).toUpperCase() || 'SONG',
        name: s.name || 'Unknown Song',
        image: s.teaserImageUrl,
        songId: s.id,
      }));
    return [...base, ...songTokens];
  }, [songs]);

  /* Fetch songs on open */
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setTokensLoading(true);

    const fetchSongs = async () => {
      try {
        const data = await getManySongs();
        if (!cancelled) {
          const withMint = data.filter(
            (s) => !!s.mintAddress && s.mintAddress.trim().length > 0 && s.swapEligible === true
          );
          setSongs(withMint);
        }
      } catch (e) {
        console.error('Failed to fetch songs for swap:', e);
      } finally {
        if (!cancelled) setTokensLoading(false);
      }
    };

    fetchSongs();
    return () => {
      cancelled = true;
    };
  }, [open]);

  /* Set defaults once songs load */
  useEffect(() => {
    if (!open) return;
    if (fromToken && toToken) return;

    const sol = allTokens.find((t) => t.type === 'native') ?? null;
    const usdc = allTokens.find((t) => t.type === 'usdc') ?? null;
    const defaultSong = defaultOutputMint
      ? allTokens.find((t) => t.mint === defaultOutputMint) ?? null
      : null;
    const defaultFrom = defaultInputMint
      ? allTokens.find((t) => t.mint === defaultInputMint) ?? null
      : null;
    const firstSong = allTokens.find((t) => t.type === 'song') ?? null;

    if (!fromToken) setFromToken(defaultFrom ?? sol);
    if (!toToken) {
      const preferredTo = defaultSong ?? firstSong ?? usdc ?? null;
      const fromMint = (defaultFrom ?? sol)?.mint;
      if (preferredTo?.mint === fromMint) {
        setToToken(usdc ?? firstSong ?? null);
      } else {
        setToToken(preferredTo);
      }
    }
  }, [open, allTokens, fromToken, toToken, defaultOutputMint, defaultInputMint]);

  /* Reset on open */
  useEffect(() => {
    if (open) {
      setAmount('');
      setQuote(null);
      setQuoteError(null);
      setSwapStep('input');
      setErrorMsg(null);
      setTxSignatures([]);
      setSelectingFor(null);
      setShowSlippageSettings(false);
      setQuoteExpiresIn(null);
      setNeedsAta(false);
      setSongBalance(null);
      setSongBalanceLoading(false);
      setIsSimulating(false);
      setCustomSlippage('');
      setSlippageBps(50);
    }
  }, [open]);

  /* Fetch SPL balance when fromToken is a song */
  useEffect(() => {
    if (!fromToken || fromToken.type !== 'song' || !walletAddress) {
      setSongBalance(null);
      setSongBalanceLoading(false);
      return;
    }
    const cached = splBalanceCache.current.get(fromToken.mint);
    if (cached !== undefined) {
      setSongBalance(cached);
      return;
    }
    setSongBalanceLoading(true);
    const rpcUrl = TAROBASE_CONFIG.rpcUrl || 'https://api.mainnet-beta.solana.com';
    fetchSPLBalance(rpcUrl, walletAddress, fromToken.mint)
      .then((bal) => {
        splBalanceCache.current.set(fromToken.mint, bal);
        setSongBalance(bal);
      })
      .catch(() => {
        splBalanceCache.current.set(fromToken.mint, 0);
        setSongBalance(0);
      })
      .finally(() => setSongBalanceLoading(false));
  }, [fromToken, walletAddress]);

  /* Check ATA when toToken changes */
  useEffect(() => {
    if (!toToken || !walletAddress) {
      setNeedsAta(false);
      return;
    }
    if (toToken.type === 'native') {
      setNeedsAta(false);
      return;
    }
    const checkAta = async () => {
      const rpcUrl = TAROBASE_CONFIG.rpcUrl || 'https://api.mainnet-beta.solana.com';
      const connection = new Connection(rpcUrl, 'confirmed');
      const ata = getAssociatedTokenAddressSync(
        new PublicKey(toToken.mint),
        new PublicKey(walletAddress)
      );
      const info = await connection.getAccountInfo(ata).catch(() => null);
      setNeedsAta(info === null);
    };
    checkAta();
  }, [toToken, walletAddress]);

  /* Balance check */
  const getBalance = useCallback(
    (token: TokenOption | null): number => {
      if (!token) return 0;
      if (token.type === 'native') return solBalance ?? 0;
      if (token.type === 'usdc') return usdcBalance ?? 0;
      if (token.type === 'song') return songBalance ?? Infinity;
      return 0;
    },
    [solBalance, usdcBalance, songBalance]
  );

  const numericAmount = useMemo(() => {
    const n = parseFloat(amount);
    return isNaN(n) || n <= 0 ? 0 : n;
  }, [amount]);

  const balance = useMemo(() => getBalance(fromToken), [getBalance, fromToken]);
  const feeAmount = useMemo(
    () => numericAmount * (PLATFORM_FEE_BPS / 10000),
    [numericAmount]
  );
  const effectiveAmount = useMemo(
    () => numericAmount - feeAmount,
    [numericAmount, feeAmount]
  );

  const isValidInput = useMemo(() => {
    if (!fromToken || !toToken) return false;
    if (fromToken.mint === toToken.mint) return false;
    if (numericAmount <= 0) return false;
    if (balance !== Infinity && numericAmount > balance) return false;
    return true;
  }, [fromToken, toToken, numericAmount, balance]);

  /* Debounced quote fetch */
  useEffect(() => {
    if (!isValidInput || !fromToken || !toToken) {
      setQuote(null);
      setQuoteError(null);
      return;
    }

    if (quoteDebounceRef.current) clearTimeout(quoteDebounceRef.current);

    quoteDebounceRef.current = setTimeout(async () => {
      setQuoteLoading(true);
      setQuoteError(null);

      try {
        const inputMint = fromToken.mint;
        const outputMint = toToken.mint;
        const rawAmt = toRawAmount(effectiveAmount, getDecimals(fromToken));

        const url =
          `/api/swap/quote?` +
          `inputMint=${inputMint}&outputMint=${outputMint}&amount=${rawAmt}&slippageBps=${slippageBps}`;

        const data = await api.get<any>(url);
        if (data.error) {
          setQuoteError(data.error);
          setQuote(null);
          return;
        }
        setQuote(data as JupiterQuote);
        toast.success('Quote refreshed');
      } catch (e: any) {
        if (e?.message?.includes('429') || e?.message?.includes('rate limit')) {
          setQuoteError('Rate limited by Jupiter. Please wait a moment.');
        } else {
          setQuoteError('Failed to fetch quote. Please try again.');
        }
        setQuote(null);
      } finally {
        setQuoteLoading(false);
      }
    }, 300);

    return () => {
      if (quoteDebounceRef.current) clearTimeout(quoteDebounceRef.current);
    };
  }, [
    isValidInput,
    fromToken,
    toToken,
    effectiveAmount,
    slippageBps,
    quoteRefreshSignal,
  ]);

  /* Quote expiry countdown */
  useEffect(() => {
    if (!quote) {
      if (expiryRef.current) clearInterval(expiryRef.current);
      setQuoteExpiresIn(null);
      return;
    }
    setQuoteExpiresIn(30);
    if (expiryRef.current) clearInterval(expiryRef.current);
    expiryRef.current = setInterval(() => {
      setQuoteExpiresIn((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          setQuoteRefreshSignal((s) => s + 1);
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (expiryRef.current) clearInterval(expiryRef.current);
    };
  }, [quote]);

  /* Flip tokens */
  const handleFlip = useCallback(() => {
    setFromToken(toToken);
    setToToken(fromToken);
    setAmount('');
    setQuote(null);
  }, [fromToken, toToken]);

  /* Max button */
  const handleMax = useCallback(() => {
    if (!fromToken) return;
    if (fromToken.type === 'native') {
      const max = Math.max(0, (solBalance ?? 0) - 0.01);
      setAmount(max.toFixed(6));
    } else if (fromToken.type === 'usdc') {
      setAmount((usdcBalance ?? 0).toFixed(6));
    } else if (fromToken.type === 'song') {
      if (songBalance != null && songBalance !== Infinity) {
        setAmount(songBalance.toFixed(6));
      } else {
        setAmount('');
        toast.info('Enter the amount of tokens you want to swap');
      }
    }
  }, [fromToken, solBalance, usdcBalance, songBalance]);

  /* Execute swap */
  const handleSwap = async () => {
    if (!walletAddress || !fromToken || !toToken || !isValidInput) return;

    const solanaWallet = wallets.find(isSolanaPrivyWallet);
    if (!solanaWallet) {
      toast.error('Wallet not connected. Please connect your wallet.');
      return;
    }

    setSwapStep('preparing');
    setErrorMsg(null);
    setTxSignatures([]);

    const rpcUrl =
      TAROBASE_CONFIG.rpcUrl || 'https://api.mainnet-beta.solana.com';
    const connection = new Connection(rpcUrl, 'confirmed');
    const userPubkey = new PublicKey(walletAddress);
    const sigs: string[] = [];

    try {
      if (!quote) throw new Error('Quote expired. Please try again.');

      /* ── Build Jupiter swap transaction ── */
      const swapData = await api.post<any>('/api/swap/transaction', {
        quoteResponse: quote,
        userPublicKey: walletAddress,
        wrapAndUnwrapSol: true,
      });
      const swapTxBase64 = swapData.swapTransaction;
      if (!swapTxBase64)
        throw new Error('No swap transaction returned from Jupiter');

      const swapTxBuf = Buffer.from(swapTxBase64, 'base64');
      let versionedTx = VersionedTransaction.deserialize(swapTxBuf);

      /* ── Validate Jupiter transaction before signing ── */
      const validationError = validateSwapTransaction(versionedTx);
      if (validationError) {
        toast.error(validationError);
        throw new Error(validationError);
      }

      /* ── SOL input: combine fee + swap into single tx ── */
      if (fromToken.type === 'native') {
        const feeLamports = Math.round(feeAmount * LAMPORTS_PER_SOL);

        if (feeLamports > 0) {
          const alts: AddressLookupTableAccount[] = await Promise.all(
            versionedTx.message.addressTableLookups.map(async (lookup) => {
              const result = await connection.getAddressLookupTable(
                lookup.accountKey
              );
              if (!result.value)
                throw new Error('Failed to load address lookup table');
              return result.value;
            })
          );

          const msg = TransactionMessage.decompile(versionedTx.message, {
            addressLookupTableAccounts: alts,
          });
          msg.instructions.unshift(
            SystemProgram.transfer({
              fromPubkey: userPubkey,
              toPubkey: new PublicKey(TREASURY_WALLET),
              lamports: feeLamports,
            })
          );
          const newMsg = msg.compileToV0Message(alts);
          versionedTx = new VersionedTransaction(newMsg);
        }

        /* Simulate */
        setIsSimulating(true);
        const simResult = await connection.simulateTransaction(versionedTx);
        setIsSimulating(false);
        if (simResult.value.err) {
          const errMsg = JSON.stringify(simResult.value.err);
          if (
            errMsg.includes('InsufficientFunds') ||
            errMsg.includes('0x1')
          ) {
            throw new Error('Not enough SOL for this swap.');
          }
          throw new Error(
            `Swap simulation failed: ${errMsg}. Please try again.`
          );
        }

        /* Sign & send */
        setSwapStep('waiting_approval');
        const signedTx = await (solanaWallet as any).signTransaction(versionedTx);
        setSwapStep('confirming');
        const sig = await connection.sendRawTransaction(signedTx.serialize(), {
          skipPreflight: false,
          maxRetries: 2,
        });
        sigs.push(sig);
        await connection.confirmTransaction(sig, 'confirmed');
      } else {
        /* ── SPL input: separate fee tx + swap tx ── */

        /* Step 1: Fee tx */
        const feeDecimals = getDecimals(fromToken);
        const rawFee = BigInt(
          Math.round(feeAmount * Math.pow(10, feeDecimals))
        );
        if (rawFee > 0n) {
          setSwapStep('waiting_approval');
          const mintPubkey = new PublicKey(fromToken.mint);
          const senderATA = getAssociatedTokenAddressSync(
            mintPubkey,
            userPubkey
          );
          const receiverATA = getAssociatedTokenAddressSync(
            mintPubkey,
            new PublicKey(TREASURY_WALLET)
          );

          const instructions = [];
          const receiverAccountInfo = await connection.getAccountInfo(
            receiverATA
          );
          if (!receiverAccountInfo) {
            instructions.push(
              createAssociatedTokenAccountInstruction(
                userPubkey,
                receiverATA,
                new PublicKey(TREASURY_WALLET),
                mintPubkey
              )
            );
          }

          instructions.push(
            createTransferCheckedInstruction(
              senderATA,
              mintPubkey,
              receiverATA,
              userPubkey,
              rawFee,
              feeDecimals
            )
          );

          const feeTx = new Transaction().add(...instructions);
          feeTx.feePayer = userPubkey;
          const { blockhash } = await connection.getLatestBlockhash();
          feeTx.recentBlockhash = blockhash;

          const signedFeeTx = await (solanaWallet as any).signTransaction(feeTx);
          setSwapStep('confirming');
          const feeSig = await connection.sendRawTransaction(
            signedFeeTx.serialize(),
            {
              skipPreflight: false,
              maxRetries: 2,
            }
          );
          sigs.push(feeSig);
          await connection.confirmTransaction(feeSig, 'confirmed');
        }

        /* Step 2: Swap tx */
        setSwapStep('preparing');
        setIsSimulating(true);
        const simResult = await connection.simulateTransaction(versionedTx);
        setIsSimulating(false);
        if (simResult.value.err) {
          const errMsg = JSON.stringify(simResult.value.err);
          if (
            errMsg.includes('InsufficientFunds') ||
            errMsg.includes('0x1')
          ) {
            throw new Error('Not enough balance for this swap.');
          }
          throw new Error(
            `Swap simulation failed: ${errMsg}. Please try again.`
          );
        }

        setSwapStep('waiting_approval');
        const signedSwapTx = await (solanaWallet as any).signTransaction(versionedTx);
        setSwapStep('confirming');
        const swapSig = await connection.sendRawTransaction(
          signedSwapTx.serialize(),
          {
            skipPreflight: false,
            maxRetries: 2,
          }
        );
        sigs.push(swapSig);
        await connection.confirmTransaction(swapSig, 'confirmed');
      }

      setTxSignatures(sigs);
      setSwapStep('success');
      toast.success('Swap completed successfully!');
    } catch (err: any) {
      console.error('[SwapBottomSheet] Swap error:', err);
      setSwapStep('error');
      const msg = err?.message || 'Swap failed';
      setErrorMsg(
        msg.includes('User rejected') ? 'Transaction cancelled by user.' : msg
      );
      if (msg.includes('User rejected')) {
        toast.info('Transaction cancelled');
      } else {
        toast.error(`Swap failed: ${msg}`);
      }
    } finally {
      setIsSimulating(false);
    }
  };

  /* ── Token selector content ── */
  const TokenSelectPanel = () => (
    <div className="flex flex-col gap-1 px-5 pb-8">
      <p
        className="text-[9px] font-bold tracking-widest uppercase mb-3"
        style={{
          fontFamily: "'Archivo Black', sans-serif",
          color: 'rgba(255,255,255,0.4)',
        }}
      >
        Select Token
      </p>
      {tokensLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2
            size={24}
            className="animate-spin"
            style={{ color: PRIMARY_GREEN }}
          />
        </div>
      ) : (
        allTokens.map((token) => (
          <button
            key={token.mint}
            onClick={() => {
              if (selectingFor === 'from') {
                if (toToken?.mint === token.mint) handleFlip();
                else setFromToken(token);
              } else {
                if (fromToken?.mint === token.mint) handleFlip();
                else setToToken(token);
              }
              setSelectingFor(null);
              setAmount('');
              setQuote(null);
            }}
            className="flex items-center gap-3 w-full px-3 py-3 rounded-xl transition-colors"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <TokenIcon token={token} size={40} />
            <div className="text-left flex-1 min-w-0">
              <div className="text-sm font-bold text-white truncate">
                {token.name}
              </div>
              <div
                className="text-xs"
                style={{ color: 'rgba(255,255,255,0.4)' }}
              >
                {token.symbol} · {truncateMint(token.mint)}
              </div>
            </div>
            {((selectingFor === 'from' && fromToken?.mint === token.mint) ||
              (selectingFor === 'to' && toToken?.mint === token.mint)) && (
              <Check size={16} style={{ color: PRIMARY_GREEN }} />
            )}
          </button>
        ))
      )}
      <button
        onClick={() => setSelectingFor(null)}
        className="w-full py-3 mt-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-[0.98]"
        style={{
          background: 'rgba(255,255,255,0.06)',
          color: 'rgba(255,255,255,0.5)',
          fontFamily: "'Archivo Black', sans-serif",
        }}
      >
        Cancel
      </button>
    </div>
  );

  /* ── Main content ── */
  const MainContent = () => (
    <div className="px-5 pb-8 flex flex-col gap-5">
      {swapStep === 'input' || swapStep === 'error' ? (
        <>
          {/* From / To selector */}
          <div className="flex flex-col gap-3">
            {/* From */}
            <div
              className="rounded-2xl px-4 py-4 flex flex-col gap-3"
              style={{
                background: '#141414',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div className="flex items-center justify-between">
                <span
                  className="text-[9px] font-bold tracking-widest uppercase"
                  style={{
                    fontFamily: "'Archivo Black', sans-serif",
                    color: 'rgba(255,255,255,0.4)',
                  }}
                >
                  From
                </span>
                {fromToken && (
                  <span
                    className="text-[10px]"
                    style={{ color: 'rgba(255,255,255,0.3)' }}
                  >
                    {fromToken.type === 'song' && songBalanceLoading ? (
                      <>
                        <Loader2
                          size={10}
                          className="animate-spin inline mr-1"
                          style={{ color: PRIMARY_GREEN }}
                        />
                        Loading balance...
                      </>
                    ) : balance !== Infinity ? (
                      `Balance: ${formatTokenAmount(
                        balance,
                        fromToken.symbol
                      )} ${fromToken.symbol}`
                    ) : null}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectingFor('from')}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl transition-colors"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  {fromToken && <TokenIcon token={fromToken} size={28} />}
                  <span className="text-sm font-bold text-white">
                    {fromToken?.symbol ?? 'Select'}
                  </span>
                  <ChevronDown
                    size={14}
                    style={{ color: 'rgba(255,255,255,0.4)' }}
                  />
                </button>
                <input
                  type="number"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  step="any"
                  min="0"
                  className="flex-1 bg-transparent text-right text-white text-lg font-bold outline-none"
                  style={{ fontFamily: "'Inter', monospace" }}
                />
              </div>
              {fromToken &&
                solPriceUsd != null &&
                (fromToken.type === 'native' || fromToken.type === 'usdc') &&
                numericAmount > 0 && (
                  <p
                    className="text-[10px] text-right"
                    style={{ color: 'rgba(255,255,255,0.3)' }}
                  >
                    ≈ ${
                      fromToken.type === 'native'
                        ? (numericAmount * solPriceUsd).toFixed(2)
                        : numericAmount.toFixed(2)
                    }
                  </p>
                )}
              {fromToken && balance !== Infinity && numericAmount > balance && (
                <p className="text-[10px]" style={{ color: '#ef4444' }}>
                  Insufficient {fromToken.symbol} balance
                </p>
              )}
            </div>

            {/* Flip button */}
            <div className="flex justify-center -my-1 relative z-10">
              <button
                onClick={handleFlip}
                className="w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90"
                style={{
                  background: '#1a1a1a',
                  border: `1px solid ${PRIMARY_GREEN}`,
                  boxShadow: `0 0 12px rgba(0, 255, 65, 0.25)`,
                }}
              >
                <ArrowUpDown size={16} style={{ color: PRIMARY_GREEN }} />
              </button>
            </div>

            {/* To */}
            <div
              className="rounded-2xl px-4 py-4 flex flex-col gap-3"
              style={{
                background: '#141414',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div className="flex items-center justify-between">
                <span
                  className="text-[9px] font-bold tracking-widest uppercase"
                  style={{
                    fontFamily: "'Archivo Black', sans-serif",
                    color: 'rgba(255,255,255,0.4)',
                  }}
                >
                  To
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectingFor('to')}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl transition-colors"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  {toToken && <TokenIcon token={toToken} size={28} />}
                  <span className="text-sm font-bold text-white">
                    {toToken?.symbol ?? 'Select'}
                  </span>
                  <ChevronDown
                    size={14}
                    style={{ color: 'rgba(255,255,255,0.4)' }}
                  />
                </button>
                <div className="flex-1 text-right">
                  {quoteLoading ? (
                    <Loader2
                      size={18}
                      className="animate-spin ml-auto"
                      style={{ color: PRIMARY_GREEN }}
                    />
                  ) : quote ? (
                    <span
                      className="text-lg font-bold"
                      style={{
                        color: HEADLINE_GREEN,
                        fontFamily: "'Inter', monospace",
                      }}
                    >
                      {formatTokenAmount(
                        fromRawAmount(
                          quote.outAmount,
                          getDecimals(toToken!)
                        ),
                        toToken!.symbol
                      )}
                    </span>
                  ) : (
                    <span
                      className="text-lg font-bold"
                      style={{ color: 'rgba(255,255,255,0.2)' }}
                    >
                      —
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ATA rent warning */}
          {needsAta && (
            <div
              className="rounded-xl px-4 py-3 flex items-start gap-2"
              style={{
                background: 'rgba(59,130,246,0.06)',
                border: '1px solid rgba(59,130,246,0.2)',
              }}
            >
              <Info
                size={14}
                color="#3b82f6"
                className="mt-0.5 flex-shrink-0"
              />
              <p className="text-xs" style={{ color: '#3b82f6' }}>
                First time holding this token? A small amount (~0.002 SOL) will
                be added to cover account setup. This is a one-time cost.
              </p>
            </div>
          )}

          {/* Quote details */}
          {quote && !quoteLoading && (
            <div
              className="rounded-xl px-4 py-3 space-y-2"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div className="flex justify-between items-center">
                <span
                  className="text-[10px]"
                  style={{ color: 'rgba(255,255,255,0.4)' }}
                >
                  Rate
                </span>
                <span
                  className="text-xs font-medium"
                  style={{
                    color: 'rgba(255,255,255,0.7)',
                    fontFamily: "'Inter', monospace",
                  }}
                >
                  1 {fromToken!.symbol} ≈{' '}
                  {formatTokenAmount(
                    fromRawAmount(
                      quote.outAmount,
                      getDecimals(toToken!)
                    ) /
                      fromRawAmount(
                        quote.inAmount,
                        getDecimals(fromToken!)
                      ),
                    toToken!.symbol
                  )}{' '}
                  {toToken!.symbol}
                </span>
              </div>
              {parseFloat(quote.priceImpactPct) > 1 && (
                <div className="flex justify-between items-center">
                  <span
                    className="text-[10px]"
                    style={{ color: 'rgba(255,255,255,0.4)' }}
                  >
                    Price Impact
                  </span>
                  <span className="text-xs font-bold" style={{ color: '#ef4444' }}>
                    {parseFloat(quote.priceImpactPct).toFixed(2)}%
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span
                  className="text-[10px]"
                  style={{ color: 'rgba(255,255,255,0.4)' }}
                >
                  Platform Fee
                </span>
                <span
                  className="text-xs font-medium"
                  style={{ color: HEADLINE_GREEN }}
                >
                  3% ({formatTokenAmount(feeAmount, fromToken!.symbol)}{' '}
                  {fromToken!.symbol})
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span
                  className="text-[10px]"
                  style={{ color: 'rgba(255,255,255,0.4)' }}
                >
                  You receive
                </span>
                <span
                  className="text-xs font-bold"
                  style={{
                    color: PRIMARY_GREEN,
                    fontFamily: "'Inter', monospace",
                  }}
                >
                  {formatTokenAmount(
                    fromRawAmount(
                      quote.outAmount,
                      getDecimals(toToken!)
                    ),
                    toToken!.symbol
                  )}{' '}
                  {toToken!.symbol}
                </span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-white/5">
                <span
                  className="text-[10px]"
                  style={{ color: 'rgba(255,255,255,0.3)' }}
                >
                  Quote valid for
                </span>
                <span
                  className="text-[10px] font-medium flex items-center gap-1"
                  style={{
                    color: 'rgba(255,255,255,0.4)',
                    fontFamily: "'Inter', monospace",
                  }}
                >
                  {quoteLoading ? (
                    <Loader2
                      size={10}
                      className="animate-spin"
                      style={{ color: PRIMARY_GREEN }}
                    />
                  ) : null}
                  {quoteExpiresIn}s
                </span>
              </div>
            </div>
          )}

          {quoteError && (
            <div
              className="rounded-xl px-4 py-3 flex items-start gap-2"
              style={{
                background: 'rgba(239,68,68,0.06)',
                border: '1px solid rgba(239,68,68,0.2)',
              }}
            >
              <AlertCircle
                size={14}
                color="#ef4444"
                className="mt-0.5 flex-shrink-0"
              />
              <p className="text-xs" style={{ color: '#ef4444' }}>
                {quoteError}
              </p>
            </div>
          )}

          {/* Swap button */}
          <div className="flex flex-col gap-3">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleSwap}
              disabled={!isValidInput || !quote || quoteLoading}
              className="w-full rounded-2xl font-black text-sm py-4 transition-all flex items-center justify-center gap-2"
              style={{
                background:
                  isValidInput && quote && !quoteLoading
                    ? PRIMARY_GREEN
                    : 'rgba(255,255,255,0.06)',
                color:
                  isValidInput && quote && !quoteLoading
                    ? '#000'
                    : 'rgba(255,255,255,0.3)',
                fontFamily: "'Archivo Black', sans-serif",
                letterSpacing: '0.05em',
                cursor:
                  isValidInput && quote && !quoteLoading
                    ? 'pointer'
                    : 'not-allowed',
                boxShadow:
                  isValidInput && quote && !quoteLoading
                    ? '0 0 24px rgba(0, 255, 65, 0.35)'
                    : 'none',
              }}
            >
              {!walletAddress
                ? 'Connect Wallet'
                : !isValidInput
                ? !fromToken || !toToken
                  ? 'Select Tokens'
                  : numericAmount <= 0
                  ? 'Enter Amount'
                  : 'Insufficient Balance'
                : !quote || quoteLoading
                ? 'Fetching Quote...'
                : `Swap ${fromToken!.symbol} → ${toToken!.symbol}`}
            </motion.button>

            {fromToken && (
              <button
                onClick={handleMax}
                className="self-center text-[10px] font-bold uppercase tracking-widest transition-colors"
                style={{
                  color: 'rgba(255,255,255,0.3)',
                  background: 'none',
                  border: 'none',
                }}
              >
                Use Max Balance
              </button>
            )}
          </div>

          {/* Error banner */}
          {swapStep === 'error' && errorMsg && (
            <div
              className="rounded-xl px-4 py-3 flex items-start gap-2"
              style={{
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.3)',
              }}
            >
              <AlertCircle
                size={14}
                color="#ef4444"
                className="mt-0.5 flex-shrink-0"
              />
              <p className="text-xs" style={{ color: '#ef4444' }}>
                {errorMsg}
              </p>
            </div>
          )}
        </>
      ) : swapStep === 'success' ? (
        <div className="flex flex-col items-center gap-5 py-8">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{
              background: 'rgba(0, 255, 65, 0.12)',
              border: `2px solid ${PRIMARY_GREEN}`,
              boxShadow: `0 0 24px rgba(0, 255, 65, 0.25)`,
            }}
          >
            <Check size={28} style={{ color: PRIMARY_GREEN }} />
          </div>
          <div className="text-center">
            <p
              className="text-base font-black text-white"
              style={{ fontFamily: "'Archivo Black', sans-serif" }}
            >
              Swap Complete
            </p>
            <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Swapped {formatTokenAmount(effectiveAmount, fromToken!.symbol)}{' '}
              {fromToken!.symbol} for{' '}
              {quote
                ? `${formatTokenAmount(
                    fromRawAmount(
                      quote.outAmount,
                      getDecimals(toToken!)
                    ),
                    toToken!.symbol
                  )} ${toToken!.symbol}`
                : toToken!.symbol}
            </p>
          </div>
          {txSignatures.length > 0 && (
            <a
              href={`https://solscan.io/tx/${txSignatures[txSignatures.length - 1]}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold transition-colors hover:opacity-80"
              style={{ color: PRIMARY_GREEN }}
            >
              View on Solscan →
            </a>
          )}
          <button
            onClick={onClose}
            className="w-full rounded-2xl font-black text-sm py-4 transition-all active:scale-[0.98]"
            style={{
              background: PRIMARY_GREEN,
              color: '#000',
              fontFamily: "'Archivo Black', sans-serif",
              letterSpacing: '0.05em',
            }}
          >
            Close
          </button>
        </div>
      ) : (
        /* Loading state */
        <div className="flex flex-col items-center gap-5 py-10">
          <Loader2
            size={40}
            className="animate-spin"
            style={{ color: PRIMARY_GREEN }}
          />
          <div className="text-center space-y-1">
            <p className="text-sm font-bold text-white">
              {isSimulating
                ? 'Checking swap...'
                : swapStep === 'preparing'
                ? 'Preparing swap...'
                : swapStep === 'waiting_approval'
                ? 'Waiting for approval...'
                : swapStep === 'confirming'
                ? 'Confirming...'
                : 'Processing...'}
            </p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Please approve the transaction in your wallet
            </p>
          </div>
        </div>
      )}
    </div>
  );

  if (!open) return null;

  const content = (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3">
        <div className="flex items-center gap-2">
          <ArrowUpDown size={16} style={{ color: HEADLINE_GREEN }} />
          <span
            style={{
              fontFamily: "'Archivo Black', sans-serif",
              fontSize: '0.65rem',
              fontWeight: 800,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              color: HEADLINE_GREEN,
            }}
          >
            {selectingFor ? 'Select Token' : 'Swap Tokens'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {!selectingFor && (
            <button
              onClick={() => setShowSlippageSettings(!showSlippageSettings)}
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
              style={{
                background: 'rgba(255,255,255,0.05)',
                color: 'rgba(255,255,255,0.4)',
              }}
            >
              <Settings2 size={14} />
            </button>
          )}
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
            style={{
              background: 'rgba(255,255,255,0.05)',
              color: 'rgba(255,255,255,0.4)',
            }}
            disabled={
              swapStep === 'preparing' ||
              swapStep === 'waiting_approval' ||
              swapStep === 'confirming'
            }
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Slippage settings */}
      {!selectingFor && showSlippageSettings && (
        <div className="px-5 pb-3">
          <div
            className="rounded-xl px-4 py-3"
            style={{
              background: '#141414',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <p
              className="text-[10px] font-bold uppercase tracking-widest mb-2"
              style={{
                color: 'rgba(255,255,255,0.4)',
                fontFamily: "'Archivo Black', sans-serif",
              }}
            >
              Slippage Tolerance
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              {[50, 100, 200].map((bps) => (
                <button
                  key={bps}
                  onClick={() => {
                    setSlippageBps(bps);
                    setCustomSlippage('');
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                  style={{
                    background:
                      slippageBps === bps && !customSlippage
                        ? 'rgba(0, 255, 65, 0.15)'
                        : 'rgba(255,255,255,0.05)',
                    color:
                      slippageBps === bps && !customSlippage
                        ? PRIMARY_GREEN
                        : 'rgba(255,255,255,0.5)',
                    border:
                      slippageBps === bps && !customSlippage
                        ? `1px solid ${PRIMARY_GREEN}`
                        : '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  {bps / 100}%
                </button>
              ))}
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={customSlippage}
                  onChange={(e) => {
                    setCustomSlippage(e.target.value);
                    const val = parseFloat(e.target.value);
                    if (!isNaN(val) && val > 0)
                      setSlippageBps(Math.round(val * 100));
                  }}
                  placeholder="Custom"
                  className="w-16 bg-transparent text-xs text-white text-center outline-none rounded-lg px-2 py-1.5"
                  style={{
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                />
                <span
                  className="text-xs"
                  style={{ color: 'rgba(255,255,255,0.4)' }}
                >
                  %
                </span>
              </div>
            </div>
            {customSlippage && parseFloat(customSlippage) > 5 && (
              <p className="text-[10px] mt-2" style={{ color: '#f97316' }}>
                High slippage — be careful
              </p>
            )}
          </div>
        </div>
      )}

      {selectingFor ? <TokenSelectPanel /> : <MainContent />}
    </>
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[399]"
            style={{ background: 'rgba(0,0,0,0.8)' }}
            onClick={
              swapStep === 'preparing' ||
              swapStep === 'waiting_approval' ||
              swapStep === 'confirming'
                ? undefined
                : onClose
            }
          />

          {isMobile ? (
            /* ── Mobile Bottom Sheet ── */
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed z-[400] left-0 right-0 bottom-0 rounded-t-3xl overflow-hidden"
              style={{
                background: BG,
                borderTop: '1px solid rgba(255,255,255,0.08)',
                maxHeight: '90vh',
                overflowY: 'auto',
              }}
            >
              {/* Drag handle */}
              <div
                className="flex justify-center pt-3 pb-1"
                onClick={onClose}
              >
                <div
                  className="w-10 h-1 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.2)' }}
                />
              </div>
              {content}
            </motion.div>
          ) : (
            /* ── Desktop Centered Modal ── */
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.95 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="fixed z-[400] left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 rounded-2xl overflow-hidden"
              style={{
                maxWidth: 460,
                width: 'calc(100% - 32px)',
                background: BG,
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {content}
            </motion.div>
          )}

          <style>{`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}</style>
        </>
      )}
    </AnimatePresence>
  );
};

/* ── Token Icon ── */
function TokenIcon({
  token,
  size = 32,
}: {
  token: TokenOption;
  size?: number;
}) {
  if (token.type === 'native') {
    return (
      <div
        className="rounded-full flex items-center justify-center font-bold"
        style={{
          width: size,
          height: size,
          background: '#1A1A1A',
          border: `1px solid rgba(255,255,255,0.1)`,
          color: PRIMARY_GREEN,
          fontSize: size * 0.45,
        }}
      >
        ◎
      </div>
    );
  }

  if (token.type === 'usdc') {
    return (
      <div
        className="rounded-full flex items-center justify-center font-bold"
        style={{
          width: size,
          height: size,
          background: '#2775CA',
          color: '#fff',
          fontSize: size * 0.4,
        }}
      >
        U
      </div>
    );
  }

  return (
    <div
      className="rounded-full overflow-hidden flex items-center justify-center"
      style={{
        width: size,
        height: size,
        background: '#1a1a1a',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {token.image ? (
        <img src={token.image} alt="" className="w-full h-full object-cover" />
      ) : (
        <Music size={size * 0.5} style={{ color: '#555' }} />
      )}
    </div>
  );
}

export default SwapBottomSheet;
