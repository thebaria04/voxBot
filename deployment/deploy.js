const fs = require('fs');
const path = require('path');
const CertificateManager = require('./create-certificate');
require('dotenv').config({ path: '../.env' });

class DeploymentManager {
    constructor() {
        this.resourceGroupName = process.env.AZURE_RESOURCE_GROUP || 'teams-ai-foundry-bot-rg';
        this.location = process.env.AZURE_LOCATION || 'eastus';
        this.subscriptionId = process.env.AZURE_SUBSCRIPTION_ID;
        this.botName = process.env.BOT_NAME || 'teams-ai-foundry-bot';
        this.botAppId = process.env.MICROSOFT_APP_ID;
        this.botAppSecret = process.env.MICROSOFT_APP_PASSWORD;
        this.aiFoundryEndpoint = process.env.AI_FOUNDRY_ENDPOINT;
        this.aiFoundryApiKey = process.env.AI_FOUNDRY_API_KEY;
        this.aiFoundryDeploymentName = process.env.AI_FOUNDRY_DEPLOYMENT_NAME || 'gpt-4';
        this.useCertificateAuth = process.env.USE_CERTIFICATE_AUTH === 'true';
        this.certificateManager = new CertificateManager();
    }

    validateEnvironment() {
        const requiredVars = [
            'AZURE_SUBSCRIPTION_ID',
            'MICROSOFT_APP_ID',
            'MICROSOFT_APP_PASSWORD',
            'AI_FOUNDRY_ENDPOINT',
            'AI_FOUNDRY_API_KEY'
        ];

        const missing = requiredVars.filter(varName => !process.env[varName]);
        
        if (missing.length > 0) {
            throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
        }

        console.log('✅ Environment validation passed');
    }

    generateParametersFile() {
        const parameters = {
            "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
            "contentVersion": "1.0.0.0",
            "parameters": {
                "botName": {
                    "value": this.botName
                },
                "botDisplayName": {
                    "value": "AI Foundry Teams Bot"
                },
                "botDescription": {
                    "value": "Intelligent Teams bot powered by Azure AI Foundry with speech capabilities"
                },
                "botAppId": {
                    "value": this.botAppId
                },
                "botAppSecret": {
                    "value": this.botAppSecret
                },
                "location": {
                    "value": this.location
                },
                "aiFoundryEndpoint": {
                    "value": this.aiFoundryEndpoint
                },
                "aiFoundryApiKey": {
                    "value": this.aiFoundryApiKey
                },
                "aiFoundryDeploymentName": {
                    "value": this.aiFoundryDeploymentName
                }
            }
        };

        const parametersPath = path.join(__dirname, 'parameters.json');
        fs.writeFileSync(parametersPath, JSON.stringify(parameters, null, 2));
        console.log(`✅ Parameters file generated: ${parametersPath}`);
        
        return parametersPath;
    }

    generateTeamsManifest() {
        const manifestPath = path.join(__dirname, 'manifest.json');
        let manifestContent = fs.readFileSync(manifestPath, 'utf8');
        
        // Replace placeholders
        manifestContent = manifestContent
            .replace(/{{MICROSOFT_APP_ID}}/g, this.botAppId)
            .replace(/{{BOT_DOMAIN}}/g, `https://${this.botName}-app-${this.getUniqueString()}.azurewebsites.net`);
        
        const outputPath = path.join(__dirname, 'manifest-generated.json');
        fs.writeFileSync(outputPath, manifestContent);
        console.log(`✅ Teams manifest generated: ${outputPath}`);
        
        return outputPath;
    }

