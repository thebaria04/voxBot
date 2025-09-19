# Teams AI Foundry Bot - Project Overview

## 📋 Project Summary

This project implements a comprehensive Microsoft Teams bot that integrates with Azure AI Foundry to provide intelligent conversational experiences with advanced speech capabilities. The bot can participate in Teams meetings, transcribe speech in real-time, generate AI-powered responses, and convert text back to speech for seamless voice interactions.

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Microsoft Teams                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │    Chat     │  │  Meetings   │  │       Channels          │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Teams Bot (Node.js)                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ Bot Handler │  │ API Routes  │  │    Express Server       │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────┬───────────────────────────────────────┘
                          │
           ┌──────────────┼──────────────┐
           │              │              │
           ▼              ▼              ▼
┌─────────────────┐ ┌─────────────┐ ┌─────────────────┐
│  Azure Speech   │ │ Azure AI    │ │  Azure KeyVault │
│   Services      │ │  Foundry    │ │   + Identity    │
│   (STT/TTS)     │ │             │ │                 │
└─────────────────┘ └─────────────┘ └─────────────────┘
```

## 📂 Project Structure

```
src/Microsoft/TeamsBot/
├── index.js                           # Main Express server and Bot Framework setup
├── package.json                       # Dependencies and scripts
├── .env.example                       # Environment configuration template
├── README.md                          # Project documentation
├── DEPLOYMENT_CHECKLIST.md            # Deployment guide
├── .gitignore                         # Git ignore rules
├── jest.config.json                   # Test configuration
│
├── src/                               # Core application code
│   ├── teamsBot.js                    # Main bot logic and Teams integration
│   ├── services/                      # Service layer
│   │   ├── logger.js                  # Winston logging service
│   │   ├── speechService.js           # Azure Speech SDK wrapper
│   │   ├── aiFoundryClient.js         # AI Foundry REST client
│   │   └── credentialFactory.js       # Azure authentication management
│   └── controllers/                   # API controllers
│       └── apiController.js           # REST API endpoints
│
├── deployment/                        # Deployment artifacts
│   ├── manifest.json                  # Teams app manifest template
│   ├── arm-template.json              # Azure Resource Manager template
│   ├── deploy.js                      # Deployment script generator
│   └── README.md                      # Deployment instructions
│
├── tests/                             # Test suite
│   ├── bot.test.js                    # Main test file
│   └── setup.js                       # Jest setup and mocks
│
└── examples/                          # Usage examples
    └── usage.js                       # API usage examples
