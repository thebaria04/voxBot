# Teams AI Foundry Bot with Speech Integration

A comprehensive Microsoft Teams bot that integrates with Azure AI Foundry to provide intelligent responses with speech capabilities. This bot supports real-time speech-to-text conversion, AI-powered responses, and text-to-speech output for seamless conversation in Teams meetings and chats.

## 🚀 Features

### Core Capabilities
- **Microsoft Teams Integration**: Full support for Teams chat, meetings, and calling
- **Azure AI Foundry**: Intelligent responses powered by advanced AI models
- **Speech Processing**: Real-time speech-to-text and text-to-speech capabilities
- **Meeting Participation**: Join meetings, transcribe conversations, and provide voice responses
- **Secure Authentication**: Managed Identity and Key Vault certificate-based authentication

### Technical Features
- **Node.js & Express**: Modern web framework with TypeScript support
- **Bot Framework SDK**: Official Microsoft Bot Framework integration
- **Azure Cognitive Services**: Speech SDK for STT/TTS processing
- **Microsoft Graph API**: Teams meeting and calling integration
- **REST API**: External endpoints for AI queries and speech processing
- **Comprehensive Logging**: Winston-based logging with Application Insights
- **Error Handling**: Graceful error handling and fallback responses

## 📋 Prerequisites

### Azure Services
- **Azure subscription** with sufficient permissions
- **Azure AI Foundry** service configured and deployed
- **Azure Cognitive Services Speech** service
- **Azure Key Vault** for secure secret storage
- **Azure AD App Registration** for bot authentication

### Development Environment
- **Node.js 18+** and npm
- **Azure CLI** or Azure PowerShell
- **Teams development environment** (Teams Toolkit recommended)

## 🛠️ Installation & Setup

### 1. Clone and Install Dependencies

```bash
cd src/Microsoft/TeamsBot
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Bot Framework Configuration
MICROSOFT_APP_ID=your-bot-app-id
MICROSOFT_APP_TYPE=MultiTenant
MICROSOFT_APP_TENANT_ID=your-tenant-id

# Azure Key Vault Configuration
AZURE_KEY_VAULT_URI=https://your-keyvault.vault.azure.net/
AZURE_KEY_VAULT_CERTIFICATE_NAME=your-cert-name

# Azure AI Foundry Configuration
AI_FOUNDRY_ENDPOINT=https://your-ai-foundry-endpoint.com/v1/chat/completions
AI_FOUNDRY_API_KEY=your-ai-foundry-api-key
AI_FOUNDRY_DEPLOYMENT_NAME=your-deployment-name
AI_FOUNDRY_MODEL_NAME=gpt-4

# Azure Cognitive Services Speech Configuration
SPEECH_SERVICE_KEY=your-speech-service-key
SPEECH_SERVICE_REGION=eastus
SPEECH_LANGUAGE=en-US
SPEECH_VOICE_NAME=en-US-JennyNeural

# Server Configuration
PORT=3978
NODE_ENV=development
LOG_LEVEL=info
```

### 3. Deploy Azure Resources

```bash
cd deployment
node deploy.js
```

Or use the generated scripts:

```bash
# Using Azure CLI
./deploy.sh

# Using PowerShell
./deploy.ps1
```

### 4. Deploy Bot Code

Deploy the Node.js application to the created Azure Web App:

```bash
# Build and deploy (configure your deployment method)
npm run build
# Deploy to Azure Web App using your preferred method
```

### 5. Configure Teams App

1. Use the generated `deployment/manifest-generated.json`
2. Upload to Teams App Catalog or use Teams Toolkit
3. Install the app in your Teams environment

## 🔧 Usage

### Text Conversations

The bot responds to text messages in Teams:

```
User: "What's the weather like?"
Bot: [AI-powered response about weather]
```

### Voice Conversations in Meetings

1. Add the bot to a Teams meeting
2. Speak naturally - the bot will transcribe your speech
3. The bot provides AI responses through text and speech
4. Responses are played back as audio in the meeting

### REST API Endpoints

#### Query AI Foundry
```bash
POST /api/ask
Content-Type: application/json

{
  "prompt": "Explain quantum computing",
  "conversationContext": [],
  "options": {
    "maxTokens": 1000,
    "temperature": 0.7
  }
}
```

