import { useState } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAuth } from '@/hooks/use-auth';
import BrandLogo from '@/components/BrandLogo';

/**
 * Public (signed-out) site navigation.
 *
 * Navbar — the authenticated navigation — is mounted globally in App and gates
 * itself with `if (!user) return null`. This header had no matching gate, so a
 * signed-in user visiting the landing page saw BOTH navigation bars stacked.
 * Each navigation now declares its own audience, so exactly one ever renders.
 */
const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user } = useAuth();

  // Authenticated users get Navbar instead.
  if (user) return null;

  return (
    <header className="sticky top-0 glass border-b border-border shadow-sm z-10 theme-transition">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center">
          <BrandLogo />
        </div>

        <nav className="hidden md:flex space-x-6">
          <Link href="/" className="text-primary font-medium hover:text-primary/80 transition-colors">Home</Link>
          <Link href="/tracker" className="text-foreground font-medium hover:text-primary transition-colors">Tracker</Link>
          <Link href="/ai-coach" className="text-foreground font-medium hover:text-primary transition-colors">AI Coach</Link>
          <Link href="/stats" className="text-foreground font-medium hover:text-primary transition-colors">Stats</Link>
        </nav>

        <div className="flex items-center space-x-4">
          <ThemeToggle />
          <Link href="/auth">
            <Button 
              variant="default"
              className="hidden md:block bg-primary hover:bg-primary/90 transition-colors"
            >
              Sign In
            </Button>
          </Link>
          <button 
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
      
      {mobileMenuOpen && (
        <div className="md:hidden py-3 px-4 glass border-t border-border theme-transition">
                      <nav className="flex flex-col space-y-3">
              <Link href="/" className="text-primary font-medium hover:text-primary/80 transition-colors py-2">Home</Link>
              <Link href="/tracker" className="text-foreground font-medium hover:text-primary transition-colors py-2">Tracker</Link>
              <Link href="/ai-coach" className="text-foreground font-medium hover:text-primary transition-colors py-2">AI Coach</Link>
              <Link href="/stats" className="text-foreground font-medium hover:text-primary transition-colors py-2">Stats</Link>
              <Link href="/auth">
                <Button className="bg-primary hover:bg-primary/90 transition-colors mt-2 w-full">
                  Sign In
                </Button>
              </Link>
            </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
