import { create } from 'zustand'
import type { GenerationPayload, ImageGeneratorConfig, GeneratorResult } from './types'

interface AIStudioState {
  currentPrompt: string
  negativePrompt: string
  referenceImages: Array<{ base64?: string; url?: string; role: 'style' | 'subject' }>
  styleMd: string
  designMd: string
  activeProjectId: string | null
  generators: ImageGeneratorConfig[]
  generatorResults: GeneratorResult[]

  setPrompt: (prompt: string) => void
  setNegativePrompt: (prompt: string) => void
  addReferenceImage: (img: { base64?: string; url?: string; role: 'style' | 'subject' }) => void
  removeReferenceImage: (index: number) => void
  setStyleMd: (md: string) => void
  setDesignMd: (md: string) => void
  setActiveProject: (id: string | null) => void
  addGenerator: (gen: ImageGeneratorConfig) => void
  removeGenerator: (id: string) => void
  updateGeneratorStatus: (id: string, status: ImageGeneratorConfig['status']) => void
  updateGenerator: (id: string, updates: Partial<ImageGeneratorConfig>) => void
  addResult: (result: GeneratorResult) => void
  clearResults: () => void
  broadcastGeneration: () => GenerationPayload
  clearAll: () => void
}

export const useAIStudioStore = create<AIStudioState>((set, get) => ({
  currentPrompt: '',
  negativePrompt: '',
  referenceImages: [],
  styleMd: '',
  designMd: '',
  activeProjectId: null,
  generators: [
    {
      id: 'mock-1', name: 'Mock Generator A', type: 'custom',
      baseUrl: 'http://localhost:9000', models: ['flux', 'sdxl'],
      status: 'offline', lastChecked: new Date(),
    },
    {
      id: 'mock-2', name: 'Mock Generator B', type: 'openrouter',
      baseUrl: 'http://localhost:9001', models: ['flux', 'sdxl'],
      status: 'offline', lastChecked: new Date(),
    },
  ],
  generatorResults: [],

  setPrompt: (prompt: string) => set({ currentPrompt: prompt }),
  setNegativePrompt: (prompt: string) => set({ negativePrompt: prompt }),
  addReferenceImage: (img: { base64?: string; url?: string; role: 'style' | 'subject' }) =>
    set((s: AIStudioState) => ({ referenceImages: [...s.referenceImages, img] })),
  removeReferenceImage: (index: number) =>
    set((s: AIStudioState) => ({ referenceImages: s.referenceImages.filter((_: unknown, i: number) => i !== index) })),
  setStyleMd: (md: string) => set({ styleMd: md }),
  setDesignMd: (md: string) => set({ designMd: md }),
  setActiveProject: (id: string | null) => set({ activeProjectId: id }),
  addGenerator: (gen: ImageGeneratorConfig) =>
    set((s: AIStudioState) => ({ generators: [...s.generators, gen] })),
  removeGenerator: (id: string) =>
    set((s: AIStudioState) => ({ generators: s.generators.filter((g: ImageGeneratorConfig) => g.id !== id) })),
  updateGeneratorStatus: (id: string, status: ImageGeneratorConfig['status']) =>
    set((s: AIStudioState) => ({
      generators: s.generators.map((g: ImageGeneratorConfig) => g.id === id ? { ...g, status, lastChecked: new Date() } : g),
    })),
  updateGenerator: (id: string, updates: Partial<ImageGeneratorConfig>) =>
    set((s: AIStudioState) => ({
      generators: s.generators.map((g: ImageGeneratorConfig) => g.id === id ? { ...g, ...updates } : g),
    })),
  addResult: (result: GeneratorResult) =>
    set((s: AIStudioState) => ({ generatorResults: [...s.generatorResults, result] })),
  clearResults: () => set({ generatorResults: [] }),

  broadcastGeneration: () => {
    const state = get()
    return {
      prompt: state.currentPrompt,
      negativePrompt: state.negativePrompt,
      referenceImages: state.referenceImages,
      styleMd: state.styleMd,
      designMd: state.designMd,
      parameters: { width: 1024, height: 1024, steps: 28, cfg: 7.5, model: 'flux' },
      projectId: state.activeProjectId ?? undefined,
    }
  },

  clearAll: () => set({ currentPrompt: '', negativePrompt: '', referenceImages: [], styleMd: '', designMd: '', generatorResults: [] }),
}))
