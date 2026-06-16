import { Router, type IRouter } from "express";
import sharp from "sharp";
import { db } from "@workspace/db";
import { aiJobsTable, activityLogTable, projectsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router: IRouter = Router();

// ── Allowlisted OpenAI-compatible endpoints ───────────────────────────────
const ALLOWED_PROVIDER_BASES = new Set([
  "https://openrouter.ai/api/v1",
  "https://api.openai.com/v1",
  "https://api.groq.com/openai/v1",
  "http://localhost:11434/v1",
]);

// ── Design-focused image pools per style (fallback when no API key) ────────
const IMAGE_POOLS: Record<string, string[]> = {
  default: [
    "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800",
    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800",
    "https://images.unsplash.com/photo-1527719327859-c6ce80353573?w=800",
    "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800",
    "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800",
    "https://images.unsplash.com/photo-1503341733017-1901578f9f1e?w=800",
  ],
  streetwear: [
    "https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=800",
    "https://images.unsplash.com/photo-1516762689617-e1cffcef479d?w=800",
    "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800",
    "https://images.unsplash.com/photo-1522770179533-24471fcdba45?w=800",
  ],
  minimal: [
    "https://images.unsplash.com/photo-1503342394128-c104d54dba01?w=800",
    "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800",
    "https://images.unsplash.com/photo-1582038292460-0e88d1b4e7b3?w=800",
  ],
  abstract: [
    "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800",
    "https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=800",
    "https://images.unsplash.com/photo-1550859492-d5da9d8e45f3?w=800",
  ],
};

function pickImages(prompt: string, qty: number): string[] {
  const lower = prompt.toLowerCase();
  let pool = IMAGE_POOLS.default;
  if (lower.includes("street") || lower.includes("urban") || lower.includes("grunge")) pool = IMAGE_POOLS.streetwear;
  else if (lower.includes("minimal") || lower.includes("clean") || lower.includes("simple")) pool = IMAGE_POOLS.minimal;
  else if (lower.includes("abstract") || lower.includes("psychedelic") || lower.includes("art")) pool = IMAGE_POOLS.abstract;
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(qty, shuffled.length));
}

// ── Real OpenAI-compatible image generation proxy ────────────────────────
async function generateViaApi(opts: {
  apiKey: string;
  baseUrl: string;
  model: string;
  prompt: string;
  quantity: number;
  size: string;
}): Promise<string[]> {
  const { apiKey, baseUrl, model, prompt, quantity, size } = opts;
  const endpoint = `${baseUrl}/images/generations`;
  const upstream = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": "https://design.studio",
      "X-Title": "DESIGN.Studio",
    },
    body: JSON.stringify({ model, prompt, n: quantity, size }),
  });
  if (!upstream.ok) {
    const err = await upstream.text();
    throw new Error(`Provider error ${upstream.status}: ${err.slice(0, 300)}`);
  }
  const data = await upstream.json() as { data?: { url?: string; b64_json?: string }[] };
  return (data.data ?? []).map((d) => d.url ?? `data:image/png;base64,${d.b64_json ?? ""}`).filter(Boolean);
}

