# Lit Studios — Platform Test Checklist

**Platform:** [ ] Draft (Poofnet)  [ ] Preview (mainnet-preview)  [ ] Live (production)
**Date:** _______________    **Tester:** _______________
**URL:** ___________________________________________

---

## 1. AUTH & WALLET

- [ ] **Privy Social Login** — Log in with Google
- [ ] **Privy Social Login** — Log in with Twitter / X
- [ ] **Privy Social Login** — Log in with Email
- [ ] **Embedded Wallet Auto-Created** — After login, a Solana wallet address is assigned automatically
- [ ] **Wallet Visible** — Wallet address displayed in wallet button/header
- [ ] **Logout & Re-login** — Same wallet address returns on re-login (persistent)

---

## 2. HOME SCREEN FLOWS

- [ ] **Home Page Loads** — Songs, trending, or featured content visible
- [ ] **Buy Directly from Home Screen** — Find a "Buy" button or quick-buy on a song card on the home page
- [ ] **Buy Modal Opens** — QuickBuyModal or buy interface appears with price/amount
- [ ] **Token Price Displayed** — Price shown in SOL and/or USD
- [ ] **Transaction Succeeds** — After confirming buy, success toast/notification appears
- [ ] **Balance Updated** — Token balance reflects the purchase (check wallet/portfolio)

---

## 3. LAUNCH A TOKEN (PUMP.FUN FLOW)

- [ ] **Navigate to /create** — Launch page loads with form
- [ ] **Fill Song Details** — Enter song title, artist, genre, audio upload
- [ ] **Set Token Parameters** — Configure launch mode, initial price, bonding curve settings
- [ ] **Submit Song** — Click submit/launch
- [ ] **Submission Confirmation** — "Pending approval" or "Launched" confirmation shown
- [ ] **On-Chain Token Created** — (If auto-launch mode) SPL token minted on-chain via bonding curve
- [ ] **New Song Appears** — Song shows up on home page / discover / Hot100

---

## 4. SONG DETAIL PAGE — BUY & SELL

- [ ] **Open a Song Page** — Click any song to open /song/:songId
- [ ] **Song Info Visible** — Title, artist, audio player, price chart, token holders
- [ ] **Live Price Chart** — Bonding curve price chart renders (candlestick or line)
- [ ] **Buy on Song Page** — Open buy interface, enter amount, confirm transaction
- [ ] **Buy Succeeds** — Tokens credited to wallet, balance updates
- [ ] **Sell on Song Page** — Open SellModal, enter amount to sell, confirm
- [ ] **Sell Succeeds** — SOL credited back, token balance decreases
- [ ] **Price Updates After Trade** — Bonding curve price reflects the buy/sell
- [ ] **Trading Activity Feed** — Recent buys/sells shown in activity feed
- [ ] **Token Holders List** — Top holders displayed

---

## 5. MY TOKENS / PORTFOLIO

- [ ] **Navigate to /collection** — Portfolio/collection page loads
- [ ] **Owned Tokens Listed** — Songs/tokens you own appear with balances
- [ ] **Token Value Shown** — Current value of holdings displayed
- [ ] **Buy from Portfolio** — Quick-buy or link to buy more from portfolio view
- [ ] **Sell from Portfolio** — Sell button available on owned tokens

---

## 6. DISCOVER & BROWSE

- [ ] **Navigate to /discover** — Discover page loads with browseable songs
- [ ] **Search/Filter Works** — Can filter by genre, trending, new drops
- [ ] **Hot100 Page** (/hot100) — Rankings display correctly
- [ ] **New Drops Page** (/new-drops) — Recent launches shown
- [ ] **Artist Profile** (/artist/:address) — Public artist page loads with their songs and stats

---

## 7. MUSIC LISTENING

- [ ] **Play a Song** — Audio plays from song detail page
- [ ] **Now Playing Bar** — Bottom bar shows current song with play/pause/skip
- [ ] **Song Streams Recorded** — Stream count increases after listening
- [ ] **Listening History** — History updates with played songs

---

## 8. FIAT PURCHASE (SHOPIFY PACKS)

- [ ] **Pack Purchase Available** — Pack tiers visible (PackSection / PackBuyButtons)
- [ ] **Select a Pack** — Choose a pack tier (e.g., Standard, Premium)
- [ ] **Shopify Checkout Opens** — Redirected to Shopify checkout or draft order created
- [ ] **Complete Fiat Payment** — Pay with credit card / Apple Pay
- [ ] **Success Page** — Redirected to /shopify-success after payment
- [ ] **Token Airdrop** — Tokens airdropped to embedded wallet after fulfillment
- [ ] **NFT Minted** — Collectible NFT minted as part of pack fulfillment
- [ ] **Claim Flow** — If claim needed, /claim/:purchaseId flow works with email verification

---

## 9. WALLET

- [ ] **Navigate to /wallet** — Wallet page loads
- [ ] **Balance Shown** — SOL balance displayed
- [ ] **Token Balances** — All owned song tokens listed with amounts
- [ ] **Send SOL** — Can send SOL to another address (SendSolModal)
- [ ] **Receive** — Wallet address copyable for receiving
- [ ] **Buy Crypto** (/buy-crypto) — Onramp modal opens for purchasing SOL

