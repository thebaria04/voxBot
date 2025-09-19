# Certificate Authentication Setup Guide

This guide explains how certificates are created and managed for Teams bot authentication.

## Overview

The Teams AI Foundry Bot supports two authentication methods:

1. **Client Secret Authentication** (Default)
   - Uses a client secret stored in Azure Key Vault
   - Simpler setup process
   - Recommended for development and testing

2. **Certificate-Based Authentication** (Recommended for Production)
   - Uses X.509 certificates for enhanced security
   - Certificates can be created automatically or manually
   - More secure than client secrets

## Certificate Creation Methods

### Method 1: Automated Certificate Creation (Recommended)

The deployment process can automatically create certificates in Azure Key Vault.

#### Prerequisites
- Azure Key Vault deployed (created by ARM template)
- Appropriate permissions to Key Vault
- Azure CLI or PowerShell authenticated

#### Steps
1. **Enable certificate authentication** in your `.env` file:
   ```bash
   USE_CERTIFICATE_AUTH=true
   AZURE_KEY_VAULT_URI=https://your-keyvault.vault.azure.net/
   AZURE_KEY_VAULT_CERTIFICATE_NAME=teams-bot-auth-cert
   ```

2. **Run the certificate creation script**:
   ```bash
   # After deploying Azure resources
   node deployment/create-certificate.js
   ```

3. **Verify certificate creation**:
   ```bash
   node deployment/create-certificate.js check
   ```

The script will:
- Create a self-signed certificate directly in Key Vault
- Set appropriate permissions for the managed identity
- Configure the certificate for authentication use

### Method 2: Manual Certificate Creation

You can create certificates manually in the Azure Portal or using Azure CLI.

#### Using Azure Portal
1. Navigate to your Key Vault in Azure Portal
2. Go to Certificates → Generate/Import
3. Choose "Generate" for self-signed certificate
4. Fill in certificate details:
   - Certificate Name: `teams-bot-auth-cert`
   - Subject: `CN=teams-ai-foundry-bot, O=Microsoft`
   - DNS Names: `your-bot-name.azurewebsites.net`
   - Validity Period: 12 months
5. Click Create

#### Using Azure CLI
```bash
# Create certificate in Key Vault
az keyvault certificate create \
  --vault-name your-keyvault-name \
  --name teams-bot-auth-cert \
  --policy @certificate-policy.json

# Where certificate-policy.json contains:
{
  "issuerName": "Self",
  "subject": "CN=teams-ai-foundry-bot, O=Microsoft",
  "validityInMonths": 12,
  "keyUsage": ["digitalSignature", "keyEncipherment"],
  "keyType": "RSA",
  "keySize": 2048
}
```

### Method 3: External Certificate Authority (Production)

For production deployments, use certificates from a trusted CA:

1. **Generate Certificate Signing Request (CSR)**:
   ```bash
   openssl req -new -newkey rsa:2048 -nodes \
     -keyout teams-bot.key \
     -out teams-bot.csr \
     -subj "/C=US/ST=WA/L=Redmond/O=Microsoft/CN=teams-ai-foundry-bot"
   ```

2. **Submit CSR to Certificate Authority**
3. **Import signed certificate to Key Vault**:
   ```bash
   az keyvault certificate import \
     --vault-name your-keyvault-name \
     --name teams-bot-auth-cert \
     --file certificate.pfx \
     --password certificate-password
   ```

## Configuration

### Environment Variables
```bash
# Required for certificate authentication
USE_CERTIFICATE_AUTH=true
AZURE_KEY_VAULT_URI=https://your-keyvault.vault.azure.net/
AZURE_KEY_VAULT_CERTIFICATE_NAME=teams-bot-auth-cert

# Bot configuration
MICROSOFT_APP_ID=your-bot-app-id
MICROSOFT_APP_TENANT_ID=your-tenant-id
```

### App Registration Setup
Ensure your Azure AD app registration has certificate authentication configured:

1. Go to Azure Portal → App Registrations → Your Bot App
2. Navigate to "Certificates & secrets"
3. Upload the certificate public key (.cer file)
4. Note the certificate thumbprint

## Permissions Required

The managed identity needs these Key Vault permissions:
- **Certificates**: Get, List, Import, Create
- **Keys**: Get, List, Sign, Verify
- **Secrets**: Get, List (for fallback scenarios)

These permissions are automatically configured by the ARM template.

## Testing Certificate Authentication

1. **Check certificate exists**:
   ```bash
   node deployment/create-certificate.js check
   ```

2. **Test authentication**:
   ```bash
   # Start your bot locally
   npm start
   
   # Check health endpoint
   curl http://localhost:3978/health
   ```

3. **Verify in logs**:
   Look for "Using certificate-based credential" in Application Insights or console logs.

## Troubleshooting

### Common Issues

1. **Certificate not found**
   - Verify `AZURE_KEY_VAULT_CERTIFICATE_NAME` matches the certificate name in Key Vault
   - Check managed identity has access to Key Vault

2. **Authentication failed**
   - Ensure certificate is not expired
   - Verify app registration has the certificate uploaded
   - Check tenant ID matches the certificate

3. **Key Vault access denied**
   - Verify managed identity permissions
   - Check Key Vault access policies
   - Ensure Key Vault allows application access

### Fallback to Client Secret

If certificate authentication fails, the bot will automatically fall back to client secret authentication if configured:

```bash
# In .env file
USE_CERTIFICATE_AUTH=false
MICROSOFT_APP_PASSWORD=your-client-secret
```

## Security Best Practices

1. **Certificate Rotation**
   - Set up automated certificate renewal
   - Monitor certificate expiration dates
   - Use Key Vault's auto-rotation feature when possible

2. **Key Protection**
   - Never export private keys from Key Vault
   - Use hardware security modules (HSM) for production
   - Implement proper access controls

3. **Monitoring**
   - Monitor certificate usage in Application Insights
   - Set up alerts for authentication failures
   - Regular security audits

## Production Considerations

1. **Use trusted Certificate Authority** instead of self-signed certificates
2. **Implement certificate rotation** procedures
3. **Use Azure Key Vault Premium** with HSM protection
4. **Set up monitoring and alerting** for certificate expiration
5. **Test disaster recovery** procedures

## Quick Reference

### Certificate Creation Commands
```bash
# Create certificate automatically
node deployment/create-certificate.js

# Check if certificate exists
node deployment/create-certificate.js check

# Force recreate certificate
node deployment/create-certificate.js force-recreate

# Show help
node deployment/create-certificate.js help
```

### Environment Variables
```bash
# Certificate authentication
USE_CERTIFICATE_AUTH=true
AZURE_KEY_VAULT_URI=https://your-kv.vault.azure.net/
AZURE_KEY_VAULT_CERTIFICATE_NAME=teams-bot-auth-cert

# Bot configuration
MICROSOFT_APP_ID=your-app-id
MICROSOFT_APP_TENANT_ID=your-tenant-id
```

This comprehensive approach ensures certificates can be created both automatically through scripts and manually through Azure Portal, addressing both development convenience and production security requirements.
