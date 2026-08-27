// ============================================================
// AI Image Studio Widget Suite — Shared Types
// ============================================================

export interface GenerationPayload {
  prompt: string
  negativePrompt?: string
  referenceImages: Array<{
    base64?: string
    url?: string
    role: 'style' | 'subject'
  }>
  styleMd?: string
  designMd?: string
  parameters: {
    width: number
    height: number
    steps: number
    cfg: number
    sampler?: string
    model?: string
    seed?: number
  }
  projectId?: string
}

export interface ImageGeneratorConfig {
  id: string
  name: string
  type: 'drawthings' | 'openrouter' | 'custom'
  baseUrl: string
  apiKey?: string
  models: string[]
  status: 'online' | 'offline' | 'error'
  lastChecked: Date
}

export interface StyleAnalysis {
  styleMd: string
  designMd: string
  palette: string[]
  mood: string
  techniques: string[]
  negativePrompt: string
}

export interface GeneratorResult {
  id: string
  generatorId: string
  generatorName: string
  imageUrl?: string
  status: 'pending' | 'generating' | 'complete' | 'error'
  timestamp: Date
}
