# Certificate Authentication Troubleshooting

This document explains how the Teams Bot handles certificate-based authentication and resolves common certificate authentication errors.

## Overview

The Teams Bot supports multiple authentication methods in the following priority order:
1. **Managed Identity** (for Azure-hosted scenarios)
2. **Certificate-based Authentication** (recommended for production)
3. **Client Secret Authentication** (simpler for development)
4. **Default Azure Credential** (for development/local testing)

## Certificate Authentication Fix

### Problem
The original implementation had an issue where `ClientCertificateCredential` from the Azure Identity library would fail with the error:
```
ClientCertificateCredential: Provide either a PEM certificate in string form, or the path to that certificate in the filesystem.
```

### Root Cause
The Azure Identity library's `ClientCertificateCredential` expects certificates in specific formats:
- PEM certificate string
- Path to a certificate file
- Properly formatted PKCS#12 certificate with password

However, certificates retrieved from Azure Key Vault are provided as base64-encoded PKCS#12 data, which needed to be converted to a compatible format.

### Solution
The `tryCreateCertificateCredential` method now implements a robust fallback mechanism with three approaches:

#### Approach 1: Direct Base64 String
```javascript
this.credential = new ClientCertificateCredential(
    tenantId,
    clientId,
    certificateInfo.certificate // Base64 string directly
);
```

#### Approach 2: Certificate Buffer
```javascript
const certBuffer = Buffer.from(certificateInfo.certificate, 'base64');
this.credential = new ClientCertificateCredential(
    tenantId,
    clientId,
    certBuffer
);
```

#### Approach 3: Temporary File Path
```javascript
// Write certificate to temporary file
const tempFilePath = path.join(tempDir, `cert-${Date.now()}-${randomId}.pfx`);
fs.writeFileSync(tempFilePath, certBuffer);

this.credential = new ClientCertificateCredential(
    tenantId,
    clientId,
    tempFilePath
);

// Clean up temporary file after successful creation
fs.unlinkSync(tempFilePath);
```

### Configuration

#### Required Environment Variables
```env
MICROSOFT_APP_ID=your-bot-app-id
MICROSOFT_APP_TENANT_ID=your-tenant-id
AZURE_KEY_VAULT_URI=https://your-keyvault.vault.azure.net/
AZURE_KEY_VAULT_CERTIFICATE_NAME=teams-bot-auth-cert
```

#### Optional Environment Variables
```env
# If your PKCS#12 certificate is password protected
AZURE_KEY_VAULT_CERTIFICATE_PASSWORD=your-certificate-password
```

### Error Handling

The implementation includes comprehensive error handling:
- Logs each authentication attempt with detailed error information
- Falls back gracefully through all available methods
- Provides clear error messages if all methods fail
- Automatically cleans up temporary files

### Testing Certificate Authentication

To test certificate authentication:

1. Ensure your Azure Key Vault contains a valid certificate
2. Configure the required environment variables
3. Run the bot - it will automatically attempt certificate authentication
4. Check the logs for authentication method used:
   ```
   Successfully using certificate-based credential
   ```

### Debugging

If certificate authentication fails, check the logs for:
- Certificate retrieval from Key Vault
- Each authentication approach attempted
- Specific error messages for each approach

The bot will continue to function using fallback authentication methods even if certificate authentication fails.
