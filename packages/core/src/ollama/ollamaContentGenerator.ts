/**
 * @license
 * Copyright 2025 Qwen
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  Content,
  CountTokensParameters,
  CountTokensResponse,
  EmbedContentParameters,
  EmbedContentResponse,
  GenerateContentParameters,
} from '@google/genai';
import { FinishReason, GenerateContentResponse } from '@google/genai';
import type { ContentGeneratorConfig } from '../core/contentGenerator.js';
import type { Config } from '../config/config.js';
import { toContents } from '../code_assist/converter.js';

interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OllamaRequest {
  model: string;
  messages: OllamaMessage[];
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    max_tokens?: number;
  };
}

interface OllamaResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
}

interface OllamaStreamResponse {
  model: string;
  created_at: string;
  message?: {
    role: string;
    content: string;
  };
  done: boolean;
  response?: string;
}

/**
 * Ollama Content Generator that communicates with a local Ollama server
 */
export class OllamaContentGenerator {
  private baseUrl: string;
  private model: string;

  constructor(
    contentGeneratorConfig: ContentGeneratorConfig,
    cliConfig: Config,
  ) {
    this.baseUrl = contentGeneratorConfig.baseUrl || 'http://localhost:11434';
    this.model = contentGeneratorConfig.model || 'llama3.2:1b';
  }

  /**
   * Convert Gemini Content format to Ollama messages format
   */
  private convertToOllamaMessages(contents: Content[]): OllamaMessage[] {
    const messages: OllamaMessage[] = [];
    
    for (const content of contents) {
      if (content.role === 'system' || content.role === 'user' || content.role === 'model') {
        const textParts = content.parts
          ?.filter(part => part && typeof part === 'object' && 'text' in part)
          .map(part => (part as { text: string }).text)
          .join('') || '';
        
        if (textParts) {
          messages.push({
            role: content.role === 'model' ? 'assistant' : content.role,
            content: textParts,
          });
        }
      }
    }
    
    return messages;
  }

  /**
   * Convert Ollama response to Gemini format
   */
  private convertFromOllamaResponse(response: OllamaResponse): GenerateContentResponse {
    const generateResponse = new GenerateContentResponse();
    generateResponse.candidates = [
      {
        content: {
          role: 'model',
          parts: [
            {
              text: response.message.content,
            },
          ],
        },
        finishReason: response.done ? FinishReason.STOP : FinishReason.MAX_TOKENS,
        index: 0,
        safetyRatings: [],
      },
    ];
    generateResponse.promptFeedback = { safetyRatings: [] };
    return generateResponse;
  }

  /**
   * Generate content using Ollama API
   */
  async generateContent(
    request: GenerateContentParameters,
    userPromptId: string,
  ): Promise<GenerateContentResponse> {
    const contents = toContents(request.contents);
    const messages = this.convertToOllamaMessages(contents);
    
    const ollamaRequest: OllamaRequest = {
      model: this.model,
      messages,
      stream: false,
      options: {
        temperature: request.config?.temperature || 0.7,
        top_p: request.config?.topP || 1,
        max_tokens: request.config?.maxOutputTokens || 4096,
      },
    };

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ollamaRequest),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const ollamaResponse: OllamaResponse = await response.json();
      return this.convertFromOllamaResponse(ollamaResponse);
    } catch (error) {
      throw new Error(`Failed to generate content with Ollama: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate content stream using Ollama API
   */
  async generateContentStream(
    request: GenerateContentParameters,
    userPromptId: string,
  ): Promise<AsyncGenerator<GenerateContentResponse>> {
    return this.generateContentStreamImpl(request, userPromptId);
  }

  private async *generateContentStreamImpl(
    request: GenerateContentParameters,
    userPromptId: string,
  ): AsyncGenerator<GenerateContentResponse> {
    const contents = toContents(request.contents);
    const messages = this.convertToOllamaMessages(contents);
    
    const ollamaRequest: OllamaRequest = {
      model: this.model,
      messages,
      stream: true,
      options: {
        temperature: request.config?.temperature || 0.7,
        top_p: request.config?.topP || 1,
        max_tokens: request.config?.maxOutputTokens || 4096,
      },
    };

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ollamaRequest),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader available');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim()) {
              try {
                const streamResponse: OllamaStreamResponse = JSON.parse(line);
                
                if (streamResponse.message || streamResponse.response) {
                  const content = streamResponse.message?.content || streamResponse.response || '';
                  
                  const streamResponseObj = new GenerateContentResponse();
                  streamResponseObj.candidates = [
                    {
                      content: {
                        role: 'model',
                        parts: [
                          {
                            text: content,
                          },
                        ],
                      },
                      finishReason: streamResponse.done ? FinishReason.STOP : undefined,
                      index: 0,
                      safetyRatings: [],
                    },
                  ];
                  streamResponseObj.promptFeedback = { safetyRatings: [] };
                  yield streamResponseObj;
                }
              } catch (parseError) {
                // Skip invalid JSON lines
                continue;
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      throw new Error(`Failed to generate content stream with Ollama: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Count tokens - Ollama doesn't provide token counting, so we estimate
   */
  async countTokens(request: CountTokensParameters): Promise<CountTokensResponse> {
    // Simple estimation: approximately 4 characters per token
    const contents = toContents(request.contents);
    const totalText = contents
      .map((content: Content) => 
        content.parts
          ?.filter(part => part && typeof part === 'object' && 'text' in part)
          .map(part => (part as { text: string }).text)
          .join('') || ''
      )
      .join('');
    
    const estimatedTokens = Math.ceil(totalText.length / 4);
    
    return {
      totalTokens: estimatedTokens,
    };
  }

  /**
   * Embed content - Ollama doesn't support embeddings, return empty array
   */
  async embedContent(request: EmbedContentParameters): Promise<EmbedContentResponse> {
    // Ollama doesn't support embeddings, return empty response
    const contents = toContents(request.contents);
    return {
      embeddings: contents.map(() => ({
        values: [],
      })),
    };
  }
}
