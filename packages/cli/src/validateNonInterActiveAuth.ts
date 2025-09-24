/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuthType, type Config } from '@qwen-code/qwen-code-core';
import { USER_SETTINGS_PATH } from './config/settings.js';
import { validateAuthMethod } from './config/auth.js';

function getAuthTypeFromEnv(): AuthType | undefined {
  if (process.env['GOOGLE_GENAI_USE_GCA'] === 'true') {
    return AuthType.LOGIN_WITH_GOOGLE;
  }
  if (process.env['GOOGLE_GENAI_USE_VERTEXAI'] === 'true') {
    return AuthType.USE_VERTEX_AI;
  }
  if (process.env['GEMINI_API_KEY']) {
    return AuthType.USE_GEMINI;
  }
  // Allow OpenAI-compatible backends without requiring OPENAI_API_KEY when Ollama is configured
  // If OLLAMA_HOST is set, prefer USE_OPENAI path which is OpenAI-compatible in the core
  if (process.env['OLLAMA_HOST']) {
    return AuthType.USE_OPENAI;
  }
  // If a custom OpenAI-compatible base URL is provided, use OpenAI path
  if (process.env['OPENAI_BASE_URL']) {
    return AuthType.USE_OPENAI;
  }
  if (process.env['OPENAI_API_KEY']) {
    return AuthType.USE_OPENAI;
  }
  return undefined;
}

export async function validateNonInteractiveAuth(
  configuredAuthType: AuthType | undefined,
  useExternalAuth: boolean | undefined, 
  nonInteractiveConfig: Config,
) {
  // Prefer environment-driven auth if present; fall back to configured
  const envAuthType = getAuthTypeFromEnv();
  const effectiveAuthType = envAuthType || configuredAuthType;

  if (!effectiveAuthType) {
    console.error(
      `Please set an Auth method in your ${USER_SETTINGS_PATH} or specify one of the following environment variables before running: GEMINI_API_KEY, OPENAI_API_KEY, GOOGLE_GENAI_USE_VERTEXAI, GOOGLE_GENAI_USE_GCA`,
    );
    process.exit(1);
  }

  if (!useExternalAuth) {
    const err = validateAuthMethod(effectiveAuthType);
    if (err != null) {
      console.error(err);
      process.exit(1);
    }
  }

  await nonInteractiveConfig.refreshAuth(effectiveAuthType);
  return nonInteractiveConfig;
}
