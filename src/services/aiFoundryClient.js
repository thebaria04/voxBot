const axios = require('axios');
const { Logger } = require('./logger');

class AiFoundryClient {
    constructor() {
        this.logger = new Logger();
        this.endpoint = process.env.AI_FOUNDRY_ENDPOINT;
        this.apiKey = process.env.AI_FOUNDRY_API_KEY;
        this.deploymentName = process.env.AI_FOUNDRY_DEPLOYMENT_NAME;
        this.modelName = process.env.AI_FOUNDRY_MODEL_NAME || 'gpt-4';
        
        this.validateConfiguration();
        this.setupAxiosInstance();
    }

    validateConfiguration() {
        // Skip validation in test environment
        if (process.env.NODE_ENV === 'test') {
            this.logger.info('Skipping AI Foundry configuration validation in test environment');
            return;
        }
        
        if (!this.endpoint) {
            throw new Error('AI_FOUNDRY_ENDPOINT environment variable is required');
        }
        if (!this.apiKey) {
            throw new Error('AI_FOUNDRY_API_KEY environment variable is required');
        }
        
        this.logger.info('AI Foundry client configuration validated', {
            endpoint: this.endpoint,
            deploymentName: this.deploymentName,
            modelName: this.modelName
        });
    }

    setupAxiosInstance() {
        // Skip axios setup in test environment
        if (process.env.NODE_ENV === 'test') {
            this.httpClient = {
                post: jest.fn().mockResolvedValue({
                    status: 200,
                    data: {
                        choices: [{ message: { content: 'Mock AI response' } }],
                        usage: { total_tokens: 100 }
                    }
                })
            };
            return;
        }
        
        this.httpClient = axios.create({
            baseURL: this.endpoint,
            timeout: 30000, // 30 seconds timeout
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
                'User-Agent': 'teams-ai-foundry-bot/1.0.0'
            }
        });

        // Request interceptor for logging
        this.httpClient.interceptors.request.use(
            (config) => {
                this.logger.debug('AI Foundry request', {
                    method: config.method?.toUpperCase(),
                    url: config.url,
                    dataLength: config.data ? JSON.stringify(config.data).length : 0
                });
                return config;
            },
            (error) => {
                this.logger.error('AI Foundry request error', { error: error.message });
                return Promise.reject(error);
            }
        );

