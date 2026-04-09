// src/features/ai/components/AiIntegrationSettings.tsx
// BYOK settings UI for OpenAI API key management.
//
// State 1 (No Key): Warning banner + input form + helper link.
// State 2 (Key Configured): Success state + masked key + Test + Revoke.

import { useState, useCallback, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../../../components/ui/Card";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/Badge";
import { api } from "../../../lib/api";
import { toast } from "sonner";
import {
  Key,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Brain,
  ShieldCheck,
  Loader2,
  Zap,
} from "lucide-react";

// ── Types ───────────────────────────────────────────────────────────────────

interface OpenAiStatus {
  isConfigured: boolean;
  maskedKey: string | null;
}

// ── Component ───────────────────────────────────────────────────────────────

export function AiIntegrationSettings() {
  const [status, setStatus] = useState<OpenAiStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [testing, setTesting] = useState(false);

  // ── Fetch status on mount ───────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await api.get<OpenAiStatus>(
          "/v1/tenant/integrations/openai",
        );
        if (!cancelled) setStatus(data);
      } catch {
        if (!cancelled) setStatus({ isConfigured: false, maskedKey: null });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Save API Key ────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!apiKeyInput.trim() || apiKeyInput.trim().length < 10) {
      toast.error("Invalid API key", {
        description: "Please enter a valid OpenAI API key.",
      });
      return;
    }

    setSaving(true);
    try {
      const data = await api.post<{ isConfigured: boolean; maskedKey: string }>(
        "/v1/tenant/integrations/openai",
        { apiKey: apiKeyInput.trim() },
      );
      setStatus({ isConfigured: data.isConfigured, maskedKey: data.maskedKey });
      setApiKeyInput("");
      toast.success("OpenAI API key saved", {
        description:
          "Your key has been encrypted and stored securely. AI features are now enabled.",
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to save API key";
      toast.error("Error", { description: message });
    } finally {
      setSaving(false);
    }
  }, [apiKeyInput]);

  // ── Revoke API Key ──────────────────────────────────────────────────────
  const handleRevoke = useCallback(async () => {
    setRevoking(true);
    try {
      await api.delete("/v1/tenant/integrations/openai");
      setStatus({ isConfigured: false, maskedKey: null });
      toast.success("API key revoked", {
        description: "AI features have been disabled.",
      });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to revoke key";
      toast.error("Error", { description: message });
    } finally {
      setRevoking(false);
    }
  }, []);

  // ── Test Connection ─────────────────────────────────────────────────────
  const handleTest = useCallback(async () => {
    setTesting(true);
    try {
      // A simple GET to verify the key is readable / configured.
      const data = await api.get<OpenAiStatus>(
        "/v1/tenant/integrations/openai",
      );
      if (data.isConfigured) {
        toast.success("Connection OK", {
          description: "Your OpenAI key is configured and readable.",
        });
      } else {
        toast.error("Key not found", {
          description: "No OpenAI API key is configured.",
        });
      }
    } catch {
      toast.error("Test failed", {
        description: "Could not verify the API key.",
      });
    } finally {
      setTesting(false);
    }
  }, []);

  // ── Loading skeleton ────────────────────────────────────────────────────
  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-48 rounded bg-muted" />
          <div className="h-4 w-72 rounded bg-muted" />
          <div className="h-32 rounded bg-muted" />
        </div>
      </Card>
    );
  }

  const isConfigured = status?.isConfigured ?? false;

  // ── STATE 1: No Key ─────────────────────────────────────────────────────
  if (!isConfigured) {
    return (
      <div className="space-y-5">
        {/* Warning banner */}
        <Card className="border-destructive/30 bg-destructive/5 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-destructive mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">
                AI Features are disabled
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Exam AI grading, knowledge base semantic search, and the AI
                assistant require an OpenAI API key. Configure your key below to
                enable these features.
              </p>
            </div>
          </div>
        </Card>

        {/* Input form */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Brain className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>OpenAI API Key</CardTitle>
                <CardDescription>
                  Your key is encrypted with AES-256-GCM before storage and
                  never leaves the server.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="openai-key"
                className="text-sm font-medium text-foreground"
              >
                API Key
              </label>
              <input
                id="openai-key"
                type="password"
                autoComplete="off"
                placeholder="sk-proj-..."
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              <p className="text-xs text-muted-foreground">
                Get your API key from{" "}
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                >
                  platform.openai.com
                  <ExternalLink className="h-3 w-3" />
                </a>
              </p>
            </div>

            <Button
              onClick={handleSave}
              disabled={saving || !apiKeyInput.trim()}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Key className="h-4 w-4" />
              )}
              {saving ? "Encrypting & Saving..." : "Save API Key"}
            </Button>

            {/* Security notice */}
            <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/50 p-3">
              <ShieldCheck className="h-4 w-4 shrink-0 text-primary mt-0.5" />
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold">Security:</span> Your API key is
                encrypted using AES-256-GCM with a unique initialization vector.
                The plain-text key is never stored and is decrypted only at
                runtime for each API call. Only your organization can use this
                key.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── STATE 2: Key Configured ─────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Success banner */}
      <Card className="border-primary/20 bg-primary/5 p-5">
        <div className="flex items-start gap-3">
          <Zap className="h-5 w-5 shrink-0 text-primary mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">
              AI Features are enabled
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Exam AI grading, semantic search, and the AI assistant are active
              using your own OpenAI API key. Costs are billed directly to your
              OpenAI account.
            </p>
          </div>
        </div>
      </Card>

      {/* Key management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Brain className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>OpenAI API Key</CardTitle>
                <CardDescription>
                  Manage your Bring-Your-Own-Key integration
                </CardDescription>
              </div>
            </div>
            <Badge variant="success">Active</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Masked key display */}
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-md border border-border bg-muted/50 px-3 py-2 text-sm font-mono text-muted-foreground">
              {status?.maskedKey ?? "sk-...****"}
            </code>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={handleTest}
              disabled={testing}
            >
              {testing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {testing ? "Testing..." : "Test Connection"}
            </Button>

            <Button
              variant="destructive"
              onClick={handleRevoke}
              disabled={revoking}
            >
              {revoking ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              {revoking ? "Revoking..." : "Revoke Key"}
            </Button>
          </div>

          {/* Security notice */}
          <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/50 p-3">
            <ShieldCheck className="h-4 w-4 shrink-0 text-primary mt-0.5" />
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold">Encrypted at rest:</span> Your key
              is stored using AES-256-GCM encryption and is decrypted only for
              the duration of each API call. Revoking the key immediately
              disables all AI features.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
