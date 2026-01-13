import { useState, useEffect, useCallback } from 'react';
import { AppProvider } from '@shopify/polaris';
import Dashboard from './components/Dashboard';
import ConnectScreen from './components/ConnectScreen';

// Get the Shopify API key (client_id) for this app
// Dynamically read from URL parameter, fallback to build-time env var
const getApiKey = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get('client_id') || import.meta.env.VITE_SHOPIFY_API_KEY;
};
const SHOPIFY_API_KEY = getApiKey();

function App() {
  const [shop, setShop] = useState(null);
  const [isEmbedded, setIsEmbedded] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDisconnected, setIsDisconnected] = useState(false);

  // Handle auth required - redirect to OAuth flow
  const handleAuthRequired = useCallback(() => {
    if (shop) {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      window.location.href = `${apiUrl}/auth?shop=${encodeURIComponent(shop)}&client_id=${encodeURIComponent(SHOPIFY_API_KEY)}`;
    }
  }, [shop]);

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
        const adminUrl = `https://${shopParam}/admin/apps/${SHOPIFY_API_KEY}`;
        window.location.href = adminUrl;
        return;
      }

      // Otherwise, redirect to auth to start OAuth
      // Pass client_id so backend can look up the correct app credentials
      const apiUrl = import.meta.env.VITE_API_URL || '';
      window.location.href = `${apiUrl}/auth?shop=${encodeURIComponent(shopParam)}&client_id=${encodeURIComponent(SHOPIFY_API_KEY)}`;
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
      <Dashboard shop={shop} installed={isInstalled} onAuthRequired={handleAuthRequired} />
    </AppProvider>
  );
}

export default App;
