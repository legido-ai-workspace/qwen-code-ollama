import OpenAI from 'openai';
import type { Config } from '../../../config/config.js';
import type { ContentGeneratorConfig } from '../../contentGenerator.js';
import { DEFAULT_TIMEOUT, DEFAULT_MAX_RETRIES } from '../constants.js';
import type { OpenAICompatibleProvider } from './types.js';

/**
 * Provider for Ollama API
 */
export class OllamaOpenAICompatibleProvider
  implements OpenAICompatibleProvider
{
  protected contentGeneratorConfig: ContentGeneratorConfig;
  protected cliConfig: Config;

  constructor(
    contentGeneratorConfig: ContentGeneratorConfig,
    cliConfig: Config,
  ) {
    this.cliConfig = cliConfig;
    this.contentGeneratorConfig = contentGeneratorConfig;
  }

  /**
   * Check if this provider should be used based on configuration
   */
  static isOllamaProvider(config: ContentGeneratorConfig): boolean {
    // Check if base URL points to Ollama
    if (config.baseUrl && config.baseUrl.includes('ollama')) {
      return true;
    }
    
    // Check for OLLAMA_ environment variables
    if (process.env['OLLAMA_HOST'] || process.env['OLLAMA_MODEL']) {
      return true;
    }
    
    return false;
  }

  buildHeaders(): Record<string, string | undefined> {
    const version = this.cliConfig.getCliVersion() || 'unknown';
    const userAgent = `QwenCode/${version} (${process.platform}; ${process.arch})`;
    return {
      'User-Agent': userAgent,
    };
  }

  buildClient(): OpenAI {
    const {
      apiKey = 'ollama', // Ollama doesn't require an API key, but we need to provide something
      baseUrl = process.env['OLLAMA_HOST'] || 'http://localhost:11434/v1',
      timeout = DEFAULT_TIMEOUT,
      maxRetries = DEFAULT_MAX_RETRIES,
    } = this.contentGeneratorConfig;
    
    const defaultHeaders = this.buildHeaders();
    
    return new OpenAI({
      apiKey,
      baseURL: baseUrl,
      timeout,
      maxRetries,
      defaultHeaders,
    });
  }

  buildRequest(
    request: OpenAI.Chat.ChatCompletionCreateParams,
    _userPromptId: string,
  ): OpenAI.Chat.ChatCompletionCreateParams {
    // Ollama may require specific parameter adjustments
    // For now, we'll pass through all parameters but ensure the model is set correctly
    const model = process.env['OLLAMA_MODEL'] || request.model || 'qwen3-coder';
    
    return {
      ...request,
      model,
    };
  }
}