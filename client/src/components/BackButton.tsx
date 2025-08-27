import { useLocation } from 'wouter';
import { ArrowLeft, Home } from 'lucide-react';
import { motion } from 'framer-motion';

interface BackButtonProps {
  fallbackPath?: string;
  className?: string;
  showHome?: boolean;
}

const BackButton = ({ fallbackPath = '/', className = '', showHome = false }: BackButtonProps) => {
  const [, navigate] = useLocation();

  const handleBack = () => {
    // Get the current path
    const currentPath = window.location.pathname;
    
    // Define navigation paths based on current location
    const navigationMap: Record<string, string> = {
      '/dashboard': '/',
      '/tracker': '/dashboard',
      '/ai-coach': '/dashboard',
      '/stats': '/dashboard',
      '/profile': '/dashboard',
      '/auth': '/',
    };
    
    // If we have a specific navigation path, use it
    if (navigationMap[currentPath]) {
      navigate(navigationMap[currentPath]);
      return;
    }
    
    // Fallback: try browser history, then go to fallback path
    if (window.history.length > 1) {
      try {
        window.history.back();
      } catch (error) {
        navigate(fallbackPath);
      }
    } else {
      navigate(fallbackPath);
    }
  };

  const handleHome = () => {
    navigate('/');
  };

  return (
    <div className={`flex gap-2 ${className}`}>
      <motion.button
        whileHover={{ scale: 1.05, y: -2 }}
        whileTap={{ scale: 0.95, y: 0 }}
        onClick={handleBack}
        className="btn btn-primary btn-sm gap-2 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: 'none',
          boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
        }}
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </motion.button>
      
      {showHome && (
        <motion.button
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95, y: 0 }}
          onClick={handleHome}
          className="btn btn-secondary btn-sm gap-2 shadow-xl hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
          style={{
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            border: 'none',
            boxShadow: '0 4px 15px rgba(240, 147, 251, 0.4)'
          }}
        >
          <Home className="w-4 h-4" />
          Home
        </motion.button>
      )}
    </div>
  );
};

export default BackButton;
