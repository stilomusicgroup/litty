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
export declare function backfillSongCreators(): Promise<void>;
