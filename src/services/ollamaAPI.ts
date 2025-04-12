import {Message, OllamaGenerateResponse, OllamaStreamChunk, OllamaTagsResponse} from '../types';

// Determine OLLAMA_URL from environment variable or default
const OLLAMA_URL = process.env.REACT_APP_OLLAMA_URL || 'http://localhost:11434';

/**
 * Fetches the list of available models from the Ollama API.
 * @returns A promise resolving to an array of model names.
 * @throws Error if the request fails or the server is unreachable.
 */
export const fetchModels = async (): Promise<string[]> => {
    try {
        const response = await fetch(`${OLLAMA_URL}/api/tags`);
        if (!response.ok) {
            const errorText = await response.text().catch(() => `Status ${response.status}`);
            console.error('Ollama API Error (fetchModels):', response.status, errorText);
            throw new Error(`Ollama server error (${response.status}) fetching models.`);
        }
        const data: OllamaTagsResponse = await response.json();
        if (!Array.isArray(data?.models)) {
            return [];
        }
        return data.models.map((m) => m.name).sort();
    } catch (err) {
        console.error('Failed to fetch Ollama models:', err);
        if (err instanceof Error && err.message.includes('Failed to fetch')) {
            throw new Error('Could not connect to Ollama.');
        }
        throw err instanceof Error ? err : new Error('An unexpected error occurred while fetching models.');
    }
};

/** Options for the streamChatResponse function */
export interface StreamChatOptions {
    model: string;
    messages: Message[];
    signal: AbortSignal;
    onData: (chunk: string) => void;
    onError: (error: Error) => void;
    onComplete: (finalContent: string) => void;
}

/**
 * Initiates a streaming chat request to the Ollama API (/api/chat).
 * @param options Configuration including model, messages, and callbacks.
 * @returns A promise that resolves when the stream completes or rejects on error.
 */
export const streamChatResponse = async ({
                                             model,
                                             messages,
                                             signal,
                                             onData,
                                             onError,
                                             onComplete,
                                         }: StreamChatOptions): Promise<void> => {
    let accumulatedContent = '';
    try {
        const response = await fetch(`${OLLAMA_URL}/api/chat`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({model, messages, stream: true}),
            signal,
        });

        if (!response.ok || !response.body) {
            let errorDetails = `Server error: ${response.status}`;
            try {
                const errorData = await response.json();
                errorDetails = errorData?.error || errorDetails;
            } catch {
                // Ignore parsing errors; use default message
            }
            throw new Error(errorDetails);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            if (signal.aborted) {
                await reader.cancel('Request aborted by user.').catch(() => {
                });
                return;
            }

            const {done, value} = await reader.read();
            if (done) {
                if (buffer.trim()) {
                    try {
                        const data: OllamaStreamChunk = JSON.parse(buffer);
                        if (data.message?.content) {
                            onData(data.message.content);
                            accumulatedContent += data.message.content;
                        }
                    } catch (e) {
                        console.error('Error parsing final JSON buffer:', e);
                        onError(new Error('Error parsing final stream data.'));
                        return;
                    }
                }
                break;
            }

            if (value) {
                buffer += decoder.decode(value, {stream: true});
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                for (const line of lines) {
                    if (line.trim()) {
                        try {
                            const data: OllamaStreamChunk = JSON.parse(line);
                            if (data.message?.content) {
                                onData(data.message.content);
                                accumulatedContent += data.message.content;
                            }
                        } catch (e) {
                            console.error('Error parsing JSON chunk:', e);
                            onError(new Error('Error parsing stream data chunk.'));
                            await reader.cancel('Parsing error').catch(() => {
                            });
                            return;
                        }
                    }
                }
            }
        }
        onComplete(accumulatedContent);
    } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
            onError(err);
        } else {
            console.error('Error during streamChatResponse:', err);
            onError(err instanceof Error ? err : new Error('Unknown streaming error.'));
        }
    }
};

/**
 * Generates a concise title using Ollama's /api/generate endpoint.
 * @param model The model to use for title generation.
 * @param userPrompt The user's prompt.
 * @param assistantResponse The assistant's response (truncated to 200 chars).
 * @returns A promise resolving to the generated title or 'Chat' on failure.
 */
export const generateTitle = async (
    model: string,
    userPrompt: string,
    assistantResponse: string
): Promise<string> => {
    const prompt = `Generate a very concise title (3-6 words max) for this conversation:\n\nUser: ${userPrompt}\nAssistant: ${assistantResponse.substring(0, 200)}...`;
    try {
        const response = await fetch(`${OLLAMA_URL}/api/generate`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                model,
                prompt,
                stream: false,
                options: {num_predict: 20, temperature: 0.3},
            }),
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => `Status ${response.status}`);
            console.error('Ollama API Error (generateTitle):', response.status, errorText);
            throw new Error(`Ollama server error (${response.status}) generating title.`);
        }

        const data: OllamaGenerateResponse = await response.json();
        let title = data.response.trim().replace(/["'\n\r]/g, '');
        title = title.replace(/^title:/i, '').trim();
        const words = title.split(' ');
        if (words.length > 8) {
            title = words.slice(0, 8).join(' ') + '...';
        }
        return title || 'Chat';
    } catch (err) {
        console.error('Failed to generate title:', err);
        return 'Chat';
    }
};