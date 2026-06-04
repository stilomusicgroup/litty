/**
 * Detects whether the current browser is running on a mobile device.
 * Checks navigator.userAgent for common mobile patterns.
 */
export function isMobileBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;

  const ua = navigator.userAgent || navigator.vendor || (window as any).opera || '';
  const lowerUa = ua.toLowerCase();

  // Common mobile device patterns
  const mobilePatterns = [
    /android/i,
    /iphone/i,
    /ipad/i,
    /ipod/i,
    /blackberry/i,
    /windows phone/i,
    /mobile/i,
    /samsung/i,
    /silk/i,        // Amazon Kindle
    /kindle/i,
  ];

  const isMobile = mobilePatterns.some(pattern => pattern.test(lowerUa));

  // Also check for touch-capable small screens as a secondary signal
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isSmallScreen = window.innerWidth <= 768;

  // If UA says mobile, trust it. Otherwise fall back to touch + small screen.
  return isMobile || (isTouchDevice && isSmallScreen);
}
