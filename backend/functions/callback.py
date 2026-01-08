"""
Callback Lambda Function
Handles the OAuth callback and stores credentials in Parameter Store
"""

import os
import json
import hmac
import hashlib
from datetime import datetime

import boto3
import requests

ssm_client = boto3.client('ssm', region_name=os.environ.get('AWS_REGION', 'eu-central-1'))


def exchange_code_for_token(shop: str, code: str) -> dict:
    """Exchange authorization code for access token"""
    api_key = os.environ.get('SHOPIFY_API_KEY')
    api_secret = os.environ.get('SHOPIFY_API_SECRET')

    response = requests.post(
        f'https://{shop}/admin/oauth/access_token',
        json={
            'client_id': api_key,
            'client_secret': api_secret,
            'code': code
        },
        headers={'Content-Type': 'application/json'}
    )

    if not response.ok:
        raise Exception(f'Failed to exchange code: {response.text}')

    return response.json()


def store_credentials(shop: str, access_token: str, scopes: str):
    """Store credentials in AWS Parameter Store"""
    prefix = os.environ.get('PARAMETER_STORE_PREFIX', '/shopify/clients')

    # Store access token
    ssm_client.put_parameter(
        Name=f'{prefix}/{shop}/access-token',
        Value=access_token,
        Type='SecureString',
        Description=f'Shopify access token for {shop}',
        Overwrite=True,
        Tags=[
            {'Key': 'App', 'Value': 'Shopify'},
            {'Key': 'Shop', 'Value': shop}
        ]
    )

    # Store scopes for reference
    ssm_client.put_parameter(
        Name=f'{prefix}/{shop}/scopes',
        Value=scopes,
        Type='String',
        Description=f'Shopify scopes for {shop}',
        Overwrite=True,
        Tags=[
            {'Key': 'App', 'Value': 'Shopify'},
            {'Key': 'Shop', 'Value': shop}
        ]
    )

    # Store installation timestamp
    ssm_client.put_parameter(
        Name=f'{prefix}/{shop}/installed-at',
        Value=datetime.utcnow().isoformat(),
        Type='String',
        Description=f'Installation timestamp for {shop}',
        Overwrite=True,
        Tags=[
            {'Key': 'App', 'Value': 'Shopify'},
            {'Key': 'Shop', 'Value': shop}
        ]
    )


def verify_hmac(query_params: dict, hmac_value: str) -> bool:
    """Verify HMAC signature from Shopify"""
    api_secret = os.environ.get('SHOPIFY_API_SECRET')

    # Remove hmac and signature from params
    params = {k: v for k, v in query_params.items() if k not in ('hmac', 'signature')}

    # Sort and build query string
    sorted_params = '&'.join(f'{k}={v}' for k, v in sorted(params.items()))

    # Generate HMAC
    computed_hmac = hmac.new(
        api_secret.encode('utf-8'),
        sorted_params.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(computed_hmac, hmac_value)


def handler(event, context):
    try:
        params = event.get('queryStringParameters') or {}
        code = params.get('code')
        hmac_value = params.get('hmac')
        shop = params.get('shop')

        # Validate required parameters
        if not code or not hmac_value or not shop:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Missing required parameters'})
            }

        # Verify HMAC
        if not verify_hmac(params, hmac_value):
            return {
                'statusCode': 403,
                'body': json.dumps({'error': 'Invalid HMAC signature'})
            }

        # Exchange code for access token
        token_data = exchange_code_for_token(shop, code)

        # Store credentials in Parameter Store
        store_credentials(shop, token_data['access_token'], token_data['scope'])

        print(f'Successfully stored credentials for shop: {shop}')

        # Redirect to frontend with success message
        frontend_url = os.environ.get('FRONTEND_URL', '')
        return {
            'statusCode': 302,
            'headers': {
                'Location': f'{frontend_url}?shop={shop}&installed=true'
            },
            'body': ''
        }
    except Exception as e:
        print(f'Callback error: {e}')
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({
                'error': 'Failed to complete installation',
                'message': str(e)
            })
        }
