"""
Shopify Client Utility (Python)
Helper class for custom tooling to interact with Shopify using stored credentials
"""

import boto3
import requests
from typing import Dict, Any, Optional


class ShopifyClient:
    """Client for interacting with Shopify API using credentials from Parameter Store"""

    def __init__(self, shop: str, region: str = 'eu-central-1', api_version: str = '2024-01'):
        self.shop = shop
        self.region = region
        self.api_version = api_version
        self.ssm = boto3.client('ssm', region_name=region)
        self._access_token: Optional[str] = None

    def get_access_token(self) -> str:
        """Get access token from Parameter Store"""
        if self._access_token:
            return self._access_token

        response = self.ssm.get_parameter(
            Name=f'/shopify/clients/{self.shop}/access-token',
            WithDecryption=True
        )
        self._access_token = response['Parameter']['Value']
        return self._access_token

    def graphql(self, query: str, variables: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Make a GraphQL API request"""
        token = self.get_access_token()
        url = f'https://{self.shop}/admin/api/{self.api_version}/graphql.json'

        headers = {
            'X-Shopify-Access-Token': token,
            'Content-Type': 'application/json',
        }

        payload = {'query': query}
        if variables:
            payload['variables'] = variables

        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()

        data = response.json()

        if 'errors' in data:
            raise Exception(f"GraphQL errors: {data['errors']}")

        return data.get('data', {})

    def request(
        self,
        endpoint: str,
        method: str = 'GET',
        data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Make a REST API request"""
        token = self.get_access_token()
        url = f'https://{self.shop}/admin/api/{self.api_version}/{endpoint}'

        headers = {
            'X-Shopify-Access-Token': token,
            'Content-Type': 'application/json',
        }

        response = requests.request(method, url, json=data, headers=headers)
        response.raise_for_status()

        return response.json()

    def get_products(self, limit: int = 50) -> Dict[str, Any]:
        """Get products"""
        return self.request(f'products.json?limit={limit}')

    def get_product(self, product_id: int) -> Dict[str, Any]:
        """Get product by ID"""
        return self.request(f'products/{product_id}.json')

    def get_orders(self, limit: int = 50, status: str = 'any') -> Dict[str, Any]:
        """Get orders"""
        return self.request(f'orders.json?limit={limit}&status={status}')

    def get_order(self, order_id: int) -> Dict[str, Any]:
        """Get order by ID"""
        return self.request(f'orders/{order_id}.json')

    def create_product(self, product_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a product"""
        return self.request('products.json', method='POST', data={'product': product_data})

    def update_product(self, product_id: int, product_data: Dict[str, Any]) -> Dict[str, Any]:
        """Update a product"""
        return self.request(
            f'products/{product_id}.json',
            method='PUT',
            data={'product': product_data}
        )

    def delete_product(self, product_id: int) -> None:
        """Delete a product"""
        self.request(f'products/{product_id}.json', method='DELETE')


# Example usage:
"""
from shopify_client import ShopifyClient

# Initialize client
client = ShopifyClient('my-store.myshopify.com')

# Get products
products = client.get_products()
print(products)

# GraphQL query
data = client.graphql('''
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
''')
print(data)
"""
