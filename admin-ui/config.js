// Duxly Connection Admin Configuration
window.DUXLY_CONFIG = {
    // AWS Region
    region: 'eu-central-1',

    // Cognito User Pool (shared Duxly Auth)
    userPoolId: 'eu-central-1_c955gkxoe',
    clientId: '28d72k7d95ip8e7rjcb3mg0j8k',

    // Cognito Identity Pool (for AWS credentials)
    identityPoolId: 'eu-central-1:9d0aa27c-ace6-4b8e-9aa8-cb8678744321',

    // Admin emails (can manage apps)
    adminEmails: [
        'tim@duxly.nl',
        'jori@duxly.nl'
    ],

    // Parameter Store prefix for shop credentials
    parameterStorePrefix: '/shopify/duxly-connection',

    // Public app info
    publicApp: {
        name: 'Duxly Connection (Public)',
        clientId: '79f672bb13bc6ab7fa86755927ff9a6f',
        apiUrl: 'https://xehi9a6w6e.execute-api.eu-central-1.amazonaws.com/prod',
        frontendUrl: 'https://d3hd7mj8z35qoh.cloudfront.net',
        status: 'review' // 'active', 'review', 'draft'
    }
};
