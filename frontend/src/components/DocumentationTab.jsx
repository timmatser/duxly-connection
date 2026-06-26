import {
  Card,
  Text,
  BlockStack,
  InlineStack,
  Box,
  List,
  DataTable,
  Badge,
  Link,
  Divider,
} from '@shopify/polaris';

/**
 * Renders one manual section in a fixed, readable order:
 *   body paragraphs → bullets / bulletGroups → steps → table → important → why
 */
function Section({ section }) {
  const { heading, body, bullets, bulletGroups, steps, table, important, why } = section;

  return (
    <Card>
      <BlockStack gap="300">
        <Text variant="headingMd" as="h3">
          {heading}
        </Text>

        {body?.map((p, i) => (
          <Text key={`b-${i}`} variant="bodyMd" as="p">
            {p}
          </Text>
        ))}

        {bullets && (
          <List type="bullet">
            {bullets.map((item, i) => (
              <List.Item key={`bl-${i}`}>{item}</List.Item>
            ))}
          </List>
        )}

        {bulletGroups?.map((group, gi) => (
          <BlockStack key={`bg-${gi}`} gap="100">
            <Text variant="headingSm" as="h4">
              {group.title}
            </Text>
            <List type="bullet">
              {group.items.map((item, i) => (
                <List.Item key={`bgi-${gi}-${i}`}>{item}</List.Item>
              ))}
            </List>
          </BlockStack>
        ))}

        {steps && (
          <BlockStack gap="100">
            <Text variant="bodySm" tone="subdued" as="p" fontWeight="semibold">
              Hoe
            </Text>
            <List type="number">
              {steps.map((item, i) => (
                <List.Item key={`st-${i}`}>{item}</List.Item>
              ))}
            </List>
          </BlockStack>
        )}

        {table && (
          <DataTable
            columnContentTypes={table.headings.map(() => 'text')}
            headings={table.headings}
            rows={table.rows}
          />
        )}

        {important && (
          <Box
            background="bg-surface-caution"
            padding="300"
            borderRadius="200"
          >
            <Text variant="bodyMd" as="p">
              <Text as="span" fontWeight="semibold">
                Belangrijk:{' '}
              </Text>
              {important}
            </Text>
          </Box>
        )}

        {why && (
          <Text variant="bodySm" tone="subdued" as="p">
            <Text as="span" fontWeight="semibold">
              Waarom:{' '}
            </Text>
            {why}
          </Text>
        )}
      </BlockStack>
    </Card>
  );
}

/**
 * DocumentationTab
 * Renders the client-facing manual (authored in appContent.js) natively in Polaris,
 * plus a subdued "for maintainers" card linking the source docs (ticket DoD).
 */
function DocumentationTab({ documentation }) {
  if (!documentation) return null;

  const { title, subtitle, updated, sections, sources } = documentation;

  return (
    <BlockStack gap="400">
      <Box paddingBlockStart="200">
        <BlockStack gap="200">
          <InlineStack gap="200" blockAlign="center" wrap={false}>
            <Text variant="headingLg" as="h2">
              {title}
            </Text>
            {updated && <Badge tone="info">{`Bijgewerkt: ${updated}`}</Badge>}
          </InlineStack>
          {subtitle && (
            <Text variant="bodyMd" tone="subdued" as="p">
              {subtitle}
            </Text>
          )}
        </BlockStack>
      </Box>

      {sections?.map((section, i) => (
        <Section key={`sec-${i}`} section={section} />
      ))}

      {sources?.length > 0 && (
        <Card>
          <BlockStack gap="200">
            <Text variant="headingSm" as="h3" tone="subdued">
              Bronnen (voor beheerders)
            </Text>
            <Divider />
            <List type="bullet">
              {sources.map((src, i) => (
                <List.Item key={`src-${i}`}>
                  <Link url={src.url} target="_blank">
                    {src.label}
                  </Link>
                </List.Item>
              ))}
            </List>
          </BlockStack>
        </Card>
      )}
    </BlockStack>
  );
}

export default DocumentationTab;
