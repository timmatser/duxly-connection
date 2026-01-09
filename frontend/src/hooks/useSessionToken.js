/**
 * useSessionToken Hook
 * Provides utilities for authenticated API calls using Shopify session tokens
 *
 * Session tokens are JWTs issued by Shopify App Bridge that prove the request
 * comes from an authenticated merchant within the Shopify admin.
 *
 * Uses App Bridge CDN (4.x) - the global `shopify` object is auto-initialized
 * when the app loads in the embedded context via the script tag in index.html.
 */

import { useCallback, useState, useEffect } from 'react';

/**
 * Wait for App Bridge to be ready
 * @returns {Promise<object>} The shopify App Bridge object
 */
function waitForAppBridge() {
  return new Promise((resolve, reject) => {
    // If already available, resolve immediately
    if (window.shopify) {
      resolve(window.shopify);
      return;
    }

    // Wait for App Bridge to initialize (max 10 seconds)
    const maxWait = 10000;
    const checkInterval = 100;
    let waited = 0;

    const interval = setInterval(() => {
      if (window.shopify) {
        clearInterval(interval);
        resolve(window.shopify);
      } else if (waited >= maxWait) {
        clearInterval(interval);
        reject(new Error('App Bridge failed to initialize - ensure app is loaded in Shopify Admin'));
      }
      waited += checkInterval;
    }, checkInterval);
  });
}

/**
 * Hook that provides authenticated fetch function
 * @returns {{ authenticatedFetch: Function, getToken: Function, isReady: boolean, error: string|null }}
 */
export function useSessionToken() {
  const [isReady, setIsReady] = useState(!!window.shopify);
  const [error, setError] = useState(null);

  // Wait for App Bridge on mount
  useEffect(() => {
    if (!window.shopify) {
      waitForAppBridge()
        .then(() => {
          setIsReady(true);
          setError(null);
        })
        .catch((err) => {
          console.error('App Bridge initialization failed:', err.message);
          setError(err.message);
        });
    }
  }, []);

  /**
   * Make an authenticated API request with session token
   * @param {string} url - The API endpoint URL
   * @param {RequestInit} options - Fetch options
   * @returns {Promise<Response>}
   */
  const authenticatedFetch = useCallback(async (url, options = {}) => {
    // Ensure App Bridge is ready
    const shopify = await waitForAppBridge();

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
  }, []);

  /**
   * Get the current session token (for manual use)
   * @returns {Promise<string>}
   */
  const getToken = useCallback(async () => {
    const shopify = await waitForAppBridge();
    return shopify.idToken();
  }, []);

  return {
    authenticatedFetch,
    getToken,
    isReady,
    error,
  };
}

export default useSessionToken;
