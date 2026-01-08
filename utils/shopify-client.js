/**
 * Shopify Client Utility
 * Helper functions for custom tooling to interact with Shopify using stored credentials
 */

const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');

class ShopifyClient {
  constructor(shop, region = 'eu-central-1') {
    this.shop = shop;
    this.region = region;
    this.ssm = new SSMClient({ region });
    this.accessToken = null;
    this.apiVersion = '2024-01';
  }

  /**
   * Get access token from Parameter Store
   */
  async getAccessToken() {
    if (this.accessToken) {
      return this.accessToken;
    }

    const command = new GetParameterCommand({
      Name: `/shopify/clients/${this.shop}/access-token`,
      WithDecryption: true,
    });

    const response = await this.ssm.send(command);
    this.accessToken = response.Parameter.Value;
    return this.accessToken;
  }

  /**
   * Make a GraphQL API request
   */
  async graphql(query, variables = {}) {
    const token = await this.getAccessToken();

    const response = await fetch(`https://${this.shop}/admin/api/${this.apiVersion}/graphql.json`, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      throw new Error(`GraphQL request failed: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
    }

    return data.data;
  }

  /**
   * Make a REST API request
   */
  async request(endpoint, options = {}) {
    const token = await this.getAccessToken();

    const url = `https://${this.shop}/admin/api/${this.apiVersion}/${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'X-Shopify-Access-Token': token,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get products
   */
  async getProducts(limit = 50) {
    return await this.request(`products.json?limit=${limit}`);
  }

  /**
   * Get product by ID
   */
  async getProduct(productId) {
    return await this.request(`products/${productId}.json`);
  }

  /**
   * Get orders
   */
  async getOrders(limit = 50, status = 'any') {
    return await this.request(`orders.json?limit=${limit}&status=${status}`);
  }

  /**
   * Get order by ID
   */
  async getOrder(orderId) {
    return await this.request(`orders/${orderId}.json`);
  }

  /**
   * Create a product
   */
  async createProduct(productData) {
    return await this.request('products.json', {
      method: 'POST',
      body: JSON.stringify({ product: productData }),
    });
  }

  /**
   * Update a product
   */
  async updateProduct(productId, productData) {
    return await this.request(`products/${productId}.json`, {
      method: 'PUT',
      body: JSON.stringify({ product: productData }),
    });
  }

  /**
   * Delete a product
   */
  async deleteProduct(productId) {
    return await this.request(`products/${productId}.json`, {
      method: 'DELETE',
    });
  }
}

module.exports = ShopifyClient;

// Example usage:
/*
const ShopifyClient = require('./utils/shopify-client');

async function example() {
  const client = new ShopifyClient('my-store.myshopify.com');

  // Get products
  const products = await client.getProducts();
  console.log(products);

  // GraphQL query
  const data = await client.graphql(`
    {
      products(first: 10) {
        edges {
          node {
            id
            title
            handle
          }
        }
      }
    }
  `);
  console.log(data);
}
*/
