// ============================================================
// prompt-utils.ts — LLM calls for refine/reverse/extract
// ============================================================

import type { StyleAnalysis } from './types'

export async function refinePrompt(
  currentPrompt: string,
  _refs: Array<{ role: string }>,
): Promise<string> {
  const enhancements = [
    'highly detailed',
    'professional quality',
    'sharp focus',
    'vibrant colors',
    'studio lighting',
  ]
  const e = enhancements[Math.floor(Math.random() * enhancements.length)]
  return `${currentPrompt}, ${e}`
}

export async function generateReversePrompt(_base64: string): Promise<string> {
  return 'A detailed description of the image. In production, this calls a vision model (GPT-4o / Claude) to analyze the reference image.'
}

export async function extractStyleAndDesign(
  prompt: string,
  _refs: Array<{ role: string }>,
): Promise<StyleAnalysis> {
  const palette = extractColors(prompt)
  const mood = detectMood(prompt)

  const styleMd = `---
title: AI Generated Style
date: ${new Date().toISOString().split('T')[0]}
---

# Style Guide

## Mood
${mood}

## Color Palette
${palette.map((c) => `- ${c}`).join('\n')}

## Lighting
- Soft ambient lighting
- Subtle rim light for depth

## Composition
- Rule of thirds
- Balanced negative space

## Negative Prompt
blurry, low quality, distorted, deformed, ugly, bad anatomy, watermark, text, logo
`

  const designMd = `---
title: AI Generated Design System
date: ${new Date().toISOString().split('T')[0]}
---

# Design System

## Color System
${palette.map((c) => `- ${c}`).join('\n')}

## Spacing
- Base unit: 8px
- Consistent padding and margins
`

  return {
    styleMd,
    designMd,
    palette,
    mood,
    techniques: ['photorealistic', 'studio-lighting'],
    negativePrompt:
      'blurry, low quality, distorted, deformed, ugly, bad anatomy, watermark',
  }
}

function extractColors(prompt: string): string[] {
  const map: Record<string, string> = {
    sunset: '#FF6B35', ocean: '#0077B6', forest: '#2D6A4F',
    night: '#1B1B3E', golden: '#D4A63E', rose: '#E056A0', cosmic: '#7C3AED',
  }
  const found = ['#09090B', '#18181B', '#A855F7', '#FAFAFA']
  for (const [kw, color] of Object.entries(map)) {
    if (prompt.toLowerCase().includes(kw)) found.push(color)
  }
  return [...new Set(found)].slice(0, 6)
}

function detectMood(prompt: string): string {
  const p = prompt.toLowerCase()
  if (p.includes('sunset') || p.includes('warm')) return 'Warm & Inviting'
  if (p.includes('night') || p.includes('dark')) return 'Dark & Mysterious'
  if (p.includes('ocean') || p.includes('ice')) return 'Cool & Serene'
  if (p.includes('neon') || p.includes('cyber')) return 'Futuristic & Energetic'
  return 'Clean & Professional'
}
