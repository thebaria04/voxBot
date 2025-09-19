const { TeamsActivityHandler, CardFactory, MessageFactory, TurnContext } = require('botbuilder');
const { SpeechService } = require('./services/speechService');
const { AiFoundryClient } = require('./services/aiFoundryClient');
const { CredentialFactory } = require('./services/credentialFactory');
const { Logger } = require('./services/logger');

class TeamsBot extends TeamsActivityHandler {
    constructor() {
        super();
        
        this.logger = new Logger();
        this.speechService = new SpeechService();
        this.aiFoundryClient = new AiFoundryClient();
        this.credentialFactory = new CredentialFactory();
        
        // Track conversation state for context awareness
        this.conversationState = new Map();
        
        this.setupEventHandlers();
        this.logger.info('TeamsBot initialized successfully');
    }

    setupEventHandlers() {
        // Handle member additions
        this.onMembersAdded(async (context, next) => {
            const membersAdded = context.activity.membersAdded;
            const welcomeText = 'Welcome! I\'m your AI assistant bot. I can help you with:' +
                '\n- Voice conversations in Teams meetings' +
                '\n- Text-based chat interactions' +
                '\n- AI-powered responses using Azure AI Foundry' +
                '\n\nJust speak or type your questions, and I\'ll assist you!';

            for (let cnt = 0; cnt < membersAdded.length; ++cnt) {
                if (membersAdded[cnt].id !== context.activity.recipient.id) {
                    const welcomeCard = this.createWelcomeCard();
                    await context.sendActivity(MessageFactory.attachment(welcomeCard));
                    await context.sendActivity(MessageFactory.text(welcomeText));
                }
            }
            await next();
        });

        // Handle text messages
        this.onMessage(async (context, next) => {
            await this.handleTextMessage(context);
            await next();
        });

        // Handle Teams meeting events
        this.onTeamsMeetingStart(async (meeting, context, next) => {
            this.logger.info('Meeting started', { meetingId: meeting.id });
            await this.handleMeetingStart(meeting, context);
            await next();
        });

        this.onTeamsMeetingEnd(async (meeting, context, next) => {
            this.logger.info('Meeting ended', { meetingId: meeting.id });
            await this.handleMeetingEnd(meeting, context);
            await next();
        });
    }

    async handleTextMessage(context) {
        try {
            const userMessage = context.activity.text?.trim();
            if (!userMessage) {
                await context.sendActivity('I didn\'t receive any text. Please try again.');
                return;
            }

            this.logger.info('Processing text message', { 
                text: userMessage,
                userId: context.activity.from.id,
                channelId: context.activity.channelId
            });

            // Show typing indicator
            await context.sendActivity({ type: 'typing' });

            // Get conversation context
            const conversationId = context.activity.conversation.id;
            const conversationContext = this.conversationState.get(conversationId) || [];

            // Add user message to context
            conversationContext.push({ role: 'user', content: userMessage });

            // Query AI Foundry
            const aiResponse = await this.aiFoundryClient.queryAiFoundry(userMessage, conversationContext);
            
            if (!aiResponse) {
                await context.sendActivity('I\'m sorry, I couldn\'t process your request right now. Please try again later.');
                return;
            }

            // Add AI response to context
            conversationContext.push({ role: 'assistant', content: aiResponse });
            
            // Keep only last 10 messages for context
            if (conversationContext.length > 10) {
                conversationContext.splice(0, conversationContext.length - 10);
            }
            this.conversationState.set(conversationId, conversationContext);

            // Send text response
            await context.sendActivity(MessageFactory.text(aiResponse));

            // Generate and send speech response if in a call/meeting
            if (this.isInCall(context)) {
                await this.generateAndPlaySpeech(aiResponse, context);
            }

        } catch (error) {
            this.logger.error('Error handling text message', { 
                error: error.message, 
                stack: error.stack 
            });
            await context.sendActivity('I encountered an error processing your message. Please try again.');
        }
    }

    async handleMeetingStart(meeting, context) {
        try {
            // Auto-join meeting if enabled
            if (process.env.AUTO_JOIN_MEETINGS === 'true') {
                await this.joinMeeting(meeting, context);
            }

            // Send welcome message to meeting
            const welcomeMessage = 'Hi everyone! I\'ve joined the meeting and I\'m ready to assist. ' +
                'You can speak directly and I\'ll transcribe and respond, or use text chat.';
            
            await context.sendActivity(MessageFactory.text(welcomeMessage));
            
        } catch (error) {
            this.logger.error('Error handling meeting start', { 
                error: error.message,
                meetingId: meeting.id 
            });
        }
    }

