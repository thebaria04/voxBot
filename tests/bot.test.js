const request = require('supertest');

// Mock environment variables for testing
process.env.MICROSOFT_APP_ID = 'test-app-id';
process.env.MICROSOFT_APP_PASSWORD = 'test-app-password';
process.env.AI_FOUNDRY_ENDPOINT = 'https://test-ai-foundry.com/v1/chat/completions';
process.env.AI_FOUNDRY_API_KEY = 'test-api-key';
process.env.SPEECH_SERVICE_KEY = 'test-speech-key';
process.env.SPEECH_SERVICE_REGION = 'eastus';
process.env.NODE_ENV = 'test';

const { BotServer } = require('../index');

describe('Teams AI Foundry Bot', () => {
    let app;
    let server;

    beforeAll(() => {
        // Create mock instances for testing
        const mockAiFoundryClient = {
            queryAiFoundry: jest.fn().mockResolvedValue('Hello! How can I help you?'),
            testConnection: jest.fn().mockResolvedValue({
                success: true,
                response: 'Connection test successful'
            }),
            getHealthStatus: jest.fn().mockReturnValue({
                endpoint: 'configured',
                apiKey: 'configured',
                deploymentName: 'test-deployment',
                modelName: 'gpt-4'
            })
        };
        
        const mockSpeechService = {
            speechToText: jest.fn().mockResolvedValue('Hello world'),
            textToSpeech: jest.fn().mockResolvedValue(Buffer.from('fake audio data'))
        };
        
        const mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn()
        };
        
        const mockCredentialFactory = {
            getCredentials: jest.fn().mockResolvedValue({}),
            getHealthStatus: jest.fn().mockReturnValue({
                credential: 'mock initialized',
                secretClient: 'mock initialized',
                certificateClient: 'mock initialized',
                graphClient: 'mock initialized',
                keyVaultUri: 'mock configured'
            })
        };
        
        // Create bot server instance with mock dependencies
        const botServer = new BotServer({
            apiControllerOptions: {
                aiFoundryClient: mockAiFoundryClient,
                speechService: mockSpeechService,
                logger: mockLogger,
                credentialFactory: mockCredentialFactory
            }
        });
        app = botServer.app;
        
        // Store mock references for individual tests
        app.mockAiFoundryClient = mockAiFoundryClient;
        app.mockSpeechService = mockSpeechService;
    });

    afterAll(() => {
        if (server) {
            server.close();
        }
    });

    describe('Health Endpoints', () => {
        test('GET /health should return 200', async () => {
            const response = await request(app)
                .get('/health')
                .expect(200);

            expect(response.body).toHaveProperty('status', 'healthy');
            expect(response.body).toHaveProperty('timestamp');
            expect(response.body).toHaveProperty('version');
        });

        test('GET /api/health should return 200', async () => {
            const response = await request(app)
                .get('/api/health')
                .expect(200);

            expect(response.body).toHaveProperty('status', 'healthy');
        });

        test('GET /api/status should return service status', async () => {
            const response = await request(app)
                .get('/api/status')
                .expect(200);

            expect(response.body).toHaveProperty('timestamp');
            expect(response.body).toHaveProperty('services');
            expect(response.body).toHaveProperty('environment');
        });
    });

    describe('AI Foundry API', () => {
        beforeEach(() => {
            // Reset mock call counts
            app.mockAiFoundryClient.queryAiFoundry.mockClear();
            app.mockAiFoundryClient.testConnection.mockClear();
        });

        test('POST /api/ask should process AI query', async () => {
            const response = await request(app)
                .post('/api/ask')
                .send({
                    prompt: 'Hello, how are you?',
                    conversationContext: []
                })
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('response', 'Hello! How can I help you?');
            expect(response.body).toHaveProperty('metadata');
        });

        test('POST /api/ask should return 400 for empty prompt', async () => {
            const response = await request(app)
                .post('/api/ask')
                .send({})
                .expect(400);

            expect(response.body).toHaveProperty('error', 'Invalid input');
        });

        test('POST /api/ask should handle AI Foundry errors', async () => {
            // Override the mock for this test to simulate error
            app.mockAiFoundryClient.queryAiFoundry.mockRejectedValueOnce(new Error('AI service unavailable'));

            const response = await request(app)
                .post('/api/ask')
                .send({
                    prompt: 'Test prompt'
                })
                .expect(500);

            expect(response.body).toHaveProperty('success', false);
            expect(response.body).toHaveProperty('error', 'Internal server error');
        });

        test('GET /api/test-ai-foundry should test connection', async () => {
            const response = await request(app)
                .get('/api/test-ai-foundry')
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('message', 'AI Foundry connection successful');
        });
    });

    describe('Speech API', () => {
        beforeEach(() => {
            // Reset mock call counts
            app.mockSpeechService.textToSpeech.mockClear();
            app.mockSpeechService.speechToText.mockClear();
        });

        test('POST /api/text-to-speech should convert text to speech', async () => {
            const response = await request(app)
                .post('/api/text-to-speech')
                .send({
                    text: 'Hello world',
                    returnAudio: true
                })
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('audioData');
            expect(response.body).toHaveProperty('metadata');
        });

        test('POST /api/text-to-speech should return 400 for empty text', async () => {
            const response = await request(app)
                .post('/api/text-to-speech')
                .send({})
                .expect(400);

            expect(response.body).toHaveProperty('error', 'Invalid input');
        });

        test('POST /api/speech-to-text should convert speech to text', async () => {
            const audioData = Buffer.from('fake audio data').toString('base64');
            
            const response = await request(app)
                .post('/api/speech-to-text')
                .send({
                    audioData: audioData
                })
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('transcription', 'Hello world');
            expect(response.body).toHaveProperty('metadata');
        });
    });

    describe('Conversation API', () => {
        beforeEach(() => {
            // Reset mock call counts and set up specific mocks for conversation flow
            app.mockAiFoundryClient.queryAiFoundry.mockClear();
            app.mockSpeechService.speechToText.mockClear();
            app.mockSpeechService.textToSpeech.mockClear();
            
            // Set up specific responses for conversation tests
            app.mockAiFoundryClient.queryAiFoundry.mockResolvedValue('AI response');
            app.mockSpeechService.speechToText.mockResolvedValue('Transcribed text');
            app.mockSpeechService.textToSpeech.mockResolvedValue(Buffer.from('speech audio'));
        });

        test('POST /api/conversation should handle full conversation flow', async () => {
            const audioData = Buffer.from('fake audio').toString('base64');

            const response = await request(app)
                .post('/api/conversation')
                .send({
                    audioData: audioData
                })
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('transcription', 'Transcribed text');
            expect(response.body).toHaveProperty('aiResponse', 'AI response');
            expect(response.body).toHaveProperty('speechAudio');
            expect(response.body).toHaveProperty('metadata');
        });

        test('POST /api/conversation should handle text-only input', async () => {
            const response = await request(app)
                .post('/api/conversation')
                .send({
                    text: 'Hello AI'
                })
                .expect(200);

            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('transcription', null);
            expect(response.body).toHaveProperty('aiResponse', 'AI response');
            expect(response.body).toHaveProperty('speechAudio');
        });
    });

    describe('Bot Messages Endpoint', () => {
        test('POST /api/messages should handle bot framework messages', async () => {
            const botActivity = {
                type: 'message',
                text: 'Hello bot',
                from: { id: 'user123', name: 'Test User' },
                recipient: { id: 'bot456', name: 'Test Bot' },
                conversation: { id: 'conv789' },
                channelId: 'msteams',
                serviceUrl: 'https://smba.trafficmanager.net/amer/'
            };

            // In test environment, the CloudAdapter is mocked and should succeed
            const response = await request(app)
                .post('/api/messages')
                .send(botActivity)
                .expect(200); // Expect 200 in test environment due to mocked adapter

            // Verify the adapter processes the message correctly
        });
    });

    describe('Error Handling', () => {
        test('should return 404 for unknown routes', async () => {
            const response = await request(app)
                .get('/unknown-route')
                .expect(404);

            expect(response.body).toHaveProperty('error', 'Not Found');
        });

        test('should handle internal server errors gracefully', async () => {
            // Override the mock to reject with an error for this specific test
            app.mockAiFoundryClient.queryAiFoundry.mockRejectedValueOnce(new Error('Unexpected error'));

            const response = await request(app)
                .post('/api/ask')
                .send({
                    prompt: 'Test prompt'
                })
                .expect(500);

            expect(response.body).toHaveProperty('success', false);
            expect(response.body).toHaveProperty('error', 'Internal server error');
        });
    });

    describe('Static Files', () => {
        test('GET /manifest should serve Teams manifest', async () => {
            const response = await request(app)
                .get('/manifest')
                .expect(200);

            // Should return the manifest.json file
            expect(response.headers['content-type']).toMatch(/application\/json/);
        });
    });
});
