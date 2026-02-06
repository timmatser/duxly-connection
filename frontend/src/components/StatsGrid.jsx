import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Text,
  BlockStack,
  InlineStack,
  InlineGrid,
  SkeletonDisplayText,
  Banner,
  Button,
} from '@shopify/polaris';
import { RefreshIcon } from '@shopify/polaris-icons';
import { useSessionToken } from '../hooks/useSessionToken';

/**
 * Individual stat card component
 */
function StatCard({ label, value, isLoading, hasError }) {
  return (
    <Card>
      <BlockStack gap="200">
        <Text variant="bodySm" tone="subdued" as="p">
          {label}
        </Text>
        {isLoading ? (
          <SkeletonDisplayText size="large" />
        ) : hasError ? (
          <Text variant="headingLg" as="p" tone="critical">
            --
          </Text>
        ) : (
          <Text
            variant="heading2xl"
            as="p"
            fontWeight="bold"
          >
            {typeof value === 'number' ? value.toLocaleString() : value}
          </Text>
        )}
      </BlockStack>
    </Card>
  );
}

/**
 * Format a date for display as "Last updated" timestamp
 */
function formatLastUpdated(isoString) {
  if (!isoString) return null;
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;

    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return null;
  }
}

/**
 * Stats Grid component
 * Displays store statistics in a 3-column grid
 * Uses session token authentication for secure API access
 */
function StatsGrid({ shop, apiUrl, onAuthRequired }) {
  const { authenticatedFetch } = useSessionToken();

  const [stats, setStats] = useState({
    products: null,
    customers: null,
    orders: null,
    variants: null,
    collections: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [fetchedAt, setFetchedAt] = useState(null);
  const [isCached, setIsCached] = useState(false);

  const fetchStats = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      // Construct API URL - shop is determined from session token on backend
      const baseUrl = apiUrl || import.meta.env.VITE_API_URL || '';
      let url = `${baseUrl}/stats`;

      // Add refresh parameter to force cache invalidation
      if (forceRefresh) {
        url += '?refresh=true';
      }

      // Use authenticated fetch with session token
      const response = await authenticatedFetch(url);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        // If credentials not found or access token expired, trigger OAuth flow
        if (
          (response.status === 404 && errorData.message?.includes('No credentials')) ||
          (response.status === 401 && errorData.requiresReauth)
        ) {
          if (onAuthRequired) {
            onAuthRequired();
            return;
          }
        }
        throw new Error(errorData.error || 'Unable to load store data. Please try again.');
      }

      const data = await response.json();

      if (data.success === false && !data.stats) {
        throw new Error(data.message || 'Failed to load statistics');
      }

      setStats({
        products: data.stats?.products ?? null,
        customers: data.stats?.customers ?? null,
        orders: data.stats?.orders ?? null,
        variants: data.stats?.variants ?? null,
        collections: data.stats?.collections ?? null,
      });

      setFetchedAt(data.stats?.fetchedAt ?? null);
      setIsCached(data.cached ?? false);

      if (data.warning) {
        setError(data.warning);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
      setError(err.message || 'Unable to load statistics');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [apiUrl, authenticatedFetch]);

  useEffect(() => {
    if (shop) {
      fetchStats(false);
    }
  }, [shop, fetchStats]);

  const handleRefresh = useCallback(() => {
    fetchStats(true);
  }, [fetchStats]);

  const lastUpdatedText = formatLastUpdated(fetchedAt);

  return (
    <BlockStack gap="400">
      <InlineStack align="space-between" blockAlign="center">
        <BlockStack gap="100">
          <Text variant="headingMd" as="h2">
            Store Snapshot
          </Text>
          {lastUpdatedText && !isLoading && (
            <Text variant="bodySm" tone="subdued" as="p">
              Last updated: {lastUpdatedText}
              {isCached && ' (cached)'}
            </Text>
          )}
        </BlockStack>
        <Button
          icon={RefreshIcon}
          onClick={handleRefresh}
          loading={isRefreshing}
          disabled={isLoading}
          accessibilityLabel="Refresh statistics"
        >
          Refresh
        </Button>
      </InlineStack>

      {error && !isLoading && (
        <Banner tone="warning">
          <p>{error}</p>
        </Banner>
      )}

      <InlineGrid columns={{ xs: 1, sm: 2, md: 3 }} gap="400">
        <StatCard
          label="Products"
          value={stats.products}
          isLoading={isLoading || isRefreshing}
          hasError={stats.products === null && !isLoading && !isRefreshing}
        />
        <StatCard
          label="Variants"
          value={stats.variants}
          isLoading={isLoading || isRefreshing}
          hasError={stats.variants === null && !isLoading && !isRefreshing}
        />
        <StatCard
          label="Collections"
          value={stats.collections}
          isLoading={isLoading || isRefreshing}
          hasError={stats.collections === null && !isLoading && !isRefreshing}
        />
        <StatCard
          label="Customers"
          value={stats.customers}
          isLoading={isLoading || isRefreshing}
          hasError={stats.customers === null && !isLoading && !isRefreshing}
        />
        <StatCard
          label="Orders"
          value={stats.orders}
          isLoading={isLoading || isRefreshing}
          hasError={stats.orders === null && !isLoading && !isRefreshing}
        />
      </InlineGrid>
    </BlockStack>
  );
}

export default StatsGrid;