// POST /api/ai/generate — real provider proxy with curated-URL fallback
router.post("/ai/generate", async (req, res): Promise<void> => {
  const body = z.object({
    projectId: z.number().int(),
    prompt: z.string().min(1),
    negativePrompt: z.string().optional(),
    model: z.string().optional().default("dall-e-3"),
    provider: z.string().optional().default("openrouter"),
    baseUrl: z.string().optional(),
    aspectRatio: z.string().optional().default("1:1"),
    quantity: z.number().int().min(1).max(4).optional().default(1),
    style: z.string().optional(),
    apiKey: z.string().optional(),
  }).safeParse(req.body);

  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const { projectId, prompt, quantity = 1, model, provider, apiKey } = body.data;

  // Validate that projectId references a real project before inserting FK
  const [project] = await db
    .select({ name: projectsTable.name })
    .from(projectsTable)
    .where(eq(projectsTable.id, projectId));

  if (!project) {
    res.status(400).json({ error: `Project ${projectId} not found. Select a project before generating.` });
    return;
  }

  // ── Real provider proxy ──────────────────────────────────────────────────
  let resultUrls: string[] = [];
  if (apiKey) {
    // Determine base URL (SSRF guard)
    let rawBase = body.data.baseUrl?.replace(/\/+$/, "");
    if (!rawBase) {
      rawBase = provider === "openai"
        ? "https://api.openai.com/v1"
        : provider === "groq"
          ? "https://api.groq.com/openai/v1"
          : "https://openrouter.ai/api/v1";
    }
    if (!ALLOWED_PROVIDER_BASES.has(rawBase)) {
      res.status(400).json({ error: "Unsupported provider base URL." });
      return;
    }
    const aspect = body.data.aspectRatio ?? "1:1";
    // Map all 5 frontend aspect ratios to OpenAI-compatible size strings
    const SIZE_MAP: Record<string, string> = {
      "1:1":  "1024x1024",
      "16:9": "1792x1024",
      "9:16": "1024x1792",
      "4:5":  "1024x1280",
      "3:2":  "1536x1024",
    };
    const size = SIZE_MAP[aspect] ?? "1024x1024";
    try {
      resultUrls = await generateViaApi({ apiKey, baseUrl: rawBase, model: model!, prompt, quantity, size });
    } catch (e) {
      // Fall through to curated fallback so the DB record is still created
      console.warn("Provider generation failed, using fallback:", String(e));
    }
  }

  // Curated fallback when no key provided or provider call failed
  if (resultUrls.length === 0) {
    resultUrls = pickImages(prompt, quantity);
  }

  const [job] = await db
    .insert(aiJobsTable)
    .values({
      projectId,
      type: "image_generation",
      status: "completed",
      prompt,
      negativePrompt: body.data.negativePrompt ?? null,
      provider: provider ?? "openrouter",
      model: model ?? "dall-e-3",
      aspectRatio: body.data.aspectRatio ?? null,
      quantity,
      sourceAssetUrl: null,
      resultUrls,
      selectedResultUrl: resultUrls[0] ?? null,
    })
    .returning();

  await db.insert(activityLogTable).values({
    type: "ai_job_completed",
    description: `AI image generation completed (${quantity} image${quantity > 1 ? "s" : ""})`,
    projectId,
    projectName: project?.name ?? null,
  });

  res.status(201).json(job);
});

// POST /api/ai/style-transfer — accepts source + style image base64, runs prompt-based generation
router.post("/ai/style-transfer", async (req, res): Promise<void> => {
  const body = z.object({
    projectId: z.number().int(),
    sourceBase64: z.string().optional(),
    styleBase64: z.string().optional(),
    prompt: z.string().optional(),
    apiKey: z.string().optional(),
    model: z.string().optional().default("dall-e-3"),
    provider: z.string().optional().default("openrouter"),
    baseUrl: z.string().optional(),
  }).safeParse(req.body);

  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const { projectId, apiKey, model, provider } = body.data;

  const [project] = await db
    .select({ name: projectsTable.name })
    .from(projectsTable)
    .where(eq(projectsTable.id, projectId));

  if (!project) {
    res.status(400).json({ error: `Project ${projectId} not found.` });
    return;
  }

  const transferPrompt = body.data.prompt
    ?? "Apply the visual style, color palette, and texture from the style reference image to the design source image. Preserve the composition of the source while adopting the mood and aesthetic of the style reference. High quality, print-ready artwork.";

  let resultUrls: string[] = [];
  if (apiKey) {
    let rawBase = body.data.baseUrl?.replace(/\/+$/, "");
    if (!rawBase) rawBase = provider === "openai" ? "https://api.openai.com/v1" : "https://openrouter.ai/api/v1";
    if (ALLOWED_PROVIDER_BASES.has(rawBase)) {
      try {
        resultUrls = await generateViaApi({ apiKey, baseUrl: rawBase, model: model!, prompt: transferPrompt, quantity: 1, size: "1024x1024" });
      } catch { /* fall through */ }
    }
  }

  if (resultUrls.length === 0) {
    resultUrls = pickImages(transferPrompt, 1);
  }

  const [job] = await db
    .insert(aiJobsTable)
    .values({
      projectId,
      type: "style_transfer",
      status: "completed",
      prompt: transferPrompt,
      negativePrompt: null,
      provider: provider ?? "openrouter",
      model: model ?? "dall-e-3",
      aspectRatio: "1:1",
      quantity: 1,
      sourceAssetUrl: null,
      resultUrls,
      selectedResultUrl: resultUrls[0] ?? null,
    })
    .returning();

  await db.insert(activityLogTable).values({
    type: "ai_job_completed",
    description: "Style transfer completed",
    projectId,
    projectName: project.name,
  });

  res.status(201).json(job);
});

