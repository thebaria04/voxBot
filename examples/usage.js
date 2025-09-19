// Example usage patterns for the Teams AI Foundry Bot

const axios = require('axios');

// Configuration - Replace with your actual bot endpoint
const BOT_BASE_URL = 'https://your-bot.azurewebsites.net';

// Example 1: Simple AI Query
async function exampleAIQuery() {
    console.log('🤖 Example 1: Simple AI Query');
    
    try {
        const response = await axios.post(`${BOT_BASE_URL}/api/ask`, {
            prompt: 'Explain quantum computing in simple terms',
            options: {
                maxTokens: 500,
                temperature: 0.7
            }
        });
        
        console.log('AI Response:', response.data.response);
        console.log('Processing Time:', response.data.metadata.processingTime);
    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
    }
}

// Example 2: Conversation with Context
async function exampleConversationWithContext() {
    console.log('💬 Example 2: Conversation with Context');
    
    const conversationContext = [
        { role: 'user', content: 'Hello, I need help with JavaScript' },
        { role: 'assistant', content: 'Hello! I\'d be happy to help you with JavaScript. What specific topic would you like to learn about?' }
    ];
    
    try {
        const response = await axios.post(`${BOT_BASE_URL}/api/ask`, {
            prompt: 'How do I use async/await?',
            conversationContext: conversationContext,
            options: {
                maxTokens: 800,
                temperature: 0.5
            }
        });
        
        console.log('AI Response:', response.data.response);
    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
    }
}

// Example 3: Text-to-Speech
async function exampleTextToSpeech() {
    console.log('🔊 Example 3: Text-to-Speech');
    
    try {
        const response = await axios.post(`${BOT_BASE_URL}/api/text-to-speech`, {
            text: 'Hello! This is an example of text-to-speech conversion using Azure Cognitive Services.',
            voiceName: 'en-US-JennyNeural',
            returnAudio: true
        });
        
        console.log('Audio generated successfully');
        console.log('Audio size:', response.data.metadata.audioSize, 'bytes');
        
        // In a real application, you would save or play the audio
        // const audioBuffer = Buffer.from(response.data.audioData, 'base64');
        // fs.writeFileSync('output.mp3', audioBuffer);
        
    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
    }
}

// Example 4: Speech-to-Text (requires audio data)
async function exampleSpeechToText() {
    console.log('🎤 Example 4: Speech-to-Text');
    
    // In a real scenario, you would have actual audio data
    // This is just an example structure
    const mockAudioData = Buffer.from('mock audio data').toString('base64');
    
    try {
        const response = await axios.post(`${BOT_BASE_URL}/api/speech-to-text`, {
            audioData: mockAudioData
        });
        
        console.log('Transcription:', response.data.transcription);
        console.log('Processing Time:', response.data.metadata.processingTime);
        
    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
    }
}

// Example 5: Full Conversation Flow (STT -> AI -> TTS)
async function exampleFullConversationFlow() {
    console.log('🔄 Example 5: Full Conversation Flow');
    
    try {
        const response = await axios.post(`${BOT_BASE_URL}/api/conversation`, {
            text: 'What are the benefits of using TypeScript over JavaScript?',
            options: {
                maxTokens: 600,
                temperature: 0.6
            }
        });
        
        console.log('AI Response:', response.data.aiResponse);
        console.log('Speech Audio Generated:', !!response.data.speechAudio);
        console.log('Processing Steps:', response.data.metadata.steps);
        
    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
    }
}

// Example 6: Health Check
async function exampleHealthCheck() {
    console.log('🏥 Example 6: Health Check');
    
    try {
        const healthResponse = await axios.get(`${BOT_BASE_URL}/health`);
        console.log('Bot Health:', healthResponse.data);
        
        const statusResponse = await axios.get(`${BOT_BASE_URL}/api/status`);
        console.log('Service Status:', statusResponse.data.services);
        
    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
    }
}

// Example 7: Test AI Foundry Connection
async function exampleTestAIFoundry() {
    console.log('🧪 Example 7: Test AI Foundry Connection');
    
    try {
        const response = await axios.get(`${BOT_BASE_URL}/api/test-ai-foundry`);
        console.log('AI Foundry Test:', response.data.success ? '✅ Passed' : '❌ Failed');
        
        if (!response.data.success) {
            console.log('Error:', response.data.error);
        }
        
    } catch (error) {
        console.error('Error:', error.response?.data || error.message);
    }
}

// Teams Bot Usage Examples (conceptual - actual usage would be in Teams)
function teamsUsageExamples() {
    console.log('📱 Teams Bot Usage Examples:');
    console.log('');
    console.log('1. Direct Chat:');
    console.log('   User: "Hello bot, can you help me with Python?"');
    console.log('   Bot: "Hello! I\'d be happy to help you with Python..."');
    console.log('');
    console.log('2. In Meeting (Voice):');
    console.log('   User speaks: "What is machine learning?"');
    console.log('   Bot transcribes, processes with AI, and responds with both text and voice');
    console.log('');
    console.log('3. Channel Mention:');
    console.log('   User: "@AIBot explain the benefits of microservices"');
    console.log('   Bot: Provides detailed explanation about microservices');
    console.log('');
    console.log('4. Adaptive Card Interactions:');
    console.log('   User clicks "Get Started" button');
    console.log('   Bot: Presents options and interactive elements');
}

// Main execution function
async function runExamples() {
    console.log('🚀 Teams AI Foundry Bot - Usage Examples');
    console.log('==========================================');
    
    // Basic health check first
    await exampleHealthCheck();
    console.log('');
    
    // Test AI Foundry connection
    await exampleTestAIFoundry();
    console.log('');
    
    // Run other examples
    await exampleAIQuery();
    console.log('');
    
    await exampleConversationWithContext();
    console.log('');
    
    await exampleTextToSpeech();
    console.log('');
    
    // Note: Speech-to-text requires actual audio data
    // await exampleSpeechToText();
    
    await exampleFullConversationFlow();
    console.log('');
    
    // Show Teams usage patterns
    teamsUsageExamples();
}

// Error handling for the entire example
async function main() {
    try {
        await runExamples();
    } catch (error) {
        console.error('Example execution failed:', error.message);
        console.log('');
        console.log('Make sure to:');
        console.log('1. Update BOT_BASE_URL with your actual bot endpoint');
        console.log('2. Ensure the bot is deployed and running');
        console.log('3. Check that all required environment variables are configured');
    }
}

// Export for module usage
module.exports = {
    exampleAIQuery,
    exampleConversationWithContext,
    exampleTextToSpeech,
    exampleSpeechToText,
    exampleFullConversationFlow,
    exampleHealthCheck,
    exampleTestAIFoundry
};

// Run examples if this file is executed directly
if (require.main === module) {
    console.log('To run these examples:');
    console.log('1. Update BOT_BASE_URL with your bot endpoint');
    console.log('2. Run: node examples/usage.js');
    console.log('');
    console.log('Or uncomment the next line to run examples:');
    // main();
}
