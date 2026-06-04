import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wallet } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { useAuth } from '@/hooks/use-privy-auth';

const HEADLINE_GREEN = '#00FF41';
const CTA_GREEN = '#00FF41';

interface ProfileSignInSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileSignInSheet({ open, onOpenChange }: ProfileSignInSheetProps) {
  const { login, user, loading } = useAuth();

  // Close sheet after successful login
  useEffect(() => {
    if (user && open) {
      onOpenChange(false);
    }
  }, [user, open, onOpenChange]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="bg-black border-t border-[#00FF41]/20 rounded-t-3xl px-6 pt-6 pb-8"
        style={{
          boxShadow: '0 -8px 40px rgba(0, 255, 65, 0.1)',
          maxHeight: '50vh',
        }}
      >
        <SheetHeader className="space-y-3 pb-2">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-2"
            style={{
              background: 'linear-gradient(135deg, rgba(0, 255, 65, 0.15), transparent)',
              border: '1px solid rgba(0, 255, 65, 0.3)',
              boxShadow: '0 0 24px rgba(0, 255, 65, 0.15)',
            }}
          >
            <Wallet size={24} style={{ color: HEADLINE_GREEN }} />
          </div>
          <SheetTitle
            className="text-center text-xl font-black"
            style={{
              color: HEADLINE_GREEN,
              fontFamily: "'Archivo Black', monospace",
              textShadow: '0 0 12px rgba(0, 255, 65, 0.4)',
            }}
          >
            Sign In to View Profile
          </SheetTitle>
          <SheetDescription
            className="text-center text-xs"
            style={{
              color: 'rgba(255,255,255,0.5)',
              fontFamily: "'Inter', sans-serif",
            }}
          >
            Connect your Phantom wallet to access your artist profile, collections, and more.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 flex flex-col gap-3">
          <motion.button
            onClick={() => login()}
            disabled={loading}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="w-full h-12 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
            style={{
              background: CTA_GREEN,
              color: '#000',
              fontFamily: "'Archivo Black', monospace",
              letterSpacing: '0.06em',
              boxShadow: '0 0 20px rgba(0, 255, 65, 0.3)',
            }}
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : (
              <>
                <Wallet size={16} />
                Connect Wallet
              </>
            )}
          </motion.button>

          <button
            onClick={() => onOpenChange(false)}
            className="w-full py-2 text-xs font-medium transition-colors"
            style={{
              color: 'rgba(255,255,255,0.4)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Maybe later
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default ProfileSignInSheet;
