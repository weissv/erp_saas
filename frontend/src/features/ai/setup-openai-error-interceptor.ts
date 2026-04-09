// src/features/ai/setup-openai-error-interceptor.ts
// Registers a global error interceptor on the API client to detect
// MISSING_OPENAI_KEY errors and trigger the slide-out dialog.

import { api, ApiRequestError } from "../../lib/api";
import { triggerMissingOpenAiKeyDialog } from "./components/MissingOpenAiKeyDialog";

let installed = false;

/**
 * Call once at app startup (e.g. in main.tsx or a top-level layout).
 * Intercepts any 428 response with code MISSING_OPENAI_KEY and shows
 * the configuration dialog.
 */
export function installOpenAiKeyErrorInterceptor(): void {
  if (installed) return;
  installed = true;

  api.addErrorInterceptor((error: ApiRequestError) => {
    if (error.code === "MISSING_OPENAI_KEY") {
      triggerMissingOpenAiKeyDialog();
    }
    return error;
  });
}
