/**
 * Parses a raw Shopify shop identifier into a human-readable store name
 *
 * Handles various formats:
 * - "my-store.myshopify.com" -> "My Store"
 * - "https-www-my-store-myshopify-com" -> "My Store"
 * - "my_awesome_store.myshopify.com" -> "My Awesome Store"
 *
 * @param {string} shopUrl - The raw shop URL or identifier
 * @returns {string} Human-readable store name
 */
export function parseStoreName(shopUrl) {
  if (!shopUrl) return 'Your Store';

  let storeName = shopUrl;

  // Remove protocol prefixes (handles encoded URLs like "https-www-")
  storeName = storeName
    .replace(/^https?[-_]*(www[-_]*)?/i, '')
    .replace(/^https?:\/\/(www\.)?/i, '');

  // Remove .myshopify.com suffix and variations
  storeName = storeName
    .replace(/[-_]?myshopify[-_]?com$/i, '')
    .replace(/\.myshopify\.com$/i, '');

  // Remove any trailing/leading special characters
  storeName = storeName.replace(/^[-_\.]+|[-_\.]+$/g, '');

  // Replace hyphens and underscores with spaces
  storeName = storeName.replace(/[-_]+/g, ' ');

  // Capitalize first letter of each word
  storeName = storeName
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  return storeName || 'Your Store';
}

export default parseStoreName;
