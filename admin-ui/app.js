// Duxly Connection Admin App
// Uses shared DuxlyAuth for cross-subdomain authentication

const CONFIG = window.DUXLY_CONFIG;

// State
let ssm = null;
let currentUser = null;
let registeredApps = [];

// Apps prefix in Parameter Store
const APPS_PREFIX = '/shopify/duxly-connection/apps';

// Default scopes for Duxly Connection apps
const DEFAULT_SCOPES = 'read_products,write_products,read_orders,read_customers';

// Default app configuration
const APP_CONFIG = {
    frontendUrl: 'https://connections.duxly.eu',
    apiUrl: 'https://xehi9a6w6e.execute-api.eu-central-1.amazonaws.com/prod',
    webhooksApiVersion: '2024-01'
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    AWS.config.region = CONFIG.region;

    // Check if already authenticated via shared DuxlyAuth
    if (DuxlyAuth.isAuthenticated()) {
        showDashboard();
    }

    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('add-app-form').addEventListener('submit', handleAddApp);
});

// ==================== AUTH HELPERS (using shared DuxlyAuth) ====================

function isAuthenticated() {
    return DuxlyAuth.isAuthenticated();
}

function getUserEmail() {
    return DuxlyAuth.getUserEmail();
}

function isAdmin() {
    const email = getUserEmail();
    return CONFIG.adminEmails.includes(email);
}

async function setupAWSCredentials() {
    await DuxlyAuth.setupAWSCredentials();
    ssm = new AWS.SSM();
}

// ==================== VIEW MANAGEMENT ====================

function showLogin() {
    document.getElementById('login-view').classList.remove('hidden');
    document.getElementById('dashboard-view').classList.add('hidden');
}

async function showDashboard() {
    document.getElementById('login-view').classList.add('hidden');
    document.getElementById('dashboard-view').classList.remove('hidden');

    const email = getUserEmail();
    document.getElementById('user-email').textContent = email;

    try {
        await setupAWSCredentials();
        loadRegisteredApps();
        loadConnectedShops();
    } catch (error) {
        console.error('Failed to setup AWS credentials:', error);
        showError('apps-error', 'Failed to authenticate with AWS. Please try logging in again.');
    }
}

function showError(elementId, message) {
    const el = document.getElementById(elementId);
    if (el) {
        el.textContent = message;
        el.classList.remove('hidden');
    }
}

function hideError(elementId) {
    const el = document.getElementById(elementId);
    if (el) el.classList.add('hidden');
}

// ==================== LOGIN (using shared DuxlyAuth) ====================

// Track if we're in new password flow
let awaitingNewPassword = false;

async function handleLogin(e) {
    e.preventDefault();
    hideError('login-error');

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const newPassword = document.getElementById('login-new-password')?.value;
    const confirmPassword = document.getElementById('login-confirm-password')?.value;
    const btn = document.getElementById('login-btn');

    btn.disabled = true;
    btn.innerHTML = 'Signing in...';

    try {
        if (awaitingNewPassword && newPassword) {
            // Complete new password challenge
            if (newPassword !== confirmPassword) {
                throw new Error('Passwords do not match');
            }
            await DuxlyAuth.setNewPassword(email, newPassword);
            awaitingNewPassword = false;
            document.getElementById('new-password-section').classList.add('hidden');
            showDashboard();
        } else {
            // Initial login
            const result = await DuxlyAuth.login(email, password, {
                onNewPasswordRequired: () => {
                    awaitingNewPassword = true;
                    document.getElementById('new-password-section').classList.remove('hidden');
                    btn.innerHTML = 'Set New Password';
                    btn.disabled = false;
                }
            });

            if (result.requiresNewPassword) {
                return; // Wait for user to set new password
            }

            showDashboard();
        }
    } catch (error) {
        console.error('Login error:', error);
        showError('login-error', error.message || 'Authentication failed.');
        btn.innerHTML = 'Sign In';
        btn.disabled = false;
    }
}

function logout() {
    DuxlyAuth.logout();
    awaitingNewPassword = false;
    document.getElementById('login-form').reset();
    document.getElementById('new-password-section').classList.add('hidden');
    showLogin();
}

