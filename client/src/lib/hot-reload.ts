// Hot Reload Enhancement Utility
export const hotReloadConfig = {
  // Enable enhanced hot reload
  enableEnhancedHMR: true,
  
  // Custom error handling
  onError: (error: Error) => {
    console.error('🚨 Hot Reload Error:', error);
    // You can add custom error handling here
  },
  
  // Custom success handling
  onSuccess: (module: any) => {
    console.log('✅ Hot Reload Success:', module);
    // You can add custom success handling here
  },
  
  // Reload notification
  showReloadNotification: () => {
    if (typeof window !== 'undefined') {
      const notification = document.createElement('div');
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #10b981;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-weight: 600;
        z-index: 9999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideIn 0.3s ease-out;
      `;
      notification.textContent = '🔄 Hot Reload Complete!';
      document.body.appendChild(notification);
      
      setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-in';
        setTimeout(() => {
          document.body.removeChild(notification);
        }, 300);
      }, 2000);
    }
  }
};

// Add CSS animations for notifications
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(100%); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}

// Enhanced HMR handler
export const setupEnhancedHMR = () => {
  if (typeof window !== 'undefined' && import.meta.hot) {
    import.meta.hot.accept((newModule) => {
      if (newModule) {
        hotReloadConfig.onSuccess(newModule);
        hotReloadConfig.showReloadNotification();
      }
    });
    
    import.meta.hot.dispose(() => {
      // Cleanup when module is disposed
      console.log('🧹 Cleaning up module...');
    });
  }
};
