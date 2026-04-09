// src/features/ai/components/MissingOpenAiKeyDialog.tsx
// Global slide-out dialog that appears when any AI feature catches
// the MISSING_OPENAI_KEY error. Urges the tenant admin to configure
// their OpenAI integration.

import { useEffect, useState, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "../../../components/ui/sheet";
import { Button } from "../../../components/ui/button";
import {
  AlertTriangle,
  Brain,
  ExternalLink,
  Settings,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

// ── Custom Event ────────────────────────────────────────────────────────────

const MISSING_KEY_EVENT = "openai:missing-key";

/**
 * Fire this from anywhere in the app to trigger the dialog.
 * Typically called from an API error interceptor when it detects
 * the MISSING_OPENAI_KEY code.
 */
export function triggerMissingOpenAiKeyDialog(): void {
  window.dispatchEvent(new CustomEvent(MISSING_KEY_EVENT));
}

// ── Component ───────────────────────────────────────────────────────────────

export function MissingOpenAiKeyDialog() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener(MISSING_KEY_EVENT, handler);
    return () => window.removeEventListener(MISSING_KEY_EVENT, handler);
  }, []);

  const goToSettings = useCallback(() => {
    setOpen(false);
    navigate("/ai-settings");
  }, [navigate]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader className="space-y-4">
          {/* Icon */}
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
            <Brain className="h-7 w-7 text-destructive" />
          </div>

          <SheetTitle className="text-xl">
            OpenAI API Key Required
          </SheetTitle>
          <SheetDescription className="text-base leading-relaxed">
            This feature requires an OpenAI API key that has not been
            configured yet for your organization.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Warning box */}
          <div className="flex items-start gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-4">
            <AlertTriangle className="h-5 w-5 shrink-0 text-destructive mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                AI features are disabled
              </p>
              <p className="text-sm text-muted-foreground">
                Exam AI grading, knowledge base semantic search, and the AI
                assistant are currently unavailable. Ask your administrator to
                add an OpenAI API key.
              </p>
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">
              To enable AI features:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>
                Get an API key from{" "}
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                >
                  platform.openai.com
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>Navigate to Settings → AI Integration</li>
              <li>Paste your key and save</li>
            </ol>
          </div>

          {/* CTA */}
          <div className="flex flex-col gap-3">
            <Button onClick={goToSettings} className="w-full">
              <Settings className="h-4 w-4" />
              Go to AI Settings
            </Button>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="w-full"
            >
              Dismiss
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
