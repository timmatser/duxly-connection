import { useState } from 'react';
import {
  Modal,
  Text,
  BlockStack,
  Banner,
  TextField,
} from '@shopify/polaris';
import { useSessionToken } from '../hooks/useSessionToken';

function DisconnectModal({ shop, open, onClose, onDisconnect }) {
  const { authenticatedFetch } = useSessionToken();

  const [confirmText, setConfirmText] = useState('');
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [error, setError] = useState(null);

  const storeName = shop ? shop.replace('.myshopify.com', '') : '';
  const isConfirmValid = confirmText.toLowerCase() === 'disconnect';

  const handleDisconnect = async () => {
    if (!isConfirmValid) return;

    setIsDisconnecting(true);
    setError(null);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      // Use authenticated fetch - shop is determined from session token on backend
      const response = await authenticatedFetch(`${apiUrl}/disconnect`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to disconnect store');
      }

      // Call the onDisconnect callback to handle redirect
      onDisconnect();
    } catch (err) {
      console.error('Disconnect error:', err);
      setError(err.message || 'An error occurred while disconnecting');
      setIsDisconnecting(false);
    }
  };

  const handleClose = () => {
    if (isDisconnecting) return; // Prevent closing while disconnecting
    setConfirmText('');
    setError(null);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Disconnect Store"
      primaryAction={{
        content: isDisconnecting ? 'Disconnecting...' : 'Disconnect Store',
        destructive: true,
        disabled: !isConfirmValid || isDisconnecting,
        loading: isDisconnecting,
        onAction: handleDisconnect,
      }}
      secondaryActions={[
        {
          content: 'Cancel',
          onAction: handleClose,
          disabled: isDisconnecting,
        },
      ]}
    >
      <Modal.Section>
        <BlockStack gap="400">
          <Banner status="critical" title="Warning: This action cannot be undone">
            <p>
              Disconnecting your store will permanently remove all API credentials
              and connection data. You will need to reinstall the app to reconnect.
            </p>
          </Banner>

          <BlockStack gap="200">
            <Text variant="bodyMd" as="p">
              You are about to disconnect <strong>{storeName}</strong> from Duxly.
              This will:
            </Text>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              <li>Remove your stored API credentials</li>
              <li>Delete cached store statistics</li>
              <li>Terminate the integration connection</li>
            </ul>
          </BlockStack>

          <TextField
            label={
              <Text variant="bodyMd" as="span">
                Type <strong>disconnect</strong> to confirm
              </Text>
            }
            value={confirmText}
            onChange={setConfirmText}
            placeholder="disconnect"
            autoComplete="off"
            disabled={isDisconnecting}
          />

          {error && (
            <Banner status="critical">
              <p>{error}</p>
            </Banner>
          )}
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}

export default DisconnectModal;
