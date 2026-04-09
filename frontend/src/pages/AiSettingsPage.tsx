// src/pages/AiSettingsPage.tsx
// Page wrapper for the BYOK AI Integration Settings.

import { AiIntegrationSettings } from "../features/ai/components/AiIntegrationSettings";

export default function AiSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          AI Integration
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your OpenAI API key for AI-powered features.
        </p>
      </div>

      <AiIntegrationSettings />
    </div>
  );
}
