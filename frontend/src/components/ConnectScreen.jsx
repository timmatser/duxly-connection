import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineStack,
  Banner,
  Box,
} from '@shopify/polaris';
import DuxlyLogo from './DuxlyLogo';

function ConnectScreen({ isDisconnected = false }) {
  return (
    <Page>
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="600" align="center">
              <Box padding="400">
                <InlineStack align="center">
                  <DuxlyLogo width={180} />
                </InlineStack>
              </Box>

              {isDisconnected && (
                <Banner status="success" title="Store Disconnected">
                  <p>
                    Your store has been successfully disconnected from Duxly.
                    All credentials have been removed.
                  </p>
                </Banner>
              )}

              <BlockStack gap="300" align="center">
                <Text variant="heading2xl" as="h1" alignment="center">
                  {isDisconnected ? 'Reconnect to Duxly' : 'Connect to Duxly'}
                </Text>
                <Text variant="bodyLg" as="p" alignment="center" tone="subdued">
                  {isDisconnected
                    ? 'To reconnect your store, please reinstall the app from your Shopify admin.'
                    : 'Please access this app from your Shopify admin to get started.'}
                </Text>
              </BlockStack>

              <Box
                padding="600"
                background="bg-surface-secondary"
                borderRadius="200"
                width="100%"
              >
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2" alignment="center">
                    How to {isDisconnected ? 'Reconnect' : 'Connect'}
                  </Text>
                  <ol style={{ margin: 0, paddingLeft: '24px', lineHeight: '2' }}>
                    <li>
                      <Text variant="bodyMd" as="span">
                        Go to your Shopify Admin dashboard
                      </Text>
                    </li>
                    <li>
                      <Text variant="bodyMd" as="span">
                        Navigate to <strong>Apps</strong> in the sidebar
                      </Text>
                    </li>
                    <li>
                      <Text variant="bodyMd" as="span">
                        {isDisconnected
                          ? 'Search for and reinstall the Duxly app'
                          : 'Find and open the Duxly app'}
                      </Text>
                    </li>
                    <li>
                      <Text variant="bodyMd" as="span">
                        Follow the installation prompts to authorize the connection
                      </Text>
                    </li>
                  </ol>
                </BlockStack>
              </Box>

              <Text variant="bodySm" as="p" tone="subdued" alignment="center">
                Need help? Contact us at{' '}
                <a href="mailto:support@duxly.com" style={{ color: '#4F46E5' }}>
                  support@duxly.com
                </a>
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

export default ConnectScreen;
