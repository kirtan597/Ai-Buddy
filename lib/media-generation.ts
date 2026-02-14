
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

interface MediaGenerationResult {
    url?: string;
    error?: string;
}

export async function generateImage(prompt: string): Promise<MediaGenerationResult> {
    const apiKey = process.env.OPENROUTER_API_KEY_IMAGE;
    if (!apiKey) {
        return { error: 'Image API key not configured' };
    }

    try {
        // Using Flux 1 Schnell which is standard on OpenRouter
        const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': 'http://localhost:3000',
                'X-Title': 'Ai Buddy Media',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'stabilityai/stable-diffusion-xl-base-1.0',
                messages: [{ role: 'user', content: prompt }],
            }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error('OpenRouter Image API Error Body:', errorBody);
            try {
                const jsonError = JSON.parse(errorBody);
                throw new Error(`OpenRouter API error: ${jsonError.error?.message || response.statusText}`);
            } catch {
                throw new Error(`OpenRouter API error: ${response.statusText} - ${errorBody.substring(0, 100)}`);
            }
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        // Flux Schnell on OpenRouter often returns the URL directly in the content
        const urlMatch = content?.match(/https?:\/\/[^\s)]+/);
        if (urlMatch) {
            return { url: urlMatch[0] };
        }
        // If raw content is the URL
        if (content && content.startsWith('http')) {
            return { url: content };
        }

        return { error: 'Failed to extract image URL. Response: ' + content?.substring(0, 100) };

    } catch (error) {
        console.error('Image generation error:', error);
        return { error: (error as Error).message };
    }
}

export async function generateVideo(prompt: string): Promise<MediaGenerationResult> {
    const apiKey = process.env.OPENROUTER_API_KEY_VIDEO;
    if (!apiKey) {
        return { error: 'Video API key not configured' };
    }

    try {
        // Attempting Luma Ray or generic video model. 
        // Video generation on OpenRouter is less standardized.
        // We will try 'luma/ray' as a placeholder for high-quality video if available.
        // If this fails, we return a helpful error.
        const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': 'http://localhost:3000',
                'X-Title': 'Ai Buddy Media',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'luma/ray',
                messages: [{ role: 'user', content: prompt }],
            }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error('OpenRouter Video API Error Body:', errorBody);
            try {
                const jsonError = JSON.parse(errorBody);
                throw new Error(`OpenRouter API error: ${jsonError.error?.message || response.statusText}`);
            } catch {
                throw new Error(`OpenRouter API error: ${response.statusText} - ${errorBody.substring(0, 100)}`);
            }
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        const urlMatch = content?.match(/https?:\/\/[^\s)]+/);
        if (urlMatch) {
            return { url: urlMatch[0] };
        }

        if (content && content.startsWith('http')) {
            return { url: content };
        }

        return { error: 'Failed to extract video URL' };

    } catch (error) {
        console.error('Video generation error:', error);
        return { error: (error as Error).message };
    }
}
