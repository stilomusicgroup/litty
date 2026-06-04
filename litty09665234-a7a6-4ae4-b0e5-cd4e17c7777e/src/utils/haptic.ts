/**
 * Haptic feedback utility — wraps Web Vibration API.
 * Guard: checks 'vibrate' in navigator before calling (safe on iOS Safari which doesn't support it).
 *
 * Patterns (ms: vibrate, pause, vibrate, ...):
 * - hapticSuccess  [15, 40, 25]  — double tap, positive confirmation
 * - hapticError    [60]          — single firm buzz, failure
 * - hapticTap      [10]          — subtle light tap, button press
 */

const canVibrate = typeof navigator !== 'undefined' && 'vibrate' in navigator;

/** Double-tap pattern for purchase/trade confirmations */
export function hapticSuccess(): void {
  if (canVibrate) navigator.vibrate([15, 40, 25]);
}

/** Single firm buzz for failures and errors */
export function hapticError(): void {
  if (canVibrate) navigator.vibrate([60]);
}

/** Subtle tap for button presses and UI interactions */
export function hapticTap(): void {
  if (canVibrate) navigator.vibrate([10]);
}

// ─── Legacy aliases (keeps existing call sites working) ─────────────────────

export function triggerHapticFeedback(pattern?: [number, number, number]): void {
  if (!canVibrate) return;
  if (pattern) {
    navigator.vibrate(pattern);
  } else {
    hapticTap();
  }
}

export function triggerSuccessHaptic(): void {
  hapticSuccess();
}

export function triggerErrorHaptic(): void {
  hapticError();
}
