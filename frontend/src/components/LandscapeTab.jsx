import {
  Card,
  Text,
  BlockStack,
  InlineStack,
  Box,
  Badge,
  Banner,
} from '@shopify/polaris';

const STATUS_MAP = {
  active: { tone: 'success', label: 'Actief' },
  scheduled: { tone: 'info', label: 'Gepland' },
  'on-request': { tone: 'attention', label: 'Op aanvraag' },
};

/** A labelled flow node (source / hub / result). */
function FlowChip({ label, emphasis }) {
  return (
    <Box
      background={emphasis ? 'bg-surface-brand' : 'bg-surface-secondary'}
      padding="200"
      borderRadius="200"
      borderWidth="025"
      borderColor="border"
    >
      <Text variant="bodySm" as="span" fontWeight={emphasis ? 'bold' : 'medium'}>
        {label}
      </Text>
    </Box>
  );
}

function Arrow() {
  return (
    <Text variant="bodyMd" as="span" tone="subdued">
      →
    </Text>
  );
}

function IntegrationCard({ integration }) {
  const { name, what, source, result, status } = integration;
  const statusInfo = STATUS_MAP[status] || STATUS_MAP.active;

  return (
    <Card>
      <BlockStack gap="300">
        <InlineStack align="space-between" blockAlign="center" gap="200">
          <Text variant="headingMd" as="h3">
            {name}
          </Text>
          <Badge tone={statusInfo.tone}>{statusInfo.label}</Badge>
        </InlineStack>

        <Text variant="bodyMd" tone="subdued" as="p">
          {what}
        </Text>

        <InlineStack gap="200" blockAlign="center" wrap>
          <FlowChip label={source} />
          <Arrow />
          <FlowChip label="Duxly Connection" emphasis />
          <Arrow />
          <FlowChip label={result} />
        </InlineStack>
      </BlockStack>
    </Card>
  );
}

/**
 * LandscapeTab
 * Client-friendly "what Duxly runs for your store" view — a reassuring
 * source → Duxly Connection → result map, rendered natively in Polaris.
 */
function LandscapeTab({ landscape, storeName }) {
  if (!landscape) return null;

  const { intro, integrations } = landscape;

  return (
    <BlockStack gap="400">
      <Box paddingBlockStart="200">
        <BlockStack gap="200">
          <Text variant="headingLg" as="h2">
            Wat we voor je laten draaien
          </Text>
          {intro && (
            <Text variant="bodyMd" tone="subdued" as="p">
              {intro}
            </Text>
          )}
        </BlockStack>
      </Box>

      {integrations?.length > 0 ? (
        integrations.map((integration, i) => (
          <IntegrationCard key={`int-${i}`} integration={integration} />
        ))
      ) : (
        <Banner tone="info">
          <p>Er zijn nog geen integraties geconfigureerd voor deze winkel.</p>
        </Banner>
      )}
    </BlockStack>
  );
}

export default LandscapeTab;
