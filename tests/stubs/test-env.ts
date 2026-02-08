/**
 * Test Environment Configuration
 */

// Set test environment variables before loading anything
process.env['UPS_CLIENT_ID'] = 'test-client-id';
process.env['UPS_CLIENT_SECRET'] = 'test-client-secret';
process.env['UPS_ACCOUNT_NUMBER'] = 'test-account-123';
process.env['UPS_BASE_URL'] = 'https://onlinetools.ups.com';
process.env['UPS_TOKEN_URL'] = 'https://onlinetools.ups.com/security/v1/oauth/token';
