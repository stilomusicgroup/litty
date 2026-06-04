# Lit Studio — Manual Test Checklist (Go-Live)

Run these in the **Preview** environment with a real Phantom wallet before publishing to Live.

---

## MONEY IN

- [ ] **Buy a token** — Pick a song, click Buy, enter amount, confirm in Phantom. Tokens arrive in wallet.
- [ ] **Buy quote accuracy** — Before confirming, check the quoted token amount feels reasonable for the SOL spent.
- [ ] **Minimum purchase** — Try buying $0.50 worth. Should be blocked.
- [ ] **Solscan link** — After buy, click the Solscan link. Transaction should appear.

## MONEY OUT

- [ ] **Sell a token** — Go to a song you own, click Sell, enter amount, confirm in Phantom.
- [ ] **SOL balance increase** — Check wallet SOL balance before and after sell. Should go up.
- [ ] **Sell quote** — Before confirming, verify the quoted SOL amount looks correct.
- [ ] **Solscan link** — After sell, click the Solscan link. Transaction should appear.

## WALLET

- [ ] **SOL balance** — Open wallet page. SOL balance should match Phantom.
- [ ] **Token holdings** — Wallet page should list all song coins you own with real balances.
- [ ] **Send SOL** — Send a small amount of SOL to another address. Confirm in Phantom.
- [ ] **Receive QR** — Open Receive, scan QR with another wallet. Address should match.
- [ ] **Copy address** — Click copy, paste elsewhere. Should match wallet address.

## MUSIC

- [ ] **Play a song** — Click play on any song. Audio should start within 2 seconds.
- [ ] **Free stream** — Play a song you don't own. Should play without asking for tokens.
- [ ] **Mini player** — Start playing, navigate to another page. Mini player stays visible.
- [ ] **Navigation persistence** — Switch between pages while playing. Audio should not stop.

## LAUNCH A SONG

- [ ] **Audio upload** — Upload an MP3 on the Create page. Should succeed.
- [ ] **Square cover art** — Try uploading a non-square image. Should be rejected with an error toast.
- [ ] **Square cover art (pass)** — Upload a square image. Should succeed.
- [ ] **Token launch** — Fill all fields, launch. Should succeed and redirect to song page.
- [ ] **Discover visibility** — New song should appear on Discover immediately after launch.

---

Mark each item with [x] as you complete it. All must pass before going Live.
