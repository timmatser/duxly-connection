import { useState, useEffect } from 'react';
import { AppProvider } from '@shopify/polaris';
import Dashboard from './components/Dashboard';
import ConnectScreen from './components/ConnectScreen';

// App identifier for multi-app support
// Each frontend deployment has its own VITE_APP_ID baked in at build time
const APP_ID = import.meta.env.VITE_APP_ID || 'duxly-connection';

function App() {
  const [shop, setShop] = useState(null);
  const [isEmbedded, setIsEmbedded] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDisconnected, setIsDisconnected] = useState(false);

  useEffect(() => {
    // Get shop and host from URL parameters
    const params = new URLSearchParams(window.location.search);
    const shopParam = params.get('shop');
    const host = params.get('host');
    const installed = params.get('installed');
    const disconnected = params.get('disconnected');

    if (disconnected === 'true') {
      setIsDisconnected(true);
      return;
    }

    // If host is present, app is loaded embedded from Shopify admin
    // App Bridge CDN auto-initializes using the host param and API key from meta tag
    if (host) {
      setShop(shopParam);
      setIsEmbedded(true);
      return;
    }

    // If shop is present but no host, this is the initial installation flow
    if (shopParam) {
      // If already installed (coming back from OAuth callback), redirect to embedded admin
      if (installed === 'true') {
        // Redirect to Shopify admin to load app in embedded context
        const adminUrl = `https://${shopParam}/admin/apps/${import.meta.env.VITE_SHOPIFY_API_KEY}`;
        window.location.href = adminUrl;
        return;
      }

      // Otherwise, redirect to auth to start OAuth
      // Pass app parameter for multi-app credential loading
      const apiUrl = import.meta.env.VITE_API_URL || '';
      window.location.href = `${apiUrl}/auth?shop=${encodeURIComponent(shopParam)}&app=${encodeURIComponent(APP_ID)}`;
    }
  }, []);

  // Show disconnect success screen
  if (isDisconnected) {
    return (
      <AppProvider>
        <ConnectScreen isDisconnected={true} />
      </AppProvider>
    );
  }

  // Show connect screen when not embedded
  if (!isEmbedded) {
    return (
      <AppProvider>
        <ConnectScreen />
      </AppProvider>
    );
  }

  // App is embedded - App Bridge CDN is auto-initialized
  return (
    <AppProvider>
      <Dashboard shop={shop} installed={isInstalled} />
    </AppProvider>
  );
}

export default App;
