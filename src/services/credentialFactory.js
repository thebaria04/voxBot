const { DefaultAzureCredential, ManagedIdentityCredential, ClientCertificateCredential, ClientSecretCredential } = require('@azure/identity');
const { SecretClient } = require('@azure/keyvault-secrets');
const { CertificateClient } = require('@azure/keyvault-certificates');
const { Client } = require('@microsoft/microsoft-graph-client');
const { TokenCredentialAuthenticationProvider } = require('@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials');
const { Logger } = require('./logger');

class CredentialFactory {
    constructor() {
        this.logger = new Logger();
        
        // Skip credential setup in test environment
        if (process.env.NODE_ENV === 'test') {
            this.logger.info('Skipping credential factory setup in test environment');
            return;
        }
        
        this.credential = null;
        this.secretClient = null;
        this.certificateClient = null;
        this.graphClient = null;
        this.initializationError = null;
        this.isInitialized = false;
        
        // Initialize asynchronously without throwing errors
        this.initializeAsync();
    }
    
    async initializeAsync() {
        try {
            this.isInitialized = await this.initialize();
        } catch (error) {
            this.logger.error('Critical error in credential factory initialization', {
                error: error.message,
                stack: error.stack
            });
            this.initializationError = error;
            this.isInitialized = false;
        }
    }

    async initialize() {
        try {
            await this.setupCredentials();
            await this.setupKeyVaultClients();
            await this.setupGraphClient();
            
            this.logger.info('Credential factory initialized successfully');
            return true;
        } catch (error) {
            this.logger.error('Failed to initialize credential factory', {
                error: error.message,
                stack: error.stack
            });
            
            // Don't throw error during initialization to prevent app crash
            // Instead, log the error and allow the app to continue
            // Individual services can check if credentials are available before use
            this.initializationError = error;
            return false;
        }
    }

    async setupCredentials() {
        try {
            const keyVaultUri = process.env.AZURE_KEY_VAULT_URI;
            const certificateName = process.env.AZURE_KEY_VAULT_CERTIFICATE_NAME;
            const tenantId = process.env.MICROSOFT_APP_TENANT_ID;
            const clientId = process.env.MICROSOFT_APP_ID;
            const clientSecret = process.env.MICROSOFT_APP_PASSWORD;

            // Priority order for credential selection with fallback:
            // 1. Try Managed Identity (for Azure hosted scenarios)
            // 2. Try Certificate-based authentication (for production)
            // 3. Try Client Secret authentication (if available)
            // 4. Default Azure Credential (for development)

            let credentialAttempts = [];
            
            // Attempt 1: Managed Identity (only if we're likely in Azure environment)
            if (process.env.AZURE_CLIENT_ID || process.env.MSI_ENDPOINT) {
                try {
                    this.credential = new ManagedIdentityCredential();
                    await this.testCredential();
                    this.logger.info('Successfully using Managed Identity credential');
                    return;
                } catch (error) {
                    credentialAttempts.push({ type: 'ManagedIdentity', error: error.message });
                    this.logger.warn('Managed Identity credential failed, trying fallback options', { error: error.message });
                    this.credential = null;
                }
            }
            
            // Attempt 2: Certificate-based authentication
            if (keyVaultUri && certificateName && tenantId && clientId) {
                try {
                    const certificateInfo = await this.getCertificateFromKeyVault(keyVaultUri, certificateName);
                    
                    // Try different approaches for ClientCertificateCredential
                    await this.tryCreateCertificateCredential(tenantId, clientId, certificateInfo);
                    
                    await this.testCredential();
                    this.logger.info('Successfully using certificate-based credential');
                    return;
                } catch (error) {
                    credentialAttempts.push({ type: 'ClientCertificate', error: error.message });
                    this.logger.warn('Certificate-based credential failed, trying fallback options', { error: error.message });
                    this.credential = null;
                }
            }
            
            // Attempt 3: Client Secret authentication (if available)
            if (tenantId && clientId && clientSecret) {
                try {
                    const { ClientSecretCredential } = require('@azure/identity');
                    this.credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
                    await this.testCredential();
                    this.logger.info('Successfully using client secret credential');
                    return;
                } catch (error) {
                    credentialAttempts.push({ type: 'ClientSecret', error: error.message });
                    this.logger.warn('Client secret credential failed, trying fallback options', { error: error.message });
                    this.credential = null;
                }
            }
            
            // Attempt 4: Default Azure Credential (for development)
            try {
                this.credential = new DefaultAzureCredential();
                await this.testCredential();
                this.logger.info('Successfully using DefaultAzureCredential');
                return;
            } catch (error) {
                credentialAttempts.push({ type: 'DefaultAzureCredential', error: error.message });
                this.logger.error('All credential attempts failed', { attempts: credentialAttempts });
                throw new Error(`All authentication methods failed. Attempts: ${JSON.stringify(credentialAttempts)}`);
            }

        } catch (error) {
            this.logger.error('Failed to setup credentials', { error: error.message });
            throw error;
        }
    }

