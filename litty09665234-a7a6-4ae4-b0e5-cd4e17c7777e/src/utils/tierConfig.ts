/**
 * Tier configuration for Song Coin purchase packs.
 * 4 simple tiers with fixed USD prices.
 * Token amounts are calculated DYNAMICALLY at purchase time based on the
 * current song token market price (USD / pricePerToken). The tokenAmount
 * fields below are REMOVED — never use fixed token counts, always calculate
 * at time of purchase using: tokenAmount = floor(priceUsd / pricePerToken).
 * If no price data is available, backend PACK_CONFIG.tokenAmount serves as fallback.
 */

export interface TierConfig {
  id: string;
  name: string;
  price: number;     // USD
  label: string;
  gradient: string;
  borderColor: string;
  glowColor: string;
}

export const TIERS: Record<string, TierConfig> = {
  studio: {
    id: 'studio',
    name: 'Studio',
    price: 10.99,
    label: 'Starter',
    gradient: 'linear-gradient(135deg, #e6e600, #FFFF00)',
    borderColor: '#FFFF00',
    glowColor: 'rgba(255,255,0,0.6)',
  },
  platinum: {
    id: 'platinum',
    name: 'Platinum',
    price: 39.99,
    label: 'Most Popular',
    gradient: 'linear-gradient(135deg, #0891b2, #00D4FF)',
    borderColor: '#00D4FF',
    glowColor: 'rgba(0,212,255,0.5)',
  },
  diamond: {
    id: 'diamond',
    name: 'Diamond',
    price: 69.99,
    label: 'Premium',
    gradient: 'linear-gradient(135deg, #7c3aed, #a855f7)',
    borderColor: '#a855f7',
    glowColor: 'rgba(168,85,247,0.7)',
  },
  legend: {
    id: 'legend',
    name: 'Legend',
    price: 99.99,
    label: 'VIP',
    gradient: 'linear-gradient(135deg, #d97706, #f59e0b)',
    borderColor: '#f59e0b',
    glowColor: 'rgba(245,158,11,0.8)',
  },
};

export const TIER_LIST = [TIERS.studio, TIERS.platinum, TIERS.diamond, TIERS.legend];

// Stripe price IDs removed — Shopify-only payment flow.
