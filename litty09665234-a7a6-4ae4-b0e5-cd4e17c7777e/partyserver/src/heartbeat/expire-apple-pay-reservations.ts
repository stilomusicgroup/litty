import { get, set } from '@pooflabs/server';

export async function expireApplePayReservations(): Promise<void> {
  const todayKey = new Date().toISOString().slice(0, 10);
  const budget = await get(`applePayDailyBudget/${todayKey}`);
  if (!budget?.reservations) return;

  const reservations: Array<{cartId: string; amountCents: number; reservedAt: number}> =
    JSON.parse(budget.reservations);
  const EXPIRY_SECS = 45 * 60; // 45 minutes
  const nowSec = Math.floor(Date.now() / 1000);

  const expired = reservations.filter(r => nowSec - r.reservedAt > EXPIRY_SECS);
  if (expired.length === 0) return;

  const expiredCents = expired.reduce((sum, r) => sum + r.amountCents, 0);
  const active = reservations.filter(r => nowSec - r.reservedAt <= EXPIRY_SECS);

  await set(`applePayDailyBudget/${todayKey}`, {
    ...budget,
    reservedUsd: Math.max(0, Number(budget.reservedUsd ?? 0) - expiredCents),
    reservations: JSON.stringify(active),
    updatedAt: nowSec,
  });
  console.log(`[expire-apple-pay-reservations] Expired ${expired.length} reservations (${expiredCents} cents freed)`);
}
