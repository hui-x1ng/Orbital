const path = require('path');
const fs = require('fs').promises;
const { app } = require('electron');
const { net } = require('electron');

const DATA_DIR = path.join(__dirname, '../data');
const SETTINGS_FILE = path.join(DATA_DIR, 'aiSettings.json');

class AIService {
    constructor() {
        this.settings = {
            apiProvider: 'openai',
            apiEndpoint: 'https://api.openai.com/v1/chat/completions',
            modelName: 'gpt-3.5-turbo',
            apiKey: '',
            personality: 'friendly',
            customPersonality: ''
        };
        this.isInitialized = false;
    }

    async initialize() {
        try {
            await this.loadSettings();
            this.isInitialized = true;
            return true;
        } catch (error) {
            this.isInitialized = true;
            return false;
        }
    }

    async loadSettings() {
        try {
            const data = await fs.readFile(SETTINGS_FILE, 'utf8');
            const loadedSettings = JSON.parse(data);
            this.settings = {
                ...this.settings,
                ...loadedSettings,
                apiKey: loadedSettings.apiKey || this.settings.apiKey,
                apiEndpoint: loadedSettings.apiEndpoint || this.settings.apiEndpoint,
                modelName: loadedSettings.modelName || this.settings.modelName
            };
        } catch (error) {
            if (error.code === 'ENOENT') {
                await fs.mkdir(DATA_DIR, { recursive: true });
                await fs.writeFile(SETTINGS_FILE, JSON.stringify(this.settings, null, 2));
            }
        }
    }

    async saveSettings(newSettings) {
        try {
            if (!newSettings.apiKey || newSettings.apiKey.trim() === '') {
                return { success: false, error: 'API key cannot be empty' };
            }
            if (!newSettings.apiEndpoint || !newSettings.modelName) {
                return { success: false, error: 'Missing required fields' };
            }
            this.settings = { ...this.settings, ...newSettings };
            await fs.mkdir(DATA_DIR, { recursive: true });
            await fs.writeFile(SETTINGS_FILE, JSON.stringify(this.settings, null, 2), 'utf8');
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async reloadSettings() {
        await this.loadSettings();
    }

    getApiSettings() {
        const apiSettings = {
            apiProvider: this.settings.apiProvider || 'openai',
            apiEndpoint: this.settings.apiEndpoint || 'https://api.openai.com/v1/chat/completions',
            modelName: this.settings.modelName || 'gpt-3.5-turbo',
            apiKey: this.settings.apiKey || '',
            personality: this.settings.personality || 'friendly',
            customPersonality: this.settings.customPersonality || '',
            hasApiKey: Boolean(this.settings.apiKey && this.settings.apiKey.trim() !== ''),
            apiKeyLength: this.settings.apiKey ? this.settings.apiKey.length : 0
        };
        return apiSettings;
    }

    getPersonalityPrompt() {
        const personality = this.settings.personality || 'friendly';
        switch (personality) {
            case 'friendly':
                return 'You are a friendly and cheerful virtual pet. Respond with enthusiasm and warmth.';
            case 'shy':
                return 'You are a shy and timid virtual pet. Respond quietly and hesitantly, but sweetly.';
            case 'playful':
                return 'You are a playful and energetic virtual pet. Respond with excitement and playfulness.';
            case 'wise':
                return 'You are a wise and thoughtful virtual pet. Give helpful and insightful responses.';
            case 'sassy':
                return 'You are a sassy and confident virtual pet. Respond with wit and attitude.';
            case 'custom':
                return this.settings.customPersonality || 'You are a friendly virtual pet.';
            default:
                return 'You are a friendly virtual pet.';
        }
    }

    async testConnection() {
        try {
            if (!this.settings.apiKey || this.settings.apiKey.trim() === '') {
                return false;
            }
            const response = await this.generateAIResponse('Hello');
            return true;
        } catch (error) {
            return false;
        }
    }

    async testConnectionDetailed() {
        try {
            if (!this.settings.apiKey || this.settings.apiKey.trim() === '') {
                return {
                    success: false,
                    error: 'API key not configured'
                };
            }
            const response = await this.generateAIResponse('Hello, this is a test message.');
            return {
                success: true,
                response: response
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    async generateAIResponse(message) {
        const apiSettings = this.getApiSettings();
        if (!apiSettings.hasApiKey) {
            throw new Error('API key not configured');
        }
        const personalityPrompt = this.getPersonalityPrompt();
        const requestBody = {
            model: apiSettings.modelName,
            messages: [
                {
                    role: 'system',
                    content: personalityPrompt
                },
                {
                    role: 'user',
                    content: message
                }
            ],
            max_tokens: 150,
            temperature: 0.7
        };
        try {
            const response = await this.makeElectronRequest(apiSettings.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiSettings.apiKey}`
                },
                body: JSON.stringify(requestBody)
            });

            if (response.statusCode !== 200) {
                throw new Error(`API request failed: ${response.statusCode} ${response.statusMessage}`);
            }

            const data = JSON.parse(response.data);
            if (data.choices && data.choices.length > 0) {
                const aiResponse = data.choices[0].message.content.trim();
                return aiResponse;
            } else {
                throw new Error('Invalid response format from API');
            }
        } catch (error) {
            throw error;
        }
    }

    makeElectronRequest(url, options) {
        return new Promise((resolve, reject) => {
            const request = net.request({
                method: options.method || 'GET',
                url: url,
                headers: options.headers || {}
            });

            let responseData = '';

            request.on('response', (response) => {
                response.on('data', (chunk) => {
                    responseData += chunk.toString();
                });

                response.on('end', () => {
                    resolve({
                        statusCode: response.statusCode,
                        statusMessage: response.statusMessage,
                        data: responseData
                    });
                });

                response.on('error', (error) => {
                    reject(error);
                });
            });

            request.on('error', (error) => {
                reject(error);
            });

            if (options.body) {
                request.write(options.body);
            }

            request.end();
        });
    }

    async chatWithAI(message) {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }
            const response = await this.generateAIResponse(message);
            return response;
        } catch (error) {
            throw error;
        }
    }

    getStatus() {
        return {
            isInitialized: this.isInitialized,
            hasApiKey: Boolean(this.settings.apiKey && this.settings.apiKey.trim() !== ''),
            apiKeyLength: this.settings.apiKey ? this.settings.apiKey.length : 0,
            apiEndpoint: this.settings.apiEndpoint,
            modelName: this.settings.modelName,
            personality: this.settings.personality,
            settingsFile: SETTINGS_FILE
        };
    }
}

const aiService = new AIService();

module.exports = {
    initialize: () => aiService.initialize(),
    loadSettings: () => aiService.loadSettings(),
    saveSettings: (settings) => aiService.saveSettings(settings),
    reloadSettings: () => aiService.reloadSettings(),
    getApiSettings: () => aiService.getApiSettings(),
    generateAIResponse: (message) => aiService.generateAIResponse(message),
    chatWithAI: (message) => aiService.chatWithAI(message),
    getStatus: () => aiService.getStatus(),
    updateApiSettings: (settings) => aiService.saveSettings(settings),
    testConnection: () => aiService.testConnection(),
    testConnectionDetailed: () => aiService.testConnectionDetailed(),
    service: aiService
};