    async getCertificateFromKeyVault(keyVaultUri, certificateName) {
        try {
            // Use DefaultAzureCredential temporarily to access Key Vault for certificate
            const tempCredential = new DefaultAzureCredential();
            const tempCertClient = new CertificateClient(keyVaultUri, tempCredential);
            
            // Get the certificate and its secret (which contains the private key)
            const certificate = await tempCertClient.getCertificate(certificateName);
            
            // Get the secret that contains the private key in PKCS#12 format
            const { SecretClient } = require('@azure/keyvault-secrets');
            const tempSecretClient = new SecretClient(keyVaultUri, tempCredential);
            const secretResponse = await tempSecretClient.getSecret(certificateName);
            
            this.logger.info('Certificate retrieved from Key Vault', {
                certificateName,
                keyVaultUri
            });
            
            // The secret value contains the PKCS#12 certificate with private key in base64
            // For ClientCertificateCredential, we can pass the base64 string directly
            // or convert to buffer depending on the library expectation
            
            // Try different formats that ClientCertificateCredential accepts
            const certificateData = secretResponse.value; // Base64 string from Key Vault
            
            // Option 1: Try as base64 string (some versions accept this)
            // Option 2: Try as buffer
            // Option 3: Try writing to temp file and use file path
            
            return {
                certificate: certificateData, // Keep as base64 string first
                password: process.env.AZURE_KEY_VAULT_CERTIFICATE_PASSWORD || '', // Optional password
                format: 'pkcs12'
            };
            
        } catch (error) {
            this.logger.error('Failed to get certificate from Key Vault', {
                error: error.message,
                certificateName,
                keyVaultUri
            });
            throw error;
        }
    }

    async tryCreateCertificateCredential(tenantId, clientId, certificateInfo) {
        const fs = require('fs');
        const path = require('path');
        const os = require('os');
        
        const errors = [];
        
        // Approach 1: Try direct certificate data (base64 string)
        try {
            this.logger.info('Attempting certificate credential with base64 string');
            this.credential = new ClientCertificateCredential(
                tenantId,
                clientId,
                certificateInfo.certificate
            );
            return; // Success
        } catch (error) {
            errors.push({ approach: 'base64String', error: error.message });
            this.logger.debug('Base64 string approach failed', { error: error.message });
        }
        
        // Approach 2: Try with certificate buffer
        try {
            this.logger.info('Attempting certificate credential with buffer');
            const certBuffer = Buffer.from(certificateInfo.certificate, 'base64');
            this.credential = new ClientCertificateCredential(
                tenantId,
                clientId,
                certBuffer
            );
            return; // Success
        } catch (error) {
            errors.push({ approach: 'buffer', error: error.message });
            this.logger.debug('Buffer approach failed', { error: error.message });
        }
        
        // Approach 3: Write certificate to temporary file and use file path
        let tempFilePath = null;
        try {
            this.logger.info('Attempting certificate credential with temporary file');
            
            // Create a temporary file
            const tempDir = os.tmpdir();
            tempFilePath = path.join(tempDir, `cert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.pfx`);
            
            // Write certificate to temp file
            const certBuffer = Buffer.from(certificateInfo.certificate, 'base64');
            fs.writeFileSync(tempFilePath, certBuffer);
            
            this.credential = new ClientCertificateCredential(
                tenantId,
                clientId,
                tempFilePath
            );
            
            // Clean up temp file after successful credential creation
            try {
                fs.unlinkSync(tempFilePath);
                this.logger.debug('Temporary certificate file cleaned up', { tempFilePath });
            } catch (cleanupError) {
                this.logger.warn('Failed to cleanup temporary certificate file', { 
                    tempFilePath, 
                    error: cleanupError.message 
                });
            }
            
            return; // Success
        } catch (error) {
            errors.push({ approach: 'tempFile', error: error.message });
            this.logger.debug('Temporary file approach failed', { error: error.message });
            
            // Clean up temp file on error
            if (tempFilePath && fs.existsSync(tempFilePath)) {
                try {
                    fs.unlinkSync(tempFilePath);
                } catch (cleanupError) {
                    this.logger.warn('Failed to cleanup temporary certificate file after error', { 
                        tempFilePath, 
                        error: cleanupError.message 
                    });
                }
            }
        }
        
        // If all approaches failed, throw a comprehensive error
        throw new Error(`All certificate credential approaches failed: ${JSON.stringify(errors)}`);
    }


