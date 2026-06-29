// AI provider adapter pattern — pluggable image generation backends
export type AspectRatio = "1:1" | "16:9" | "9:16" | "4:5" | "3:2";

export interface GenerateOptions {
  prompt: string;
  negativePrompt?: string;
  aspectRatio?: AspectRatio;
  quantity?: number;
  style?: string;
  model?: string;
}

export interface GeneratedImage {
  url: string;
  revisedPrompt?: string;
  seed?: number;
}

export interface ImageGenService {
  name: string;
  displayName: string;
  generate(options: GenerateOptions): Promise<GeneratedImage[]>;
}

// ── Local adapter: calls our backend /api/ai/generate ───────────────────────
export class LocalBackendAdapter implements ImageGenService {
  name = "local-backend";
  displayName = "DESIGN.Studio AI";

  constructor(private projectId: number) {}

  async generate(options: GenerateOptions): Promise<GeneratedImage[]> {
    const res = await fetch("/api/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: this.projectId,
        prompt: options.prompt,
        negativePrompt: options.negativePrompt,
        aspectRatio: options.aspectRatio ?? "1:1",
        quantity: options.quantity ?? 1,
        style: options.style,
        model: options.model ?? "dall-e-3",
        provider: "gemini-web2api",
      }),
    });
    if (!res.ok) throw new Error(`Generation failed: ${res.status}`);
    const job = await res.json() as { resultUrls?: string[] };
    return (job.resultUrls ?? []).map((url) => ({ url }));
  }
}

// ── OpenRouter adapter (direct, user provides key) ───────────────────────────
export class OpenRouterAdapter implements ImageGenService {
  name = "openrouter";
  displayName = "OpenRouter";

  constructor(private apiKey: string, private model = "dall-e-3", private projectId = 0) {}

  async generate(options: GenerateOptions): Promise<GeneratedImage[]> {
    // Falls back to backend proxy which handles real or mock response
    const res = await fetch("/api/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...options, apiKey: this.apiKey, model: this.model, provider: "openrouter", projectId: this.projectId }),
    });
    if (!res.ok) throw new Error(`OpenRouter generation failed: ${res.status}`);
    const job = await res.json() as { resultUrls?: string[] };
    return (job.resultUrls ?? []).map((url) => ({ url }));
  }
}

// ── OpenAI-compatible adapter (Ollama local / any OpenAI-compat endpoint) ────
export class OpenAICompatibleAdapter implements ImageGenService {
  name = "openai-compatible";
  displayName = "OpenAI / Ollama";

  constructor(private baseUrl: string, private apiKey: string, private model = "dall-e-3", private projectId = 0) {}

  async generate(options: GenerateOptions): Promise<GeneratedImage[]> {
    const res = await fetch("/api/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...options, apiKey: this.apiKey, baseUrl: this.baseUrl, model: this.model, provider: "openai", projectId: this.projectId }),
    });
    if (!res.ok) throw new Error(`OpenAI-compatible generation failed: ${res.status}`);
    const job = await res.json() as { resultUrls?: string[] };
    return (job.resultUrls ?? []).map((url) => ({ url }));
  }
}

// ── Provider config (stored in localStorage) ─────────────────────────────────
export interface ProviderConfig {
  provider: "local" | "nous" | "gemini-web2api" | "openrouter" | "openai" | "groq";
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

const CONFIG_KEY = "ai-provider-config";

export function loadProviderConfig(): ProviderConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) return JSON.parse(raw) as ProviderConfig;
  } catch { /* ignore */ }
  return { provider: "nous", baseUrl: "https://inference-api.nousresearch.com/v1", model: "openrouter/owl-alpha" };
}

export function saveProviderConfig(cfg: ProviderConfig): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
}

export function buildAdapter(cfg: ProviderConfig, projectId: number): ImageGenService {
  if (cfg.provider === "nous") {
    return new OpenAICompatibleAdapter("https://inference-api.nousresearch.com/v1", "", cfg.model ?? "openrouter/owl-alpha", projectId);
  }
  if (cfg.provider === "openrouter" && cfg.apiKey) {
    return new OpenRouterAdapter(cfg.apiKey, cfg.model, projectId);
  }
  if (cfg.provider === "openai" && cfg.apiKey) {
    return new OpenAICompatibleAdapter(cfg.baseUrl ?? "https://api.openai.com/v1", cfg.apiKey, cfg.model, projectId);
  }
  if (cfg.provider === "groq" && cfg.apiKey) {
    return new OpenAICompatibleAdapter("https://api.groq.com/openai/v1", cfg.apiKey, cfg.model ?? "llama-3.3-70b-versatile", projectId);
  }
  if (cfg.provider === "gemini-web2api") {
    return new OpenAICompatibleAdapter("https://saint-examine-clearance-growth.trycloudflare.com/v1", "", cfg.model ?? "gemini-3.5-flash", projectId);
  }
  return new LocalBackendAdapter(projectId);
}
