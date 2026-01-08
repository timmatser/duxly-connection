import { useState, useEffect } from 'react';
import { Provider as AppBridgeProvider } from '@shopify/app-bridge-react';
import { AppProvider } from '@shopify/polaris';
import Dashboard from './components/Dashboard';
import ConnectScreen from './components/ConnectScreen';

function App() {
  const [config, setConfig] = useState(null);
  const [isDisconnected, setIsDisconnected] = useState(false);

  useEffect(() => {
    // Get shop and host from URL parameters
    const params = new URLSearchParams(window.location.search);
    const shop = params.get('shop');
    const host = params.get('host');
    const installed = params.get('installed');
    const disconnected = params.get('disconnected');

    if (disconnected === 'true') {
      setIsDisconnected(true);
      return;
    }

    if (shop) {
      setConfig({
        apiKey: import.meta.env.VITE_SHOPIFY_API_KEY || '',
        host: host || window.btoa(`${shop}/admin`),
        shop: shop,
        forceRedirect: false,
        installed: installed === 'true',
      });
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
        <Dashboard shop={config.shop} installed={config.installed} />
      </AppProvider>
    </AppBridgeProvider>
  );
}

export default App;
