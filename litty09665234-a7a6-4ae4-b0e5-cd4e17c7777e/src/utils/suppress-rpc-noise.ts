/**
 * Suppresses known-noisy, non-actionable console errors/warnings from
 * third-party Solana RPC and wallet libraries.
 *
 * These errors occur when:
 * - Poofnet endpoints return responses without the standard jsonrpc "2.0" envelope
 * - WalletConnect sessions expire or disconnect
 * - WebSocket reconnects happen transiently
 *
 * The wallet continues to work correctly; these are cosmetic console spam only.
 * Import once at the very top of main.tsx.
 */

const SUPPRESSED_ERROR_PATTERNS: Array<string | RegExp> = [
  // Zod validation errors from RPC response parsing
  'ZodError',
  // WalletConnect RPC errors (non-actionable during session lifecycle)
  'WalletConnectSolana: RPC Error',
  'WalletConnectSolana: Error disconnecting session',
  'WalletConnectSolana: Error destroying session',
  // Privy Solana provider reconnect errors (transient)
  'Failed to reconnect solana provider',
  'Solana provider reconnection failed',
  'Solana provider connection lost',
  // Tarobase WebSocket errors (transient reconnects are expected)
  '[WS v2] WebSocket error:',
  '[WS v2] Error reconnecting:',
  '[WS v2] Server error:',
  '[WS v2] Error parsing message:',
  // Solana JSON-RPC response shape mismatches (Poofnet returns non-standard envelope)
  /SolanaError.*MALFORMED_JSON_RPC/,
  /SolanaError.*RPC.*TRANSPORT/,
  /Expected a JSON-RPC/,
];

const SUPPRESSED_WARN_PATTERNS: Array<string | RegExp> = [
  // Transient WebSocket reconnect warnings
  '[WS v2] Auth refresh failed',
  '[WS v2] Token refresh failed',
  // Solana adapter state warnings (harmless timing issues)
  'Expected adapter state to be',
  // Wallet connection transient warnings
  'Failed to reconnect solana provider',
];

function matchesPattern(args: unknown[], patterns: Array<string | RegExp>): boolean {
  const message = args
    .map((a) => {
      if (typeof a === 'string') return a;
      if (a instanceof Error) return a.message + (a.stack ?? '');
      try {
        return String(a);
      } catch {
        return '';
      }
    })
    .join(' ');

  return patterns.some((pattern) =>
    typeof pattern === 'string' ? message.includes(pattern) : pattern.test(message)
  );
}

let installed = false;

/**
 * Install console.error and console.warn patches. Call once at app startup.
 * Only suppresses matching patterns — all other errors/warnings pass through normally.
 * Safe to call multiple times; only installs once.
 */
export function installRpcNoiseSuppressor(): void {
  if (installed) return;
  installed = true;

  const originalError = console.error.bind(console);
  const originalWarn = console.warn.bind(console);

  console.error = (...args: unknown[]) => {
    if (matchesPattern(args, SUPPRESSED_ERROR_PATTERNS)) {
      return;
    }
    originalError(...args);
  };

  console.warn = (...args: unknown[]) => {
    if (matchesPattern(args, SUPPRESSED_WARN_PATTERNS)) {
      return;
    }
    originalWarn(...args);
  };
}