// ==================== REGISTERED APPS MANAGEMENT ====================

async function loadRegisteredApps() {
    const loading = document.getElementById('apps-loading');
    const list = document.getElementById('apps-list');

    loading.classList.remove('hidden');
    list.classList.add('hidden');
    hideError('apps-error');

    try {
        // Get all app parameters
        const params = await getParametersByPath(APPS_PREFIX);

        // Group by app ID
        const apps = {};
        params.forEach(param => {
            const parts = param.Name.replace(APPS_PREFIX + '/', '').split('/');
            const appId = parts[0];
            const key = parts[1];

            if (!apps[appId]) {
                apps[appId] = { id: appId, params: {} };
            }
            apps[appId].params[key] = param.Value;
        });

        // Always include the public app from config
        const publicApp = {
            id: 'public',
            params: {
                name: CONFIG.publicApp.name,
                distribution: 'public',
                'client-id': CONFIG.publicApp.clientId,
                status: CONFIG.publicApp.status,
                'api-url': CONFIG.publicApp.apiUrl,
                'frontend-url': CONFIG.publicApp.frontendUrl,
                'partners-link': 'https://partners.shopify.com'
            }
        };

        registeredApps = [publicApp, ...Object.values(apps)];

        loading.classList.add('hidden');
        renderApps(registeredApps);
        list.classList.remove('hidden');
    } catch (error) {
        console.error('Failed to load apps:', error);
        loading.classList.add('hidden');

        // Still show public app even on error
        registeredApps = [{
            id: 'public',
            params: {
                name: CONFIG.publicApp.name,
                distribution: 'public',
                'client-id': CONFIG.publicApp.clientId,
                status: CONFIG.publicApp.status,
                'api-url': CONFIG.publicApp.apiUrl,
                'frontend-url': CONFIG.publicApp.frontendUrl
            }
        }];
        renderApps(registeredApps);
        list.classList.remove('hidden');
    }
}

