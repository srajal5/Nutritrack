import { useState } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 bg-white shadow-md z-10">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M14.243 5.757a6 6 0 10-.986 9.284 1 1 0 111.087 1.678A8 8 0 1118 10a3 3 0 01-3.757-4.243z" clipRule="evenodd" />
          </svg>
          <h1 className="font-heading font-bold text-2xl ml-2 text-neutral-900">NutriTrack<span className="text-primary">AI</span></h1>
        </div>

        <nav className="hidden md:flex space-x-6">
          <a href="#home" className="text-primary font-medium hover:text-primary-dark transition-colors">Home</a>
          <a href="#tracker" className="text-neutral-800 font-medium hover:text-primary transition-colors">Tracker</a>
          <a href="#ai-chat" className="text-neutral-800 font-medium hover:text-primary transition-colors">AI Coach</a>
          <a href="#stats" className="text-neutral-800 font-medium hover:text-primary transition-colors">Stats</a>
        </nav>

        <div className="flex items-center space-x-4">
          <Link href="/auth">
            <Button 
              variant="default"
              className="hidden md:block bg-primary hover:bg-primary-dark transition-colors"
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
        <div className="md:hidden py-3 px-4 bg-white border-t border-gray-100">
          <nav className="flex flex-col space-y-3">
            <a href="#home" className="text-primary font-medium hover:text-primary-dark transition-colors py-2">Home</a>
            <a href="#tracker" className="text-neutral-800 font-medium hover:text-primary transition-colors py-2">Tracker</a>
            <a href="#ai-chat" className="text-neutral-800 font-medium hover:text-primary transition-colors py-2">AI Coach</a>
            <a href="#stats" className="text-neutral-800 font-medium hover:text-primary transition-colors py-2">Stats</a>
            <Link href="/auth">
              <Button className="bg-primary hover:bg-primary-dark transition-colors mt-2 w-full">
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
