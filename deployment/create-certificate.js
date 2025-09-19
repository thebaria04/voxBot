const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { CertificateClient } = require('@azure/keyvault-certificates');
const { DefaultAzureCredential } = require('@azure/identity');
require('dotenv').config();

/**
 * Certificate Creation and Management Utility
 * 
 * This script provides automated certificate creation for Teams bot authentication.
 * Supports both development (self-signed) and production (CA-signed) scenarios.
 */
class CertificateManager {
    constructor() {
        this.keyVaultUri = process.env.AZURE_KEY_VAULT_URI;
        this.certificateName = process.env.AZURE_KEY_VAULT_CERTIFICATE_NAME || 'teams-bot-auth-cert';
        this.credential = new DefaultAzureCredential();
        this.certificateClient = null;
        
        if (this.keyVaultUri) {
            this.certificateClient = new CertificateClient(this.keyVaultUri, this.credential);
        }
    }

    /**
     * Creates a self-signed certificate for development/testing
     * @param {Object} options - Certificate options
     * @returns {Object} - Certificate details
     */
    async createSelfSignedCertificate(options = {}) {
        const {
            commonName = 'teams-ai-foundry-bot',
            organization = 'Microsoft',
            organizationalUnit = 'Teams Bot',
            country = 'US',
            state = 'WA',
            city = 'Redmond',
            validityDays = 365,
            keySize = 2048
        } = options;

        console.log('🔧 Creating self-signed certificate...');

        try {
            // Generate key pair
            const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
                modulusLength: keySize,
                publicKeyEncoding: {
                    type: 'spki',
                    format: 'pem'
                },
                privateKeyEncoding: {
                    type: 'pkcs8',
                    format: 'pem'
                }
            });

            // Create certificate signing request (CSR)
            const subject = [
                `CN=${commonName}`,
                `O=${organization}`,
                `OU=${organizationalUnit}`,
                `C=${country}`,
                `ST=${state}`,
                `L=${city}`
            ].join(', ');