function renderApps(apps) {
    const grid = document.getElementById('apps-grid');
    grid.innerHTML = '';

    apps.forEach(app => {
        const isPublic = app.params.distribution === 'public';
        const status = app.params.status || 'pending';
        const name = app.params.name || `App ${app.id}`;

        const statusConfig = {
            active: { bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500', label: 'Active' },
            review: { bg: 'bg-yellow-100', text: 'text-yellow-800', dot: 'bg-yellow-500 animate-pulse', label: 'Under Review' },
            pending: { bg: 'bg-gray-100', text: 'text-gray-800', dot: 'bg-gray-400', label: 'Pending Setup' }
        };
        const statusStyle = statusConfig[status] || statusConfig.pending;

        const card = document.createElement('div');
        card.className = `border-2 ${isPublic ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-white'} rounded-xl p-4 hover:shadow-md transition cursor-pointer`;
        card.onclick = () => showAppDetails(app);

        card.innerHTML = `
            <div class="flex items-center justify-between mb-3">
                <span class="${isPublic ? 'bg-blue-600' : 'bg-gray-600'} text-white text-xs px-2 py-1 rounded-full">
                    ${isPublic ? 'Public' : 'Custom'}
                </span>
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}">
                    <span class="w-2 h-2 ${statusStyle.dot} rounded-full mr-1"></span>
                    ${statusStyle.label}
                </span>
            </div>
            <h3 class="font-semibold text-gray-900 mb-1 truncate" title="${escapeHtml(name)}">${escapeHtml(name)}</h3>
            <p class="text-xs text-gray-500 mb-3 truncate">
                ${app.params['client-id'] ? `ID: ${app.params['client-id'].substring(0, 12)}...` : 'No Client ID'}
            </p>
            <div class="flex items-center justify-between text-xs">
                <button onclick="event.stopPropagation(); showSetupInstructions(registeredApps.find(a => a.id === '${escapeHtml(app.id)}'))"
                    class="inline-flex items-center gap-1 text-green-600 hover:text-green-800 font-medium">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                    </svg>
                    Get Config
                </button>
                <span class="text-blue-600 hover:text-blue-800">View Details</span>
            </div>
        `;

        grid.appendChild(card);
    });

    // Add "Add App" placeholder card
    const addCard = document.createElement('div');
    addCard.className = 'border-2 border-dashed border-gray-300 rounded-xl p-4 flex items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition min-h-[160px]';
    addCard.onclick = showAddAppModal;
    addCard.innerHTML = `
        <div class="text-center">
            <svg class="w-8 h-8 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
            </svg>
            <span class="text-sm text-gray-500">Add Custom App</span>
        </div>
    `;
    grid.appendChild(addCard);
}

// ==================== ADD APP MODAL ====================

function showAddAppModal() {
    document.getElementById('add-app-modal').classList.remove('hidden');
    document.getElementById('add-app-form').reset();
    hideError('add-app-error');
}

function hideAddAppModal() {
    document.getElementById('add-app-modal').classList.add('hidden');
}

function handlePartnersLinkPaste(event) {
    setTimeout(() => {
        const link = event.target.value;
        // Parse Shopify Partners link: https://dev.shopify.com/dashboard/ORG_ID/apps/APP_ID
        // or: https://partners.shopify.com/ORG_ID/apps/APP_ID
        const match = link.match(/(?:dev\.shopify\.com|partners\.shopify\.com)\/dashboard\/(\d+)\/apps\/(\d+)/);
        if (match) {
            console.log('Parsed Partners link:', { orgId: match[1], appId: match[2] });
            // Could auto-fill some fields if we had API access
        }
    }, 100);
}

async function handleAddApp(e) {
    e.preventDefault();
    hideError('add-app-error');

    const btn = document.getElementById('add-app-btn');
    btn.disabled = true;
    btn.textContent = 'Registering...';

    try {
        const name = document.getElementById('app-name').value.trim();
        const distribution = document.getElementById('app-distribution').value;
        const clientId = document.getElementById('app-client-id').value.trim();
        const clientSecret = document.getElementById('app-client-secret').value.trim();
        const status = document.getElementById('app-status').value;
        const notes = document.getElementById('app-notes').value.trim();
        const partnersLink = document.getElementById('app-partners-link').value.trim();

        // Generate app ID from name (slug)
        const appId = name.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .substring(0, 30);

        // Store parameters
        const params = [
            { name: 'name', value: name, type: 'String' },
            { name: 'distribution', value: distribution, type: 'String' },
            { name: 'client-id', value: clientId, type: 'String' },
            { name: 'client-secret', value: clientSecret, type: 'SecureString' },
            { name: 'status', value: status, type: 'String' },
            { name: 'created-at', value: new Date().toISOString(), type: 'String' },
            { name: 'created-by', value: getUserEmail(), type: 'String' }
        ];

        if (notes) params.push({ name: 'notes', value: notes, type: 'String' });
        if (partnersLink) params.push({ name: 'partners-link', value: partnersLink, type: 'String' });

        // Save all parameters
        for (const param of params) {
            await ssm.putParameter({
                Name: `${APPS_PREFIX}/${appId}/${param.name}`,
                Value: param.value,
                Type: param.type,
                Overwrite: true,
                Description: `Duxly Connection app: ${name}`
            }).promise();
        }

        hideAddAppModal();
        loadRegisteredApps();
    } catch (error) {
        console.error('Failed to add app:', error);
        showError('add-app-error', 'Failed to register app: ' + error.message);
    }

    btn.disabled = false;
    btn.textContent = 'Register App';
}

// ==================== APP DETAILS MODAL ====================

function showAppDetails(app) {
    const modal = document.getElementById('app-details-modal');
    const title = document.getElementById('app-details-title');
    const content = document.getElementById('app-details-content');

    title.textContent = app.params.name || `App ${app.id}`;

    const isPublic = app.params.distribution === 'public';
    const status = app.params.status || 'pending';
    const statusConfig = {
        active: { bg: 'bg-green-100', text: 'text-green-800', label: 'Active' },
        review: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Under Review' },
        pending: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Pending Setup' }
    };
    const statusStyle = statusConfig[status] || statusConfig.pending;

    content.innerHTML = `
        <div class="space-y-4">
            <div class="flex items-center gap-2">
                <span class="${isPublic ? 'bg-blue-600' : 'bg-gray-600'} text-white text-xs px-2 py-1 rounded-full">
                    ${isPublic ? 'Public Distribution' : 'Custom Distribution'}
                </span>
                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}">
                    ${statusStyle.label}
                </span>
            </div>

            <div class="grid grid-cols-1 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-500 mb-1">Client ID (API Key)</label>
                    <div class="flex items-center gap-2">
                        <code class="text-sm bg-gray-100 px-2 py-1 rounded flex-1 overflow-x-auto">${escapeHtml(app.params['client-id'] || 'Not set')}</code>
                        ${app.params['client-id'] ? `<button onclick="copyToClipboard('${escapeHtml(app.params['client-id'])}')" class="text-blue-600 hover:text-blue-800 text-sm whitespace-nowrap">Copy</button>` : ''}
                    </div>
                </div>

                ${app.params['api-url'] ? `
                <div>
                    <label class="block text-sm font-medium text-gray-500 mb-1">API URL</label>
                    <code class="text-sm bg-gray-100 px-2 py-1 rounded block overflow-x-auto">${escapeHtml(app.params['api-url'])}</code>
                </div>
                ` : ''}

                ${app.params['frontend-url'] ? `
                <div>
                    <label class="block text-sm font-medium text-gray-500 mb-1">Frontend URL</label>
                    <code class="text-sm bg-gray-100 px-2 py-1 rounded block overflow-x-auto">${escapeHtml(app.params['frontend-url'])}</code>
                </div>
                ` : ''}

                ${app.params['partners-link'] ? `
                <div>
                    <label class="block text-sm font-medium text-gray-500 mb-1">Shopify Partners</label>
                    <a href="${escapeHtml(app.params['partners-link'])}" target="_blank" rel="noopener" class="text-blue-600 hover:text-blue-800 text-sm">
                        Open in Partners Dashboard
                    </a>
                </div>
                ` : ''}

                ${app.params['notes'] ? `
                <div>
                    <label class="block text-sm font-medium text-gray-500 mb-1">Notes</label>
                    <p class="text-sm text-gray-700">${escapeHtml(app.params['notes'])}</p>
                </div>
                ` : ''}

                ${app.params['created-at'] ? `
                <div>
                    <label class="block text-sm font-medium text-gray-500 mb-1">Created</label>
                    <p class="text-sm text-gray-700">${formatDate(app.params['created-at'])}${app.params['created-by'] ? ` by ${escapeHtml(app.params['created-by'])}` : ''}</p>
                </div>
                ` : ''}
            </div>

            <!-- Setup Config Button -->
            <div class="pt-4 border-t border-gray-200">
                <button onclick="hideAppDetailsModal(); showSetupInstructions(registeredApps.find(a => a.id === '${escapeHtml(app.id)}'))"
                    class="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition flex items-center justify-center gap-2 mb-3">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                    Generate Config & Setup Instructions
                </button>
            </div>

            ${!isPublic && app.id !== 'public' ? `
            <div class="flex justify-between">
                <button onclick="confirmDeleteApp('${escapeHtml(app.id)}', '${escapeHtml(app.params.name)}')" class="text-red-600 hover:text-red-800 text-sm font-medium">
                    Delete App
                </button>
                <button onclick="hideAppDetailsModal()" class="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition">
                    Close
                </button>
            </div>
            ` : `
            <div class="flex justify-end">
                <button onclick="hideAppDetailsModal()" class="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition">
                    Close
                </button>
            </div>
            `}
        </div>
    `;

    modal.classList.remove('hidden');
}

function hideAppDetailsModal() {
    document.getElementById('app-details-modal').classList.add('hidden');
}

async function confirmDeleteApp(appId, appName) {
    if (!confirm(`Are you sure you want to delete "${appName}"?\n\nThis will remove all stored credentials for this app.`)) {
        return;
    }

    try {
        // Get all parameters for this app
        const params = await getParametersByPath(`${APPS_PREFIX}/${appId}`);

        // Delete each parameter
        for (const param of params) {
            await ssm.deleteParameter({ Name: param.Name }).promise();
        }

        hideAppDetailsModal();
        loadRegisteredApps();
    } catch (error) {
        console.error('Failed to delete app:', error);
        alert('Failed to delete app: ' + error.message);
    }
}

// ==================== SHOPS MANAGEMENT ====================

async function loadConnectedShops() {
    const loading = document.getElementById('shops-loading');
    const list = document.getElementById('shops-list');
    const empty = document.getElementById('shops-empty');

    loading.classList.remove('hidden');
    list.classList.add('hidden');
    empty.classList.add('hidden');
    hideError('shops-error');

    try {
        // Get all parameters under the prefix (excluding /apps)
        const allParams = await getParametersByPath(CONFIG.parameterStorePrefix);

        // Filter out app configs and group by shop domain
        const shops = {};
        allParams.forEach(param => {
            // Skip /apps/ parameters
            if (param.Name.includes('/apps/')) return;

            const parts = param.Name.replace(CONFIG.parameterStorePrefix + '/', '').split('/');
            const shopDomain = parts[0];
            const key = parts[1];

            // Skip if this looks like an app ID (no dots in domain)
            if (!shopDomain.includes('.')) return;

            if (!shops[shopDomain]) {
                shops[shopDomain] = { domain: shopDomain, params: {} };
            }
            shops[shopDomain].params[key] = param;
        });

        loading.classList.add('hidden');

        if (Object.keys(shops).length === 0) {
            empty.classList.remove('hidden');
        } else {
            renderShops(Object.values(shops));
            list.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Failed to load shops:', error);
        loading.classList.add('hidden');
        showError('shops-error', 'Failed to load connected shops: ' + error.message);
    }
}

async function getParametersByPath(path) {
    const params = [];
    let nextToken = null;

    do {
        const result = await new Promise((resolve, reject) => {
            ssm.getParametersByPath({
                Path: path,
                Recursive: true,
                WithDecryption: false,
                NextToken: nextToken
            }, (err, data) => {
                if (err) reject(err);
                else resolve(data);
            });
        });

        params.push(...result.Parameters);
        nextToken = result.NextToken;
    } while (nextToken);

    return params;
}

function renderShops(shops) {
    const tbody = document.getElementById('shops-tbody');
    tbody.innerHTML = '';

    shops.forEach(shop => {
        const installedAt = shop.params['installed-at']?.Value || 'Unknown';
        const scopes = shop.params['scopes']?.Value || 'Unknown';
        const hasToken = !!shop.params['access-token'];

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="px-6 py-4">
                <div class="flex items-center">
                    <div class="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                        <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/>
                        </svg>
                    </div>
                    <div>
                        <div class="font-medium text-gray-900">${escapeHtml(shop.domain)}</div>
                        <div class="text-sm text-gray-500">Installed: ${formatDate(installedAt)}</div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4">
                ${hasToken
                    ? '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"><span class="w-2 h-2 bg-green-500 rounded-full mr-1.5"></span>Connected</span>'
                    : '<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800"><span class="w-2 h-2 bg-red-500 rounded-full mr-1.5"></span>No Token</span>'
                }
            </td>
            <td class="px-6 py-4 text-sm text-gray-500 max-w-xs">
                <div class="truncate" title="${escapeHtml(scopes)}">${escapeHtml(scopes)}</div>
            </td>
            <td class="px-6 py-4 text-sm">
                <button onclick="viewShopDetails('${escapeHtml(shop.domain)}')" class="text-blue-600 hover:text-blue-800 mr-3">View</button>
                <button onclick="confirmDisconnect('${escapeHtml(shop.domain)}')" class="text-red-600 hover:text-red-800">Disconnect</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function formatDate(isoString) {
    if (isoString === 'Unknown') return isoString;
    try {
        const date = new Date(isoString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch {
        return isoString;
    }
}

async function viewShopDetails(domain) {
    alert(`Shop: ${domain}\n\nTo view full details, check AWS Parameter Store:\n${CONFIG.parameterStorePrefix}/${domain}/`);
}

async function confirmDisconnect(domain) {
    if (confirm(`Are you sure you want to disconnect ${domain}?\n\nThis will remove the access token from Parameter Store.`)) {
        try {
            await ssm.deleteParameter({
                Name: `${CONFIG.parameterStorePrefix}/${domain}/access-token`
            }).promise();

            alert(`Disconnected ${domain} successfully.`);
            loadConnectedShops();
        } catch (error) {
            alert(`Failed to disconnect: ${error.message}`);
        }
    }
}

// ==================== HELPERS ====================

function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        // Brief visual feedback could be added here
        console.log('Copied to clipboard');
    });
}

// ==================== TOML GENERATION ====================

function generateTomlConfig(app) {
    const clientId = app.params['client-id'] || 'YOUR_CLIENT_ID';
    const appName = app.params.name || 'Duxly Connection';
    const appHandle = appName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    // Use the shared frontend/API URLs
    const frontendUrl = app.params['frontend-url'] || APP_CONFIG.frontendUrl;
    const apiUrl = app.params['api-url'] || APP_CONFIG.apiUrl;

    const toml = `# Shopify App Configuration for: ${appName}
# Generated by Duxly Connection Admin
# ${new Date().toISOString()}

# App Identity
name = "${appName}"
client_id = "${clientId}"
handle = "${appHandle}"

# App URLs
application_url = "${frontendUrl}"
embedded = true

# Access Scopes
[access_scopes]
scopes = "${DEFAULT_SCOPES}"
use_legacy_install_flow = false

# Authentication
[auth]
redirect_urls = [
    "${apiUrl}/callback"
]

# Webhooks Configuration
[webhooks]
api_version = "${APP_CONFIG.webhooksApiVersion}"

[[webhooks.subscriptions]]
topics = ["app/uninstalled"]
uri = "/webhooks"

# Build Settings (for local development)
[build]
automatically_update_urls_on_dev = true
include_config_on_deploy = true
`;

    return toml;
}

function getConfigName(app) {
    const appName = app.params.name || 'app';
    return appName.toLowerCase()
        .replace(/^duxly connection\s*/i, '')  // Remove "Duxly Connection" prefix
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'custom';
}

function downloadTomlConfig(app) {
    const toml = generateTomlConfig(app);
    const configName = getConfigName(app);
    const filename = `shopify.app.${configName}.toml`;

    const blob = new Blob([toml], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function showSetupInstructions(app) {
    const clientId = app.params['client-id'] || 'YOUR_CLIENT_ID';
    const appName = app.params.name || 'App';
    const partnersLink = app.params['partners-link'] || 'https://partners.shopify.com';
    const configName = getConfigName(app);

    // Generate the TOML content for preview
    const toml = generateTomlConfig(app);

    const modal = document.getElementById('setup-modal');
    const content = document.getElementById('setup-modal-content');

    content.innerHTML = `
        <div class="space-y-6">
            <!-- Introduction -->
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 class="font-medium text-blue-900 mb-2">Configure your Shopify app in 3 steps</h4>
                <p class="text-sm text-blue-700">
                    This will set up your app's scopes, URLs, and webhooks in Shopify Partners using the Shopify CLI.
                </p>
            </div>

            <!-- Step 1: Download TOML -->
            <div>
                <div class="flex items-center gap-2 mb-3">
                    <span class="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">1</span>
                    <h4 class="font-medium text-gray-900">Download Configuration File</h4>
                </div>
                <p class="text-sm text-gray-600 mb-3 ml-8">
                    Download the pre-configured TOML file with all settings for <strong>${escapeHtml(appName)}</strong>.
                </p>
                <div class="ml-8">
                    <button onclick="downloadTomlConfig(registeredApps.find(a => a.params['client-id'] === '${escapeHtml(clientId)}'))"
                        class="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition inline-flex items-center gap-2">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                        </svg>
                        Download shopify.app.${configName}.toml
                    </button>
                </div>
            </div>

            <!-- Step 2: Place file -->
            <div>
                <div class="flex items-center gap-2 mb-3">
                    <span class="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">2</span>
                    <h4 class="font-medium text-gray-900">Save to Project</h4>
                </div>
                <p class="text-sm text-gray-600 mb-3 ml-8">
                    Move the downloaded file to your Duxly Connection project root:
                </p>
                <div class="ml-8 bg-gray-900 rounded-lg p-3 font-mono text-sm text-green-400">
                    <code>mv ~/Downloads/shopify.app.${configName}.toml ~/Dev/duxly-connection/</code>
                </div>
                <p class="text-xs text-gray-500 mt-2 ml-8">
                    This keeps configs separate: <code class="bg-gray-800 px-1 rounded">shopify.app.${configName}.toml</code>
                </p>
            </div>

            <!-- Step 3: Deploy -->
            <div>
                <div class="flex items-center gap-2 mb-3">
                    <span class="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">3</span>
                    <h4 class="font-medium text-gray-900">Deploy Configuration</h4>
                </div>
                <p class="text-sm text-gray-600 mb-3 ml-8">
                    Run deploy with the <code class="bg-gray-100 px-1 rounded">--config</code> flag:
                </p>
                <div class="ml-8 space-y-2">
                    <div class="bg-gray-900 rounded-lg p-3 font-mono text-sm text-green-400">
                        <div class="text-gray-500 text-xs mb-1"># Navigate to project</div>
                        <code>cd ~/Dev/duxly-connection</code>
                    </div>
                    <div class="bg-gray-900 rounded-lg p-3 font-mono text-sm text-green-400">
                        <div class="text-gray-500 text-xs mb-1"># Deploy this specific app config</div>
                        <code>shopify app deploy --config=${configName}</code>
                    </div>
                </div>
                <p class="text-xs text-gray-500 mt-2 ml-8">
                    The <code class="bg-gray-100 px-1 rounded">--config</code> flag tells CLI to use <code class="bg-gray-100 px-1 rounded">shopify.app.${configName}.toml</code>
                </p>
            </div>

            <!-- What gets configured -->
            <div class="border-t border-gray-200 pt-4">
                <h4 class="font-medium text-gray-900 mb-3">What gets configured:</h4>
                <div class="grid grid-cols-2 gap-3 text-sm">
                    <div class="flex items-center gap-2">
                        <svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                        </svg>
                        <span>App URLs & Redirects</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                        </svg>
                        <span>Access Scopes</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                        </svg>
                        <span>Webhook Subscriptions</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <svg class="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
                        </svg>
                        <span>Embedded App Settings</span>
                    </div>
                </div>
            </div>

            <!-- TOML Preview (collapsible) -->
            <div class="border-t border-gray-200 pt-4">
                <button onclick="toggleTomlPreview()" class="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
                    <svg id="toml-chevron" class="w-4 h-4 transform transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                    </svg>
                    <span>View TOML configuration</span>
                </button>
                <div id="toml-preview" class="hidden mt-3">
                    <pre class="bg-gray-900 text-gray-100 rounded-lg p-4 text-xs overflow-x-auto max-h-64">${escapeHtml(toml)}</pre>
                </div>
            </div>

            <!-- Partners Link -->
            ${partnersLink && partnersLink !== 'https://partners.shopify.com' ? `
            <div class="border-t border-gray-200 pt-4">
                <a href="${escapeHtml(partnersLink)}" target="_blank" rel="noopener"
                    class="text-blue-600 hover:text-blue-800 text-sm inline-flex items-center gap-2">
                    Open app in Shopify Partners
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                    </svg>
                </a>
            </div>
            ` : ''}

            <!-- Close button -->
            <div class="pt-2 flex justify-end">
                <button onclick="hideSetupModal()" class="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-medium transition">
                    Close
                </button>
            </div>
        </div>
    `;

    modal.classList.remove('hidden');
}

function hideSetupModal() {
    document.getElementById('setup-modal').classList.add('hidden');
}

function toggleTomlPreview() {
    const preview = document.getElementById('toml-preview');
    const chevron = document.getElementById('toml-chevron');

    if (preview.classList.contains('hidden')) {
        preview.classList.remove('hidden');
        chevron.classList.add('rotate-90');
    } else {
        preview.classList.add('hidden');
        chevron.classList.remove('rotate-90');
    }
}
