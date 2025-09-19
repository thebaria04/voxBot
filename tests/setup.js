// Jest setup file for Teams AI Foundry Bot tests

// Mock console methods to avoid noise in tests
global.console = {
    ...console,
    // Uncomment to mock specific console methods
    // log: jest.fn(),
    // warn: jest.fn(),
    // error: jest.fn(),
};

// Mock Azure SDK modules
jest.mock('@azure/identity', () => ({
    DefaultAzureCredential: jest.fn().mockImplementation(() => ({
        getToken: jest.fn().mockResolvedValue({
            token: 'mock-token',
            expiresOnTimestamp: Date.now() + 3600000
        })
    })),
    ManagedIdentityCredential: jest.fn().mockImplementation(() => ({
        getToken: jest.fn().mockResolvedValue({
            token: 'mock-token',
            expiresOnTimestamp: Date.now() + 3600000
        })
    })),
    ClientCertificateCredential: jest.fn().mockImplementation(() => ({
        getToken: jest.fn().mockResolvedValue({
            token: 'mock-token',
            expiresOnTimestamp: Date.now() + 3600000
        })
    }))
}));

jest.mock('@azure/keyvault-secrets', () => ({
    SecretClient: jest.fn().mockImplementation(() => ({
        getSecret: jest.fn().mockResolvedValue({ value: 'mock-secret' }),
        setSecret: jest.fn().mockResolvedValue({})
    }))
}));

jest.mock('@azure/keyvault-certificates', () => ({
    CertificateClient: jest.fn().mockImplementation(() => ({
        getCertificate: jest.fn().mockResolvedValue({
            cer: 'mock-certificate',
            key: 'mock-key'
        })
    }))
}));

// Mock Microsoft Graph Client
jest.mock('@microsoft/microsoft-graph-client', () => ({
    Client: {
        initWithMiddleware: jest.fn().mockReturnValue({
            api: jest.fn().mockReturnValue({
                post: jest.fn().mockResolvedValue({ id: 'mock-meeting-id' }),
                get: jest.fn().mockResolvedValue({ value: [] })
            })
        })
    },
    TokenCredentialAuthenticationProvider: jest.fn()
}));

// Mock Bot Framework
jest.mock('botbuilder', () => ({
    CloudAdapter: jest.fn().mockImplementation(() => ({
        process: jest.fn().mockImplementation(async (req, res, logic) => {
            // Mock bot adapter processing
            const context = {
                activity: req.body || {
                    type: 'message',
                    text: 'test message',
                    from: { id: 'user123' },
                    recipient: { id: 'bot456' },
                    conversation: { id: 'conv789' }
                },
                sendActivity: jest.fn().mockResolvedValue({}),
                sendActivities: jest.fn().mockResolvedValue([])
            };
            
            if (logic) {
                await logic(context);
            }
            
            res.status(200).end();
        }),
        onTurnError: null
    })),
    ConfigurationServiceClientCredentialFactory: jest.fn(),
    createBotFrameworkAuthenticationFromConfiguration: jest.fn().mockReturnValue({}),
    TeamsActivityHandler: jest.fn().mockImplementation(function() {
        this.onMessage = jest.fn();
        this.onMembersAdded = jest.fn();
        this.onTeamsMeetingStart = jest.fn();
        this.onTeamsMeetingEnd = jest.fn();

        this.run = jest.fn().mockResolvedValue();
    }),
    CardFactory: {
        adaptiveCard: jest.fn().mockReturnValue({
            contentType: 'application/vnd.microsoft.card.adaptive',
            content: {}
        })
    },
    MessageFactory: {
        text: jest.fn().mockImplementation((text) => ({ type: 'message', text })),
        attachment: jest.fn().mockImplementation((attachment) => ({ 
            type: 'message', 
            attachments: [attachment] 
        }))
    },
    TurnContext: jest.fn()
}));

// Mock Speech SDK
jest.mock('microsoft-cognitiveservices-speech-sdk', () => ({
    SpeechConfig: {
        fromSubscription: jest.fn().mockReturnValue({
            speechRecognitionLanguage: 'en-US',
            speechSynthesisVoiceName: 'en-US-JennyNeural',
            speechSynthesisOutputFormat: null
        })
    },
    SpeechRecognizer: jest.fn().mockImplementation(() => ({
        recognizeOnceAsync: jest.fn().mockImplementation((successCallback, errorCallback) => {
            setTimeout(() => successCallback({ text: 'mock transcription' }), 100);
        }),
        startContinuousRecognitionAsync: jest.fn().mockImplementation((successCallback) => {
            setTimeout(() => successCallback(), 100);
        }),
        stopContinuousRecognitionAsync: jest.fn().mockImplementation((successCallback) => {
            setTimeout(() => successCallback(), 100);
        }),
        close: jest.fn(),
        recognized: null,
        recognizing: null,
        canceled: null,
        sessionStopped: null
    })),
    SpeechSynthesizer: jest.fn().mockImplementation(() => ({
        speakSsmlAsync: jest.fn().mockImplementation((ssml, successCallback, errorCallback) => {
            const mockAudioData = new ArrayBuffer(1024);
            setTimeout(() => successCallback({
                reason: 3, // SynthesizingAudioCompleted
                audioData: mockAudioData
            }), 100);
        }),
        close: jest.fn()
    })),
    AudioConfig: {
        fromDefaultMicrophoneInput: jest.fn().mockReturnValue({}),
        fromStreamInput: jest.fn().mockReturnValue({})
    },
    AudioInputStream: {
        createPushStream: jest.fn().mockReturnValue({
            write: jest.fn(),
            close: jest.fn()
        })
    },
    ResultReason: {
        RecognizedSpeech: 3,
        NoMatch: 1,
        SynthesizingAudioCompleted: 3
    },
    CancellationReason: {
        Error: 1
    },
    SpeechSynthesisOutputFormat: {
        Audio16Khz32KBitRateMonoMp3: 13
    }
}));

// Mock Axios for HTTP requests
jest.mock('axios', () => ({
    create: jest.fn(() => ({
        post: jest.fn().mockResolvedValue({
            status: 200,
            data: {
                choices: [{
                    message: {
                        content: 'Mock AI response'
                    }
                }],
                usage: {
                    total_tokens: 100
                }
            }
        }),
        interceptors: {
            request: { use: jest.fn() },
            response: { use: jest.fn() }
        }
    })),
    post: jest.fn().mockResolvedValue({
        status: 200,
        data: { message: 'Mock response' }
    }),
    get: jest.fn().mockResolvedValue({
        status: 200,
        data: { message: 'Mock response' }
    })
}));

// Set up environment variables for tests
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error'; // Reduce log noise in tests

// Global test utilities
global.delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Mock logger to reduce test output
jest.mock('../src/services/logger', () => ({
    Logger: jest.fn().mockImplementation(() => ({
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn()
    }))
}));

// Clean up after each test
afterEach(() => {
    jest.clearAllMocks();
});