    async handleMeetingEnd(meeting, context) {
        try {
            // Clean up meeting-specific resources
            const conversationId = context.activity.conversation.id;
            this.conversationState.delete(conversationId);
            
            this.logger.info('Meeting cleanup completed', { meetingId: meeting.id });
            
        } catch (error) {
            this.logger.error('Error handling meeting end', { 
                error: error.message,
                meetingId: meeting.id 
            });
        }
    }

    async joinMeeting(meeting, context) {
        try {
            // Note: Actual meeting join logic would require Microsoft Graph API calls
            // and proper meeting bot setup. This is a placeholder for the logic.
            this.logger.info('Joining meeting', { meetingId: meeting.id });
            
            // Initialize speech recognition for the meeting
            await this.speechService.startContinuousRecognition(
                (transcription) => this.handleSpeechTranscription(transcription, context)
            );
            
        } catch (error) {
            this.logger.error('Error joining meeting', { 
                error: error.message,
                meetingId: meeting.id 
            });
        }
    }

    async handleSpeechTranscription(transcription, context) {
        try {
            if (!transcription || transcription.trim().length === 0) {
                return;
            }

            this.logger.info('Processing speech transcription', { 
                transcription: transcription,
                userId: context.activity.from.id 
            });

            // Process the transcription as if it were a text message
            const mockActivity = {
                ...context.activity,
                text: transcription,
                type: 'message'
            };

            const mockContext = {
                ...context,
                activity: mockActivity
            };

            await this.handleTextMessage(mockContext);
            
        } catch (error) {
            this.logger.error('Error handling speech transcription', { 
                error: error.message,
                transcription: transcription 
            });
        }
    }

    async generateAndPlaySpeech(text, context) {
        try {
            // Generate audio from text
            const audioBuffer = await this.speechService.textToSpeech(text);
            
            if (audioBuffer) {
                // Note: Playing audio in Teams calls requires specific APIs
                // This is a placeholder for the audio playback logic
                this.logger.info('Generated speech audio', { 
                    textLength: text.length,
                    audioSize: audioBuffer.length 
                });
                
                // In a real implementation, you would use Teams calling SDK
                // to play the audio buffer into the call
                await this.playAudioInCall(audioBuffer, context);
            }
            
        } catch (error) {
            this.logger.error('Error generating speech', { 
                error: error.message,
                text: text 
            });
        }
    }

    async playAudioInCall(audioBuffer, context) {
        try {
            // Placeholder for Teams calling SDK audio playback
            // In a real implementation, this would use the Teams calling SDK
            // to inject audio into the active call
            this.logger.info('Playing audio in call', { 
                audioSize: audioBuffer.length,
                callId: context.activity.callId 
            });
            
        } catch (error) {
            this.logger.error('Error playing audio in call', { 
                error: error.message 
            });
        }
    }

    isInCall(context) {
        // Check if the bot is currently in a Teams call or meeting
        return context.activity.channelData?.meeting || 
               context.activity.channelData?.call ||
               context.activity.callId;
    }

    createWelcomeCard() {
        const card = CardFactory.adaptiveCard({
            type: 'AdaptiveCard',
            version: '1.4',
            body: [
                {
                    type: 'TextBlock',
                    text: 'AI Foundry Teams Bot',
                    size: 'Large',
                    weight: 'Bolder',
                    color: 'Accent'
                },
                {
                    type: 'TextBlock',
                    text: 'Your intelligent assistant powered by Azure AI Foundry',
                    wrap: true,
                    spacing: 'Medium'
                },
                {
                    type: 'FactSet',
                    facts: [
                        {
                            title: 'Voice Support:',
                            value: 'Speech-to-Text & Text-to-Speech'
                        },
                        {
                            title: 'AI Model:',
                            value: process.env.AI_FOUNDRY_MODEL_NAME || 'Azure AI Foundry'
                        },
                        {
                            title: 'Meeting Support:',
                            value: 'Real-time transcription & responses'
                        }
                    ]
                }
            ],
            actions: [
                {
                    type: 'Action.Submit',
                    title: 'Get Started',
                    data: { action: 'start' }
                }
            ]
        });

        return card;
    }
}

module.exports = { TeamsBot };