---

## 10. COLLECTIBLES / NFTs

- [ ] **Navigate to /collectibles** — Collectibles page loads
- [ ] **NFTs Displayed** — Owned NFT collectibles shown
- [ ] **Edition Detail** (/edition/:editionId) — Individual NFT detail page loads
- [ ] **NFT Marketplace** (/nft-marketplace) — Browse available NFTs for sale

---

## 11. SOCIAL FEATURES

- [ ] **Navigate to /social** — Social/chat page loads
- [ ] **Arena Chat** — Can send messages in an arena chat
- [ ] **Reactions** — Can react to messages with emojis
- [ ] **Follow/Unfollow** — Follow an artist or user
- [ ] **Reposts** — Repost/share functionality works
- [ ] **Comments** — Comment on songs or content
- [ ] **Wishlist** — Add songs to wishlist

---

## 12. ARTIST FLOWS

- [ ] **Artist Setup** (/artist-setup) — Onboarding form loads and submits
- [ ] **Artist Dashboard** (/profile) — Dashboard shows earnings, song stats, pending submissions
- [ ] **Artist Earnings Tab** — Revenue/payout history visible
- [ ] **Create Edition** (/create-edition) — NFT edition creation form works
- [ ] **Artist Verified Badge** — Verified badge shows on approved artist profiles

---

## 13. ADMIN FLOWS (Admin Wallet Only)

- [ ] **Admin Page** (/admin) — Admin dashboard loads
- [ ] **Pending Songs** — List of pending song submissions visible
- [ ] **Approve Song** — Approve a pending song submission
- [ ] **Reject Song** — Reject with reason
- [ ] **Pending Orders** — Pack purchases awaiting wallet addresses listed
- [ ] **Manual Fulfill** — Manually fulfill a pending pack purchase
- [ ] **Failed Fulfillments** (/admin/failed-fulfillments) — Failed records visible
- [ ] **Retry Fulfillment** — Re-run a failed fulfillment
- [ ] **Pending Payouts** — List of pending artist SOL payouts
- [ ] **Retry Payout** — Retry a failed payout
- [ ] **Transaction Audits** — Audit log visible
- [ ] **Capture Mint** — Run capture-mint for songs missing mintAddress
- [ ] **Pack Dry-Run** — Admin dry-run test of pack fulfillment pipeline

---

## 14. CROSS-FLOW / EDGE CASES

- [ ] **Buy → Sell Same Song** — Buy tokens, then immediately sell them back
- [ ] **Multiple Buys** — Buy the same song token multiple times, balance accumulates
- [ ] **Buy on Home → Check Song Page** — Buy from home screen, verify balance shows on song detail page
- [ ] **Privy Login → Wallet Persists** — Log out, log back in, same wallet address returns
- [ ] **Token Price Movement** — Multiple buys push price up on bonding curve
- [ ] **Stream While Holding** — Listening to a song you hold tokens in works
- [ ] **Social + Trading** — Chat about a song while viewing its trading chart

---

## 15. MOBILE (If Testing on Phone)

- [ ] **Bottom Tab Bar** — All tabs visible and functional
- [ ] **Pull to Refresh** — Pull-to-refresh works on main pages
- [ ] **Responsive Layout** — Pages render correctly on small screens
- [ ] **Now Playing Bar** — Persists while navigating between pages
- [ ] **Mobile Nav Menu** — Hamburger menu opens and navigates

---

## NOTES / BUGS FOUND

| # | What Happened | Expected | Page/URL | Severity |
|---|---------------|----------|----------|----------|
| 1 |               |          |          |          |
| 2 |               |          |          |          |
| 3 |               |          |          |          |
| 4 |               |          |          |          |
| 5 |               |          |          |          |
| 6 |               |          |          |          |
| 7 |               |          |          |          |
| 8 |               |          |          |          |
| 9 |               |          |          |          |
| 10|               |          |          |          |

---

## FINAL SCORE

| Category | Passed | Failed | Skipped |
|----------|--------|--------|---------|
| Auth & Wallet | ____ / 6 | ____ | ____ |
| Home Screen | ____ / 6 | ____ | ____ |
| Launch Token | ____ / 8 | ____ | ____ |
| Song Buy/Sell | ____ / 9 | ____ | ____ |
| Portfolio | ____ / 5 | ____ | ____ |
| Discover | ____ / 5 | ____ | ____ |
| Listening | ____ / 4 | ____ | ____ |
| Fiat Purchase | ____ / 8 | ____ | ____ |
| Wallet | ____ / 6 | ____ | ____ |
| Collectibles | ____ / 4 | ____ | ____ |
| Social | ____ / 7 | ____ | ____ |
| Artist | ____ / 6 | ____ | ____ |
| Admin | ____ / 13| ____ | ____ |
| Cross-Flow | ____ / 7 | ____ | ____ |
| Mobile | ____ / 5 | ____ | ____ |
| **TOTAL** | **____ / 99** | **____** | **____** |
