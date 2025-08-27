// Development Configuration for Enhanced Hot Reload
export const devConfig = {
  // Hot reload settings
  hotReload: {
    enabled: true,
    fastRefresh: true,
    overlay: true,
    port: 5173,
  },
  
  // Development features
  features: {
    errorBoundary: true,
    performanceMonitoring: true,
    debugMode: true,
  },
  
  // Console logging
  logging: {
    hotReload: true,
    errors: true,
    warnings: true,
    performance: false,
  },
  
  // Development shortcuts
  shortcuts: {
    reload: 'Ctrl+R',
    hardReload: 'Ctrl+Shift+R',
    devTools: 'F12',
  }
};

// Development utilities
export const devUtils = {
  // Force reload the page
  forceReload: () => {
    window.location.reload();
  },
  
  // Hard reload (clear cache)
  hardReload: () => {
    window.location.reload(true);
  },
  
  // Log development info
  logDevInfo: () => {
    console.log('🚀 Development Mode Active');
    console.log('📱 Hot Reload:', devConfig.hotReload.enabled ? '✅ Enabled' : '❌ Disabled');
    console.log('🔧 Fast Refresh:', devConfig.hotReload.fastRefresh ? '✅ Enabled' : '❌ Disabled');
    console.log('📊 Performance Monitoring:', devConfig.features.performanceMonitoring ? '✅ Enabled' : '❌ Disabled');
  },
  
  // Setup development keyboard shortcuts
  setupDevShortcuts: () => {
    if (typeof window !== 'undefined') {
      document.addEventListener('keydown', (e) => {
        // Ctrl+Shift+R for hard reload
        if (e.ctrlKey && e.shiftKey && e.key === 'R') {
          e.preventDefault();
          devUtils.hardReload();
        }
        
        // Ctrl+Shift+D for dev info
        if (e.ctrlKey && e.shiftKey && e.key === 'D') {
          e.preventDefault();
          devUtils.logDevInfo();
        }
      });
    }
  }
};

// Initialize development features
export const initDevFeatures = () => {
  if (import.meta.env.DEV) {
    devUtils.logDevInfo();
    devUtils.setupDevShortcuts();
    
    // Add development indicator
    if (typeof document !== 'undefined') {
      const devIndicator = document.createElement('div');
      devIndicator.style.cssText = `
        position: fixed;
        bottom: 10px;
        left: 10px;
        background: #ef4444;
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: bold;
        z-index: 9999;
        pointer-events: none;
      `;
      devIndicator.textContent = 'DEV';
      document.body.appendChild(devIndicator);
    }
  }
};
