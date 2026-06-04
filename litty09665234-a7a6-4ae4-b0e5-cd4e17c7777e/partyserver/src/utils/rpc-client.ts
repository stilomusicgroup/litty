/**
 * Solana RPC client with Helius fallback.
 *
 * Tries the primary RPC first; on connection error or timeout,
 * falls back to Helius. Logs which endpoint was used.
 */

import { Connection } from '@solana/web3.js';

const RPC_TIMEOUT_MS = 10_000;

function getPrimaryRpcUrl(): string {
  return (
    process.env.SOLANA_RPC_URL ??
    process.env.VITE_RPC_URL ??
    'https://api.mainnet-beta.solana.com'
  );
}

function getHeliusRpcUrl(env?: Record<string, unknown>): string | undefined {
  const apiKey = env?.HELIUS_API_KEY ?? process.env.HELIUS_API_KEY;
  if (!apiKey) return undefined;
  return `https://mainnet.helius-rpc.com/?api-key=${apiKey}`;
}

/**
 * Fetch JSON-RPC with a timeout. Returns null on timeout/error.
 */
async function rpcFetchWithTimeout(url: string, body: unknown, timeoutMs: number): Promise<Response | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timer);
    return resp;
  } catch {
    return null;
  }
}

/**
 * Return the best available RPC URL, trying primary first then Helius fallback.
 */
export async function getRpcUrlWithFallback(env?: unknown): Promise<string> {
  const primary = getPrimaryRpcUrl();

  // Test primary with a lightweight getHealth call
  const healthResp = await rpcFetchWithTimeout(
    primary,
    { jsonrpc: '2.0', id: 1, method: 'getHealth' },
    RPC_TIMEOUT_MS,
  );

  if (healthResp && healthResp.ok) {
    console.log(`[RPC] Using primary endpoint: ${primary.replace(/\?.*$/, '')}`);
    return primary;
  }

  const helius = getHeliusRpcUrl(env as Record<string, unknown> | undefined);
  if (helius) {
    const heliusHealth = await rpcFetchWithTimeout(
      helius,
      { jsonrpc: '2.0', id: 1, method: 'getHealth' },
      RPC_TIMEOUT_MS,
    );
    if (heliusHealth && heliusHealth.ok) {
      console.log(`[RPC] Primary failed — using Helius fallback`);
      return helius;
    }
  }

  // If both fail, return primary anyway (last resort)
  console.warn(`[RPC] Both primary and Helius failed — returning primary as last resort`);
  return primary;
}

/**
 * Create a Solana Connection using the best available RPC endpoint.
 * Tries primary first, falls back to Helius on failure.
 */
export async function createConnection(env?: unknown, commitment: 'confirmed' | 'finalized' | 'processed' = 'confirmed'): Promise<Connection> {
  const rpcUrl = await getRpcUrlWithFallback(env);
  return new Connection(rpcUrl, commitment);
}
