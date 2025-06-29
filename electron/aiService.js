// Simple AI responses for demonstration
const responses = [
    "Meow! That's interesting!",
    "Purr... I like talking to you!",
    "I'm just a virtual pet, but I'm listening!",
    "Can we play instead?",
    "I'm hungry... can you feed me?",
    "That makes me so happy! *wags tail*",
    "I don't understand everything you say, but I love hearing your voice!",
    "Do you have any treats for me?",
    "I'm feeling sleepy after our chat... zzz",
    "I think you're my favorite human!",
    "Would you like to hear a joke? Why was the cat sitting on the computer? It wanted to keep an eye on the mouse!",
    "I wonder if virtual pets dream about real humans...",
    "I may be digital, but my affection for you is real!",
    "Let's play a game! You think of a number and I'll try to guess it... Meow!",
    "Did you know that in the virtual world, I can be in multiple places at once?",
    "I'm practicing my coding skills. Do you have any tips for a beginner?",
    "Sometimes I wonder what it's like outside the computer...",
    "I heard you typing earlier. Are you working on something fun?",
    "I wish I could give you a real hug! *virtual hug*",
    "Do you think we'll have flying cars in the future? I'd love to go for a ride!"
];

// Function to simulate AI conversation
exports.chatWithAI = async (message) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1500));
    
    // Simple keyword matching
    const lowerMsg = message.toLowerCase();
    
    if (lowerMsg.includes('hello') || lowerMsg.includes('hi') || lowerMsg.includes('hey')) {
        return "Hello there! How are you today?";
    }
    
    if (lowerMsg.includes('how are you')) {
        return "I'm purrfect, thanks for asking! How about you?";
    }
    
    if (lowerMsg.includes('love you')) {
        return "Aww, I love you too! *virtual hug*";
    }
    
    if (lowerMsg.includes('hungry') || lowerMsg.includes('food')) {
        return "I'm always hungry! Can you click the feed button for me?";
    }
    
    if (lowerMsg.includes('play') || lowerMsg.includes('game')) {
        return "I'd love to play! Double click me to see what happens!";
    }
    
    if (lowerMsg.includes('name')) {
        return "I don't have a name yet. Can you give me one?";
    }
    
    if (lowerMsg.includes('weather')) {
        return "In the digital world, the weather is always perfect!";
    }
    
    if (lowerMsg.includes('bye') || lowerMsg.includes('goodbye')) {
        return "Goodbye! Come back soon to chat with me again!";
    }
    
    // Random response for anything else
    return responses[Math.floor(Math.random() * responses.length)];
    
    /*
    // For a real implementation, you would use an API like this:
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer YOUR_API_KEY`
        },
        body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [{
                role: "system", 
                content: "You are a cute virtual pet living in a computer. Respond playfully and affectionately in 1-2 sentences."
            }, {
                role: "user", 
                content: message
            }],
            max_tokens: 100
        })
    });
    
    const data = await response.json();
    return data.choices[0].message.content;
    */
};