// Represents the core message content and role
export interface Message {
    role: 'user' | 'assistant';
    content: string;
    id?: string; // Optional temporary ID for streaming or identifying error messages
    isError?: boolean; // Optional flag for error messages from assistant
}

// Represents one attempt to get a response for a given prompt
export interface ResponseAttempt {
    attemptId: string; // Unique ID for this specific attempt
    promptUsed: string; // The actual user prompt text used for this attempt
    assistantMessage: Message; // The resulting assistant message (may include isError and temporary id)
}

// Represents a single user initiation and subsequent AI responses/versions
export interface Turn {
    turnId: string; // Unique ID for this conversational turn
    responses: ResponseAttempt[]; // Array of response attempts for this turn
}

// Represents a full chat session
export interface Chat {
    id: string;
    title: string;
    turns: Turn[]; // Array of turns in the chat session
}

// Represents an Ollama model
export interface Model {
    name: string;
}

// Response type for /api/tags (model listing)
export interface OllamaTagsResponse {
    models: Model[];
}

// Response chunk type for /api/chat streaming
export interface OllamaStreamChunk {
    model: string;
    created_at: string;
    message: { role: 'assistant'; content: string };
    done: boolean;
    total_duration?: number;
    load_duration?: number;
    prompt_eval_count?: number;
    prompt_eval_duration?: number;
    eval_count?: number;
    eval_duration?: number;
}

// Response type for /api/generate (non-streaming)
export interface OllamaGenerateResponse {
    model: string;
    created_at: string;
    response: string; // The generated text
    done: boolean;
    context?: number[];
    total_duration?: number;
    load_duration?: number;
    prompt_eval_count?: number;
    prompt_eval_duration?: number;
    eval_count?: number;
    eval_duration?: number;
}