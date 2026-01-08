import { InlineStack, Text, Tooltip, Icon } from '@shopify/polaris';
import { LockFilledIcon } from '@shopify/polaris-icons';

/**
 * SecurityBadge - Compact trust indicator showing bank-level security
 * Displays a shield icon with tooltip explaining AWS Parameter Store encryption
 */
function SecurityBadge() {
  return (
    <Tooltip
      content="Your credentials are encrypted using AWS Parameter Store with bank-level AES-256 encryption. Data is never stored in plain text."
      preferredPosition="above"
    >
      <InlineStack gap="100" blockAlign="center" wrap={false}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '20px',
            height: '20px',
            borderRadius: '4px',
            backgroundColor: '#e8f5e9',
          }}
        >
          <Icon source={LockFilledIcon} tone="success" />
        </div>
        <Text variant="bodySm" as="span" tone="subdued">
          Data encrypted & secure
        </Text>
      </InlineStack>
    </Tooltip>
  );
}

export default SecurityBadge;
