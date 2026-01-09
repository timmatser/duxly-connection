/**
 * useSessionToken Hook
 * Provides utilities for authenticated API calls using Shopify session tokens
 *
 * Session tokens are JWTs issued by Shopify App Bridge that prove the request
 * comes from an authenticated merchant within the Shopify admin.
 *
 * Uses App Bridge CDN (4.x) - the global `shopify` object is auto-initialized
 * when the app loads in the embedded context.
 */

import { useCallback } from 'react';
import { useAppBridge } from '@shopify/app-bridge-react';

/**
 * Hook that provides authenticated fetch function
 * @returns {{ authenticatedFetch: Function }}
 */
export function useSessionToken() {
  // In App Bridge 4.x, useAppBridge returns the global shopify object
  const shopify = useAppBridge();

  /**
   * Make an authenticated API request with session token
   * @param {string} url - The API endpoint URL
   * @param {RequestInit} options - Fetch options
   * @returns {Promise<Response>}
   */
  const authenticatedFetch = useCallback(async (url, options = {}) => {
    // Get a fresh session token using App Bridge CDN API
    const token = await shopify.idToken();

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
  }, [shopify]);

  /**
   * Get the current session token (for manual use)
   * @returns {Promise<string>}
   */
  const getToken = useCallback(async () => {
    return shopify.idToken();
  }, [shopify]);

  return {
    authenticatedFetch,
    getToken,
  };
}

export default useSessionToken;
