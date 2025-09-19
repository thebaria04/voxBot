# Teams AI Foundry Bot Deployment

This directory contains deployment artifacts for the Teams AI Foundry Bot.

## Prerequisites

1. **Azure CLI** or **Azure PowerShell** installed and configured
2. **Azure subscription** with appropriate permissions
3. **Azure AD app registration** for the bot
4. **Azure AI Foundry** service configured

## Environment Variables

Create a `.env` file with the following variables:

```
AZURE_SUBSCRIPTION_ID=your-subscription-id
AZURE_RESOURCE_GROUP=teams-ai-foundry-bot-rg
AZURE_LOCATION=eastus
BOT_NAME=teams-ai-foundry-bot
MICROSOFT_APP_ID=your-bot-app-id
MICROSOFT_APP_PASSWORD=your-bot-app-secret
AI_FOUNDRY_ENDPOINT=https://your-ai-foundry-endpoint.com/v1/chat/completions
AI_FOUNDRY_API_KEY=your-ai-foundry-api-key
AI_FOUNDRY_DEPLOYMENT_NAME=gpt-4
```

## Deployment Steps

### Option 1: Using Node.js Script

```bash
node deploy.js
```

### Option 2: Using Azure CLI

```bash
chmod +x deploy.sh
./deploy.sh
```

### Option 3: Using PowerShell

```powershell
./deploy.ps1
```

## Manual Deployment

1. Generate parameters file:
   ```bash
   node -e "const dm = require('./deploy.js'); new dm.DeploymentManager().generateParametersFile();"
   ```

2. Deploy ARM template:
   ```bash
   az deployment group create \
       --resource-group teams-ai-foundry-bot-rg \
       --template-file arm-template.json \
       --parameters @parameters.json
   ```

## Resources Created

- **Azure Bot Service**: The bot registration
- **App Service Plan**: Hosting plan for the web app
- **Web App**: Node.js application hosting the bot
- **Key Vault**: Secure storage for secrets
- **Cognitive Services Speech**: Speech-to-text and text-to-speech
- **Application Insights**: Monitoring and logging
- **Managed Identity**: For secure authentication
- **Storage Account**: For bot state and file storage

## Post-Deployment

1. **Deploy Bot Code**: Deploy the Node.js application to the created Web App
2. **Upload Teams Manifest**: Use the generated `manifest-generated.json` file
3. **Test Bot**: Verify functionality in Teams
4. **Configure Permissions**: Ensure proper permissions for meeting access

## Troubleshooting

- Check Application Insights for logs and errors
- Verify Key Vault access policies
- Ensure bot endpoint is accessible and returns 200 OK
- Check Teams app manifest validation

## Security Notes

- Secrets are stored in Azure Key Vault
- Managed Identity is used for authentication
- HTTPS is enforced for all endpoints
- Bot uses certificate-based authentication when possible
