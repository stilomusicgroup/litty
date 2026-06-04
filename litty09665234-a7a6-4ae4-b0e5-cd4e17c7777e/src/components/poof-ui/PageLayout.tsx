import type { ReactNode } from 'react';

interface PageLayoutProps {
  children: ReactNode;
  /** Footer content — pass `false` to hide footer entirely */
  footer?: ReactNode | false;
  /** Background utility class: 'bg-grid-pattern', 'bg-dot-pattern', 'bg-gradient-spotlight', etc. */
  background?: string;
  /** Full-bleed mode removes the container constraint (useful for landing pages) */
  fullBleed?: boolean;
  className?: string;
}

export function PageLayout({
  children,
  footer,
  background = '',
  fullBleed = false,
  className = '',
}: PageLayoutProps) {
  return (
    <div className={`min-h-screen flex flex-col bg-background w-full ${background} ${className}`} style={{ maxWidth: '100%' }}>
      {/* ── Main content ── */}
      <main className='flex-1 relative w-full' style={{ overflowX: 'auto', overflowY: 'visible' }}>
        {fullBleed ? children : (
          <div className='container py-2 px-1 sm:px-4'>
            {children}
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      {footer !== false && (
        <footer className='relative border-t border-border/30'>
          <div className='absolute inset-0 bg-gradient-to-t from-background to-transparent pointer-events-none' />
          <div className='relative container py-8'>
            {footer || (
              <div className='text-center space-y-2'>
                <p className='text-xs text-muted-foreground/60'>
                  &copy; {new Date().getFullYear()} Lit Studios
                </p>
                <div className='flex items-center justify-center gap-4'>
                  <a href='/terms' className='text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors'>
                    Terms of Service
                  </a>
                  <a href='/privacy' className='text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors'>
                    Privacy Policy
                  </a>
                </div>
              </div>
            )}
          </div>
        </footer>
      )}

      {/* ── Legal Disclaimer ── */}
      <p className='text-center text-[10px] text-muted-foreground/50 border-t border-border/10 py-3 px-4'>
        Content removal from Lit Studios does not constitute deletion of on-chain assets. Lit Studios is not responsible for on-chain token activity after content removal.
      </p>
    </div>
  );
}
