"""
GDPR Compliance Webhook Handlers
Handles mandatory GDPR webhooks for Shopify public apps:
- customers/data_request: Customer requests their data
- customers/redact: Customer requests data deletion
- shop/redact: Shop owner uninstalls app, requests data deletion
"""

import json
import hmac
import hashlib
import base64
import os
import boto3
from datetime import datetime

ssm_client = boto3.client('ssm', region_name=os.environ.get('AWS_REGION', 'eu-central-1'))


def verify_webhook_hmac(body: str, hmac_header: str) -> bool:
    """Verify the webhook HMAC signature from Shopify."""
    api_secret = os.environ.get('SHOPIFY_API_SECRET', '')

    computed_hmac = base64.b64encode(
        hmac.new(
            api_secret.encode('utf-8'),
            body.encode('utf-8'),
            hashlib.sha256
        ).digest()
    ).decode('utf-8')

    return hmac.compare_digest(computed_hmac, hmac_header)


def delete_shop_data(shop: str) -> dict:
    """Delete all stored data for a shop from Parameter Store."""
    prefix = os.environ.get('PARAMETER_STORE_PREFIX', '/shopify/clients')
    deleted_params = []

    try:
        # List all parameters for this shop
        paginator = ssm_client.get_paginator('describe_parameters')
        for page in paginator.paginate(
            ParameterFilters=[
                {
                    'Key': 'Name',
                    'Option': 'BeginsWith',
                    'Values': [f'{prefix}/{shop}/']
                }
            ]
        ):
            for param in page.get('Parameters', []):
                param_name = param['Name']
                ssm_client.delete_parameter(Name=param_name)
                deleted_params.append(param_name)
                print(f"Deleted parameter: {param_name}")

    except Exception as e:
        print(f"Error deleting shop data: {e}")
        raise

    return {
        'shop': shop,
        'deleted_parameters': deleted_params,
        'deleted_at': datetime.utcnow().isoformat()
    }


def handler(event, context):
    """
    Handle GDPR webhook requests from Shopify.
    Routes to appropriate handler based on the webhook topic.
    """
    try:
        # Get the webhook topic from headers
        headers = event.get('headers', {})
        # Normalize header keys to lowercase
        headers_lower = {k.lower(): v for k, v in headers.items()}

        webhook_topic = headers_lower.get('x-shopify-topic', '')
        hmac_header = headers_lower.get('x-shopify-hmac-sha256', '')
        shop_domain = headers_lower.get('x-shopify-shop-domain', '')

        body = event.get('body', '')

        # Verify HMAC signature
        if not verify_webhook_hmac(body, hmac_header):
            print(f"Invalid HMAC signature for webhook from {shop_domain}")
            return {
                'statusCode': 401,
                'body': json.dumps({'error': 'Invalid signature'})
            }

        # Parse the webhook payload
        payload = json.loads(body) if body else {}

        print(f"Received GDPR webhook: {webhook_topic} from {shop_domain}")
        print(f"Payload: {json.dumps(payload)}")

        # Route to appropriate handler
        if webhook_topic == 'customers/data_request':
            return handle_customer_data_request(payload, shop_domain)
        elif webhook_topic == 'customers/redact':
            return handle_customer_redact(payload, shop_domain)
        elif webhook_topic == 'shop/redact':
            return handle_shop_redact(payload, shop_domain)
        else:
            print(f"Unknown webhook topic: {webhook_topic}")
            return {
                'statusCode': 400,
                'body': json.dumps({'error': f'Unknown topic: {webhook_topic}'})
            }

    except Exception as e:
        print(f"GDPR webhook error: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': 'Internal server error'})
        }


def handle_customer_data_request(payload: dict, shop_domain: str) -> dict:
    """
    Handle customers/data_request webhook.
    Called when a customer requests their data from a store.

    This app only stores shop-level credentials, not customer data,
    so we respond with an empty data payload.
    """
    shop_id = payload.get('shop_id')
    shop_domain_from_payload = payload.get('shop_domain')
    customer = payload.get('customer', {})
    customer_id = customer.get('id')
    customer_email = customer.get('email')

    print(f"Customer data request - Shop: {shop_domain_from_payload}, Customer ID: {customer_id}")

    # This app does not store customer-specific data
    # Only shop-level access tokens are stored
    response_data = {
        'shop_id': shop_id,
        'shop_domain': shop_domain_from_payload,
        'customer_id': customer_id,
        'data_stored': [],
        'message': 'This app does not store customer-specific data. Only shop-level access tokens are stored for API access.'
    }

    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json'},
        'body': json.dumps(response_data)
    }


def handle_customer_redact(payload: dict, shop_domain: str) -> dict:
    """
    Handle customers/redact webhook.
    Called when a customer requests to be forgotten.

    This app only stores shop-level credentials, not customer data,
    so no action is needed.
    """
    shop_id = payload.get('shop_id')
    shop_domain_from_payload = payload.get('shop_domain')
    customer = payload.get('customer', {})
    customer_id = customer.get('id')

    print(f"Customer redact request - Shop: {shop_domain_from_payload}, Customer ID: {customer_id}")

    # No customer data to delete - this app only stores shop credentials
    response_data = {
        'shop_id': shop_id,
        'shop_domain': shop_domain_from_payload,
        'customer_id': customer_id,
        'action_taken': 'none_required',
        'message': 'This app does not store customer-specific data. No deletion required.'
    }

    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json'},
        'body': json.dumps(response_data)
    }


def handle_shop_redact(payload: dict, shop_domain: str) -> dict:
    """
    Handle shop/redact webhook.
    Called 48 hours after a shop uninstalls the app.
    Must delete all shop data.
    """
    shop_id = payload.get('shop_id')
    shop_domain_from_payload = payload.get('shop_domain')

    print(f"Shop redact request - Shop: {shop_domain_from_payload}, ID: {shop_id}")

    try:
        # Delete all stored data for this shop
        deletion_result = delete_shop_data(shop_domain_from_payload)

        response_data = {
            'shop_id': shop_id,
            'shop_domain': shop_domain_from_payload,
            'action_taken': 'data_deleted',
            'details': deletion_result,
            'message': 'All shop data has been deleted from our systems.'
        }

        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps(response_data)
        }

    except Exception as e:
        print(f"Error processing shop redact: {e}")
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({
                'error': 'Failed to delete shop data',
                'message': str(e)
            })
        }
