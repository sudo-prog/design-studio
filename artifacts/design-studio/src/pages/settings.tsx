import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Check, Cpu, Key, Globe, Zap, Download, CheckCircle2 } from "lucide-react";
import { usePWAInstall } from "@/hooks/use-pwa-install";

export type AIProvider = "nous" | "gemini-web2api" | "openai" | "openrouter" | "groq" | "ollama";

export interface LLMConfig {
  provider: AIProvider;
  apiKey: string;
  baseUrl: string;
  model: string;
}

const PROVIDER_DEFAULTS: Record<AIProvider, { baseUrl: string; models: string[]; label: string; keyLabel: string }> = {
  "nous": {
    baseUrl: "https://inference-api.nousresearch.com/v1",
    models: ["openrouter/owl-alpha", "openrouter/anthropic/claude-3.5-sonnet", "openrouter/openai/gpt-4o", "openrouter/google/gemini-2.0-flash-001"],
    label: "Hermes (Nous)",
    keyLabel: "No key needed",
  },
  "gemini-web2api": {
    baseUrl: "https://navigator-aim-disciplinary-couples.trycloudflare.com/v1",
    models: ["gemini-3.5-flash", "gemini-3.5-flash-thinking", "gemini-3.1-pro"],
    label: "Gemini (Free)",
    keyLabel: "No key needed",
  },
  openai: {
    baseUrl: "https://api.openai.com/v1",
    models: ["gpt-4o", "gpt-4o-mini", "dall-e-3", "dall-e-2"],
    label: "OpenAI",
    keyLabel: "API Key (sk-...)",
  },
  openrouter: {
    baseUrl: "https://openrouter.ai/api/v1",
    models: [
      "openai/gpt-4o",
      "anthropic/claude-3.5-sonnet",
      "google/gemini-2.0-flash-001",
      "meta-llama/llama-3.3-70b-instruct",
    ],
    label: "OpenRouter",
    keyLabel: "API Key (sk-or-...)",
  },
  groq: {
    baseUrl: "https://api.groq.com/openai/v1",
    models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"],
    label: "Groq",
    keyLabel: "API Key (gsk_...)",
  },
  ollama: {
    baseUrl: "http://localhost:11434/v1",
    models: ["llama3.2", "mistral", "gemma2", "codellama"],
    label: "Ollama (local)",
    keyLabel: "API Key (leave blank for local)",
  },
};

const STORAGE_KEY = "design_studio_llm_config";

export function loadLLMConfig(): LLMConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as LLMConfig;
  } catch {}
  return {
    provider: "nous",
    apiKey: "",
    baseUrl: PROVIDER_DEFAULTS.nous.baseUrl,
    model: "openrouter/owl-alpha",
  };
}

