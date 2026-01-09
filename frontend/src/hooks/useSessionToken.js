/**
 * useSessionToken Hook
 * Provides utilities for authenticated API calls using Shopify session tokens
 *
 * Session tokens are JWTs issued by Shopify App Bridge that prove the request
 * comes from an authenticated merchant within the Shopify admin.
 */

import { useCallback } from 'react';
import { useAppBridge } from '@shopify/app-bridge-react';
import { getSessionToken } from '@shopify/app-bridge/utilities';

/**
 * Hook that provides authenticated fetch function
 * @returns {{ authenticatedFetch: Function }}
 */
export function useSessionToken() {
  const app = useAppBridge();

  /**
   * Make an authenticated API request with session token
   * @param {string} url - The API endpoint URL
   * @param {RequestInit} options - Fetch options
   * @returns {Promise<Response>}
   */
  const authenticatedFetch = useCallback(async (url, options = {}) => {
    // Get a fresh session token
    const token = await getSessionToken(app);

    // Merge headers with Authorization
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    return fetch(url, {
      ...options,
      headers,
    });
  }, [app]);

  /**
   * Get the current session token (for manual use)
   * @returns {Promise<string>}
   */
  const getToken = useCallback(async () => {
    return getSessionToken(app);
  }, [app]);

  return {
    authenticatedFetch,
    getToken,
  };
}

export default useSessionToken;
