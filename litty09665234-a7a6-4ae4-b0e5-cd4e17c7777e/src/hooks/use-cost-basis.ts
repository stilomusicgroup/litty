/**
 * useCostBasis — per-user FIFO cost-basis tracking and realized PnL recording.
 *
 * Integrates with userTokenLots (buy lots) and userRealizedPnL (sell events).
 * All trade flows call recordBuyLot after a confirmed buy and recordSellPnL
 * after a confirmed sell. Estimates are used when exact on-chain output amounts
 * are not immediately available (noted inline with TODOs).
 */

import { useCallback, useMemo } from 'react';
import { useRealtimeData } from '@/hooks/use-realtime-data';
import {
  setUserTokenLotsLots,
  updateUserTokenLotsLots,
  getManyUserTokenLotsLots,
  subscribeManyUserTokenLotsLots,
  type UserTokenLotsLotsResponse,
} from '@/lib/collections/userTokenLots';
import {
  setUserRealizedPnLEvents,
  subscribeManyUserRealizedPnLEvents,
  type UserRealizedPnLEventsResponse,
} from '@/lib/collections/userRealizedPnL';
import { Time, Address } from '@/lib/db-client';
import { runTokenPriceSolQueryForSongDetails } from '@/lib/collections/songDetails';
import { toast } from 'sonner';

const TOKEN_DECIMALS = 6;
const TOKEN_UNITS_PER_TOKEN = 10 ** TOKEN_DECIMALS; // 1_000_000
const SOL_DECIMALS = 1_000_000_000; // lamports per SOL

/* ─── Types ─── */

export interface RecordBuyLotParams {
  userAddress: string;
  songId: string;
  songName: string;
  songSymbol: string;
  tokenMint: string;
  quantity: number; // raw token units (smallest denomination)
  costBasisAmount: number; // lamports for SOL, micro-USDC for USDC
  costBasisCurrency: 'SOL' | 'USDC';
  source: string;
  txSignature: string;
}

export interface RecordSellPnLParams {
  userAddress: string;
  songId: string;
  songName: string;
  songSymbol: string;
  tokenMint: string;
  soldQuantity: number; // raw token units
  saleProceeds: number; // lamports for SOL, micro-USDC for USDC
  currency: 'SOL' | 'USDC';
  source: string;
  txSignature: string;
}

/* ─── Helpers ─── */

function formatPricePerToken(costBasis: number, quantity: number, currency: string): string {
  if (!quantity || quantity <= 0) return `0 ${currency}/token`;
  const price = costBasis / quantity;
  return `${price.toFixed(10)} ${currency}`;
}

/**
 * Estimate raw token units received for a given SOL input.
 * Uses the same Jupiter-derived rate as TradeQuote.
 * TODO: Replace with exact on-chain output once the buy response includes tokensReceived.
 */
export async function estimateTokensFromSol(songId: string, solAmount: number): Promise<number> {
  try {
    const raw = await runTokenPriceSolQueryForSongDetails(songId);
    const lamportsFor1MTokens = Number(raw);
    if (isNaN(lamportsFor1MTokens) || lamportsFor1MTokens <= 0) return 0;
    const tokensPerSol = (SOL_DECIMALS * TOKEN_UNITS_PER_TOKEN) / lamportsFor1MTokens;
    const wholeTokens = solAmount * tokensPerSol;
    return Math.round(wholeTokens * TOKEN_UNITS_PER_TOKEN);
  } catch {
    return 0;
  }
}

/**
 * Estimate lamports received for selling a given raw token amount.
 * Uses the same Jupiter-derived rate as TradeQuote.
 * TODO: Replace with exact on-chain output once the swap response includes SOL received.
 */
export async function estimateSolFromTokens(songId: string, rawTokenAmount: number): Promise<number> {
  try {
    const raw = await runTokenPriceSolQueryForSongDetails(songId);
    const lamportsFor1MTokens = Number(raw);
    if (isNaN(lamportsFor1MTokens) || lamportsFor1MTokens <= 0) return 0;
    const tokensPerSol = (SOL_DECIMALS * TOKEN_UNITS_PER_TOKEN) / lamportsFor1MTokens;
    const wholeTokens = rawTokenAmount / TOKEN_UNITS_PER_TOKEN;
    const solReceived = wholeTokens / tokensPerSol;
    return Math.round(solReceived * SOL_DECIMALS);
  } catch {
    return 0;
  }
}

/* ─── Core Hook ─── */