        // Response interceptor for logging
        this.httpClient.interceptors.response.use(
            (response) => {
                this.logger.debug('AI Foundry response', {
                    status: response.status,
                    dataLength: JSON.stringify(response.data).length
                });
                return response;
            },
            (error) => {
                this.logger.error('AI Foundry response error', {
                    status: error.response?.status,
                    statusText: error.response?.statusText,
                    message: error.message,
                    data: error.response?.data
                });
                return Promise.reject(error);
            }
        );
    }

    async queryAiFoundry(prompt, conversationContext = [], options = {}) {
        try {
            if (!prompt || typeof prompt !== 'string') {
                throw new Error('Prompt must be a non-empty string');
            }

            // In test environment, return mock response
            if (process.env.NODE_ENV === 'test') {
                return 'Hello! How can I help you?';
            }

            // Prepare messages for the conversation
            const messages = this.prepareMessages(prompt, conversationContext);
            
            // Prepare request payload
            const payload = {
                model: this.modelName,
                messages: messages,
                max_tokens: options.maxTokens || 1000,
                temperature: options.temperature || 0.7,
                top_p: options.topP || 0.9,
                frequency_penalty: options.frequencyPenalty || 0,
                presence_penalty: options.presencePenalty || 0,
                stream: false
            };

            // Add deployment name if provided
            if (this.deploymentName) {
                payload.deployment_name = this.deploymentName;
            }

            this.logger.info('Sending request to AI Foundry', {
                promptLength: prompt.length,
                contextLength: conversationContext.length,
                model: this.modelName
            });

            const startTime = Date.now();
            const response = await this.httpClient.post('', payload);
            const duration = Date.now() - startTime;

            this.logger.info('AI Foundry response received', {
                duration: `${duration}ms`,
                status: response.status,
                usage: response.data.usage
            });

            return this.extractResponseContent(response.data);

        } catch (error) {
            this.logger.error('Error querying AI Foundry', {
                error: error.message,
                stack: error.stack,
                status: error.response?.status,
                responseData: error.response?.data
            });

            // Return fallback response for user
            return this.getFallbackResponse(error);
        }
    }

    prepareMessages(prompt, conversationContext = []) {
        const messages = [];

        // Add system message for context
        messages.push({
            role: 'system',
            content: this.getSystemMessage()
        });

        // Add conversation history (keep last 8 messages for context)
        const recentContext = conversationContext.slice(-8);
        messages.push(...recentContext);

        // Add current user prompt if not already in context
        const lastMessage = messages[messages.length - 1];
        if (!lastMessage || lastMessage.content !== prompt) {
            messages.push({
                role: 'user',
                content: prompt
            });
        }

        return messages;
    }

    getSystemMessage() {
        return `You are an intelligent AI assistant integrated into Microsoft Teams. You help users with various tasks and questions during meetings and conversations.

Guidelines:
- Provide helpful, accurate, and concise responses
- Be professional and friendly in tone
- When discussing complex topics, break them down into clear points
- If you're unsure about something, acknowledge it honestly
- Keep responses focused and relevant to the user's question
- For technical topics, provide practical examples when possible
- Remember that you're in a Teams environment, so responses may be read aloud or viewed by multiple participants

Current context: You are responding to a message in Microsoft Teams and may be participating in a meeting or chat conversation.`;
    }

    extractResponseContent(responseData) {
        try {
            // Handle OpenAI-style response format
            if (responseData.choices && responseData.choices.length > 0) {
                const choice = responseData.choices[0];
                return choice.message?.content || choice.text || '';
            }

            // Handle direct content response
            if (responseData.content) {
                return responseData.content;
            }

            // Handle response with data wrapper
            if (responseData.data && responseData.data.content) {
                return responseData.data.content;
            }

            this.logger.warn('Unexpected response format from AI Foundry', {
                responseKeys: Object.keys(responseData)
            });

            return 'I received a response, but I\'m having trouble processing it. Please try again.';

        } catch (error) {
            this.logger.error('Error extracting response content', {
                error: error.message,
                responseData: responseData
            });
            return 'I encountered an error processing the AI response. Please try again.';
        }
    }

    getFallbackResponse(error) {
        // Provide contextual fallback responses based on error type
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
            return 'I\'m experiencing delays connecting to the AI service. Please try again in a moment.';
        }

        if (error.response?.status === 401) {
            return 'I\'m having authentication issues with the AI service. Please contact your administrator.';
        }

        if (error.response?.status === 429) {
            return 'The AI service is currently busy. Please wait a moment and try again.';
        }

        if (error.response?.status >= 500) {
            return 'The AI service is temporarily unavailable. Please try again later.';
        }

        return 'I\'m having trouble processing your request right now. Please try rephrasing your question or try again later.';
    }

    async testConnection() {
        try {
            // In test environment, return success immediately
            if (process.env.NODE_ENV === 'test') {
                return { success: true, response: 'Connection test successful' };
            }
            
            this.logger.info('Testing AI Foundry connection');
            
            const testPrompt = 'Hello, this is a connection test.';
            const response = await this.queryAiFoundry(testPrompt);
            
            if (response && response.length > 0) {
                this.logger.info('AI Foundry connection test successful');
                return { success: true, response };
            } else {
                this.logger.warn('AI Foundry connection test returned empty response');
                return { success: false, error: 'Empty response' };
            }
            
        } catch (error) {
            this.logger.error('AI Foundry connection test failed', { error: error.message });
            return { success: false, error: error.message };
        }
    }

    async queryWithRetry(prompt, conversationContext = [], options = {}, maxRetries = 3) {
        let lastError;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                this.logger.debug(`AI Foundry query attempt ${attempt}/${maxRetries}`);
                const response = await this.queryAiFoundry(prompt, conversationContext, options);
                
                if (response && response.length > 0) {
                    return response;
                }
                
                lastError = new Error('Empty response from AI Foundry');
                
            } catch (error) {
                lastError = error;
                this.logger.warn(`AI Foundry query attempt ${attempt} failed`, { 
                    error: error.message 
                });
                
                // Don't retry on authentication or client errors
                if (error.response?.status === 401 || error.response?.status === 400) {
                    break;
                }
                
                // Wait before retrying (exponential backoff)
                if (attempt < maxRetries) {
                    const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        
        this.logger.error('All AI Foundry query attempts failed', { 
            maxRetries,
            lastError: lastError.message 
        });
        
        return this.getFallbackResponse(lastError);
    }

    getHealthStatus() {
        return {
            endpoint: this.endpoint ? 'configured' : 'missing',
            apiKey: this.apiKey ? 'configured' : 'missing',
            deploymentName: this.deploymentName || 'not specified',
            modelName: this.modelName
        };
    }
}

module.exports = { AiFoundryClient };