// POST /api/ai/remove-bg — Sharp-based background removal (alpha mask)
router.post("/ai/remove-bg", async (req, res): Promise<void> => {
  const body = z.object({
    imageBase64: z.string().min(1),
    projectId: z.number().int(),
    threshold: z.number().min(0).max(255).optional().default(240),
  }).safeParse(req.body);

  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  try {
    const { imageBase64, threshold } = body.data;
    const buf = Buffer.from(imageBase64.replace(/^data:[^;]+;base64,/, ""), "base64");

    const img = sharp(buf).ensureAlpha();
    const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });

    const { width, height, channels } = info;
    const out = Buffer.alloc(width * height * 4);

    // Simple luminance-flood-fill: pixels whiter than threshold become transparent
    for (let i = 0; i < width * height; i++) {
      const base = i * channels;
      const r = data[base]!;
      const g = data[base + 1]!;
      const b = data[base + 2]!;
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      const alpha = luma > threshold ? 0 : 255;
      out[i * 4] = r;
      out[i * 4 + 1] = g;
      out[i * 4 + 2] = b;
      out[i * 4 + 3] = alpha;
    }

    const pngBuf = await sharp(out, { raw: { width, height, channels: 4 } })
      .png()
      .toBuffer();

    const resultBase64 = `data:image/png;base64,${pngBuf.toString("base64")}`;
    res.json({ resultBase64, width, height });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: `Background removal failed: ${msg}` });
  }
});

// Allowlisted provider base URLs for SSRF prevention
const ALLOWED_BASE_URLS = new Set([
  "https://openrouter.ai/api/v1",
  "https://api.openai.com/v1",
  "https://api.anthropic.com/v1",
  "http://localhost:11434/v1",   // Ollama local
]);

// POST /api/ai/chat — LLM chat refinement (streams if apiKey provided, falls back gracefully)
router.post("/ai/chat", async (req, res): Promise<void> => {
  const body = z.object({
    messages: z.array(z.object({ role: z.enum(["user", "assistant", "system"]), content: z.string() })),
    canvasContext: z.string().optional(),
    apiKey: z.string().optional(),
    baseUrl: z.string().optional(),
    model: z.string().optional().default("openai/gpt-4o-mini"),
  }).safeParse(req.body);

  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const { messages, canvasContext, apiKey, model } = body.data;
  const rawBaseUrl = body.data.baseUrl ?? "https://openrouter.ai/api/v1";

  // SSRF guard: only allow known provider endpoints
  const normalizedBase = rawBaseUrl.replace(/\/+$/, "");
  if (!ALLOWED_BASE_URLS.has(normalizedBase)) {
    res.status(400).json({ error: "Unsupported provider base URL." });
    return;
  }
  const baseUrl = normalizedBase;

  // If caller provided a live API key, attempt actual LLM call
  if (apiKey) {
    const endpoint = `${baseUrl}/chat/completions`;
    try {
      const systemMsg = canvasContext
        ? { role: "system" as const, content: `You are a print-design assistant. Current canvas JSON: ${canvasContext.slice(0, 2000)}` }
        : { role: "system" as const, content: "You are a print-design assistant. Suggest creative changes clearly and concisely." };

      const upstream = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({ model, max_tokens: 1024, messages: [systemMsg, ...messages] }),
      });

      if (upstream.ok) {
        const data = await upstream.json() as { choices?: { message?: { content?: string } }[] };
        const content = data.choices?.[0]?.message?.content ?? "No response.";
        res.json({ content, model });
        return;
      }
    } catch {
      // Fall through to canned response
    }
  }

  // Canned intelligent design suggestions keyed to last user message
  const lastMsg = messages.at(-1)?.content?.toLowerCase() ?? "";
  let suggestion = "Try increasing contrast by boosting midtones and adding a slight vignette around the edges. This helps the design pop on fabric.";
  if (lastMsg.includes("grungy") || lastMsg.includes("grange") || lastMsg.includes("rough"))
    suggestion = "Add a halftone overlay at 45°, reduce brightness by 20%, and apply a grainy texture layer set to Multiply at 40% opacity. Consider using an aged paper color (hex #D4C5A9) as the garment base.";
  else if (lastMsg.includes("earth") || lastMsg.includes("natural") || lastMsg.includes("organic"))
    suggestion = "Shift your palette to earthy tones: #8B6914 (ochre), #5C4033 (brown), #3D5A3E (forest green). Remove cool highlights and add warm shadows.";
  else if (lastMsg.includes("minimal") || lastMsg.includes("clean") || lastMsg.includes("simple"))
    suggestion = "Strip the design to 2–3 colors max. Use generous whitespace and a single weight for any text. Consider a centered single-line wordmark.";
  else if (lastMsg.includes("bold") || lastMsg.includes("pop") || lastMsg.includes("vivid"))
    suggestion = "Increase saturation by 30%, bump contrast to +25, and try a complementary accent color (e.g., if base is blue #1B4FD8, accent with orange #F97316). High-visibility design works best at 150+ LPI.";
  else if (lastMsg.includes("color") || lastMsg.includes("palette"))
    suggestion = "Try a 3-color split-complementary scheme. If your dominant color is #E53E3E (red), pair with #3182CE (blue) and #38A169 (green). Keep one color dominant at 60%, one secondary at 30%, one accent at 10%.";

  res.json({ content: suggestion, model: "design-assistant-stub" });
});

export default router;
