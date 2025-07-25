const path = require('path');
const fs = require('fs').promises;
const { app } = require('electron');
const DATA_DIR = path.join(__dirname, '../data');
const SETTINGS_FILE = path.join(DATA_DIR, 'aiSettings.json');
console.log('AI settings path:', SETTINGS_FILE);

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
        console.log('AI Service constructor called');
    }

    async initialize() {
        console.log('Initializing AI service settings...');
        try {
            await this.loadSettings();
            this.isInitialized = true;
            console.log('AI service initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize AI service:', error);
            console.log('Using default settings due to initialization error');
            this.isInitialized = true;
            return false;
        }
    }

    async loadSettings() {
        try {
            console.log(`Loading AI settings from: ${SETTINGS_FILE}`);
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
                console.log('Creating new settings file');
                await fs.mkdir(DATA_DIR, { recursive: true });
                await fs.writeFile(SETTINGS_FILE, JSON.stringify(this.settings, null, 2));
            } else {
                console.error('Error loading AI settings:', error);
            }
        }
    }

    async saveSettings(newSettings) {
        try {
            console.log('Saving AI settings:', {
                ...newSettings,
                apiKey: newSettings.apiKey ? `***${newSettings.apiKey.slice(-4)}` : 'empty'
            });
            if (!newSettings.apiKey || newSettings.apiKey.trim() === '') {
                console.error('API key is empty!');
                return { success: false, error: 'API key cannot be empty' };
            }
            if (!newSettings.apiEndpoint || !newSettings.modelName) {
                console.error('Missing required fields');
                return { success: false, error: 'Missing required fields' };
            }
            this.settings = { ...this.settings, ...newSettings };
            await fs.mkdir(DATA_DIR, { recursive: true });
            await fs.writeFile(SETTINGS_FILE, JSON.stringify(this.settings, null, 2), 'utf8');
            console.log('AI settings saved successfully');
            return { success: true };
        } catch (error) {
            console.error('Failed to save AI settings:', error);
            return { success: false, error: error.message };
        }
    }

    async reloadSettings() {
        console.log('Reloading AI service settings...');
        await this.loadSettings();
        console.log('AI service settings reloaded');
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
        console.log('Getting API settings:', {
            ...apiSettings,
            apiKey: apiSettings.apiKey ? `***${apiSettings.apiKey.slice(-4)}` : 'empty'
        });
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
            console.log('Testing AI connection...');
            if (!this.settings.apiKey || this.settings.apiKey.trim() === '') {
                console.log('Connection test failed: No API key');
                return false;
            }
            const response = await this.generateAIResponse('Hello');
            console.log('Connection test successful');
            return true;
        } catch (error) {
            console.error('Connection test failed:', error);
            return false;
        }
    }

    async testConnectionDetailed() {
        try {
            console.log('Testing AI connection (detailed)...');
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
            console.error('Detailed connection test failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async generateAIResponse(message) {
        console.log('Generating AI response in main process...');
        const apiSettings = this.getApiSettings();
        if (!apiSettings.hasApiKey) {
            console.error('API key validation failed:', {
                hasApiKey: apiSettings.hasApiKey,
                apiKeyLength: apiSettings.apiKeyLength,
                apiKey: apiSettings.apiKey ? 'present' : 'missing'
            });
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
        console.log('Making API request to:', apiSettings.apiEndpoint);
        console.log('Request body:', {
            ...requestBody,
            messages: requestBody.messages.map(msg => ({
                ...msg,
                content: msg.content.length > 50 ? msg.content.substring(0, 50) + '...' : msg.content
            }))
        });
        try {
            const fetch = require('node-fetch');
            const response = await fetch(apiSettings.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiSettings.apiKey}`
                },
                body: JSON.stringify(requestBody)
            });
            console.log('API response status:', response.status);
            if (!response.ok) {
                const errorText = await response.text();
                console.error('API request failed:', {
                    status: response.status,
                    statusText: response.statusText,
                    error: errorText
                });
                throw new Error(`API request failed: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            console.log('API response received successfully');
            if (data.choices && data.choices.length > 0) {
                const aiResponse = data.choices[0].message.content.trim();
                console.log('AI response generated:', aiResponse.substring(0, 100) + '...');
                return aiResponse;
            } else {
                console.error('Invalid API response format:', data);
                throw new Error('Invalid response format from API');
            }
        } catch (error) {
            console.error('Error generating AI response:', error);
            throw error;
        }
    }

    async chatWithAI(message) {
        console.log('ChatWithAI called with message:', message);
        try {
            if (!this.isInitialized) {
                console.log('AI service not initialized, initializing now...');
                await this.initialize();
            }
            const response = await this.generateAIResponse(message);
            console.log('ChatWithAI response generated successfully');
            return response;
        } catch (error) {
            console.error('ChatWithAI error:', error);
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