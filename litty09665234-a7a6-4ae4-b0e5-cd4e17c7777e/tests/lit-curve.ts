/**
 * Lit Curve — Phase 2 Unit Tests
 *
 * Run pure math tests without blockchain:
 *   npx ts-node tests/lit-curve.ts
 *
 * Run Anchor integration tests (requires localnet):
 *   anchor test
 */

import * as assert from "assert";

// ─── Mirror of programs/lit-curve/src/math.rs in TypeScript ────────────────

const INITIAL_VIRTUAL_SOL = BigInt(30_000_000_000); // 30 SOL
const INITIAL_VIRTUAL_TOKENS = BigInt(1_073_000_000_000_000); // 1.073B × 10^6
const TOTAL_SUPPLY = BigInt(1_000_000_000_000_000);
const TOKEN_RESERVES_IN_CURVE = BigInt(793_100_000_000_000);
const GRADUATION_THRESHOLD = BigInt(85_000_000_000);
const SOL = BigInt(1_000_000_000); // 1 SOL in lamports

interface BuyResult {
  tokensOut: bigint;
  newVirtualSol: bigint;
  newVirtualTokens: bigint;
}

interface SellResult {
  solOut: bigint;
  newVirtualSol: bigint;
  newVirtualTokens: bigint;
}

interface FeeComponents {
  fanLamports: bigint;
  artistLamports: bigint;
  treasuryLamports: bigint;
  infraLamports: bigint;
}

function computeBuy(
  virtualSol: bigint,
  virtualTokens: bigint,
  solIn: bigint
): BuyResult {
  if (solIn === 0n) throw new Error("ZeroAmount");
  const k = virtualSol * virtualTokens;
  const newVirtualSol = virtualSol + solIn;
  const newVirtualTokens = k / newVirtualSol; // floor
  const tokensOut = virtualTokens - newVirtualTokens;
  if (tokensOut <= 0n) throw new Error("InsufficientOutput");
  return { tokensOut, newVirtualSol, newVirtualTokens };
}

function computeSell(
  virtualSol: bigint,
  virtualTokens: bigint,
  tokensIn: bigint
): SellResult {
  if (tokensIn === 0n) throw new Error("ZeroAmount");
  const k = virtualSol * virtualTokens;
  const newVirtualTokens = virtualTokens + tokensIn;
  const newVirtualSol = k / newVirtualTokens; // floor
  const solOut = virtualSol - newVirtualSol;
  if (solOut <= 0n) throw new Error("InsufficientOutput");
  return { solOut, newVirtualSol, newVirtualTokens };
}

function splitFees(grossLamports: bigint): FeeComponents {
  const fan = (grossLamports * 9_600n) / 10_000n;
  const artist = (grossLamports * 200n) / 10_000n;
  const treasury = (grossLamports * 100n) / 10_000n;
  const infra = grossLamports - fan - artist - treasury;
  return { fanLamports: fan, artistLamports: artist, treasuryLamports: treasury, infraLamports: infra };
}

function spotPrice(virtualSol: bigint, virtualTokens: bigint): bigint {
  if (virtualTokens === 0n) return 0n;
  return (virtualSol * 1_000_000n) / virtualTokens; // lamports per 1 token
}

function kInvariant(vSol: bigint, vTokens: bigint): bigint {
  return vSol * vTokens;
}

// ─── Test helpers ────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✅  ${name}`);
    passed++;
  } catch (e: any) {
    console.log(`  ❌  ${name}: ${e.message}`);
    failed++;
  }
}

function approxEqual(a: bigint, b: bigint, tolerance = 1n): boolean {
  const diff = a > b ? a - b : b - a;
  return diff <= tolerance;
}

// ─── Phase 2 Unit Tests ──────────────────────────────────────────────────────

console.log("\n═══════════════════════════════════════════");
console.log("  LIT CURVE — Phase 2 Math Unit Tests");
console.log("═══════════════════════════════════════════\n");

// ── Section 1: Single buys at 0.1 / 1 / 10 SOL ──────────────────────────────
console.log("Section 1: Single buys (0.1 / 1 / 10 SOL)");

const buyAmounts = [
  { label: "0.1 SOL", lamports: SOL / 10n },
  { label: "1 SOL",   lamports: SOL },
  { label: "10 SOL",  lamports: SOL * 10n },
];

