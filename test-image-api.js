// Quick test for OpenRouter image generation
// Run with: node test-image-api.js

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

// Paste your OPENROUTER_API_KEY_IMAGE value here for testing:
const API_KEY = process.env.OPENROUTER_API_KEY_IMAGE || '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';

async function testImageGeneration() {
    console.log('=== Testing Image Generation API ===\n');

    if (!API_KEY || API_KEY === 'your-key-here') {
        console.error('❌ No API Key found. Set OPENROUTER_API_KEY_IMAGE env var or paste it in the script.');
        process.exit(1);
    }

    const prompt = 'A simple red apple on a white background';
    const model = 'google/gemini-2.5-flash-image';

    console.log(`Model: ${model}`);
    console.log(`Prompt: ${prompt}`);
    console.log('\nSending request...\n');

    try {
        const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'HTTP-Referer': 'http://localhost:3000',
                'X-Title': 'Ai Buddy Test',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model,
                messages: [{ role: 'user', content: prompt }],
                modalities: ['image', 'text'],
            }),
        });

        console.log(`Response Status: ${response.status} ${response.statusText}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ API ERROR:', errorText);

            try {
                const parsed = JSON.parse(errorText);
                console.log('\nParsed error:', JSON.stringify(parsed, null, 2));

                if (response.status === 402) {
                    console.log('\n💡 STATUS 402 = Insufficient credits on your OpenRouter account!');
                    console.log('   → Go to https://openrouter.ai/settings/billing and add credits.');
                } else if (response.status === 404) {
                    console.log('\n💡 STATUS 404 = Model not found on your account.');
                    console.log('   → Try a different model or check your account has access.');
                } else if (response.status === 401) {
                    console.log('\n💡 STATUS 401 = Invalid API key!');
                    console.log('   → Check your OPENROUTER_API_KEY_IMAGE in .env.local');
                }
            } catch { }
            return;
        }

        const data = await response.json();
        console.log('\n✅ SUCCESS! Raw response (truncated):');
        const rawJson = JSON.stringify(data, null, 2);
        console.log(rawJson.substring(0, 1000));

        const message = data.choices?.[0]?.message;
        console.log('\n--- Parsing response ---');

        if (Array.isArray(message?.content)) {
            console.log('Content is an array (multimodal)');
            for (const part of message.content) {
                console.log(`  Part type: ${part.type}`);
                if (part.type === 'image_url') {
                    const url = part.image_url?.url;
                    console.log(`  ✅ Image URL found: ${url?.substring(0, 80)}...`);
                } else if (part.type === 'image') {
                    console.log(`  ✅ Inline image data found (${part.mime_type || 'image/png'}), ${part.data?.length || 0} chars`);
                } else if (part.type === 'text') {
                    console.log(`  Text: ${part.text?.substring(0, 100)}`);
                }
            }
        } else if (typeof message?.content === 'string') {
            console.log('Content is a string:', message.content.substring(0, 200));
        }

        console.log('\n✅ Image generation test complete!');

    } catch (error) {
        console.error('❌ Exception:', error.message);
    }
}

testImageGeneration();
