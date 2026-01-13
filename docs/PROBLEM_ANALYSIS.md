# Problem Analysis: Multi-App Frontend Connection Failure

## Issue
The shared frontend deployment failed to initialize Shopify App Bridge correctly for secondary apps (e.g., Hart Beach, Strand HB), causing them to load without functionality.

## Root Cause
1. **Hardcoded API Key**: The `index.html` file contained a static `<meta name="shopify-api-key">` injected at build time from environment variables.
2. **Identity Mismatch**: When a secondary app loaded, it saw the API key for the primary app. App Bridge detected this mismatch (the app loaded in the iframe did not match the API key) and failed to generate session tokens.
3. **Silent Failure**: Without a valid session token, the frontend could not authenticate with the backend, resulting in no network calls and empty dashboards.

## Solution Implemented
**Dynamic API Key Injection**:

### 1. `frontend/index.html`
Replaced the static meta tag with a runtime script that reads `client_id` from the URL:

```html
<script>
  (function() {
    var params = new URLSearchParams(window.location.search);
    var apiKey = params.get('client_id') || "%VITE_SHOPIFY_API_KEY%";
    if (apiKey) {
      var meta = document.createElement('meta');
      meta.name = 'shopify-api-key';
      meta.content = apiKey;
      document.head.appendChild(meta);
    }
  })();
</script>
```

### 2. `frontend/src/App.jsx`
Updated to dynamically read `client_id` from URL parameters:

```javascript
const getApiKey = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get('client_id') || import.meta.env.VITE_SHOPIFY_API_KEY;
};
const SHOPIFY_API_KEY = getApiKey();
```

## Required Configuration
Update the **App URL** in the Shopify Partner Dashboard for each app to include its specific API key:

| App | App URL |
|-----|---------|
| Hart Beach | `https://d7jlhqhgvrgy8.cloudfront.net/?client_id=62d1114feb88f342f9be3d50be3affe0` |
| Strand HB | `https://d7jlhqhgvrgy8.cloudfront.net/?client_id=084fc00f54ea11b15cfd5abdc4791126` |

## How It Works
1. Shopify loads the app URL with `?client_id=XXX` in the iframe
2. The inline script reads the `client_id` parameter before App Bridge loads
3. The meta tag is dynamically created with the correct API key
4. App Bridge initializes with the matching API key
5. Session tokens are generated correctly
6. The frontend can authenticate with the backend