for (const { label, lamports } of buyAmounts) {
  test(`Buy ${label}: fee split sums to gross`, () => {
    const fees = splitFees(lamports);
    assert.strictEqual(
      fees.fanLamports + fees.artistLamports + fees.treasuryLamports + fees.infraLamports,
      lamports,
      "Fee components must sum exactly to gross"
    );
  });

  test(`Buy ${label}: fan gets 96%`, () => {
    const fees = splitFees(lamports);
    // Allow ±1 for rounding
    const expected = (lamports * 9600n) / 10000n;
    assert.ok(approxEqual(fees.fanLamports, expected), `Expected ~${expected}, got ${fees.fanLamports}`);
  });

  test(`Buy ${label}: tokens out > 0`, () => {
    const fees = splitFees(lamports);
    const result = computeBuy(INITIAL_VIRTUAL_SOL, INITIAL_VIRTUAL_TOKENS, fees.fanLamports);
    assert.ok(result.tokensOut > 0n, "Must receive tokens");
  });

  test(`Buy ${label}: k conserved (fan step)`, () => {
    const fees = splitFees(lamports);
    const k0 = kInvariant(INITIAL_VIRTUAL_SOL, INITIAL_VIRTUAL_TOKENS);
    const r = computeBuy(INITIAL_VIRTUAL_SOL, INITIAL_VIRTUAL_TOKENS, fees.fanLamports);
    const k1 = kInvariant(r.newVirtualSol, r.newVirtualTokens);
    // k1 >= k0 (floor rounding gives protocol a tiny surplus)
    assert.ok(k1 >= k0, `k decreased: ${k0} → ${k1}`);
    // surplus bounded by at most newVirtualSol units
    assert.ok(k1 - k0 <= r.newVirtualSol, `k surplus too large: ${k1 - k0}`);
  });

  test(`Buy ${label}: price increases after buy`, () => {
    const fees = splitFees(lamports);
    const priceBefore = spotPrice(INITIAL_VIRTUAL_SOL, INITIAL_VIRTUAL_TOKENS);
    const r = computeBuy(INITIAL_VIRTUAL_SOL, INITIAL_VIRTUAL_TOKENS, fees.fanLamports);
    const priceAfter = spotPrice(r.newVirtualSol, r.newVirtualTokens);
    assert.ok(priceAfter > priceBefore, `Price should rise after buy`);
  });
}

// ── Section 2: Sell-back (buy then sell same tokens) ────────────────────────
console.log("\nSection 2: Sell-back (buy → sell, fan gets back <100% due to fees)");

for (const { label, lamports } of buyAmounts) {
  test(`Sell-back ${label}: fan gets back < gross input`, () => {
    const fees = splitFees(lamports);
    const buyResult = computeBuy(INITIAL_VIRTUAL_SOL, INITIAL_VIRTUAL_TOKENS, fees.fanLamports);
    const sellResult = computeSell(buyResult.newVirtualSol, buyResult.newVirtualTokens, buyResult.tokensOut);
    // Total sell output is less than original gross (fees taken both ways)
    assert.ok(sellResult.solOut < lamports, "Must lose money to fees on round-trip");
  });

  test(`Sell-back ${label}: k conserved on sell`, () => {
    const fees = splitFees(lamports);
    const buyResult = computeBuy(INITIAL_VIRTUAL_SOL, INITIAL_VIRTUAL_TOKENS, fees.fanLamports);
    const k0 = kInvariant(buyResult.newVirtualSol, buyResult.newVirtualTokens);
    const sellResult = computeSell(buyResult.newVirtualSol, buyResult.newVirtualTokens, buyResult.tokensOut);
    const k1 = kInvariant(sellResult.newVirtualSol, sellResult.newVirtualTokens);
    assert.ok(k1 >= k0, `k decreased on sell: ${k0} → ${k1}`);
    assert.ok(k1 - k0 <= sellResult.newVirtualSol, `k surplus too large on sell: ${k1 - k0}`);
  });
}

// ── Section 3: 100 random trades, k monotonically non-decreasing ─────────────
console.log("\nSection 3: 100 random trades — k invariant");

test("100 random buys: k never decreases", () => {
  let vSol = INITIAL_VIRTUAL_SOL;
  let vTokens = INITIAL_VIRTUAL_TOKENS;
  let realTokens = TOKEN_RESERVES_IN_CURVE;
  let k = kInvariant(vSol, vTokens);

  // Deterministic "random" using LCG
  let seed = 12345n;
  const lcg = () => {
    seed = (seed * 1664525n + 1013904223n) & 0xFFFFFFFFn;
    return seed;
  };

  for (let i = 0; i < 100; i++) {
    const grossSol = (lcg() % 500n + 1n) * 1_000_000n; // 0.001–0.5 SOL
    const fees = splitFees(grossSol);
    if (fees.fanLamports === 0n) continue;

    const result = computeBuy(vSol, vTokens, fees.fanLamports);
    if (result.tokensOut > realTokens) break; // out of tokens

    const kNew = kInvariant(result.newVirtualSol, result.newVirtualTokens);
    if (kNew < k) throw new Error(`k decreased at trade ${i}: ${k} → ${kNew}`);

    vSol = result.newVirtualSol;
    vTokens = result.newVirtualTokens;
    realTokens -= result.tokensOut;
    k = kNew;
  }
});

