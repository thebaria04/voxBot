#!/usr/bin/env node

/**
 * AI Foundry Authentication Validation Script
 * 
 * This script helps validate AI Foundry configuration and authentication
 * Usage: node scripts/validate-ai-foundry.js
 */

const axios = require('axios');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

class AiFoundryValidator {
    constructor() {
        this.endpoint = process.env.AI_FOUNDRY_ENDPOINT;
        this.apiKey = process.env.AI_FOUNDRY_API_KEY;
        this.deploymentName = process.env.AI_FOUNDRY_DEPLOYMENT_NAME;
        this.modelName = process.env.AI_FOUNDRY_MODEL_NAME || 'gpt-4';
    }

    async validateConfiguration() {
        console.log('🔍 AI Foundry Configuration Validation');
        console.log('=====================================\n');

        // Check environment variables
        const checks = [
            { name: 'AI_FOUNDRY_ENDPOINT', value: this.endpoint },
            { name: 'AI_FOUNDRY_API_KEY', value: this.apiKey },
            { name: 'AI_FOUNDRY_DEPLOYMENT_NAME', value: this.deploymentName },
            { name: 'AI_FOUNDRY_MODEL_NAME', value: this.modelName }
        ];

        let configValid = true;
        checks.forEach(check => {
            if (check.value) {
                console.log(`✅ ${check.name}: Configured`);
                if (check.name === 'AI_FOUNDRY_API_KEY') {
                    console.log(`   Key: ${check.value.substring(0, 8)}...${check.value.substring(check.value.length - 4)}`);
                } else if (check.name === 'AI_FOUNDRY_ENDPOINT') {
                    console.log(`   URL: ${check.value}`);
                } else {
                    console.log(`   Value: ${check.value}`);
                }
            } else {
                console.log(`❌ ${check.name}: Missing`);
                if (check.name !== 'AI_FOUNDRY_MODEL_NAME') {
                    configValid = false;
                }
            }
        });

        console.log('\n');
        return configValid;
    }

    async validateEndpoint() {
        console.log('🌐 Endpoint Validation');
        console.log('======================\n');

        try {
            // Parse URL to validate format
            const url = new URL(this.endpoint);
            console.log(`✅ Endpoint URL format is valid`);
            console.log(`   Protocol: ${url.protocol}`);
            console.log(`   Host: ${url.host}`);
            console.log(`   Path: ${url.pathname}`);

            // Test basic connectivity
            console.log('\n🔗 Testing basic connectivity...');
            const response = await axios.get(this.endpoint, {
                timeout: 10000,
                validateStatus: () => true // Accept any status for now
            });

            console.log(`✅ Endpoint is reachable`);
            console.log(`   Status: ${response.status}`);
            console.log(`   Headers: ${Object.keys(response.headers).join(', ')}`);

            return true;
        } catch (error) {
            console.log(`❌ Endpoint validation failed`);
            console.log(`   Error: ${error.message}`);
            if (error.code) {
                console.log(`   Code: ${error.code}`);
            }
            return false;
        }
    }

