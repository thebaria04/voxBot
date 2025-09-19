const express = require('express');
const { AiFoundryClient } = require('../services/aiFoundryClient');
const { SpeechService } = require('../services/speechService');
const { CredentialFactory } = require('../services/credentialFactory');
const { Logger } = require('../services/logger');

class ApiController {
    constructor(options = {}) {
        this.router = express.Router();
        this.logger = options.logger || new Logger();
        this.aiFoundryClient = options.aiFoundryClient || new AiFoundryClient();
        this.speechService = options.speechService || new SpeechService();
        this.credentialFactory = options.credentialFactory || new CredentialFactory();
        
        this.setupRoutes();
    }

    setupRoutes() {
        // Health check endpoint
        this.router.get('/health', this.getHealth.bind(this));
        
        // AI Foundry query endpoint
        this.router.post('/ask', this.askAiFoundry.bind(this));
        
        // Speech-to-text endpoint
        this.router.post('/speech-to-text', this.speechToText.bind(this));
        
        // Text-to-speech endpoint
        this.router.post('/text-to-speech', this.textToSpeech.bind(this));
        
        // Combined endpoint for full conversation flow
        this.router.post('/conversation', this.handleConversation.bind(this));
        
        // Test AI Foundry connection
        this.router.get('/test-ai-foundry', this.testAiFoundry.bind(this));
        
        // Get service status
        this.router.get('/status', this.getServiceStatus.bind(this));
    }

