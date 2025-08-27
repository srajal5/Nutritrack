import { useState } from 'react';
import BackButton from './BackButton';

const BackButtonTest = () => {
  const [currentPage, setCurrentPage] = useState('home');

  const navigateTo = (page: string) => {
    setCurrentPage(page);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return (
          <div className="p-8 text-center">
            <h1 className="text-3xl font-bold mb-4">Home Page</h1>
            <p className="mb-6">This is the home page. Navigate to other pages to test the back button.</p>
            <div className="space-y-2">
              <button 
                onClick={() => navigateTo('dashboard')}
                className="btn btn-primary mr-2"
              >
                Go to Dashboard
              </button>
              <button 
                onClick={() => navigateTo('tracker')}
                className="btn btn-secondary mr-2"
              >
                Go to Tracker
              </button>
              <button 
                onClick={() => navigateTo('ai-coach')}
                className="btn btn-accent"
              >
                Go to AI Coach
              </button>
            </div>
          </div>
        );
      
      case 'dashboard':
        return (
          <div className="p-8 text-center">
            <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
            <p className="mb-6">This is the dashboard page.</p>
            <BackButton fallbackPath="/" />
            <div className="mt-4">
              <button 
                onClick={() => navigateTo('tracker')}
                className="btn btn-primary mr-2"
              >
                Go to Tracker
              </button>
              <button 
                onClick={() => navigateTo('home')}
                className="btn btn-secondary"
              >
                Go to Home
              </button>
            </div>
          </div>
        );
      
      case 'tracker':
        return (
          <div className="p-8 text-center">
            <h1 className="text-3xl font-bold mb-4">Tracker</h1>
            <p className="mb-6">This is the tracker page.</p>
            <BackButton fallbackPath="/dashboard" />
            <div className="mt-4">
              <button 
                onClick={() => navigateTo('ai-coach')}
                className="btn btn-primary mr-2"
              >
                Go to AI Coach
              </button>
              <button 
                onClick={() => navigateTo('dashboard')}
                className="btn btn-secondary"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        );
      
      case 'ai-coach':
        return (
          <div className="p-8 text-center">
            <h1 className="text-3xl font-bold mb-4">AI Coach</h1>
            <p className="mb-6">This is the AI Coach page.</p>
            <BackButton fallbackPath="/dashboard" />
            <div className="mt-4">
              <button 
                onClick={() => navigateTo('tracker')}
                className="btn btn-primary mr-2"
              >
                Go to Tracker
              </button>
              <button 
                onClick={() => navigateTo('dashboard')}
                className="btn btn-secondary"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-base-100">
      <div className="navbar bg-base-200 shadow-lg">
        <div className="flex-1">
          <h2 className="text-xl font-bold">Back Button Test</h2>
        </div>
        <div className="flex-none">
          <button 
            onClick={() => navigateTo('home')}
            className="btn btn-ghost"
          >
            Reset to Home
          </button>
        </div>
      </div>
      
      {renderPage()}
    </div>
  );
};

export default BackButtonTest;
