"""
Auth Lambda Function
Initiates the Shopify OAuth flow
"""

import os
import re
import json
import secrets


def handler(event, context):
    try:
        query_params = event.get('queryStringParameters') or {}
        shop = query_params.get('shop')

        if not shop:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Missing shop parameter'})
            }

        # Validate shop domain format
        shop_regex = r'^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$'
        if not re.match(shop_regex, shop):
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Invalid shop domain'})
            }

        api_key = os.environ.get('SHOPIFY_API_KEY')

        # Compute APP_URL from the request context (avoids circular dependency)
        request_context = event.get('requestContext', {})
        domain_name = request_context.get('domainName', '')
        stage = request_context.get('stage', 'prod')
        app_url = f'https://{domain_name}/{stage}'

        # Required OAuth scopes for your app
        scopes = 'read_products,write_products,read_orders'

        # Generate a random state parameter for security
        state = secrets.token_hex(16)

        # Build the OAuth authorization URL
        redirect_uri = f'{app_url}/callback'
        auth_url = f'https://{shop}/admin/oauth/authorize?client_id={api_key}&scope={scopes}&redirect_uri={redirect_uri}&state={state}'

        return {
            'statusCode': 302,
            'headers': {
                'Location': auth_url,
                'Set-Cookie': f'shopify_oauth_state={state}; Path=/; Secure; HttpOnly; SameSite=Lax'
            },
            'body': ''
        }
    except Exception as e:
        print(f'Auth error: {e}')
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Internal server error'})
        }
