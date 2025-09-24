import OpenAI from 'openai';
import type { Config } from '../../../config/config.js';
import type { ContentGeneratorConfig } from '../../contentGenerator.js';
import { DEFAULT_TIMEOUT, DEFAULT_MAX_RETRIES } from '../constants.js';
import type { OpenAICompatibleProvider } from './types.js';

/**
 * Default provider for standard OpenAI-compatible APIs
 */
export class DefaultOpenAICompatibleProvider
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

  buildHeaders(): Record<string, string | undefined> {
    const version = this.cliConfig.getCliVersion() || 'unknown';
    const userAgent = `QwenCode/${version} (${process.platform}; ${process.arch})`;
    return {
      'User-Agent': userAgent,
    };
  }

  buildClient(): OpenAI {
    const {
      apiKey,
      baseUrl,
      timeout = DEFAULT_TIMEOUT,
      maxRetries = DEFAULT_MAX_RETRIES,
    } = this.contentGeneratorConfig;
    const defaultHeaders = this.buildHeaders();
    return new OpenAI({
      // Use a placeholder for local OpenAI-compatible servers (e.g., Ollama)
      apiKey: apiKey || 'ollama',
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
    // If targeting an Ollama OpenAI-compatible server, strip tools since many
    // Ollama models (e.g., qwen:0.5b) don't support tool/function calling.
    const baseUrl = this.contentGeneratorConfig.baseUrl || '';
    const isOllama =
      !!process.env['OLLAMA_HOST'] || baseUrl.includes('localhost:11434');

    if (isOllama) {
      const { tools: _omitTools, ...rest } = request as {
        tools?: unknown;
      } & OpenAI.Chat.ChatCompletionCreateParams;
      return { ...rest };
    }

    // Default provider otherwise passes through all parameters
    return {
      ...request,
    };
  }
}
