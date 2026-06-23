import { useCallback, useEffect, useRef } from 'react'
import { useAIStudioStore } from './ai-studio-store'
import type { ImageGeneratorConfig, GenerationPayload } from './types'

export function useImageGenerators() {
  const generators = useAIStudioStore((s) => s.generators)
  const updateGeneratorStatus = useAIStudioStore((s) => s.updateGeneratorStatus)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const testConnection = useCallback(
    async (generator: ImageGeneratorConfig): Promise<boolean> => {
      try {
        if (generator.type === 'drawthings') {
          const res = await fetch(`${generator.baseUrl}/sdapi/v1/options`, {
            method: 'GET', signal: AbortSignal.timeout(5000),
          })
          if (res.ok) { updateGeneratorStatus(generator.id, 'online'); return true }
        } else {
          const res = await fetch(generator.baseUrl, {
            method: 'GET', signal: AbortSignal.timeout(5000),
          })
          if (res.ok) { updateGeneratorStatus(generator.id, 'online'); return true }
        }
      } catch { /* silent */ }
      updateGeneratorStatus(generator.id, 'offline')
      return false
    },
    [updateGeneratorStatus],
  )

  const testAllConnections = useCallback(async () => {
    await Promise.allSettled(generators.map((g: ImageGeneratorConfig) => testConnection(g)))
  }, [generators, testConnection])

  const generateWithProvider = useCallback(
    async (generator: ImageGeneratorConfig, payload: GenerationPayload) => {
      if (generator.type === 'drawthings') {
        const res = await fetch(`${generator.baseUrl}/sdapi/v1/txt2img`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: payload.prompt,
            negative_prompt: payload.negativePrompt || '',
            width: payload.parameters.width,
            height: payload.parameters.height,
            steps: payload.parameters.steps,
            cfg_scale: payload.parameters.cfg,
            sampler_name: payload.parameters.sampler || 'euler',
            seed: payload.parameters.seed ?? -1,
          }),
        })
        return res.json()
      }
      return { images: [generatePlaceholderSVG(generator.name)] }
    },
    [],
  )

  useEffect(() => {
    intervalRef.current = setInterval(testAllConnections, 30000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [testAllConnections])

  useEffect(() => { testAllConnections() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { generators, testConnection, testAllConnections, generateWithProvider }
}

function generatePlaceholderSVG(name: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="512" height="512" fill="#0c0c1d"/><text x="256" y="240" text-anchor="middle" fill="#a855f7" font-size="18" font-family="system-ui">${name}</text><text x="256" y="280" text-anchor="middle" fill="#52525b" font-size="12" font-family="system-ui">Mock Output</text></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}