export function saveLLMConfig(config: LLMConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export default function Settings() {
  const { toast } = useToast();
  const { canInstall, installed, install } = usePWAInstall();
  const [config, setConfig] = useState<LLMConfig>(loadLLMConfig);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"ok" | "fail" | null>(null);

  const providerInfo = PROVIDER_DEFAULTS[config.provider];

  function handleProviderChange(p: AIProvider) {
    setTestResult(null);
    setConfig((prev) => ({
      ...prev,
      provider: p,
      baseUrl: PROVIDER_DEFAULTS[p].baseUrl,
      model: PROVIDER_DEFAULTS[p].models[0],
    }));
  }

  function handleSave() {
    saveLLMConfig(config);
    toast({ title: "Settings saved", description: "LLM Router config persisted to browser storage." });
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const url = config.provider === "ollama"
        ? `${config.baseUrl.replace("/v1", "")}/api/tags`
        : config.provider === "gemini-web2api"
          ? `${config.baseUrl}/models`
          : `${config.baseUrl}/models`;

      const res = await fetch(url, {
        headers: config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {},
        signal: AbortSignal.timeout(8000),
      });
      setTestResult(res.ok ? "ok" : "fail");
      if (res.ok) {
        toast({ title: "Connection successful", description: `${providerInfo.label} responded OK.` });
      } else {
        toast({ title: "Connection failed", description: `Status ${res.status}`, variant: "destructive" });
      }
    } catch (e) {
      setTestResult("fail");
      toast({ title: "Connection failed", description: "Could not reach provider endpoint.", variant: "destructive" });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Configure your AI provider and studio preferences.</p>
      </div>

      {(canInstall || installed) && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              {installed
                ? <CheckCircle2 className="w-5 h-5 text-green-500" />
                : <Download className="w-5 h-5 text-primary" />}
              <CardTitle>{installed ? "App Installed" : "Install App"}</CardTitle>
            </div>
            <CardDescription>
              {installed
                ? "DESIGN.Studio is installed on your device and runs in standalone mode."
                : "Install DESIGN.Studio to your home screen for faster access and offline support."}
            </CardDescription>
          </CardHeader>
          {!installed && (
            <CardContent>
              <Button onClick={install} className="gap-2">
                <Download className="w-4 h-4" />
                Install DESIGN.Studio
              </Button>
            </CardContent>
          )}
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-primary" />
            <CardTitle>LLM Router</CardTitle>
          </div>
          <CardDescription>
            Choose your AI provider for concept generation, vectorization, and assistant features.
            Your API key is stored locally in your browser only — never sent to our servers.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Provider</Label>
            <Select value={config.provider} onValueChange={(v) => handleProviderChange(v as AIProvider)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(PROVIDER_DEFAULTS) as [AIProvider, (typeof PROVIDER_DEFAULTS)[AIProvider]][]).map(([key, info]) => (
                  <SelectItem key={key} value={key}>
                    <span className="flex items-center gap-2">
                      {key === "ollama" ? <Zap className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
                      {info.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="api-key">
              <Key className="w-3.5 h-3.5 inline mr-1 mb-0.5" />
              {providerInfo.keyLabel}
            </Label>
            <Input
              id="api-key"
              type="password"
              placeholder={config.provider === "ollama" ? "Leave blank for local" : config.provider === "gemini-web2api" ? "No key needed" : "Paste your API key"}
              value={config.apiKey}
              onChange={(e) => setConfig((prev) => ({ ...prev, apiKey: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              Stored in <code className="font-mono text-xs">localStorage</code> — never transmitted to DESIGN.Studio servers.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="base-url">Base URL</Label>
            <Input
              id="base-url"
              type="url"
              value={config.baseUrl}
              onChange={(e) => setConfig((prev) => ({ ...prev, baseUrl: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              Override to point at a custom OpenAI-compatible endpoint (e.g. LM Studio, Azure, Together AI).
            </p>
          </div>

          <div className="space-y-2">
            <Label>Default Model</Label>
            <Select value={config.model} onValueChange={(v) => setConfig((prev) => ({ ...prev, model: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {providerInfo.models.map((m) => (
                  <SelectItem key={m} value={m}>
                    <code className="font-mono text-xs">{m}</code>
                  </SelectItem>
                ))}
                {!providerInfo.models.includes(config.model) && (
                  <SelectItem value={config.model}>
                    <code className="font-mono text-xs">{config.model} (custom)</code>
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button onClick={handleSave} className="flex-1">
              Save Settings
            </Button>
            <Button variant="outline" onClick={handleTest} disabled={testing}>
              {testing ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : testResult === "ok" ? (
                <Check className="w-4 h-4 mr-2 text-green-500" />
              ) : null}
              Test Connection
            </Button>
            {testResult && (
              <Badge variant={testResult === "ok" ? "default" : "destructive"}>
                {testResult === "ok" ? "Connected" : "Failed"}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>About</CardTitle>
          <CardDescription>DESIGN.Studio — print-first AI creative suite</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>Version 0.1.0 — Checkpoint 0</p>
          <p>Built for screen printers, indie clothing brands, graphic designers, and students.</p>
        </CardContent>
      </Card>
    </div>
  );
}
