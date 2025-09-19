# Azure Direct Deployment Guide

Since GitHub Actions hosted runners are disabled in your enterprise environment, you can deploy directly to Azure using the existing deployment scripts.

## Method 1: PowerShell Deployment Script

Use the existing PowerShell script:

```powershell
# Navigate to your project
cd "C:\Users\sthebaria\TeamsBot"

# Run the deployment script
.\deployment\deploy.ps1
```

## Method 2: Node.js Deployment Script

Use the Node.js deployment script:

```bash
# Navigate to your project
cd "C:\Users\sthebaria\TeamsBot"

# Run the deployment
npm run deploy
```

## Method 3: Manual Azure CLI Deployment

If you prefer more control:

```bash
# Login to Azure
az login

# Build and deploy
npm install
npm run test
az webapp deployment source config-zip --resource-group "your-resource-group" --name "VoxRepoBotTest-app-nr3qljggi6m6m" --src "./deployment.zip"
```

## Method 4: VS Code Azure Extension

1. Install the Azure App Service extension in VS Code
2. Sign in to Azure
3. Right-click your project folder
4. Select "Deploy to Web App"
5. Choose your existing app service

## Method 5: Azure DevOps Pipelines (Alternative)

If your organization supports Azure DevOps:

1. Create an Azure DevOps project
2. Set up a build pipeline
3. Configure release pipeline to Azure App Service
4. Connect to your GitHub repository

## Automated Deployment with Git Hooks

You can also set up automatic deployment when you push to Azure:

```bash
# Configure deployment source
az webapp deployment source config --name "VoxRepoBotTest-app-nr3qljggi6m6m" --resource-group "your-resource-group" --repo-url "https://github.com/sthebaria_microsoft/vox_repo" --branch "master" --manual-integration
```

## Environment Variables

Make sure to set these in Azure App Service Configuration:

- BOT_ID
- BOT_PASSWORD  
- AI_FOUNDRY_ENDPOINT
- AI_FOUNDRY_API_KEY
- SPEECH_SERVICE_KEY
- SPEECH_SERVICE_REGION

## Next Steps

1. Choose your preferred deployment method above
2. Test the deployment
3. Monitor logs in Azure portal
4. Set up monitoring and alerts