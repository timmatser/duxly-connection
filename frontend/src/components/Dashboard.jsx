import { useState, useCallback } from 'react';
import {
  Page,
  Layout,
  Card,
  Text,
  Banner,
  BlockStack,
  InlineStack,
  Button,
  Box,
  Divider,
} from '@shopify/polaris';
import {
  ChatIcon,
  BookIcon,
  SettingsIcon,
  ExitIcon,
} from '@shopify/polaris-icons';
import DashboardHeader from './DashboardHeader';
import ConnectionIndicator from './ConnectionIndicator';
import StatsGrid from './StatsGrid';
import OnboardingTimeline from './OnboardingTimeline';
import DisconnectModal from './DisconnectModal';
import SecurityBadge from './SecurityBadge';

function Dashboard({ shop, installed, onAuthRequired }) {
  // Connection status - could be 'connected', 'syncing', or 'disconnected'
  const connectionStatus = 'connected';

  // Disconnect modal state
  const [isDisconnectModalOpen, setIsDisconnectModalOpen] = useState(false);

  const handleOpenDisconnectModal = useCallback(() => {
    setIsDisconnectModalOpen(true);
  }, []);

  const handleCloseDisconnectModal = useCallback(() => {
    setIsDisconnectModalOpen(false);
  }, []);

  const handleDisconnect = useCallback(() => {
    // Redirect to the app install page (removes shop param to show "connect" state)
    // This effectively shows the "Please access this app from your Shopify admin" message
    window.location.href = window.location.origin + '?disconnected=true';
  }, []);

  // Action handlers
  const handleChatWithSupport = () => {
    // Opens support chat or redirects to support page
    window.open('mailto:support@duxly.nl', '_blank');
  };

  const handleReadDocumentation = () => {
    // Opens documentation in new tab
    window.open('https://docs.duxly.com', '_blank');
  };

  const handleConfigureSettings = () => {
    // Navigate to settings page (placeholder for now)
    console.log('Navigate to settings');
  };

  return (
    <Page>
      <DashboardHeader shop={shop} />
      <Layout>
        <Layout.Section>
          {installed && (
            <Banner
              title="Installation successful!"
              status="success"
              onDismiss={() => {}}
            >
              <p>
                Your Shopify store has been successfully connected to Duxly.
                Your API credentials have been securely stored.
              </p>
            </Banner>
          )}
        </Layout.Section>

        <Layout.Section>
          <ConnectionIndicator shop={shop} status={connectionStatus} />
        </Layout.Section>

        {/* Store Statistics */}
        <Layout.Section>
          <StatsGrid shop={shop} onAuthRequired={onAuthRequired} />
        </Layout.Section>

        {/* Action Buttons Section */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                Quick Actions
              </Text>
              <InlineStack gap="300" wrap={true}>
                <Button
                  variant="primary"
                  icon={ChatIcon}
                  onClick={handleChatWithSupport}
                >
                  Chat with Support
                </Button>
                <Button
                  variant="secondary"
                  icon={BookIcon}
                  onClick={handleReadDocumentation}
                >
                  Read Documentation
                </Button>
                <Button
                  variant="secondary"
                  icon={SettingsIcon}
                  onClick={handleConfigureSettings}
                >
                  Configure Settings
                </Button>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* Integration Progress Timeline */}
        <Layout.Section>
          <OnboardingTimeline currentStep="active" />
        </Layout.Section>

        {/* Security Badge */}
        <Layout.Section>
          <Divider />
          <SecurityBadge />
        </Layout.Section>

        {/* Danger Zone - Connection Management */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Box>
                <InlineStack align="space-between" blockAlign="center">
                  <BlockStack gap="100">
                    <Text variant="headingMd" as="h2" tone="critical">
                      Danger Zone
                    </Text>
                    <Text variant="bodySm" as="p" tone="subdued">
                      Irreversible actions that affect your integration
                    </Text>
                  </BlockStack>
                </InlineStack>
              </Box>
              <Divider />
              <InlineStack align="space-between" blockAlign="center" gap="400">
                <BlockStack gap="100">
                  <Text variant="bodyMd" as="p" fontWeight="semibold">
                    Disconnect Store
                  </Text>
                  <Text variant="bodySm" as="p" tone="subdued">
                    Remove all credentials and disconnect this store from Duxly
                  </Text>
                </BlockStack>
                <Button
                  variant="primary"
                  tone="critical"
                  icon={ExitIcon}
                  onClick={handleOpenDisconnectModal}
                >
                  Disconnect Store
                </Button>
              </InlineStack>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>

      {/* Disconnect Confirmation Modal */}
      <DisconnectModal
        shop={shop}
        open={isDisconnectModalOpen}
        onClose={handleCloseDisconnectModal}
        onDisconnect={handleDisconnect}
      />
    </Page>
  );
}

export default Dashboard;