```

## 🚀 Key Features

### Core Bot Capabilities
- **Microsoft Teams Integration**: Native support for Teams chat, channels, and meetings
- **Conversation Management**: Context-aware conversations with memory
- **Adaptive Cards**: Rich interactive UI elements
- **Meeting Participation**: Join and participate in Teams meetings
- **Multi-turn Conversations**: Maintains conversation context

### AI Integration
- **Azure AI Foundry**: Intelligent response generation using advanced AI models
- **Configurable Models**: Support for different AI models (GPT-4, etc.)
- **Context Awareness**: Maintains conversation history for better responses
- **Response Customization**: Configurable temperature, max tokens, etc.

### Speech Capabilities
- **Speech-to-Text (STT)**: Real-time transcription using Azure Cognitive Services
- **Text-to-Speech (TTS)**: Natural voice synthesis with multiple voice options
- **Continuous Recognition**: Real-time speech processing in meetings
- **Multiple Languages**: Support for various languages and voices

### Security & Authentication
- **Managed Identity**: Azure Managed Identity for secure service authentication
- **Key Vault Integration**: Secure storage and retrieval of secrets
- **Certificate-based Auth**: Support for certificate-based bot authentication
- **HTTPS Enforcement**: All endpoints secured with HTTPS

### REST API
- **External Integration**: REST endpoints for external applications
- **Speech Processing**: Standalone speech-to-text and text-to-speech APIs
- **AI Queries**: Direct AI Foundry queries via REST
- **Health Monitoring**: Health check and status endpoints

## 🔧 Technical Stack

### Backend Technologies
- **Node.js 18+**: JavaScript runtime
- **Express.js**: Web application framework
- **Bot Framework SDK**: Microsoft Bot Framework integration
- **Azure SDK**: Official Azure service integrations

### Azure Services
- **Azure Bot Service**: Bot registration and management
- **Azure AI Foundry**: AI model hosting and inference
- **Azure Cognitive Services Speech**: Speech processing
- **Azure Key Vault**: Secure secret management
- **Azure App Service**: Web application hosting
- **Application Insights**: Monitoring and logging

### Development Tools
- **Jest**: Testing framework with comprehensive mocking
- **Winston**: Structured logging
- **ESLint**: Code quality (configurable)
- **Nodemon**: Development server with hot reload

## 📊 API Endpoints

### Health & Status
- `GET /health` - Basic health check
- `GET /api/health` - Detailed health information
- `GET /api/status` - Service status and configuration
- `GET /api/test-ai-foundry` - AI Foundry connectivity test

### AI Integration
- `POST /api/ask` - Query AI Foundry with prompt and context
- `POST /api/conversation` - Full conversation flow (STT → AI → TTS)

### Speech Processing
- `POST /api/speech-to-text` - Convert audio to text
- `POST /api/text-to-speech` - Convert text to audio

### Bot Framework
- `POST /api/messages` - Bot Framework message endpoint
- `GET /manifest` - Teams app manifest

## 🔄 Example Workflows

### 1. Text Conversation in Teams Chat
```
User → "Explain machine learning"
Bot  → Processes with AI Foundry
Bot  → "Machine learning is a subset of artificial intelligence..."
```

### 2. Voice Conversation in Teams Meeting
```
User → Speaks: "What's the weather like?"
Bot  → Transcribes with Speech Service
Bot  → Queries AI Foundry: "What's the weather like?"
Bot  → Generates response: "I don't have access to current weather..."
Bot  → Converts to speech and plays in meeting
```

### 3. External API Integration
```
App  → POST /api/ask {"prompt": "Summarize this document"}
Bot  → Queries AI Foundry
Bot  → Returns JSON response with AI-generated summary
```

## 🛡️ Security Considerations

### Authentication Flow
1. **Bot Authentication**: Azure AD app registration with Bot Framework
2. **Service Authentication**: Managed Identity for Azure services
3. **Secret Management**: Key Vault for sensitive configuration
4. **API Security**: HTTPS enforcement and request validation

### Data Protection
- **No Data Persistence**: Conversations not stored permanently
- **Secure Transit**: All communication over HTTPS/TLS
- **Key Rotation**: Support for automated key rotation
- **Access Control**: Role-based access to Azure resources

## 📈 Monitoring & Observability

### Logging
- **Structured Logging**: JSON-formatted logs with Winston
- **Application Insights**: Centralized log aggregation
- **Request Tracing**: Request correlation IDs
- **Error Tracking**: Automatic error capture and alerting

### Performance Monitoring
- **Response Times**: API endpoint performance tracking
- **Success Rates**: Request success/failure metrics
- **Resource Usage**: CPU, memory, and network monitoring
- **Custom Metrics**: Business-specific metrics and KPIs

## 🚀 Deployment Options

### Azure Deployment (Recommended)
1. **Automated Deployment**: ARM template with all required resources
2. **CI/CD Ready**: GitHub Actions and Azure DevOps compatible
3. **Environment Management**: Separate dev/staging/prod environments
4. **Scaling**: Auto-scaling based on demand

### Local Development
1. **Development Server**: `npm run dev` with hot reload
2. **Local Testing**: Comprehensive test suite with mocking
3. **Bot Emulator**: Test with Bot Framework Emulator
4. **ngrok Integration**: Expose local bot for Teams testing

## 🧪 Testing Strategy

### Unit Tests
- **Service Layer**: Mocked Azure services for isolated testing
- **API Endpoints**: Comprehensive REST API testing
- **Bot Logic**: Teams conversation flow testing
- **Error Handling**: Exception and edge case coverage

### Integration Tests
- **Azure Services**: Real service integration testing
- **End-to-End**: Complete conversation flow testing
- **Performance**: Load and stress testing
- **Security**: Authentication and authorization testing

## 🔮 Future Enhancements

### Planned Features
- **Multi-language Support**: Automatic language detection and response
- **Advanced AI Features**: Function calling, RAG integration
- **Meeting Transcription**: Full meeting recording and summarization
- **Analytics Dashboard**: Usage analytics and insights

### Integration Opportunities
- **SharePoint**: Document analysis and Q&A
- **Outlook**: Calendar integration and meeting insights
- **Power Platform**: Low-code extensions and workflows
- **Custom Connectors**: Enterprise system integration

## 🤝 Contributing

### Development Setup
1. Clone repository and install dependencies
2. Configure environment variables
3. Run tests to ensure setup
4. Follow coding standards and patterns

### Code Quality
- **TypeScript Migration**: Consider TypeScript for enhanced type safety
- **Code Coverage**: Maintain >80% test coverage
- **Documentation**: Keep README and inline docs updated
- **Security**: Follow security best practices

---

This Teams AI Foundry Bot provides a robust foundation for intelligent Teams integrations with speech capabilities. The modular architecture and comprehensive testing make it suitable for enterprise deployment while remaining extensible for custom requirements.