test("100 random sells: k never decreases", () => {
  // First buy a bunch to have tokens to sell
  let vSol = INITIAL_VIRTUAL_SOL;
  let vTokens = INITIAL_VIRTUAL_TOKENS;
  const buyResult = computeBuy(vSol, vTokens, SOL * 5n);
  vSol = buyResult.newVirtualSol;
  vTokens = buyResult.newVirtualTokens;
  let tokenBalance = buyResult.tokensOut;

  let k = kInvariant(vSol, vTokens);
  let seed = 99999n;
  const lcg = () => {
    seed = (seed * 1664525n + 1013904223n) & 0xFFFFFFFFn;
    return seed;
  };

  for (let i = 0; i < 100; i++) {
    if (tokenBalance === 0n) break;
    const tokensIn = (lcg() % tokenBalance) + 1n;
    const result = computeSell(vSol, vTokens, tokensIn);
    const kNew = kInvariant(result.newVirtualSol, result.newVirtualTokens);
    if (kNew < k) throw new Error(`k decreased at sell ${i}: ${k} → ${kNew}`);
    vSol = result.newVirtualSol;
    vTokens = result.newVirtualTokens;
    tokenBalance -= tokensIn;
    k = kNew;
  }
});

test("100 alternating buy/sell: k monotonically non-decreasing", () => {
  let vSol = INITIAL_VIRTUAL_SOL;
  let vTokens = INITIAL_VIRTUAL_TOKENS;
  let realTokens = TOKEN_RESERVES_IN_CURVE;
  let k = kInvariant(vSol, vTokens);
  let heldTokens = 0n;

  let seed = 42n;
  const lcg = () => {
    seed = (seed * 1664525n + 1013904223n) & 0xFFFFFFFFn;
    return seed;
  };

  for (let i = 0; i < 100; i++) {
    const isBuy = heldTokens === 0n || lcg() % 2n === 0n;

    if (isBuy) {
      const grossSol = (lcg() % 200n + 1n) * 1_000_000n;
      const fees = splitFees(grossSol);
      if (fees.fanLamports === 0n || fees.fanLamports > realTokens) continue;
      const r = computeBuy(vSol, vTokens, fees.fanLamports);
      if (r.tokensOut > realTokens) continue;
      const kNew = kInvariant(r.newVirtualSol, r.newVirtualTokens);
      if (kNew < k) throw new Error(`k decreased on buy at step ${i}`);
      vSol = r.newVirtualSol; vTokens = r.newVirtualTokens;
      realTokens -= r.tokensOut; heldTokens += r.tokensOut; k = kNew;
    } else {
      const tokensIn = (lcg() % heldTokens) + 1n;
      const r = computeSell(vSol, vTokens, tokensIn);
      const kNew = kInvariant(r.newVirtualSol, r.newVirtualTokens);
      if (kNew < k) throw new Error(`k decreased on sell at step ${i}`);
      vSol = r.newVirtualSol; vTokens = r.newVirtualTokens;
      realTokens += tokensIn; heldTokens -= tokensIn; k = kNew;
    }
  }
});

// ── Section 4: Edge cases ────────────────────────────────────────────────────
console.log("\nSection 4: Edge cases");

test("Zero buy throws", () => {
  assert.throws(() => computeBuy(INITIAL_VIRTUAL_SOL, INITIAL_VIRTUAL_TOKENS, 0n), /ZeroAmount/);
});

test("Zero sell throws", () => {
  assert.throws(() => computeSell(INITIAL_VIRTUAL_SOL, INITIAL_VIRTUAL_TOKENS, 0n), /ZeroAmount/);
});

test("1 lamport buy succeeds (no overflow)", () => {
  const r = computeBuy(INITIAL_VIRTUAL_SOL, INITIAL_VIRTUAL_TOKENS, 1n);
  assert.ok(r.tokensOut >= 0n);
});

test("Graduation threshold: 85 SOL buys trigger check", () => {
  let vSol = INITIAL_VIRTUAL_SOL;
  let vTokens = INITIAL_VIRTUAL_TOKENS;
  let realSol = 0n;
  const chunkSol = SOL * 5n;
  const fees = splitFees(chunkSol);

  for (let i = 0; i < 20; i++) {
    const r = computeBuy(vSol, vTokens, fees.fanLamports);
    vSol = r.newVirtualSol;
    vTokens = r.newVirtualTokens;
    realSol += fees.fanLamports + fees.artistLamports;
    if (realSol >= GRADUATION_THRESHOLD) {
      assert.ok(realSol >= GRADUATION_THRESHOLD, "Graduation triggered");
      return;
    }
  }
  // If we didn't reach threshold in 20 × 5 SOL = 100 SOL that's unexpected
  assert.ok(realSol >= GRADUATION_THRESHOLD, "Should have reached 85 SOL threshold");
});

test("Fee split: infra is remainder (no rounding loss)", () => {
  // Test several amounts to verify fan+artist+treasury+infra == gross exactly
  for (const amt of [1n, 100n, 999n, 1337n, SOL, SOL * 17n + 7n]) {
    const f = splitFees(amt);
    assert.strictEqual(f.fanLamports + f.artistLamports + f.treasuryLamports + f.infraLamports, amt);
  }
});

// ── Results ──────────────────────────────────────────────────────────────────
console.log("\n═══════════════════════════════════════════");
console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
console.log("═══════════════════════════════════════════\n");

if (failed > 0) {
  process.exit(1);
}
