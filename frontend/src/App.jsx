import { useState, useEffect } from 'react';
import { Provider as AppBridgeProvider } from '@shopify/app-bridge-react';
import { AppProvider } from '@shopify/polaris';
import Dashboard from './components/Dashboard';
import ConnectScreen from './components/ConnectScreen';

function App() {
  const [config, setConfig] = useState(null);
  const [shop, setShop] = useState(null);
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
    if (host) {
      setShop(shopParam);
      setConfig({
        apiKey: import.meta.env.VITE_SHOPIFY_API_KEY || '',
        host: host,
      });
      return;
    }

    // If shop is present but no host, this is the initial installation flow
    if (shopParam) {
      // If already installed (coming back from OAuth callback), set up config
      if (installed === 'true') {
        setShop(shopParam);
        setIsInstalled(true);
        setConfig({
          apiKey: import.meta.env.VITE_SHOPIFY_API_KEY || '',
          host: window.btoa(`${shopParam}/admin`),
        });
        return;
      }

      // Otherwise, redirect to auth to start OAuth
      const apiUrl = import.meta.env.VITE_API_URL || '';
      window.location.href = `${apiUrl}/auth?shop=${encodeURIComponent(shopParam)}`;
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

  if (!config) {
    return (
      <AppProvider>
        <ConnectScreen />
      </AppProvider>
    );
  }

  return (
    <AppBridgeProvider config={config}>
      <AppProvider>
        <Dashboard shop={shop} installed={isInstalled} />
      </AppProvider>
    </AppBridgeProvider>
  );
}

export default App;
