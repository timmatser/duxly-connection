"""
Proxy Lambda Function
Handles app proxy requests from Shopify storefront
Can be used to fetch data for custom storefronts
"""

import os
import json
import hmac
import hashlib

import boto3
import requests

ssm_client = boto3.client('ssm', region_name=os.environ.get('AWS_REGION', 'eu-central-1'))


def get_access_token(shop: str) -> str:
    """Get access token from Parameter Store"""
    prefix = os.environ.get('PARAMETER_STORE_PREFIX', '/shopify/clients')

    response = ssm_client.get_parameter(
        Name=f'{prefix}/{shop}/access-token',
        WithDecryption=True
    )

    return response['Parameter']['Value']


def verify_proxy_signature(query_params: dict, signature: str) -> bool:
    """Verify proxy signature from Shopify"""
    api_secret = os.environ.get('SHOPIFY_API_SECRET')

    # Remove signature from params
    params = {k: v for k, v in query_params.items() if k != 'signature'}

    # Sort and build query string (no separators for proxy signature)
    sorted_params = ''.join(f'{k}={v}' for k, v in sorted(params.items()))

    # Generate signature
    computed_signature = hmac.new(
        api_secret.encode('utf-8'),
        sorted_params.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(computed_signature, signature)


def call_shopify_api(shop: str, access_token: str, endpoint: str, method: str = 'GET', body: dict = None) -> dict:
    """Make API call to Shopify"""
    url = f'https://{shop}/admin/api/2024-01/{endpoint}'

    headers = {
        'X-Shopify-Access-Token': access_token,
        'Content-Type': 'application/json'
    }

    response = requests.request(
        method=method,
        url=url,
        headers=headers,
        json=body if body else None
    )

    if not response.ok:
        raise Exception(f'Shopify API error: {response.text}')

    return response.json()


def handler(event, context):
    try:
        params = event.get('queryStringParameters') or {}
        shop = params.get('shop')
        signature = params.get('signature')

        if not shop or not signature:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Missing required parameters'})
            }

        # Verify the signature
        if not verify_proxy_signature(params, signature):
            return {
                'statusCode': 403,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Invalid signature'})
            }

        # Get access token from Parameter Store
        access_token = get_access_token(shop)

        # Parse request body if present
        request_body = json.loads(event.get('body', '{}')) if event.get('body') else {}
        endpoint = request_body.get('endpoint', 'products.json')
        method = request_body.get('method', 'GET')

        # Call Shopify API
        data = call_shopify_api(shop, access_token, endpoint, method)

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps(data)
        }
    except Exception as e:
        print(f'Proxy error: {e}')
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({
                'error': 'Internal server error',
                'message': str(e)
            })
        }
