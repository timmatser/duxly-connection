import { BlockStack, InlineStack, Text, Badge, Box } from '@shopify/polaris';
import { parseStoreName } from '../utils/parseStoreName';

/**
 * Generates initials from a store name for fallback avatar
 */
function getInitials(name) {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * StoreLogo component - displays merchant store logo or fallback
 */
function StoreLogo({ shop, size = 64 }) {
  const storeName = parseStoreName(shop);
  const initials = getInitials(storeName);

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '12px',
        backgroundColor: '#F3F4F6',
        border: '2px solid #E5E7EB',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        fontSize: size * 0.35,
        color: '#6B7280',
        flexShrink: 0,
      }}
      title={storeName}
    >
      {initials}
    </div>
  );
}

/**
 * DuxlyIconLogo component - compact icon version for connection indicator
 */
function DuxlyIconLogo({ size = 64 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '12px',
        backgroundColor: '#4F46E5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <svg
        width={size * 0.6}
        height={size * 0.6}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M4 6h12c2.2 0 4 1.8 4 4v4c0 2.2-1.8 4-4 4H4V6z"
          fill="#818CF8"
        />
        <circle cx="12" cy="12" r="4" fill="white" />
      </svg>
    </div>
  );
}

/**
 * Animated connection line between logos
 */
function ConnectionLine({ status }) {
  const isConnected = status === 'connected';
  const isSyncing = status === 'syncing';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        minWidth: '60px',
        maxWidth: '120px',
        height: '40px',
        position: 'relative',
      }}
    >
      {/* Connection line */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          height: '3px',
          backgroundColor: isConnected ? '#22C55E' : '#E5E7EB',
          borderRadius: '2px',
          transition: 'background-color 0.3s ease',
        }}
      />

      {/* Animated pulse for syncing */}
      {isSyncing && (
        <div
          style={{
            position: 'absolute',
            width: '12px',
            height: '12px',
            backgroundColor: '#F59E0B',
            borderRadius: '50%',
            animation: 'pulse 1.5s ease-in-out infinite, moveLeft 2s ease-in-out infinite',
          }}
        />
      )}

      {/* Checkmark for connected */}
      {isConnected && (
        <div
          style={{
            width: '28px',
            height: '28px',
            backgroundColor: '#22C55E',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(34, 197, 94, 0.4)',
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M13.5 4.5L6 12L2.5 8.5"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}

      {/* CSS animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.8; }
        }
        @keyframes moveLeft {
          0%, 100% { left: 10%; }
          50% { left: 80%; }
        }
      `}</style>
    </div>
  );
}

/**
 * ConnectionIndicator component
 * Visual "handshake" representation between merchant store and Duxly
 */
function ConnectionIndicator({ shop, status = 'connected' }) {
  const storeName = parseStoreName(shop);

  const statusConfig = {
    connected: {
      label: 'Connected',
      tone: 'success',
    },
    syncing: {
      label: 'Syncing',
      tone: 'warning',
    },
    disconnected: {
      label: 'Disconnected',
      tone: 'critical',
    },
  };

  const currentStatus = statusConfig[status] || statusConfig.connected;

  return (
    <Box
      padding="500"
      background="bg-surface"
      borderRadius="300"
      borderColor="border"
      borderWidth="025"
    >
      <BlockStack gap="400" align="center">
        {/* Connection visual */}
        <InlineStack gap="400" align="center" blockAlign="center">
          {/* Merchant Store (left) */}
          <BlockStack gap="200" align="center">
            <StoreLogo shop={shop} size={64} />
            <Text variant="bodySm" tone="subdued" alignment="center">
              {storeName}
            </Text>
          </BlockStack>

          {/* Connection line with status */}
          <ConnectionLine status={status} />

          {/* Duxly (right) */}
          <BlockStack gap="200" align="center">
            <DuxlyIconLogo size={64} />
            <Text variant="bodySm" tone="subdued" alignment="center">
              Duxly
            </Text>
          </BlockStack>
        </InlineStack>

        {/* Status badge */}
        <Badge tone={currentStatus.tone}>
          {currentStatus.label}
        </Badge>
      </BlockStack>
    </Box>
  );
}

export default ConnectionIndicator;
