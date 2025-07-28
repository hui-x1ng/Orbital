let aiSettings = {
    apiKey: '',
    apiEndpoint: 'https://api.openai.com/v1/chat/completions',
    modelName: 'gpt-3.5-turbo',
    apiProvider: 'openai',
    personality: 'friendly',
    customPersonality: '',
    requestTimeout: 30000
};

const personalityTemplates = {
    friendly: "You are a friendly and helpful AI assistant. You are cheerful, enthusiastic, and always eager to help with any questions or tasks.",
    shy: "You are a gentle and thoughtful AI assistant. You are modest and careful with your responses, taking time to consider before answering.",
    playful: "You are a creative and fun AI assistant. You enjoy wordplay, humor, and making interactions engaging.",
    wise: "You are a knowledgeable and philosophical AI assistant. You provide thoughtful insights and helpful advice.",
    sassy: "You are a confident and witty AI assistant. You have a sharp sense of humor and aren't afraid to be a bit cheeky in your responses."
};

function getStoredSettings() {
    try {
        const stored = localStorage.getItem('aiSettings');
        if (stored) {
            const parsedSettings = JSON.parse(stored);
            console.log('[aiManager] Loaded settings from localStorage:', {
                ...parsedSettings,
                apiKey: parsedSettings.apiKey ? `${parsedSettings.apiKey.substring(0, 10)}...` : 'empty'
            });
            return parsedSettings;
        }
    } catch (error) {
        console.warn('[aiManager] Failed to load from localStorage:', error);
    }
    return {};
}

function storeSettings(settings) {
    try {
        const toStore = { ...aiSettings, ...settings };
        localStorage.setItem('aiSettings', JSON.stringify(toStore));
        console.log('[aiManager] Settings saved to localStorage:', {
            ...toStore,
            apiKey: toStore.apiKey ? `${toStore.apiKey.substring(0, 10)}...` : 'empty'
        });
    } catch (error) {
        console.warn('[aiManager] Failed to save to localStorage:', error);
    }
}

function initializeSettings() {
    const storedSettings = getStoredSettings();
    aiSettings = { ...aiSettings, ...storedSettings };
    console.log('[aiManager] Settings initialized:', {
        ...aiSettings,
        apiKey: aiSettings.apiKey ? `${aiSettings.apiKey.substring(0, 10)}...` : 'empty'
    });
}

if (typeof window !== 'undefined') {
    initializeSettings();
}

export async function getSettings() {
    console.log('[aiManager] Getting current settings:', {
        ...aiSettings,
        apiKey: aiSettings.apiKey ? `${aiSettings.apiKey.substring(0, 10)}...` : 'empty'
    });
    return { ...aiSettings };
}

export async function saveSettings(settings) {
    console.log('[aiManager] Saving settings:', {
        ...settings,
        apiKey: settings.apiKey ? `${settings.apiKey.substring(0, 10)}...` : 'empty'
    });

    aiSettings = { ...aiSettings, ...settings };

    storeSettings(settings);

    if (window.electronAPI?.updateAiSettings) {
        try {
            await window.electronAPI.updateAiSettings(aiSettings);
            console.log('[aiManager] Settings synced with main process');
        } catch (error) {
            console.warn('[aiManager] Failed to sync settings with main process:', error);
        }
    }

    if (window.electronAPI?.saveAiSettings) {
        try {
            await window.electronAPI.saveAiSettings(aiSettings);
            console.log('[aiManager] Settings synced with new API');
        } catch (error) {
            console.warn('[aiManager] Failed to sync with new API:', error);
        }
    }

    return { success: true };
}

export async function savePersonalitySettings(settings) {
    aiSettings = { ...aiSettings, ...settings };
    storeSettings(settings);

    if (window.electronAPI?.updatePersonality) {
        try {
            const personalityPrompt = getPersonalityPrompt(settings.personality, settings.customPersonality);
            await window.electronAPI.updatePersonality(personalityPrompt);
        } catch (error) {
            console.warn('[aiManager] Failed to sync personality with main process:', error);
        }
    }
}

export async function testConnection() {
    try {
        console.log('[aiManager] Testing API connection...');

        if (!aiSettings.apiKey || aiSettings.apiKey.trim() === '') {
            throw new Error('API key is required');
        }

        if (!aiSettings.apiEndpoint) {
            throw new Error('API endpoint is required');
        }

        if (!aiSettings.modelName) {
            throw new Error('Model name is required');
        }

        if (window.electronAPI?.testAiConnectionDetailed) {
            try {
                const result = await window.electronAPI.testAiConnectionDetailed();
                return result.success;
            } catch (error) {
                console.warn('[aiManager] Main process test failed, trying direct API:', error);
            }
        }

        const testResponse = await makeOpenAIRequest(
            'Hello',
            'You are a helpful assistant. Respond with just "Hello" and nothing else.',
            aiSettings
        );

        if (testResponse && testResponse.trim().length > 0) {
            console.log('[aiManager] Connection test successful');
            return true;
        } else {
            throw new Error('Received empty response from API');
        }

    } catch (error) {
        console.error('[aiManager] API connection test failed:', error);
        return false;
    }
}