    async validateAuthentication() {
        console.log('\n🔐 Authentication Validation');
        console.log('============================\n');

        try {
            const httpClient = axios.create({
                baseURL: this.endpoint,
                timeout: 30000,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                    'User-Agent': 'ai-foundry-validator/1.0.0'
                }
            });

            console.log('🔑 Testing authentication with API key...');

            // Try a simple test request
            const payload = {
                model: this.modelName,
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful assistant.'
                    },
                    {
                        role: 'user',
                        content: 'Hello, this is a test message. Please respond briefly.'
                    }
                ],
                max_tokens: 50,
                temperature: 0.7
            };

            // Add deployment name if specified
            if (this.deploymentName) {
                payload.deployment_name = this.deploymentName;
                console.log(`   Using deployment: ${this.deploymentName}`);
            }

            const startTime = Date.now();
            const response = await httpClient.post('', payload);
            const duration = Date.now() - startTime;

            console.log(`✅ Authentication successful`);
            console.log(`   Response time: ${duration}ms`);
            console.log(`   Status: ${response.status}`);
            
            if (response.data.choices && response.data.choices.length > 0) {
                const content = response.data.choices[0].message?.content || 'No content';
                console.log(`   Response: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`);
            }

            if (response.data.usage) {
                console.log(`   Tokens used: ${response.data.usage.total_tokens}`);
            }

            return true;

        } catch (error) {
            console.log(`❌ Authentication failed`);
            console.log(`   Error: ${error.message}`);
            
            if (error.response) {
                console.log(`   Status: ${error.response.status}`);
                console.log(`   Status Text: ${error.response.statusText}`);
                
                if (error.response.data) {
                    console.log(`   Response Data: ${JSON.stringify(error.response.data, null, 2)}`);
                }
            }

            return false;
        }
    }

    async validateDeployment() {
        if (!this.deploymentName) {
            console.log('\n📦 Deployment Validation');
            console.log('========================\n');
            console.log('⚠️  No deployment name specified, skipping deployment validation');
            return true;
        }

        console.log('\n📦 Deployment Validation');
        console.log('========================\n');

        try {
            // Try to query the specific deployment
            console.log(`🎯 Testing deployment: ${this.deploymentName}`);
            
            const httpClient = axios.create({
                baseURL: this.endpoint,
                timeout: 30000,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                    'User-Agent': 'ai-foundry-validator/1.0.0'
                }
            });

            const payload = {
                model: this.modelName,
                deployment_name: this.deploymentName,
                messages: [
                    {
                        role: 'user',
                        content: 'Test deployment'
                    }
                ],
                max_tokens: 10
            };

            const response = await httpClient.post('', payload);
            
            console.log(`✅ Deployment is accessible`);
            console.log(`   Model: ${this.modelName}`);
            console.log(`   Deployment: ${this.deploymentName}`);

            return true;

        } catch (error) {
            console.log(`❌ Deployment validation failed`);
            console.log(`   Error: ${error.message}`);
            
            if (error.response?.status === 404) {
                console.log(`   Suggestion: Check if deployment '${this.deploymentName}' exists`);
            }

            return false;
        }
    }

    async runFullValidation() {
        console.log('🚀 Starting AI Foundry Validation\n');
        
        const results = {
            configuration: await this.validateConfiguration(),
            endpoint: false,
            authentication: false,
            deployment: false
        };

        if (results.configuration) {
            results.endpoint = await this.validateEndpoint();
            
            if (results.endpoint) {
                results.authentication = await this.validateAuthentication();
                
                if (results.authentication) {
                    results.deployment = await this.validateDeployment();
                }
            }
        }

        // Summary
        console.log('\n📊 Validation Summary');
        console.log('=====================\n');
        
        Object.entries(results).forEach(([test, passed]) => {
            console.log(`${passed ? '✅' : '❌'} ${test.charAt(0).toUpperCase() + test.slice(1)}: ${passed ? 'PASSED' : 'FAILED'}`);
        });

        const allPassed = Object.values(results).every(result => result === true);
        
        console.log(`\n${allPassed ? '🎉' : '⚠️'} Overall Status: ${allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}\n`);

        if (!allPassed) {
            console.log('💡 Troubleshooting Tips:');
            console.log('- Verify your AI_FOUNDRY_ENDPOINT is correct');
            console.log('- Check that your AI_FOUNDRY_API_KEY is valid and not expired');
            console.log('- Ensure your deployment name matches what\'s deployed in Azure');
            console.log('- Verify network connectivity to the AI Foundry endpoint\n');
        }

        return allPassed;
    }
}

// Run validation if script is executed directly
if (require.main === module) {
    const validator = new AiFoundryValidator();
    validator.runFullValidation()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('❌ Validation script failed:', error.message);
            process.exit(1);
        });
}

module.exports = { AiFoundryValidator };