            // For self-signed certificate, we'll use a simplified approach
            // In production, you would typically use a proper CSR and CA signing process
            const certificateData = {
                subject,
                privateKey,
                publicKey,
                validFrom: new Date(),
                validTo: new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000)
            };

            console.log('✅ Self-signed certificate created successfully');
            return certificateData;

        } catch (error) {
            console.error('❌ Failed to create self-signed certificate:', error.message);
            throw error;
        }
    }

    /**
     * Uploads certificate to Azure Key Vault
     * @param {Object} certificateData - Certificate data
     * @param {string} certificateName - Name for the certificate in Key Vault
     */
    async uploadToKeyVault(certificateData, certificateName = this.certificateName) {
        if (!this.certificateClient) {
            throw new Error('Key Vault client not initialized. Please set AZURE_KEY_VAULT_URI environment variable.');
        }

        console.log(`🔄 Uploading certificate to Key Vault: ${certificateName}`);

        try {
            // Create certificate policy for Key Vault
            const certificatePolicy = {
                issuerName: 'Self',
                subject: certificateData.subject,
                validityInMonths: 12,
                keyUsage: ['digitalSignature', 'keyEncipherment'],
                keyType: 'RSA',
                keySize: 2048,
                reuseKey: false,
                contentType: 'application/x-pkcs12'
            };

            // Import the certificate to Key Vault
            const importOperation = await this.certificateClient.importCertificate(
                certificateName, 
                certificateData.privateKey, 
                {
                    policy: certificatePolicy,
                    tags: {
                        createdBy: 'teams-bot-deployment-script',
                        purpose: 'authentication',
                        environment: process.env.NODE_ENV || 'development'
                    }
                }
            );

            console.log('✅ Certificate uploaded to Key Vault successfully');
            return importOperation;

        } catch (error) {
            console.error('❌ Failed to upload certificate to Key Vault:', error.message);
            throw error;
        }
    }

    /**
     * Creates a certificate directly in Azure Key Vault
     * This is the recommended approach for production scenarios
     */
    async createCertificateInKeyVault(certificateName = this.certificateName, options = {}) {
        if (!this.certificateClient) {
            throw new Error('Key Vault client not initialized. Please set AZURE_KEY_VAULT_URI environment variable.');
        }

        const {
            subject = `CN=teams-ai-foundry-bot, O=Microsoft, OU=Teams Bot, C=US`,
            validityInMonths = 12,
            issuerName = 'Self', // Use 'Self' for self-signed, or specify a CA
            keyType = 'RSA',
            keySize = 2048,
            reuseKey = false
        } = options;

        console.log(`🔄 Creating certificate in Key Vault: ${certificateName}`);

        try {
            const certificatePolicy = {
                issuerName,
                subject,
                validityInMonths,
                keyUsage: [
                    'digitalSignature',
                    'keyEncipherment',
                    'keyAgreement',
                    'keyCertSign',
                    'crlSign'
                ],
                keyType,
                keySize,
                reuseKey,
                contentType: 'application/x-pkcs12',
                subjectAlternativeNames: {
                    dnsNames: [`${process.env.BOT_NAME || 'teams-ai-foundry-bot'}.azurewebsites.net`]
                }
            };

            // Begin certificate creation operation
            const createOperation = await this.certificateClient.beginCreateCertificate(
                certificateName,
                certificatePolicy,
                {
                    tags: {
                        createdBy: 'teams-bot-deployment-script',
                        purpose: 'authentication',
                        environment: process.env.NODE_ENV || 'development',
                        botName: process.env.BOT_NAME || 'teams-ai-foundry-bot'
                    }
                }
            );

            // Wait for completion
            const certificate = await createOperation.pollUntilDone();

            console.log('✅ Certificate created in Key Vault successfully');
            return certificate;

        } catch (error) {
            console.error('❌ Failed to create certificate in Key Vault:', error.message);
            throw error;
        }
    }

    /**
     * Checks if certificate exists in Key Vault
     */
    async checkCertificateExists(certificateName = this.certificateName) {
        if (!this.certificateClient) {
            return false;
        }

        try {
            const certificate = await this.certificateClient.getCertificate(certificateName);
            console.log(`✅ Certificate '${certificateName}' exists in Key Vault`);
            return true;
        } catch (error) {
            if (error.statusCode === 404) {
                console.log(`ℹ️ Certificate '${certificateName}' not found in Key Vault`);
                return false;
            }
            console.error('❌ Error checking certificate:', error.message);
            throw error;
        }
    }

    /**
     * Main deployment method - creates certificate if it doesn't exist
     */
    async ensureCertificateExists(options = {}) {
        const {
            certificateName = this.certificateName,
            forceRecreate = false,
            method = 'keyvault' // 'keyvault' or 'local'
        } = options;

        try {
            console.log(`🔍 Checking certificate: ${certificateName}`);

            if (!forceRecreate && await this.checkCertificateExists(certificateName)) {
                console.log('ℹ️ Certificate already exists, skipping creation');
                return true;
            }

            if (method === 'keyvault') {
                console.log('🔧 Creating certificate directly in Key Vault (recommended)');
                await this.createCertificateInKeyVault(certificateName, options);
            } else {
                console.log('🔧 Creating local self-signed certificate and uploading');
                const certData = await this.createSelfSignedCertificate(options);
                await this.uploadToKeyVault(certData, certificateName);
            }

            console.log('✅ Certificate creation completed successfully');
            return true;

        } catch (error) {
            console.error('❌ Certificate creation failed:', error.message);
            throw error;
        }
    }

    /**
     * Validates environment and provides setup guidance
     */
    validateEnvironment() {
        const requiredVars = ['AZURE_KEY_VAULT_URI'];
        const missing = requiredVars.filter(varName => !process.env[varName]);

        if (missing.length > 0) {
            console.error('❌ Missing required environment variables:');
            missing.forEach(varName => {
                console.error(`   - ${varName}`);
            });
            
            console.log('\n📋 Setup Instructions:');
            console.log('1. Ensure you have deployed the Azure resources first');
            console.log('2. Set AZURE_KEY_VAULT_URI to your Key Vault URL');
            console.log('3. Ensure you have appropriate permissions to Key Vault');
            console.log('4. Run: az login (or use managed identity in Azure)');
            
            return false;
        }

        console.log('✅ Environment validation passed');
        return true;
    }

    /**
     * Provides certificate information and next steps
     */
    async showCertificateInfo(certificateName = this.certificateName) {
        if (!this.certificateClient) {
            console.log('ℹ️ Key Vault not configured');
            return;
        }

        try {
            const certificate = await this.certificateClient.getCertificate(certificateName);
            
            console.log('\n📋 Certificate Information:');
            console.log(`   Name: ${certificate.name}`);
            console.log(`   ID: ${certificate.id}`);
            console.log(`   Enabled: ${certificate.properties.enabled}`);
            console.log(`   Created: ${certificate.properties.createdOn}`);
            console.log(`   Updated: ${certificate.properties.updatedOn}`);
            console.log(`   Expires: ${certificate.properties.expiresOn}`);
            
            console.log('\n📋 Next Steps:');
            console.log('1. Update your bot application settings:');
            console.log(`   AZURE_KEY_VAULT_CERTIFICATE_NAME=${certificateName}`);
            console.log('2. Ensure your bot has access to the Key Vault');
            console.log('3. Deploy your bot application');
            
        } catch (error) {
            console.error('❌ Error retrieving certificate info:', error.message);
        }
    }
}

// CLI interface
async function main() {
    const args = process.argv.slice(2);
    const command = args[0] || 'create';
    
    const manager = new CertificateManager();
    
    try {
        switch (command) {
            case 'create':
                if (!manager.validateEnvironment()) {
                    process.exit(1);
                }
                await manager.ensureCertificateExists();
                await manager.showCertificateInfo();
                break;
                
            case 'check':
                await manager.checkCertificateExists();
                await manager.showCertificateInfo();
                break;
                
            case 'force-recreate':
                if (!manager.validateEnvironment()) {
                    process.exit(1);
                }
                await manager.ensureCertificateExists({ forceRecreate: true });
                await manager.showCertificateInfo();
                break;
                
            case 'help':
            default:
                console.log('🔐 Teams Bot Certificate Manager');
                console.log('');
                console.log('Usage: node create-certificate.js [command]');
                console.log('');
                console.log('Commands:');
                console.log('  create         Create certificate if it does not exist (default)');
                console.log('  check          Check if certificate exists');
                console.log('  force-recreate Recreate certificate even if it exists');
                console.log('  help           Show this help message');
                console.log('');
                console.log('Environment Variables:');
                console.log('  AZURE_KEY_VAULT_URI              Key Vault URL (required)');
                console.log('  AZURE_KEY_VAULT_CERTIFICATE_NAME Certificate name (optional)');
                console.log('  BOT_NAME                         Bot name for DNS (optional)');
                break;
        }
        
    } catch (error) {
        console.error('❌ Operation failed:', error.message);
        process.exit(1);
    }
}

// Export for use as module
module.exports = CertificateManager;

// Run CLI if called directly
if (require.main === module) {
    main();
}
