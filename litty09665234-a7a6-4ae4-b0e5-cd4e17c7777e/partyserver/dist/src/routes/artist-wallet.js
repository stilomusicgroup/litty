/**
 * POST /api/artists/ensure-wallet
 *
 * Creates a Privy embedded Solana wallet for the authenticated artist and
 * writes the resulting address to the `creatorWallet` field on their artist record.
 *
 * Idempotent: if creatorWallet is already set, returns the existing value immediately
 * without calling Privy again.
 */
import { sendSuccess, ApiErrors } from '../lib/api-response.js';
import { validatePoofAuth } from '../lib/poof-auth.js';
import { getArtists, updateArtists } from '../collections/artists.js';
import { Address } from '../db-client.js';
import { PRIVY_APP_ID } from '../constants.js';
export function registerArtistWalletRoutes(app) {
    app.post('/api/artists/ensure-wallet', async (c) => {
        const { walletAddress } = await validatePoofAuth(c);
        // Load the artist record keyed by the authenticated user's wallet address
        const artist = await getArtists(walletAddress);
        if (!artist) {
            return ApiErrors.notFound(c, 'Artist profile not found. Create your profile first.');
        }
        // Idempotent — if creatorWallet is already populated, return it immediately
        if (artist.creatorWallet) {
            return sendSuccess(c, { creatorWallet: artist.creatorWallet });
        }
        // We need an email to create/link a Privy user
        const email = artist.email;
        if (!email || email.trim() === '') {
            return ApiErrors.badRequest(c, 'Artist profile is missing an email address. Please update your profile with a valid email first.');
        }
        const PRIVY_APP_SECRET = c.env.PRIVY_APP_SECRET;
        if (!PRIVY_APP_SECRET) {
            console.error('[ArtistWallet] PRIVY_APP_SECRET not configured');
            return ApiErrors.internal(c, 'Wallet creation service not configured');
        }
        const basicAuth = Buffer.from(`${PRIVY_APP_ID}:${PRIVY_APP_SECRET}`).toString('base64');
        const privyHeaders = {
            Authorization: `Basic ${basicAuth}`,
            'privy-app-id': PRIVY_APP_ID,
            'Content-Type': 'application/json',
        };
        // Step 1: Check if a Privy user with this email already has a Solana wallet
        let privyWalletAddress = null;
        try {
            const getUserRes = await fetch(`https://api.privy.io/v1/users/email:${encodeURIComponent(email.trim())}`, { headers: privyHeaders });
            if (getUserRes.ok) {
                const userData = (await getUserRes.json());
                const linkedWallet = userData?.linked_accounts?.find((a) => a.type === 'wallet' && a.chain_type === 'solana');
                if (linkedWallet?.address) {
                    if (c.env.LOG_LEVEL !== 'silent')
                        console.log(`[ArtistWallet] Found existing Privy wallet for ${email}: ${linkedWallet.address}`);
                    privyWalletAddress = linkedWallet.address;
                }
            }
        }
        catch (err) {
            console.warn('[ArtistWallet] Privy user lookup failed, will proceed to create wallet:', err);
        }
        // Step 2: If no existing wallet found, create a new embedded Solana wallet
        if (!privyWalletAddress) {
            try {
                const createWalletRes = await fetch('https://api.privy.io/v1/wallets', {
                    method: 'POST',
                    headers: privyHeaders,
                    body: JSON.stringify({ chain_type: 'solana' }),
                });
                if (!createWalletRes.ok) {
                    const errBody = await createWalletRes.text();
                    console.error(`[ArtistWallet] Privy wallet creation failed: ${createWalletRes.status} - ${errBody}`);
                    return ApiErrors.internal(c, `Wallet creation failed (Privy error ${createWalletRes.status})`);
                }
                const walletData = (await createWalletRes.json());
                privyWalletAddress = walletData.address;
                // Step 3: Link the artist's email to the new Privy wallet
                const linkUserRes = await fetch('https://api.privy.io/v1/users', {
                    method: 'POST',
                    headers: privyHeaders,
                    body: JSON.stringify({
                        email: { address: email.trim(), type: 'email' },
                        linked_wallets: [privyWalletAddress],
                    }),
                });
                if (!linkUserRes.ok) {
                    const errBody = await linkUserRes.text();
                    console.error(`[ArtistWallet] Privy user linking failed: ${linkUserRes.status} - ${errBody}`);
                    // Wallet was created but linking failed — still proceed with the wallet address
                    console.warn('[ArtistWallet] Proceeding with wallet address despite link failure');
                }
                if (c.env.LOG_LEVEL !== 'silent')
                    console.log(`[ArtistWallet] Created Privy embedded wallet for artist ${walletAddress} / ${email}: ${privyWalletAddress}`);
            }
            catch (err) {
                console.error('[ArtistWallet] Privy wallet creation threw:', err);
                return ApiErrors.internal(c, 'Wallet creation failed unexpectedly');
            }
        }
        // Step 4: Write creatorWallet to the artist record (vault-signed via Tarobase middleware)
        const ok = await updateArtists(walletAddress, {
            creatorWallet: Address.publicKey(privyWalletAddress),
        });
        if (!ok) {
            console.error(`[ArtistWallet] Failed to persist creatorWallet for artist ${walletAddress}`);
            return ApiErrors.internal(c, 'Failed to save wallet address to artist profile');
        }
        return sendSuccess(c, { creatorWallet: privyWalletAddress });
    });
}
