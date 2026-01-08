import { BlockStack, InlineStack, Text, Box } from '@shopify/polaris';
import DuxlyLogo from './DuxlyLogo';
import { parseStoreName } from '../utils/parseStoreName';

/**
 * DashboardHeader component
 * Displays Duxly branding and a personalized welcome message
 */
function DashboardHeader({ shop }) {
  const storeName = parseStoreName(shop);

  return (
    <Box
      paddingBlockStart="500"
      paddingBlockEnd="600"
      paddingInlineStart="400"
      paddingInlineEnd="400"
    >
      <BlockStack gap="400">
        {/* Duxly Logo */}
        <DuxlyLogo width={140} height={46} />

        {/* Welcome Message */}
        <Text
          variant="headingXl"
          as="h1"
          fontWeight="bold"
        >
          <span style={{ color: '#4F46E5' }}>Welcome to Duxly,</span>{' '}
          <span style={{ color: '#1F2937' }}>{storeName}!</span>
        </Text>
      </BlockStack>
    </Box>
  );
}

export default DashboardHeader;
