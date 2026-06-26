import { useState, useCallback, useMemo } from 'react';
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
  Tabs,
} from '@shopify/polaris';
import {
  ChatIcon,
  BookIcon,
  ExitIcon,
} from '@shopify/polaris-icons';
import DashboardHeader from './DashboardHeader';
import ConnectionIndicator from './ConnectionIndicator';
import StatsGrid from './StatsGrid';
import OnboardingTimeline from './OnboardingTimeline';
import DisconnectModal from './DisconnectModal';
import SecurityBadge from './SecurityBadge';
import LandscapeTab from './LandscapeTab';
import DocumentationTab from './DocumentationTab';
import { getAppContent } from '../config/appContent';

function Dashboard({ shop, clientId, installed, onAuthRequired }) {
  // Connection status - could be 'connected', 'syncing', or 'disconnected'
  const connectionStatus = 'connected';

  // Per-client documentation + landscape content, keyed by client_id
  const content = useMemo(() => getAppContent(clientId), [clientId]);

  // Build the tab list dynamically — only show tabs that have content
  const tabs = useMemo(() => {
    const list = [{ id: 'overview', content: 'Overview' }];
    if (content.landscape) list.push({ id: 'landscape', content: "What's running" });
    if (content.documentation) list.push({ id: 'documentation', content: 'Documentation' });
    return list.map((t) => ({ ...t, accessibilityLabel: t.content, panelID: `${t.id}-panel` }));
  }, [content]);

  const [selectedTab, setSelectedTab] = useState(0);
  const handleTabChange = useCallback((index) => setSelectedTab(index), []);

  // Disconnect modal state
  const [isDisconnectModalOpen, setIsDisconnectModalOpen] = useState(false);
  const handleOpenDisconnectModal = useCallback(() => setIsDisconnectModalOpen(true), []);
  const handleCloseDisconnectModal = useCallback(() => setIsDisconnectModalOpen(false), []);

  const handleDisconnect = useCallback(() => {
    window.location.href = window.location.origin + '?disconnected=true';
  }, []);

  const handleChatWithSupport = () => {
    window.open('mailto:support@duxly.nl', '_blank');
  };

  // "Read Documentation" jumps to the in-app Documentation tab when available,
  // otherwise falls back to the external docs site.
  const handleReadDocumentation = useCallback(() => {
    const docIndex = tabs.findIndex((t) => t.id === 'documentation');
    if (docIndex >= 0) {
      setSelectedTab(docIndex);
    } else {
      window.open('https://docs.duxly.com', '_blank');
    }
  }, [tabs]);

  const activeTabId = tabs[selectedTab]?.id ?? 'overview';

  const overview = (
    <Layout>
      <Layout.Section>
        {installed && (
          <Banner title="Installation successful!" status="success" onDismiss={() => {}}>
            <p>
              Your Shopify store has been successfully connected to Duxly. Your API credentials
              have been securely stored.
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
              <Button variant="primary" icon={ChatIcon} onClick={handleChatWithSupport}>
                Chat with Support
              </Button>
              <Button variant="secondary" icon={BookIcon} onClick={handleReadDocumentation}>
                Read Documentation
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
  );

  return (
    <Page>
      <DashboardHeader shop={shop} />

      <Tabs tabs={tabs} selected={selectedTab} onSelect={handleTabChange}>
        <Box paddingBlockStart="400">
          {activeTabId === 'overview' && overview}
          {activeTabId === 'landscape' && (
            <LandscapeTab landscape={content.landscape} storeName={content.name} />
          )}
          {activeTabId === 'documentation' && (
            <DocumentationTab documentation={content.documentation} />
          )}
        </Box>
      </Tabs>

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