    async setupKeyVaultClients() {
        try {
            const keyVaultUri = process.env.AZURE_KEY_VAULT_URI;
            
            if (keyVaultUri && this.credential) {
                this.secretClient = new SecretClient(keyVaultUri, this.credential);
                this.certificateClient = new CertificateClient(keyVaultUri, this.credential);
                
                this.logger.info('Key Vault clients initialized', { keyVaultUri });
            } else {
                this.logger.warn('Key Vault URI not configured, skipping Key Vault client setup');
            }
            
        } catch (error) {
            this.logger.error('Failed to setup Key Vault clients', { error: error.message });
            throw error;
        }
    }

    async setupGraphClient() {
        try {
            if (!this.credential) {
                throw new Error('Credential not initialized');
            }

            const scopes = process.env.GRAPH_SCOPES ? 
                process.env.GRAPH_SCOPES.split(',') : 
                ['https://graph.microsoft.com/.default'];

            const authProvider = new TokenCredentialAuthenticationProvider(this.credential, { scopes });
            
            this.graphClient = Client.initWithMiddleware({
                authProvider: authProvider
            });

            this.logger.info('Microsoft Graph client initialized', { scopes });

        } catch (error) {
            this.logger.error('Failed to setup Microsoft Graph client', { error: error.message });
            throw error;
        }
    }

    async testCredential() {
        try {
            if (!this.credential) {
                throw new Error('No credential available to test');
            }

            // Test credential by requesting a token
            const tokenResponse = await this.credential.getToken('https://graph.microsoft.com/.default');
            
            if (tokenResponse && tokenResponse.token) {
                this.logger.info('Credential test successful');
                return true;
            } else {
                throw new Error('No token received from credential');
            }
            
        } catch (error) {
            this.logger.error('Credential test failed', { error: error.message });
            throw error;
        }
    }

    async getSecret(secretName) {
        try {
            await this.ensureCredentialAvailable();
            
            if (!this.secretClient) {
                throw new Error('Secret client not initialized. Ensure AZURE_KEY_VAULT_URI is configured.');
            }

            const secret = await this.secretClient.getSecret(secretName);
            
            this.logger.info('Secret retrieved successfully', { secretName });
            return secret.value;
            
        } catch (error) {
            this.logger.error('Failed to get secret', { 
                error: error.message,
                secretName 
            });
            throw error;
        }
    }

    async setSecret(secretName, secretValue) {
        try {
            if (!this.secretClient) {
                throw new Error('Secret client not initialized. Ensure AZURE_KEY_VAULT_URI is configured.');
            }

            await this.secretClient.setSecret(secretName, secretValue);
            
            this.logger.info('Secret set successfully', { secretName });
            
        } catch (error) {
            this.logger.error('Failed to set secret', { 
                error: error.message,
                secretName 
            });
            throw error;
        }
    }

    async getCertificate(certificateName) {
        try {
            if (!this.certificateClient) {
                throw new Error('Certificate client not initialized. Ensure AZURE_KEY_VAULT_URI is configured.');
            }

            const certificate = await this.certificateClient.getCertificate(certificateName);
            
            this.logger.info('Certificate retrieved successfully', { certificateName });
            return certificate;
            
        } catch (error) {
            this.logger.error('Failed to get certificate', { 
                error: error.message,
                certificateName 
            });
            throw error;
        }
    }