    async getHealth(req, res) {
        try {
            const health = {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                version: process.env.npm_package_version || '1.0.0',
                environment: process.env.NODE_ENV || 'development'
            };
            
            res.status(200).json(health);
            
        } catch (error) {
            this.logger.error('Health check failed', { error: error.message });
            res.status(500).json({
                status: 'unhealthy',
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    async askAiFoundry(req, res) {
        try {
            const { prompt, conversationContext, options } = req.body;
            
            // Validate input
            if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
                return res.status(400).json({
                    error: 'Invalid input',
                    message: 'Prompt is required and must be a non-empty string'
                });
            }

            this.logger.info('AI Foundry query via API', {
                promptLength: prompt.length,
                contextLength: conversationContext ? conversationContext.length : 0,
                clientIp: req.ip
            });

            const startTime = Date.now();
            const response = await this.aiFoundryClient.queryAiFoundry(prompt, conversationContext, options);
            const duration = Date.now() - startTime;

            this.logger.info('AI Foundry query completed', {
                duration: `${duration}ms`,
                responseLength: response ? response.length : 0
            });

            res.status(200).json({
                success: true,
                response: response,
                metadata: {
                    prompt: prompt,
                    timestamp: new Date().toISOString(),
                    processingTime: `${duration}ms`
                }
            });

        } catch (error) {
            this.logger.error('Error in askAiFoundry endpoint', {
                error: error.message,
                stack: error.stack,
                clientIp: req.ip
            });

            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: process.env.NODE_ENV === 'development' ? error.message : 'Failed to process AI query'
            });
        }
    }

    async speechToText(req, res) {
        try {
            // Handle audio data from request
            const audioData = req.body.audioData || req.file?.buffer;
            
            if (!audioData) {
                return res.status(400).json({
                    error: 'Invalid input',
                    message: 'Audio data is required (either as audioData in body or as file upload)'
                });
            }

            this.logger.info('Speech-to-text request via API', {
                audioSize: audioData.length,
                clientIp: req.ip
            });

            const startTime = Date.now();
            const transcription = await this.speechService.speechToText(audioData);
            const duration = Date.now() - startTime;

            this.logger.info('Speech-to-text completed', {
                duration: `${duration}ms`,
                transcriptionLength: transcription ? transcription.length : 0
            });

            res.status(200).json({
                success: true,
                transcription: transcription,
                metadata: {
                    audioSize: audioData.length,
                    timestamp: new Date().toISOString(),
                    processingTime: `${duration}ms`
                }
            });

        } catch (error) {
            this.logger.error('Error in speechToText endpoint', {
                error: error.message,
                stack: error.stack,
                clientIp: req.ip
            });

            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: process.env.NODE_ENV === 'development' ? error.message : 'Failed to process speech-to-text'
            });
        }
    }

    async textToSpeech(req, res) {
        try {
            const { text, voiceName, returnAudio } = req.body;
            
            if (!text || typeof text !== 'string' || text.trim().length === 0) {
                return res.status(400).json({
                    error: 'Invalid input',
                    message: 'Text is required and must be a non-empty string'
                });
            }

            this.logger.info('Text-to-speech request via API', {
                textLength: text.length,
                voiceName: voiceName,
                clientIp: req.ip
            });

            const startTime = Date.now();
            const audioBuffer = await this.speechService.textToSpeech(text, voiceName);
            const duration = Date.now() - startTime;

            this.logger.info('Text-to-speech completed', {
                duration: `${duration}ms`,
                audioSize: audioBuffer ? audioBuffer.length : 0
            });

            if (returnAudio === true) {
                // Return audio data as base64 encoded string
                res.status(200).json({
                    success: true,
                    audioData: audioBuffer.toString('base64'),
                    metadata: {
                        text: text,
                        audioSize: audioBuffer.length,
                        timestamp: new Date().toISOString(),
                        processingTime: `${duration}ms`
                    }
                });
            } else {
                // Return audio file directly
                res.set({
                    'Content-Type': 'audio/mpeg',
                    'Content-Length': audioBuffer.length,
                    'Content-Disposition': 'attachment; filename="speech.mp3"'
                });
                res.send(audioBuffer);
            }

        } catch (error) {
            this.logger.error('Error in textToSpeech endpoint', {
                error: error.message,
                stack: error.stack,
                clientIp: req.ip
            });

            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: process.env.NODE_ENV === 'development' ? error.message : 'Failed to process text-to-speech'
            });
        }
    }

    async handleConversation(req, res) {
        try {
            const { audioData, text, conversationContext, options } = req.body;
            
            let inputText = text;
            let transcription = null;
            
            // If audio data is provided, convert it to text first
            if (audioData && !inputText) {
                const audioBuffer = Buffer.from(audioData, 'base64');
                transcription = await this.speechService.speechToText(audioBuffer);
                inputText = transcription;
            }
            
            if (!inputText || inputText.trim().length === 0) {
                return res.status(400).json({
                    error: 'Invalid input',
                    message: 'Either text or audioData must be provided'
                });
            }

            this.logger.info('Full conversation flow via API', {
                hasAudio: !!audioData,
                hasText: !!text,
                inputLength: inputText.length,
                clientIp: req.ip
            });

            const startTime = Date.now();
            
            // Get AI response
            const aiResponse = await this.aiFoundryClient.queryAiFoundry(inputText, conversationContext, options);
            
            // Generate speech from AI response
            const speechAudio = await this.speechService.textToSpeech(aiResponse);
            
            const duration = Date.now() - startTime;

            this.logger.info('Conversation flow completed', {
                duration: `${duration}ms`,
                transcriptionLength: transcription ? transcription.length : 0,
                responseLength: aiResponse ? aiResponse.length : 0,
                audioSize: speechAudio ? speechAudio.length : 0
            });

            res.status(200).json({
                success: true,
                transcription: transcription,
                aiResponse: aiResponse,
                speechAudio: speechAudio.toString('base64'),
                metadata: {
                    inputText: inputText,
                    timestamp: new Date().toISOString(),
                    processingTime: `${duration}ms`,
                    steps: {
                        speechToText: !!transcription,
                        aiFoundry: true,
                        textToSpeech: true
                    }
                }
            });

        } catch (error) {
            this.logger.error('Error in conversation endpoint', {
                error: error.message,
                stack: error.stack,
                clientIp: req.ip
            });

            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: process.env.NODE_ENV === 'development' ? error.message : 'Failed to process conversation'
            });
        }
    }

    async testAiFoundry(req, res) {
        try {
            this.logger.info('Testing AI Foundry connection via API', { clientIp: req.ip });
            
            const testResult = await this.aiFoundryClient.testConnection();
            
            res.status(200).json({
                success: testResult.success,
                message: testResult.success ? 'AI Foundry connection successful' : 'AI Foundry connection failed',
                error: testResult.error,
                response: testResult.response,
                timestamp: new Date().toISOString()
            });

        } catch (error) {
            this.logger.error('Error testing AI Foundry connection', {
                error: error.message,
                clientIp: req.ip
            });

            res.status(500).json({
                success: false,
                error: 'Internal server error',
                message: process.env.NODE_ENV === 'development' ? error.message : 'Failed to test AI Foundry connection'
            });
        }
    }

    async getServiceStatus(req, res) {
        try {
            const status = {
                timestamp: new Date().toISOString(),
                services: {
                    aiFoundry: this.aiFoundryClient.getHealthStatus(),
                    credentials: this.credentialFactory.getHealthStatus(),
                    speech: {
                        configured: !!(process.env.SPEECH_SERVICE_KEY && process.env.SPEECH_SERVICE_REGION),
                        language: process.env.SPEECH_LANGUAGE || 'en-US',
                        voice: process.env.SPEECH_VOICE_NAME || 'en-US-JennyNeural'
                    }
                },
                environment: {
                    nodeEnv: process.env.NODE_ENV || 'development',
                    version: process.env.npm_package_version || '1.0.0',
                    uptime: process.uptime()
                }
            };

            res.status(200).json(status);

        } catch (error) {
            this.logger.error('Error getting service status', {
                error: error.message,
                clientIp: req.ip
            });

            res.status(500).json({
                error: 'Internal server error',
                message: process.env.NODE_ENV === 'development' ? error.message : 'Failed to get service status'
            });
        }
    }

    getRouter() {
        return this.router;
    }
}

module.exports = { ApiController };