#### Speech-to-Text
```bash
POST /api/speech-to-text
Content-Type: application/json

{
  "audioData": "base64-encoded-audio-data"
}
```

#### Text-to-Speech
```bash
POST /api/text-to-speech
Content-Type: application/json

{
  "text": "Hello, this will be converted to speech",
  "voiceName": "en-US-JennyNeural",
  "returnAudio": true
}
```

#### Full Conversation Flow
```bash
POST /api/conversation
Content-Type: application/json

{
  "audioData": "base64-encoded-audio",
  "conversationContext": [],
  "options": {}
}
```

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Teams Client  │────│  Teams Bot (Web  │────│  Azure AI       │
│                 │    │  App)            │    │  Foundry        │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                        ┌───────┴────────┐
                        │                │
                ┌───────▼───────┐ ┌──────▼─────┐
                │ Azure Speech  │ │ Key Vault  │
                │ Services      │ │            │
                └───────────────┘ └────────────┘
```

### Key Components

- **`index.js`**: Express server with Bot Framework CloudAdapter
- **`src/teamsBot.js`**: Main bot logic and conversation handling
- **`src/services/speechService.js`**: Azure Speech SDK wrapper
- **`src/services/aiFoundryClient.js`**: AI Foundry REST client
- **`src/services/credentialFactory.js`**: Authentication and credential management
- **`src/controllers/apiController.js`**: REST API endpoints
- **`deployment/`**: Azure ARM templates and deployment scripts

## 🧪 Testing

Run the test suite:

```bash
npm test
```

Run specific test categories:

```bash
# API tests only
npm test -- --testPathPattern=api

# Bot logic tests
npm test -- --testPathPattern=bot

# Integration tests
npm test -- --testPathPattern=integration
```

## 🔒 Security

### Authentication Flow
1. **Managed Identity**: Used for Azure service authentication
2. **Key Vault**: Secure storage for secrets and certificates
3. **Certificate-based Auth**: Bot Framework authentication (recommended)
4. **HTTPS Enforcement**: All endpoints use HTTPS

### Certificate Authentication Setup
The bot supports both client secret and certificate-based authentication. Certificate authentication is recommended for production deployments due to enhanced security.

**Quick Setup:**
```bash
# Enable certificate authentication
USE_CERTIFICATE_AUTH=true

# Create certificate automatically
node deployment/create-certificate.js
```

For detailed certificate setup instructions, see [CERTIFICATE_SETUP.md](deployment/CERTIFICATE_SETUP.md).

### Secret Management
- Bot secrets stored in Azure Key Vault
- AI Foundry API keys secured in Key Vault
- Speech service keys managed through Azure RBAC
- No secrets in code or configuration files

## 📊 Monitoring & Logging

### Application Insights
- Request/response logging
- Performance metrics
- Error tracking and alerts
- Custom telemetry

### Winston Logging
- Structured JSON logging
- Multiple log levels (error, warn, info, debug)
- File and console outputs
- Request correlation IDs

### Health Monitoring
```bash
GET /health          # Basic health check
GET /api/status      # Detailed service status
GET /api/test-ai-foundry  # AI Foundry connectivity test
```

## 🚨 Troubleshooting

### Common Issues

#### Bot Not Responding
1. Check Application Insights for errors
2. Verify bot endpoint accessibility
3. Validate Azure AD app registration
4. Confirm Key Vault access policies

#### Speech Processing Errors
1. Verify Speech service subscription key
2. Check audio format compatibility
3. Validate region configuration
4. Test with sample audio files

#### AI Foundry Connection Issues
1. Verify endpoint URL and API key
2. Check deployment name configuration
3. Test connectivity with `/api/test-ai-foundry`
4. Validate AI Foundry service status

### Debugging

Enable debug logging:
```env
LOG_LEVEL=debug
NODE_ENV=development
```

Check detailed logs in Application Insights or local files.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Azure Support**: For Azure service issues
- **Teams Platform**: Microsoft Teams developer documentation
- **Bot Framework**: Bot Framework documentation and community

## 🔄 Version History

- **v1.0.0**: Initial release with core functionality
  - Teams bot integration
  - AI Foundry connectivity
  - Speech processing
  - Meeting participation
  - REST API endpoints
  - Azure deployment automation

---

Built with ❤️ using Microsoft technologies and Azure services.
