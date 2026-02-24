
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
        // Using Google Gemini 2.5 Flash Image - confirmed working image generation model on OpenRouter
        // This model supports the `modalities` parameter for image output
        const modelName = 'google/gemini-2.5-flash-image';
        console.log(`[ImageGen] Generating image with model: ${modelName}`);
        console.log(`[ImageGen] Prompt: ${prompt.substring(0, 100)}...`);

        const requestBody = {
            model: modelName,
            messages: [{ role: 'user', content: prompt }],
            // CRITICAL: This tells OpenRouter/Gemini to output an actual image
            modalities: ['image', 'text'],
        };

        console.log('[ImageGen] Request body:', JSON.stringify(requestBody));

        const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': 'http://localhost:3000',
                'X-Title': 'Ai Buddy Media',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error('[ImageGen] API Error Status:', response.status, response.statusText);
            console.error('[ImageGen] API Error Body:', errorBody);
            try {
                const jsonError = JSON.parse(errorBody);
                const msg = jsonError.error?.message || jsonError.message || response.statusText;
                return { error: `Image generation failed (${response.status}): ${msg}` };
            } catch {
                return { error: `Image generation failed (${response.status}): ${errorBody.substring(0, 200)}` };
            }
        }

        const data = await response.json();
        console.log('[ImageGen] Raw response data:', JSON.stringify(data).substring(0, 500));

        // OpenRouter image models return base64-encoded images in the content parts
        // The response structure has content as an array of parts with type "image_url"
        const message = data.choices?.[0]?.message;

        if (!message) {
            console.error('[ImageGen] No message in response:', JSON.stringify(data));
            return { error: 'No response message from image model' };
        }

        // Case 1: Content is an array of parts (multimodal response)
        if (Array.isArray(message.content)) {
            for (const part of message.content) {
                // Image returned as base64 data URL
                if (part.type === 'image_url' && part.image_url?.url) {
                    console.log('[ImageGen] Found image in content parts (image_url type)');
                    return { url: part.image_url.url };
                }
                // Image returned inline as base64
                if (part.type === 'image' && part.data) {
                    const mimeType = part.mime_type || 'image/png';
                    const dataUrl = `data:${mimeType};base64,${part.data}`;
                    console.log('[ImageGen] Found image in content parts (inline base64)');
                    return { url: dataUrl };
                }
            }
        }

        // Case 2: Content is a plain string
        const content = typeof message.content === 'string' ? message.content : null;
        if (content) {
            // Check if it's a base64 data URL
            if (content.startsWith('data:image')) {
                console.log('[ImageGen] Content is a base64 data URL');
                return { url: content };
            }
            // Check if it contains a URL
            const urlMatch = content.match(/https?:\/\/[^\s)"]+/);
            if (urlMatch) {
                console.log('[ImageGen] Found URL in content string');
                return { url: urlMatch[0] };
            }
            // Return as error with response excerpt for debugging
            console.warn('[ImageGen] No image URL or base64 found in response. Content:', content.substring(0, 200));
            return { error: `The AI responded with text instead of an image. Response: "${content.substring(0, 150)}"` };
        }

        console.error('[ImageGen] Unexpected response structure:', JSON.stringify(data).substring(0, 300));
        return { error: 'Unexpected response format from image model. Please try again.' };

    } catch (error) {
        console.error('[ImageGen] Image generation exception:', error);
        return { error: (error as Error).message };
    }
}

export async function generateVideo(prompt: string): Promise<MediaGenerationResult> {
    const apiKey = process.env.OPENROUTER_API_KEY_VIDEO;
    if (!apiKey) {
        return { error: 'Video API key not configured' };
    }

    try {
        // Luma Ray is a video generation model. Video generation via OpenRouter
        // is still experimental and may not be available for all accounts.
        console.log('[VideoGen] Generating video with model: luma/ray');

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
            console.error('[VideoGen] API Error Status:', response.status, response.statusText);
            console.error('[VideoGen] API Error Body:', errorBody);
            try {
                const jsonError = JSON.parse(errorBody);
                const msg = jsonError.error?.message || jsonError.message || response.statusText;
                return { error: `Video generation failed (${response.status}): ${msg}` };
            } catch {
                return { error: `Video generation failed (${response.status}): ${errorBody.substring(0, 200)}` };
            }
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        if (Array.isArray(content)) {
            for (const part of content) {
                if (part.type === 'image_url' && part.image_url?.url) {
                    return { url: part.image_url.url };
                }
            }
        }

        if (typeof content === 'string') {
            const urlMatch = content.match(/https?:\/\/[^\s)"]+/);
            if (urlMatch) return { url: urlMatch[0] };
            if (content.startsWith('http')) return { url: content };
        }

        return { error: 'Failed to extract video URL from response. Video generation may not be available on your plan.' };

    } catch (error) {
        console.error('[VideoGen] Video generation exception:', error);
        return { error: (error as Error).message };
    }
}
