/**
 * One-shot backfill: find all songs where creator is null/empty/missing,
 * resolve from users collection via songDetails.artistEmail → users.email,
 * and write creator = walletAddress for each match found.
 *
 * Safe to run multiple times — never overwrites an existing non-empty creator.
 *
 * Trigger manually via the Heartbeat UI Run button (task: backfill-song-creators).
 * Disable the task after the run completes (or just leave it disabled to start).
 */
import { get, set } from '@pooflabs/server';
import { Address } from '../db-client.js';
export async function backfillSongCreators() {
    console.log('[backfill-song-creators] Starting...');
    // ── 1. Fetch all collections ───────────────────────────────────────────────
    const allSongs = (await get('songs'));
    if (!allSongs || !Array.isArray(allSongs)) {
        console.error('[backfill-song-creators] Failed to fetch songs collection or it is empty');
        return;
    }
    const allSongDetails = (await get('songDetails'));
    const allUsers = (await get('users'));
    // ── 2. Build lookup maps ───────────────────────────────────────────────────
    // songId → artistEmail
    const songIdToEmail = {};
    if (Array.isArray(allSongDetails)) {
        for (const sd of allSongDetails) {
            const id = sd.id;
            const email = sd.artistEmail;
            if (id && email && email.trim()) {
                songIdToEmail[id] = email.trim().toLowerCase();
            }
        }
    }
    console.log(`[backfill-song-creators] songDetails with artistEmail: ${Object.keys(songIdToEmail).length}`);
    // email → walletAddress (from users collection)
    const emailToWallet = {};
    if (Array.isArray(allUsers)) {
        for (const u of allUsers) {
            const email = u.email;
            const wallet = u.walletAddress;
            if (email && email.trim() && wallet && wallet.trim()) {
                emailToWallet[email.trim().toLowerCase()] = wallet.trim();
            }
        }
    }
    console.log(`[backfill-song-creators] users with email+wallet: ${Object.keys(emailToWallet).length}`);
    // ── 3. Partition songs ─────────────────────────────────────────────────────
    let totalScanned = 0;
    let alreadyHasCreator = 0;
    let noEmail = 0;
    let emailNotInUsers = 0;
    let userHasNoWallet = 0;
    let updated = 0;
    // Samples for reporting
    const sampleUpdates = [];
    const sampleUnresolved = [];
    // Collect updates to apply
    const updates = [];
    const unresolved = [];
    for (const song of allSongs) {
        totalScanned++;
        const songId = song.id;
        const creator = song.creator;
        // Skip songs that already have a creator wallet
        if (creator && creator.trim()) {
            alreadyHasCreator++;
            continue;
        }
        // Look up artistEmail from songDetails
        const email = songIdToEmail[songId];
        if (!email) {
            noEmail++;
            unresolved.push({ songId, reason: 'no-artist-email-in-songDetails' });
            continue;
        }
        // Look up wallet from users
        const wallet = emailToWallet[email];
        if (wallet === undefined) {
            // Check if email is in the map at all vs user exists but no wallet
            // (emailToWallet only contains entries where both email AND wallet exist)
            // So absence means: either no user record with that email, or user has no wallet field
            // Distinguish: check if any user has that email but no wallet
            const matchingUser = Array.isArray(allUsers)
                ? allUsers.find((u) => u.email?.trim().toLowerCase() === email)
                : undefined;
            if (!matchingUser) {
                emailNotInUsers++;
                unresolved.push({ songId, reason: `email-not-in-users (${email})` });
            }
            else {
                userHasNoWallet++;
                unresolved.push({ songId, reason: `user-has-no-wallet (${email})` });
            }
            continue;
        }
        updates.push({ songId, wallet });
    }
    // ── 4. Dry-run summary ─────────────────────────────────────────────────────
    console.log('[backfill-song-creators] DRY-RUN SUMMARY:');
    console.log(`  SCANNED:             ${totalScanned}`);
    console.log(`  ALREADY HAD CREATOR: ${alreadyHasCreator}`);
    console.log(`  WILL UPDATE:         ${updates.length}`);
    console.log(`  UNRESOLVED:          ${unresolved.length}`);
    console.log(`    no-artist-email:   ${noEmail}`);
    console.log(`    email-not-in-users:${emailNotInUsers}`);
    console.log(`    user-has-no-wallet:${userHasNoWallet}`);
    if (updates.length > 0) {
        console.log('[backfill-song-creators] Sample updates (up to 5):');
        for (const u of updates.slice(0, 5)) {
            console.log(`  ${u.songId} -> ${u.wallet}`);
        }
    }
    if (unresolved.length > 0) {
        console.log('[backfill-song-creators] Sample unresolved (up to 5):');
        for (const u of unresolved.slice(0, 5)) {
            console.log(`  ${u.songId} -> ${u.reason}`);
        }
    }
    // ── 5. Apply updates ───────────────────────────────────────────────────────
    if (updates.length === 0) {
        console.log('[backfill-song-creators] Nothing to update. Done.');
    }
    else {
        console.log(`[backfill-song-creators] Applying ${updates.length} creator writes...`);
        for (const { songId, wallet } of updates) {
            try {
                const ok = await set(`songs/${songId}`, { creator: Address.publicKey(wallet) });
                if (ok) {
                    updated++;
                    if (sampleUpdates.length < 5) {
                        sampleUpdates.push(`${songId} -> ${wallet}`);
                    }
                    console.log(`[backfill-song-creators] UPDATED songs/${songId} creator=${wallet}`);
                }
                else {
                    console.error(`[backfill-song-creators] DENIED: set songs/${songId} creator — policy rejected write`);
                    unresolved.push({ songId, reason: 'policy-denied-write' });
                    if (sampleUnresolved.length < 5) {
                        sampleUnresolved.push(`${songId} -> policy-denied-write`);
                    }
                }
            }
            catch (err) {
                console.error(`[backfill-song-creators] ERROR writing songs/${songId}:`, err);
                unresolved.push({ songId, reason: `write-error: ${err}` });
                if (sampleUnresolved.length < 5) {
                    sampleUnresolved.push(`${songId} -> write-error`);
                }
            }
        }
    }
    // Populate sample unresolved from earlier-collected unresolved list if not yet filled
    for (const u of unresolved) {
        if (sampleUnresolved.length >= 5)
            break;
        sampleUnresolved.push(`${u.songId} -> ${u.reason}`);
    }
    // ── 6. Final report ────────────────────────────────────────────────────────
    console.log('[backfill-song-creators] FINAL REPORT:');
    console.log(`SCANNED: ${totalScanned}`);
    console.log(`ALREADY HAD CREATOR: ${alreadyHasCreator}`);
    console.log(`UPDATED: ${updated}`);
    console.log(`UNRESOLVED: ${unresolved.length}`);
    console.log(`  - No artist email on song: ${noEmail}`);
    console.log(`  - Artist email not in users: ${emailNotInUsers}`);
    console.log(`  - User has no wallet: ${userHasNoWallet}`);
    console.log(`  - Policy denied / write error: ${unresolved.length - noEmail - emailNotInUsers - userHasNoWallet}`);
    console.log(`SAMPLE UPDATES: [${sampleUpdates.join(', ')}]`);
    console.log(`SAMPLE UNRESOLVED: [${sampleUnresolved.join(', ')}]`);
}
