const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const { CloudAdapter, ConfigurationServiceClientCredentialFactory, createBotFrameworkAuthenticationFromConfiguration } = require('botbuilder');
const { TeamsBot } = require('./src/teamsBot');
const { ApiController } = require('./src/controllers/apiController');
const { Logger } = require('./src/services/logger');
require('dotenv').config();

class BotServer {
    constructor(options = {}) {
        this.app = express();
        this.port = process.env.PORT || 3978;
        this.logger = new Logger();
        this.apiControllerOptions = options.apiControllerOptions || {};
        this.setupMiddleware();
        this.setupBot();
        this.setupRoutes();
        this.setupErrorHandling();
    }

    setupMiddleware() {
        // Security and performance middleware
        this.app.use(helmet());
        this.app.use(compression());
        this.app.use(cors({
            origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
            credentials: true
        }));
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        // Request logging
        this.app.use((req, res, next) => {
            this.logger.info(`${req.method} ${req.path}`, {
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                requestId: req.headers['x-request-id']
            });
            next();
        });
    }

    setupBot() {
        try {
            // Create credential factory for bot authentication
            const credentialsFactory = new ConfigurationServiceClientCredentialFactory({
                MicrosoftAppId: process.env.MICROSOFT_APP_ID,
                MicrosoftAppPassword: process.env.MICROSOFT_APP_PASSWORD,
                MicrosoftAppType: process.env.MICROSOFT_APP_TYPE || 'MultiTenant',
                MicrosoftAppTenantId: process.env.MICROSOFT_APP_TENANT_ID
            });

            // Create Bot Framework authentication
            const botFrameworkAuthentication = createBotFrameworkAuthenticationFromConfiguration(null, credentialsFactory);

            // Create the cloud adapter
            this.adapter = new CloudAdapter(botFrameworkAuthentication);

            // Create the bot instance
            this.bot = new TeamsBot();

            // Error handling for the adapter
            this.adapter.onTurnError = async (context, error) => {
                this.logger.error('Bot turn error', { error: error.message, stack: error.stack });
                
                // Send error message to user
                await context.sendActivity('Sorry, I encountered an error processing your request. Please try again.');
                
                // Log conversation state for debugging
                if (context.activity) {
                    this.logger.error('Failed activity', {
                        type: context.activity.type,
                        text: context.activity.text,
                        channelId: context.activity.channelId
                    });
                }
            };

            this.logger.info('Bot setup completed successfully');
        } catch (error) {
            this.logger.error('Failed to setup bot', { error: error.message, stack: error.stack });
            throw error;
        }
    }

    setupRoutes() {
        // Health check endpoint
        this.app.get('/health', (req, res) => {
            res.status(200).json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                version: process.env.npm_package_version || '1.0.0'
            });
        });

        // Bot messages endpoint
        this.app.post('/api/messages', async (req, res) => {
            try {
                await this.adapter.process(req, res, (context) => this.bot.run(context));
            } catch (error) {
                this.logger.error('Error processing bot message', { error: error.message });
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // AI Foundry REST API endpoints
        const apiController = new ApiController(this.apiControllerOptions);
        this.app.use('/api', apiController.getRouter());

        // Teams manifest endpoint for easy access
        this.app.get('/manifest', (req, res) => {
            res.sendFile(__dirname + '/deployment/manifest.json');
        });

        // Static files for Teams app package
        this.app.use('/static', express.static('deployment/static'));
    }

    setupErrorHandling() {
        // 404 handler
        this.app.use('*', (req, res) => {
            res.status(404).json({
                error: 'Not Found',
                message: `Route ${req.originalUrl} not found`,
                timestamp: new Date().toISOString()
            });
        });

        // Global error handler
        this.app.use((error, req, res, next) => {
            this.logger.error('Unhandled application error', {
                error: error.message,
                stack: error.stack,
                url: req.url,
                method: req.method
            });

            res.status(500).json({
                error: 'Internal Server Error',
                message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
                timestamp: new Date().toISOString()
            });
        });

        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            this.logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
            process.exit(1);
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason, promise) => {
            this.logger.error('Unhandled Rejection', { reason, promise });
        });
    }

    start() {
        this.app.listen(this.port, () => {
            this.logger.info(`Bot server started on port ${this.port}`, {
                environment: process.env.NODE_ENV,
                botId: process.env.MICROSOFT_APP_ID
            });
        });
    }
}

// Start the server
if (require.main === module) {
    try {
        const server = new BotServer();
        server.start();
    } catch (error) {
        console.error('Failed to start bot server:', error);
        process.exit(1);
    }
}

module.exports = { BotServer };
