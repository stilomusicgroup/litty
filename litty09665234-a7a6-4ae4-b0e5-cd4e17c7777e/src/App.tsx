import GlobalBackground from '@/components/GlobalBackground';
import { PullToRefresh } from '@/components/PullToRefresh';
import { BottomTabBar } from '@/components/BottomTabBar';
import TopNavBar from '@/components/TopNavBar';
import { MobileNavBar } from '@/components/MobileNavBar';
import { DesktopSidebar } from '@/components/DesktopSidebar';
import { MobileNavDropdown } from '@/components/MobileNavDropdown';
import { NavMenuProvider, useNavMenu } from '@/contexts/NavMenuContext';
import HomePage from '@/components/HomePage';
import { SocialPage } from '@/components/SocialPage';
import SongDetailPage from '@/components/SongDetailPage';
import CreatePage from '@/components/CreatePage';
import CollectionPage from '@/components/CollectionPage';
import ArtistProfilePage from '@/components/ArtistProfilePage';
import ShopifySuccessPage from '@/components/ShopifySuccessPage';
import TermsPage from '@/components/TermsPage';
import PrivacyPage from '@/components/PrivacyPage';
import Hot100Page from '@/components/Hot100Page';
import StreamPage from '@/components/StreamPage';
import DiscoverPage from '@/components/DiscoverPage';
import NFTBrowsePage from '@/components/NFTBrowsePage';
import ClaimPage from '@/components/ClaimPage';
import AdminPage from '@/components/AdminPage';
import AdminTrendingPage from '@/components/AdminTrendingPage';
import { SupportPage } from '@/components/SupportPage';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import FailedFulfillmentsPage from '@/components/FailedFulfillmentsPage';
import CollectiblesPage from '@/components/CollectiblesPage';
import EditionDetailPage from '@/components/EditionDetailPage';
import CreateEditionPage from '@/components/CreateEditionPage';
import BuyCryptoPage from '@/components/BuyCryptoPage';
import LaunchPage from '@/components/LaunchPage';
import AboutPage from '@/components/AboutPage';
import TokenomicsPage from '@/components/TokenomicsPage';
import TransparencyPage from '@/components/TransparencyPage';
import LitHubPage from '@/components/LitHubPage';
import FunHubPage from '@/components/FunHubPage';
import WalletPage from '@/components/WalletPage';
import SongTradePage from '@/components/SongTradePage';
import PnLPage from '@/components/PnLPage';
import NewDropsPage from '@/components/NewDropsPage';
import BeamUpPage from '@/components/BeamUpPage';
import LeaderboardPage from '@/components/LeaderboardPage';
import ArtistSetupPage from '@/components/ArtistSetupPage';
import ProfilePage from '@/components/ProfilePage';
import UsernameResolver from '@/components/UsernameResolver';
import AlbumVaultPage from '@/components/AlbumVaultPage';
import InstallPrompt from '@/components/InstallPrompt';
import NowPlayingBar from '@/components/NowPlayingBar';
import EndOfSessionModal from '@/components/EndOfSessionModal';
import StatusBar from '@/components/StatusBar';
import { PlayerProvider } from '@/contexts/PlayerContext';
import { TimeTabProvider } from '@/contexts/TimeTabContext';
import { useTimeTab } from '@/contexts/TimeTabContext';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider, useTheme } from '@/hooks/use-theme';
import { useIsMobile } from '@/hooks/use-mobile';
import { AnimatePresence, motion } from 'framer-motion';
import { JSX, useEffect, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { registerServiceWorker } from '@/utils/registerServiceWorker';
import { PrivyProviderWrapper } from '@/components/PrivyProviderWrapper';
import { OAuthProvider } from '@/contexts/OAuthContext';

// Redirects /arena/:artistAddress → /social?tab=arenas&arena=:artistAddress
function ArenaDirectPage() {
  const { artistAddress } = useParams<{ artistAddress: string }>();
  return <Navigate to={`/social?tab=arenas&arena=${artistAddress ?? ''}`} replace />;
}

// Redirects /trade/:songId → /song/:songId
function TradeRedirect() {
  const { songId } = useParams<{ songId: string }>();
  return <Navigate to={`/song/${songId ?? ''}`} replace />;
}

// Pages where the BottomTabBar should be hidden
const HIDE_TABBAR_PATTERNS = [
  /^\/claim\//,
  /^\/shopify-success/,
  /^\/terms/,
  /^\/buy-crypto/,
  /^\/profile\/.+/, // hide on public artist profile pages, but NOT on /profile itself
  /^\/artist-setup/,
  /^\/trade/,
];

// Timeframe tab type shared across app
export type TimeTab = '1H' | '1D' | '1W' | '1M' | '1Y' | 'ALL';

// Main tab paths in order — used to determine slide direction
const TAB_PATHS = ['/', '/stream', '/collectibles', '/collection', '/social', '/hub', '/profile'];

// Only animate transitions between main tabs
const TAB_ONLY_PATTERNS = [/^\/$/, /^\/stream$/, /^\/collectibles$/, /^\/collection$/, /^\/social$/, /^\/hub$/, /^\/profile$/];

function getTabIndex(pathname: string) {
  return TAB_PATHS.findIndex((p) => p === pathname);
}

function isTabPath(pathname: string) {
  return TAB_ONLY_PATTERNS.some((p) => p.test(pathname));
}

const tabVariants = {
  enterFromRight: { x: '30%', opacity: 0 },
  enterFromLeft: { x: '-30%', opacity: 0 },
  center: { x: 0, opacity: 1 },
  exitToLeft: { x: '-30%', opacity: 0 },
  exitToRight: { x: '30%', opacity: 0 },
};

const nonTabVariants = {
  initial: { x: '20%', opacity: 0 },
  center: { x: 0, opacity: 1 },
  exit: { x: '-10%', opacity: 0 },
};

function AppInner(): JSX.Element {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(false);
  const { close: closeMobileMenu } = useNavMenu();
  const { mode } = useTheme();
  const isMobile = useIsMobile();
  const location = useLocation();
  const [prevTabIndex, setPrevTabIndex] = useState<number>(() => getTabIndex(location.pathname));
  const [direction, setDirection] = useState<'left' | 'right'>('right');

  useEffect(() => {
    registerServiceWorker();
  }, []);

  const currentTabIndex = getTabIndex(location.pathname);
  const isTabTransition = isTabPath(location.pathname);

  // Track direction when tab changes
  useEffect(() => {
    if (isTabTransition && currentTabIndex >= 0) {
      if (prevTabIndex >= 0) {
        setDirection(currentTabIndex > prevTabIndex ? 'right' : 'left');
      }
      setPrevTabIndex(currentTabIndex);
    }
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const pageVariants = isTabTransition ? tabVariants : nonTabVariants;
  const pageInitial = isTabTransition
    ? (direction === 'right' ? 'enterFromRight' : 'enterFromLeft')
    : 'initial';
  const pageExit = isTabTransition
    ? (direction === 'right' ? 'exitToLeft' : 'exitToRight')
    : 'exit';
  const pageTransition = isTabTransition
    ? { duration: 0.22, ease: [0.32, 0.72, 0, 1] as const }
    : { duration: 0.15, ease: [0.32, 0.72, 0, 1] as const };

  // Close mobile menu on route change
  useEffect(() => {
    closeMobileMenu();
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // Plausible pageview tracking on route changes
  useEffect(() => {
    (window as any).plausible?.('pageview');
  }, [location.pathname]);

  const hideTabBar = HIDE_TABBAR_PATTERNS.some((p) => p.test(location.pathname));

  return (
    <>
      {/* Global cosmic background — fixed, covers all pages */}
      <GlobalBackground isDark={mode === 'dark'} />

      {/* CRT scanline overlay — purely decorative, never blocks interaction */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          pointerEvents: 'none',
          background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.04) 3px, rgba(0,0,0,0.04) 4px)',
          animation: 'crtScanroll 8s linear infinite',
          willChange: 'transform',
          opacity: mode === 'dark' ? 1 : 0.3,
        }}
      />

      <DesktopSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        desktopOpen={desktopSidebarOpen}
        onDesktopToggle={() => setDesktopSidebarOpen(prev => !prev)}
      />
      {/* Top navigation bar */}
      <TopNavBar />
      <MobileNavBar />
      {/* Global dropdown — uses NavMenuContext state */}
      <MobileNavDropdown />
      <div
        id='app-container'
        className='relative flex flex-col w-full min-h-[100dvh]'
        style={{
          opacity: 1,
          transition: 'margin-left 0.3s ease',
          pointerEvents: 'auto',
          maxWidth: '100%',
          overflowX: 'clip',
          // Only apply sidebar margin on desktop (md+), never on mobile
          marginLeft: (!isMobile && desktopSidebarOpen) ? '220px' : '0px',
        }}
      >
        <main id='app-main' className='flex-1 pt-16 md:pt-0 pb-[160px] md:pb-20' style={{ position: 'relative', overflowX: 'clip' }}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              variants={pageVariants}
              initial={pageInitial}
              animate="center"
              exit={pageExit}
              transition={pageTransition}
              style={{ width: '100%', minHeight: '100%' }}
            >
              <Routes location={location}>
                <Route path='/' element={<HomePage />} />
                <Route path='/song/:songId' element={<SongTradePage />} />
                <Route path='/create' element={<CreatePage />} />
                <Route path='/collection' element={<CollectionPage />} />
                <Route path='/artist/:address' element={<ProfilePage />} />
                <Route path='/shopify-success' element={<ShopifySuccessPage />} />
                <Route path='/terms' element={<TermsPage />} />
                <Route path='/privacy' element={<PrivacyPage />} />
                <Route path='/hot100' element={<Hot100Page />} />
                <Route path='/stream' element={<StreamPage />} />
                <Route path='/nft-marketplace' element={<NFTBrowsePage />} />
                <Route path='/claim/:purchaseId' element={<ClaimPage />} />
                <Route path='/admin' element={<AdminPage />} />
                <Route path='/admin/trending' element={<AdminTrendingPage />} />
                <Route path='/admin/failed-fulfillments' element={<FailedFulfillmentsPage />} />
                <Route path='/support' element={<SupportPage />} />
                <Route path='/collectibles' element={<CollectiblesPage />} />
                <Route path='/edition/:editionId' element={<EditionDetailPage />} />
                <Route path='/create-edition' element={<CreateEditionPage />} />
                <Route path='/buy-crypto' element={<BuyCryptoPage />} />
                <Route path='/discover' element={<DiscoverPage />} />
                <Route path='/launch' element={<LaunchPage />} />
                <Route path='/playlist/:playlistId' element={<Navigate to="/stream" replace />} />
                <Route path='/social' element={<SocialPage />} />
                <Route path='/arena/:artistAddress' element={<ArenaDirectPage />} />
                <Route path='/about' element={<AboutPage />} />
                <Route path='/tokenomics' element={<TokenomicsPage />} />
                <Route path='/hub' element={<FunHubPage />} />
                <Route path='/wallet/:address?' element={<WalletPage />} />
                <Route path='/new-drops' element={<NewDropsPage />} />
                <Route path='/beam-up' element={<BeamUpPage />} />
                <Route path='/leaderboard' element={<LeaderboardPage />} />
                <Route path='/gm-chat' element={<LitHubPage />} />
                <Route path='/profile' element={<ProfilePage />} />
                <Route path='/profile/:address' element={<ProfilePage />} />
                <Route path='/u/:username' element={<UsernameResolver />} />
                <Route path='/artist-dashboard' element={<ProfilePage />} />
                <Route path='/artist-setup' element={<ArtistSetupPage />} />
                <Route path='/album/:albumId/vault' element={<AlbumVaultPage />} />
                <Route path='/transparency' element={<Navigate to="/about" replace />} />
                <Route path='/trade/:songId' element={<TradeRedirect />} />
                <Route path='/trade' element={<Navigate to="/stream" replace />} />
                <Route path='/pnl' element={<PnLPage />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </main>

        <NowPlayingBar />
        <EndOfSessionModal />
        {!hideTabBar && <BottomTabBar />}
        <InstallPrompt />
        <Toaster />
        <StatusBar />
      </div>
    </>
  );
}

function App(): JSX.Element {
  return (
    <ErrorBoundary>
      <PrivyProviderWrapper>
        <ThemeProvider>
          <PlayerProvider>
            <NavMenuProvider>
              <TimeTabProvider>
                <OAuthProvider>
                  <PullToRefresh>
                    <AppInner />
                  </PullToRefresh>
                </OAuthProvider>
              </TimeTabProvider>
            </NavMenuProvider>
          </PlayerProvider>
        </ThemeProvider>
      </PrivyProviderWrapper>
    </ErrorBoundary>
  );
}

export default App;