export function getPersonalityPrompt(personalityType, customPersonality) {
    if (personalityType === 'custom' && customPersonality) {
        return customPersonality;
    }

    return personalityTemplates[personalityType] || personalityTemplates.friendly;
}

export async function generateResponse(message, petData) {
    try {
        console.log('[aiManager] Generating response...');
        console.log('[aiManager] Current settings:', {
            hasApiKey: !!aiSettings.apiKey,
            apiKeyLength: aiSettings.apiKey ? aiSettings.apiKey.length : 0,
            endpoint: aiSettings.apiEndpoint,
            model: aiSettings.modelName
        });

        if (!aiSettings.apiKey || aiSettings.apiKey.trim() === '') {
            throw new Error('API key not configured. Please configure your OpenAI API key in settings.');
        }

        const safePetData = petData || {
            hp: 100,
            intimacy: 100,
            name: 'Your Pet',
            age: 0
        };

        if (window.electronAPI?.chatWithPet) {
            try {
                const response = await window.electronAPI.chatWithPet(message);
                console.log('[aiManager] Response generated via main process');
                return response;
            } catch (error) {
                console.warn('[aiManager] Main process generation failed, trying direct API:', error);
            }
        }

        const systemPrompt = buildSystemPrompt(safePetData);
        const response = await makeOpenAIRequest(message, systemPrompt, aiSettings);

        console.log('[aiManager] Response generated successfully via direct API');
        return response;

    } catch (error) {
        console.error('[aiManager] AI response generation failed:', error);
        throw error;
    }
}

function buildSystemPrompt(petData) {
    const personalityPrompt = getPersonalityPrompt(aiSettings.personality, aiSettings.customPersonality);

    const safePetData = {
        hp: petData?.hp ?? 100,
        intimacy: petData?.intimacy ?? 100,
        name: petData?.name ?? 'Your Pet',
        age: petData?.age ?? 0
    };

    const statusInfo = `
Current system status:
- Health: ${safePetData.hp}/100
- User Satisfaction: ${safePetData.intimacy}/100
- Assistant Name: ${safePetData.name}
- Days Active: ${safePetData.age} days

Adapt your responses based on the system status. If health is low, you might be experiencing some limitations. If user satisfaction is low, try to be more helpful and engaging.
`;

    return `${personalityPrompt}

${statusInfo}

You are a smart AI assistant. Provide helpful, informative responses while maintaining your personality. You can discuss any topic and help with various tasks.`;
}

async function makeOpenAIRequest(message, systemPrompt, settings) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), settings.requestTimeout);

    try {
        console.log('[aiManager] Making OpenAI request...');
        console.log('[aiManager] Endpoint:', settings.apiEndpoint);
        console.log('[aiManager] Model:', settings.modelName);
        console.log('[aiManager] Has API Key:', !!settings.apiKey);

        const requestBody = {
            model: settings.modelName,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: message }
            ],
            max_tokens: 150,
            temperature: 0.7
        };

        const response = await fetch(settings.apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${settings.apiKey}`
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        console.log('[aiManager] Response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[aiManager] OpenAI API error:', errorText);

            let errorMessage = 'Unknown error';
            try {
                const errorData = JSON.parse(errorText);
                errorMessage = errorData.error?.message || errorText;
            } catch (e) {
                errorMessage = errorText;
            }

            throw new Error(`OpenAI API error (${response.status}): ${errorMessage}`);
        }

        const data = await response.json();

        if (!data.choices || data.choices.length === 0) {
            throw new Error('No response from AI');
        }

        const responseContent = data.choices[0].message.content;
        console.log('[aiManager] Response received:', responseContent);

        return responseContent;

    } catch (error) {
        clearTimeout(timeoutId);

        if (error.name === 'AbortError') {
            throw new Error('Request timed out. Please check your network connection or try again later.');
        }

        throw error;
    }
}

export async function loadSettings() {
    return await getSettings();
}

export async function updateSettings(settings) {
    return await saveSettings(settings);
}

export { 
    personalityTemplates,
    aiSettings,
    initializeSettings,
    storeSettings,
    getStoredSettings
};