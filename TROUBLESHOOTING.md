# Troubleshooting Guide

## Authentication Issues

### Managed Identity Authentication Failed

#### Error Symptoms
```
error: ManagedIdentityCredential: Authentication failed. Message undefined: Error(s): Not Available - Description: Unable to load the proper Managed Identity.
```

#### Root Cause
This error occurs when the application is running in an Azure Web App environment where:
1. The Web App doesn't have a Managed Identity assigned
2. The Managed Identity doesn't have the required permissions
3. The Web App is configured incorrectly

#### Solutions

##### 1. Enable Managed Identity on Azure Web App
1. Go to your Azure Web App in the Azure Portal
2. Navigate to **Identity** > **System assigned**
3. Set **Status** to **On**
4. Click **Save**

##### 2. Assign Required Permissions
The Managed Identity needs the following permissions:

**For Key Vault access:**
- `Key Vault Secrets User` (to read secrets)
- `Key Vault Certificates User` (to read certificates)

**For Microsoft Graph:**
- `Microsoft Graph Application` permissions as needed for your bot

**To assign permissions:**
1. Go to **Azure Active Directory** > **Enterprise applications**
2. Find your Web App's Managed Identity
3. Go to **API permissions**
4. Add the required permissions

##### 3. Alternative Authentication Methods
If Managed Identity cannot be configured, the bot will automatically fall back to:

1. **Certificate-based authentication** (recommended for production)
   - Set `AZURE_KEY_VAULT_URI`
   - Set `AZURE_KEY_VAULT_CERTIFICATE_NAME`
   - Set `MICROSOFT_APP_TENANT_ID`
   - Set `MICROSOFT_APP_ID`

2. **Client Secret authentication** (simpler for development)
   - Set `MICROSOFT_APP_TENANT_ID`
   - Set `MICROSOFT_APP_ID`
   - Set `MICROSOFT_APP_PASSWORD`

3. **DefaultAzureCredential** (for local development)
   - Uses Azure CLI or Visual Studio credentials

#### Environment Variables Priority
The bot uses this priority order for authentication:
1. Managed Identity (if `AZURE_CLIENT_ID` or `MSI_ENDPOINT` is set)
2. Certificate-based (if Key Vault and certificate settings are configured)
3. Client Secret (if tenant, client ID, and secret are configured)
4. DefaultAzureCredential (fallback for development)

#### Debugging Steps
1. Check if Managed Identity is enabled:
   ```bash
   curl -H "Metadata: true" "http://169.254.169.254/metadata/identity/oauth2/token?api-version=2018-02-01&resource=https://management.azure.com/"
   ```

2. Verify environment variables:
   - `AZURE_CLIENT_ID` (should be empty if not using user-assigned MI)
   - `MSI_ENDPOINT` (automatically set by Azure)
   - `MICROSOFT_APP_ID` (your bot's application ID)
   - `MICROSOFT_APP_TENANT_ID` (your Azure AD tenant ID)

3. Check application logs for fallback authentication attempts

#### Prevention
- Always test authentication in a staging environment that matches production
- Document which authentication method is being used in each environment
- Set up proper monitoring and alerting for authentication failures

## Web Chat Integration

### Bot Not Responding in Web Chat
1. Verify the bot endpoint is accessible: `https://your-app.azurewebsites.net/api/messages`
2. Check that the bot is properly registered in Azure Bot Service
3. Ensure the Microsoft App ID and password/certificate are correctly configured
4. Review application logs for detailed error messages

### CORS Issues
If experiencing CORS errors:
1. Configure `ALLOWED_ORIGINS` environment variable
2. Ensure your web chat domain is included in the allowed origins
3. Check that the bot is responding with proper CORS headers

## Performance Issues

### Slow Response Times
1. Check if credential initialization is blocking requests
2. Monitor Key Vault response times
3. Consider implementing credential caching
4. Review AI Foundry API response times

### Memory Usage
1. Monitor for credential object leaks
2. Check if Graph Client instances are being properly reused
3. Review speech service resource management

## Monitoring and Logging

### Enable Debug Logging
Set environment variable:
```
LOG_LEVEL=debug
```

### Key Metrics to Monitor
- Authentication success/failure rates
- API response times (AI Foundry, Graph API, Key Vault)
- Memory usage and garbage collection
- Active WebSocket connections (for real-time features)

### Useful Log Queries
Search for authentication issues:
```
level:error AND (message:"Credential" OR message:"Authentication")
```

Search for bot conversation errors:
```
level:error AND message:"Bot turn error"
```