    getGraphClient() {
        if (!this.graphClient) {
            throw new Error('Microsoft Graph client not initialized');
        }
        return this.graphClient;
    }

    getCredential() {
        if (!this.credential) {
            throw new Error('Credential not initialized');
        }
        return this.credential;
    }

    async getAccessToken(scopes = ['https://graph.microsoft.com/.default']) {
        try {
            await this.ensureCredentialAvailable();

            const scopeString = Array.isArray(scopes) ? scopes.join(' ') : scopes;
            const tokenResponse = await this.credential.getToken(scopeString);
            
            if (tokenResponse && tokenResponse.token) {
                this.logger.debug('Access token retrieved', { 
                    scopes: scopeString,
                    expiresOn: tokenResponse.expiresOnTimestamp 
                });
                return tokenResponse.token;
            } else {
                throw new Error('No token received from credential');
            }
            
        } catch (error) {
            this.logger.error('Failed to get access token', { 
                error: error.message,
                scopes 
            });
            throw error;
        }
    }

    async refreshCredentials() {
        try {
            this.logger.info('Refreshing credentials');
            await this.setupCredentials();
            await this.setupKeyVaultClients();
            await this.setupGraphClient();
            this.logger.info('Credentials refreshed successfully');
            
        } catch (error) {
            this.logger.error('Failed to refresh credentials', { error: error.message });
            throw error;
        }
    }

    getHealthStatus() {
        return {
            credential: this.credential ? 'initialized' : 'not initialized',
            secretClient: this.secretClient ? 'initialized' : 'not initialized',
            certificateClient: this.certificateClient ? 'initialized' : 'not initialized',
            graphClient: this.graphClient ? 'initialized' : 'not initialized',
            keyVaultUri: process.env.AZURE_KEY_VAULT_URI ? 'configured' : 'not configured'
        };
    }

    // Teams-specific methods for meeting and calling scenarios
    async getTeamsMeetingToken() {
        try {
            return await this.getAccessToken(['https://graph.microsoft.com/OnlineMeetings.ReadWrite']);
        } catch (error) {
            this.logger.error('Failed to get Teams meeting token', { error: error.message });
            throw error;
        }
    }

    async getCallingToken() {
        try {
            return await this.getAccessToken(['https://graph.microsoft.com/Calls.AccessMedia.All']);
        } catch (error) {
            this.logger.error('Failed to get calling token', { error: error.message });
            throw error;
        }
    }

    async createTeamsMeeting(meetingDetails) {
        try {
            const graphClient = this.getGraphClient();
            
            const onlineMeeting = await graphClient
                .api('/me/onlineMeetings')
                .post(meetingDetails);
                
            this.logger.info('Teams meeting created', { meetingId: onlineMeeting.id });
            return onlineMeeting;
            
        } catch (error) {
            this.logger.error('Failed to create Teams meeting', { error: error.message });
            throw error;
        }
    }

    // Helper methods for checking credential availability
    isCredentialAvailable() {
        return this.credential !== null && this.isInitialized;
    }

    hasInitializationError() {
        return this.initializationError !== null;
    }

    getInitializationError() {
        return this.initializationError;
    }

    async waitForInitialization(timeoutMs = 30000) {
        const startTime = Date.now();
        
        while (!this.isInitialized && !this.initializationError && (Date.now() - startTime) < timeoutMs) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        if (this.initializationError) {
            throw this.initializationError;
        }
        
        if (!this.isInitialized) {
            throw new Error('Credential initialization timeout');
        }
        
        return this.isInitialized;
    }

    async ensureCredentialAvailable() {
        if (process.env.NODE_ENV === 'test') {
            this.logger.debug('Skipping credential check in test environment');
            return;
        }

        if (!this.isInitialized && !this.initializationError) {
            this.logger.info('Waiting for credential initialization to complete');
            await this.waitForInitialization();
        }

        if (this.initializationError) {
            throw new Error(`Credentials not available: ${this.initializationError.message}`);
        }

        if (!this.credential) {
            throw new Error('No credential available after initialization');
        }
    }
}

module.exports = { CredentialFactory };