export function useCostBasis() {
  const recordBuyLot = useCallback(async (params: RecordBuyLotParams): Promise<boolean> => {
    const {
      userAddress,
      songId,
      songName,
      songSymbol,
      tokenMint,
      quantity,
      costBasisAmount,
      costBasisCurrency,
      source,
      txSignature,
    } = params;

    const lotId = `lot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const pricePerToken = formatPricePerToken(costBasisAmount, quantity, costBasisCurrency);

    try {
      const success = await setUserTokenLotsLots(userAddress, lotId, {
        tokenMint: Address.publicKey(tokenMint),
        songId,
        songName,
        songSymbol,
        quantity,
        remainingQuantity: quantity,
        costBasisAmount,
        costBasisCurrency,
        acquiredAt: Time.Now,
        source,
        txSignature,
        pricePerToken,
      });

      if (success) {
        console.log(`[CostBasis] Recorded buy lot ${lotId} for ${songSymbol}`);
      } else {
        console.warn(`[CostBasis] Failed to record buy lot ${lotId}`);
      }
      return success;
    } catch (err) {
      console.error('[CostBasis] recordBuyLot error:', err);
      return false;
    }
  }, []);

  const recordSellPnL = useCallback(async (params: RecordSellPnLParams): Promise<boolean> => {
    const {
      userAddress,
      songId,
      songName,
      songSymbol,
      tokenMint,
      soldQuantity,
      saleProceeds,
      currency,
      source,
      txSignature,
    } = params;

    try {
      // 1. Fetch all lots for this user, sorted oldest first
      const allLots = await getManyUserTokenLotsLots(userAddress, 'sort by acquiredAt asc');
      const lots = (allLots ?? []).filter(
        (lot) => lot.tokenMint === tokenMint && lot.remainingQuantity > 0
      );

      if (lots.length === 0) {
        console.warn(`[CostBasis] No lots found for ${tokenMint}; creating PnL event with zero cost basis`);
        // Still record the event so the sale is tracked
        const eventId = `pnl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const success = await setUserRealizedPnLEvents(userAddress, eventId, {
          tokenMint: Address.publicKey(tokenMint),
          songId,
          songName,
          songSymbol,
          lotIds: '',
          totalSoldQuantity: soldQuantity,
          totalCostBasis: 0,
          totalSaleProceeds: saleProceeds,
          currency,
          realizedPnL: saleProceeds,
          realizedAt: Time.Now,
          source,
          txSignature,
        });
        return success;
      }

      // 2. FIFO matching
      let remainingToSell = soldQuantity;
      let totalCostBasis = 0;
      const consumedLotIds: string[] = [];
      const lotUpdates: { lotId: string; newRemaining: number }[] = [];

      for (const lot of lots) {
        if (remainingToSell <= 0) break;
        const consume = Math.min(lot.remainingQuantity, remainingToSell);
        const portionCostBasis = (consume / lot.quantity) * lot.costBasisAmount;
        totalCostBasis += portionCostBasis;
        consumedLotIds.push(lot.id);
        lotUpdates.push({ lotId: lot.id, newRemaining: lot.remainingQuantity - consume });
        remainingToSell -= consume;
      }

      if (remainingToSell > 0) {
        console.warn(`[CostBasis] Sold ${soldQuantity} but only had enough cost basis for ${soldQuantity - remainingToSell}`);
      }

      // 3. Update consumed lots
      for (const update of lotUpdates) {
        const updateSuccess = await updateUserTokenLotsLots(userAddress, update.lotId, {
          remainingQuantity: update.newRemaining,
        });
        if (!updateSuccess) {
          console.warn(`[CostBasis] Failed to update lot ${update.lotId}`);
        }
      }

      // 4. Create PnL event
      const realizedPnL = saleProceeds - totalCostBasis;
      const eventId = `pnl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const success = await setUserRealizedPnLEvents(userAddress, eventId, {
        tokenMint: Address.publicKey(tokenMint),
        songId,
        songName,
        songSymbol,
        lotIds: consumedLotIds.join(','),
        totalSoldQuantity: soldQuantity - remainingToSell,
        totalCostBasis,
        totalSaleProceeds: saleProceeds,
        currency,
        realizedPnL,
        realizedAt: Time.Now,
        source,
        txSignature,
      });

      if (success) {
        console.log(`[CostBasis] Recorded PnL event ${eventId} for ${songSymbol}: ${realizedPnL} ${currency}`);
      } else {
        console.warn(`[CostBasis] Failed to record PnL event ${eventId}`);
      }
      return success;
    } catch (err) {
      console.error('[CostBasis] recordSellPnL error:', err);
      return false;
    }
  }, []);

  return { recordBuyLot, recordSellPnL };
}

/* ─── Data Hooks ─── */

export function useUserLots(userAddress: string | undefined) {
  const { data, loading, error } = useRealtimeData<UserTokenLotsLotsResponse[]>(
    subscribeManyUserTokenLotsLots,
    !!userAddress,
    userAddress ?? '',
    'sort by acquiredAt asc'
  );
  return { lots: data ?? [], loading, error };
}

export function useUserPnL(userAddress: string | undefined) {
  const { data, loading, error } = useRealtimeData<UserRealizedPnLEventsResponse[]>(
    subscribeManyUserRealizedPnLEvents,
    !!userAddress,
    userAddress ?? '',
    'sort by realizedAt desc'
  );
  return { events: data ?? [], loading, error };
}

export interface TokenPnLSummary {
  totalRealizedPnL: number;
  count: number;
  avgPnL: number;
}

export type { UserTokenLotsLotsResponse, UserRealizedPnLEventsResponse };

export function useTokenPnLSummary(
  userAddress: string | undefined,
  tokenMint: string | undefined
): TokenPnLSummary {
  const { events } = useUserPnL(userAddress);
  return useMemo(() => {
    const filtered = (events ?? []).filter((e) => e.tokenMint === tokenMint);
    const totalRealizedPnL = filtered.reduce((sum, e) => sum + (e.realizedPnL ?? 0), 0);
    const count = filtered.length;
    return {
      totalRealizedPnL,
      count,
      avgPnL: count > 0 ? totalRealizedPnL / count : 0,
    };
  }, [events, tokenMint]);
}