    getUniqueString() {
        // Simple hash function to simulate ARM's uniqueString()
        const str = this.resourceGroupName + this.subscriptionId;
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash).toString().substring(0, 8);
    }

    /**
     * Creates or ensures certificate exists for bot authentication
     * This addresses the certificate creation requirement
     */
    async setupCertificateAuthentication() {
        if (!this.useCertificateAuth) {
            console.log('ℹ️ Certificate authentication not enabled, skipping certificate setup');
            console.log('   Set USE_CERTIFICATE_AUTH=true to enable certificate-based authentication');
            return;
        }

        console.log('🔐 Setting up certificate authentication...');

        try {
            // Validate certificate environment
            if (!this.certificateManager.validateEnvironment()) {
                console.log('⚠️ Key Vault not configured for certificate creation');
                console.log('📋 Certificate Setup Options:');
                console.log('');
                console.log('Option 1: Manual Certificate Creation');
                console.log('1. Create certificate in Azure Key Vault manually');
                console.log('2. Set AZURE_KEY_VAULT_CERTIFICATE_NAME environment variable');
                console.log('3. Ensure bot has access to Key Vault');
                console.log('');
                console.log('Option 2: Automated Certificate Creation (Recommended)');
                console.log('1. Deploy Azure resources first (to create Key Vault)');
                console.log('2. Set AZURE_KEY_VAULT_URI environment variable');
                console.log('3. Run: node deployment/create-certificate.js');
                console.log('4. Re-run deployment');
                return;
            }

            // Create certificate if it doesn't exist
            await this.certificateManager.ensureCertificateExists({
                certificateName: process.env.AZURE_KEY_VAULT_CERTIFICATE_NAME || 'teams-bot-auth-cert',
                method: 'keyvault' // Create directly in Key Vault (recommended)
            });

            console.log('✅ Certificate authentication setup completed');

        } catch (error) {
            console.error('❌ Certificate setup failed:', error.message);
            console.log('');
            console.log('📋 Fallback Options:');
            console.log('1. Use client secret authentication (set USE_CERTIFICATE_AUTH=false)');
            console.log('2. Create certificate manually in Azure portal');
            console.log('3. Check Azure permissions and try again');
            throw error;
        }
    }

    generateAzureCliCommands() {
        const commands = [
            '#!/bin/bash',
            '# Azure CLI deployment script for Teams AI Foundry Bot',
            '',
            'set -e',
            '',
            '# Variables',
            `RESOURCE_GROUP="${this.resourceGroupName}"`,
            `LOCATION="${this.location}"`,
            `SUBSCRIPTION_ID="${this.subscriptionId}"`,
            `TEMPLATE_FILE="arm-template.json"`,
            `PARAMETERS_FILE="parameters.json"`,
            '',
            '# Set subscription',
            'echo "Setting Azure subscription..."',
            'az account set --subscription $SUBSCRIPTION_ID',
            '',
            '# Create resource group',
            'echo "Creating resource group..."',
            'az group create --name $RESOURCE_GROUP --location $LOCATION',
            '',
            '# Deploy ARM template',
            'echo "Deploying ARM template..."',
            'az deployment group create \\',
            '    --resource-group $RESOURCE_GROUP \\',
            '    --template-file $TEMPLATE_FILE \\',
            '    --parameters @$PARAMETERS_FILE \\',
            '    --verbose',
            '',
            '# Get deployment outputs',
            'echo "Getting deployment outputs..."',
            'az deployment group show \\',
            '    --resource-group $RESOURCE_GROUP \\',
            '    --name arm-template \\',
            '    --query properties.outputs',
            '',
            'echo "Deployment completed successfully!"',
            'echo "Next steps:"',
            'echo "1. Upload the Teams app package to Microsoft Teams"',
            'echo "2. Test the bot functionality"',
            'echo "3. Configure additional settings as needed"'
        ];

        const scriptPath = path.join(__dirname, 'deploy.sh');
        fs.writeFileSync(scriptPath, commands.join('\n'));
        
        // Make script executable (on Unix systems)
        try {
            fs.chmodSync(scriptPath, '755');
        } catch (error) {
            // Ignore chmod errors on Windows
        }
        
        console.log(`✅ Azure CLI deployment script generated: ${scriptPath}`);
        return scriptPath;
    }

    generatePowerShellCommands() {
        const commands = [
            '# PowerShell deployment script for Teams AI Foundry Bot',
            '',
            '$ErrorActionPreference = "Stop"',
            '',
            '# Variables',
            `$resourceGroup = "${this.resourceGroupName}"`,
            `$location = "${this.location}"`,
            `$subscriptionId = "${this.subscriptionId}"`,
            '$templateFile = "arm-template.json"',
            '$parametersFile = "parameters.json"',
            '',
            '# Set subscription',
            'Write-Host "Setting Azure subscription..." -ForegroundColor Green',
            'Set-AzContext -SubscriptionId $subscriptionId',
            '',
            '# Create resource group',
            'Write-Host "Creating resource group..." -ForegroundColor Green',
            'New-AzResourceGroup -Name $resourceGroup -Location $location -Force',
            '',
            '# Deploy ARM template',
            'Write-Host "Deploying ARM template..." -ForegroundColor Green',
            '$deployment = New-AzResourceGroupDeployment `',
            '    -ResourceGroupName $resourceGroup `',
            '    -TemplateFile $templateFile `',
            '    -TemplateParameterFile $parametersFile `',
            '    -Verbose',
            '',
            '# Display outputs',
            'Write-Host "Deployment outputs:" -ForegroundColor Green',
            '$deployment.Outputs',
            '',
            'Write-Host "Deployment completed successfully!" -ForegroundColor Green',
            'Write-Host "Next steps:" -ForegroundColor Yellow',
            'Write-Host "1. Upload the Teams app package to Microsoft Teams"',
            'Write-Host "2. Test the bot functionality"',
            'Write-Host "3. Configure additional settings as needed"'
        ];

        const scriptPath = path.join(__dirname, 'deploy.ps1');
        fs.writeFileSync(scriptPath, commands.join('\n'));
        console.log(`✅ PowerShell deployment script generated: ${scriptPath}`);
        
        return scriptPath;
    }

    generateReadme() {
        const readme = `# Teams AI Foundry Bot Deployment

This directory contains deployment artifacts for the Teams AI Foundry Bot.

## Prerequisites

1. **Azure CLI** or **Azure PowerShell** installed and configured
2. **Azure subscription** with appropriate permissions
3. **Azure AD app registration** for the bot
4. **Azure AI Foundry** service configured

## Environment Variables

Create a \`.env\` file with the following variables:

\`\`\`
AZURE_SUBSCRIPTION_ID=your-subscription-id
AZURE_RESOURCE_GROUP=teams-ai-foundry-bot-rg
AZURE_LOCATION=eastus
BOT_NAME=teams-ai-foundry-bot
MICROSOFT_APP_ID=your-bot-app-id
MICROSOFT_APP_PASSWORD=your-bot-app-secret
AI_FOUNDRY_ENDPOINT=https://your-ai-foundry-endpoint.com/v1/chat/completions
AI_FOUNDRY_API_KEY=your-ai-foundry-api-key
AI_FOUNDRY_DEPLOYMENT_NAME=gpt-4
\`\`\`

## Deployment Steps

### Option 1: Using Node.js Script

\`\`\`bash
node deploy.js
\`\`\`

### Option 2: Using Azure CLI

\`\`\`bash
chmod +x deploy.sh
./deploy.sh
\`\`\`

### Option 3: Using PowerShell

\`\`\`powershell
./deploy.ps1
\`\`\`

## Manual Deployment

1. Generate parameters file:
   \`\`\`bash
   node -e "const dm = require('./deploy.js'); new dm.DeploymentManager().generateParametersFile();"
   \`\`\`

2. Deploy ARM template:
   \`\`\`bash
   az deployment group create \\
       --resource-group teams-ai-foundry-bot-rg \\
       --template-file arm-template.json \\
       --parameters @parameters.json
   \`\`\`

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
2. **Upload Teams Manifest**: Use the generated \`manifest-generated.json\` file
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
`;

        const readmePath = path.join(__dirname, 'README.md');
        fs.writeFileSync(readmePath, readme);
        console.log(`✅ Deployment README generated: ${readmePath}`);
        
        return readmePath;
    }

    async deploy() {
        try {
            console.log('🚀 Starting Teams AI Foundry Bot deployment...');
            
            this.validateEnvironment();
            
            // Setup certificate authentication if enabled
            if (this.useCertificateAuth) {
                await this.setupCertificateAuthentication();
            }
            
            this.generateParametersFile();
            this.generateTeamsManifest();
            this.generateAzureCliCommands();
            this.generatePowerShellCommands();
            this.generateReadme();
            
            console.log('\n✅ Deployment artifacts generated successfully!');
            console.log('\nNext steps:');
            console.log('1. Run one of the deployment scripts (deploy.sh or deploy.ps1)');
            console.log('2. Deploy the Node.js application code to the created Web App');
            console.log('3. Upload the Teams app package using manifest-generated.json');
            console.log('4. Test the bot in Microsoft Teams');
            
        } catch (error) {
            console.error('❌ Deployment preparation failed:', error.message);
            process.exit(1);
        }
    }
}

// Export for use as module
module.exports = { DeploymentManager };

// Run deployment if script is executed directly
if (require.main === module) {
    const deploymentManager = new DeploymentManager();
    deploymentManager.deploy();
}
