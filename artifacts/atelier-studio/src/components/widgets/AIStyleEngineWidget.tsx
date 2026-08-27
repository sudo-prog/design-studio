import { useState } from 'react'
import { Settings, Sparkles, Wand2, FileText, Palette, ArrowRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useAIStudioStore } from './ai-studio-store'
import { refinePrompt, generateReversePrompt, extractStyleAndDesign } from './prompt-utils'
import FlipCard from './components/FlipCard'
import ImageDropzone from './components/ImageDropzone'
import PaletteDisplay from './components/PaletteDisplay'

const TEMPLATES = ['Product Shot', 'Lifestyle', 'Technical Flat', 'Editorial', 'Cinematic', 'Minimal']

export default function AIStyleEngineWidget() {
  const store = useAIStudioStore()
  const [isFlipped, setIsFlipped] = useState(false)
  const [activeTab, setActiveTab] = useState<'prompt' | 'style' | 'palette' | 'metadata'>('prompt')
  const [generatedPrompt, setGeneratedPrompt] = useState('')
  const [loading, setLoading] = useState<string | null>(null)
  const [palette, setPalette] = useState<string[]>([])
  const [customSystemPrompt, setCustomSystemPrompt] = useState('')

  const handleRefine = async () => {
    if (!store.currentPrompt) return
    setLoading('refine')
    const r = await refinePrompt(store.currentPrompt, store.referenceImages)
    setGeneratedPrompt(r)
    store.setPrompt(r)
    setLoading(null)
  }

  const handleReverse = async () => {
    if (!store.referenceImages.length) return
    setLoading('reverse')
    const img = store.referenceImages[0]
    if (img.base64) {
      const r = await generateReversePrompt(img.base64)
      setGeneratedPrompt(r)
      store.setPrompt(r)
    }
    setLoading(null)
  }

  const handleExtract = async () => {
    setLoading('style')
    const r = await extractStyleAndDesign(store.currentPrompt, store.referenceImages)
    store.setStyleMd(r.styleMd)
    store.setDesignMd(r.designMd)
    setPalette(r.palette)
    setActiveTab('style')
    setLoading(null)
  }

  const handleAll = async () => {
    setLoading('all')
    const [r, p] = await Promise.all([
      extractStyleAndDesign(store.currentPrompt, store.referenceImages),
      refinePrompt(store.currentPrompt, store.referenceImages),
    ])
    store.setStyleMd(r.styleMd)
    store.setDesignMd(r.designMd)
    store.setNegativePrompt(r.negativePrompt)
    setGeneratedPrompt(p)
    setPalette(r.palette)
    setActiveTab('prompt')
    setLoading(null)
  }

  const applyTemplate = (t: string) => {
    const m: Record<string, string> = {
      'Product Shot': 'Professional product photography, clean white background, studio lighting, centered composition, high-end commercial quality',
      Lifestyle: 'Lifestyle photography, natural setting, warm ambient lighting, candid moment, editorial quality',
      'Technical Flat': 'Technical flat lay, precise arrangement, soft diffused lighting, clean background, product showcase',
      Editorial: 'Editorial fashion photography, dramatic lighting, high contrast, magazine quality, bold composition',
      Cinematic: 'Cinematic shot, dramatic lighting, film grain, wide angle, depth of field, movie scene aesthetic',
      Minimal: 'Minimalist design, clean lines, negative space, muted colors, simple composition, modern aesthetic',
    }
    store.setPrompt(m[t] || t)
  }

  const front = (
    <Card className="h-full border-primary/20 bg-gradient-to-br from-card via-card to-primary/5">
      <CardHeader className="flex flex-row items-center justify-between pb-2 flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Sparkles className="w-4 h-4 text-primary" />
          <CardTitle className="text-sm">AI Style Engine</CardTitle>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="text-[10px]">{store.generators.filter(g => g.status === 'online').length} online</Badge>
          <Button variant="ghost" size="icon" className="h-7 w-7 min-h-[44px] min-w-[44px]" onClick={() => setIsFlipped(true)} aria-label="Open AI Style Engine settings">
            <Settings className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-1">
          {TEMPLATES.map((t) => (
            <button key={t} onClick={() => applyTemplate(t)} className="min-h-[44px] min-w-[44px] px-2 py-0.5 bg-secondary hover:bg-primary/20 border border-border rounded-full text-[10px] text-muted-foreground hover:text-foreground transition-all">
              {t}
            </button>
          ))}
        </div>

        <Textarea value={store.currentPrompt} onChange={(e) => store.setPrompt(e.target.value)} placeholder="Describe your vision..." rows={2} className="resize-none text-sm min-h-[44px]" />

        <ImageDropzone images={store.referenceImages} onAdd={store.addReferenceImage} onRemove={store.removeReferenceImage} />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          <ActionButton icon={<Wand2 className="w-3 h-3" />} label="Enhance" onClick={handleRefine} loading={loading === 'refine'} disabled={!store.currentPrompt} />
          <ActionButton icon={<Sparkles className="w-3 h-3" />} label="Reverse" onClick={handleReverse} loading={loading === 'reverse'} disabled={!store.referenceImages.length} />
          <ActionButton icon={<FileText className="w-3 h-3" />} label="Style.md" onClick={handleExtract} loading={loading === 'style'} disabled={!store.currentPrompt} />
          <ActionButton icon={<Palette className="w-3 h-3" />} label="Analyze All" onClick={handleAll} loading={loading === 'all'} disabled={!store.currentPrompt} accent />
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="grid grid-cols-4 min-h-[44px] overflow-x-auto">
            {(['prompt', 'style', 'palette', 'metadata'] as const).map((t) => (
              <TabsTrigger key={t} value={t} className="text-[10px] min-h-[44px]">{t.charAt(0).toUpperCase() + t.slice(1)}</TabsTrigger>
            ))}
          </TabsList>
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}>
              <TabsContent value="prompt" className="mt-2">
                <Textarea value={generatedPrompt} onChange={(e) => setGeneratedPrompt(e.target.value)} placeholder="Enhanced prompt..." rows={2} className="resize-none text-xs font-mono min-h-[44px]" />
                <div className="flex justify-between mt-1">
                  <span className="text-[9px] text-muted-foreground">{generatedPrompt.length} chars</span>
                  <button onClick={() => navigator.clipboard.writeText(generatedPrompt)} className="min-h-[44px] min-w-[44px] text-[9px] text-primary">Copy</button>
                </div>
              </TabsContent>
              <TabsContent value="style" className="mt-2">
                <pre className="text-[10px] text-muted-foreground whitespace-pre-wrap font-mono bg-secondary/50 rounded p-2 max-h-[80px] overflow-y-auto">
                  {store.styleMd || 'Click "Style.md" to generate'}
                </pre>
              </TabsContent>
              <TabsContent value="palette" className="mt-2">
                <PaletteDisplay colors={palette} />
              </TabsContent>
              <TabsContent value="metadata" className="mt-2">
                <div className="space-y-0.5 text-[10px] text-muted-foreground">
                  <p>Refs: {store.referenceImages.length} | Style: {store.styleMd.length}c | Design: {store.designMd.length}c</p>
                </div>
              </TabsContent>
            </motion.div>
          </AnimatePresence>
        </Tabs>

        <div className="flex items-center justify-between pt-1 border-t border-border">
          <span className="text-[9px] text-muted-foreground">{store.generators.length} generators</span>
          <Button size="sm" className="min-h-[44px] text-[10px]" disabled={!store.currentPrompt} onClick={() => store.broadcastGeneration()}>
            Broadcast <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  const back = (
    <Card className="h-full border-primary/20 bg-gradient-to-br from-card via-card to-card">
      <CardHeader className="flex flex-row items-center justify-between pb-2 flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Settings className="w-4 h-4 text-muted-foreground" />
          <CardTitle className="text-sm">Settings</CardTitle>
        </div>
        <Button variant="outline" size="sm" className="min-h-[44px] text-[10px]" onClick={() => setIsFlipped(false)}>← Back</Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Custom System Prompt</label>
          <Textarea value={customSystemPrompt} onChange={(e) => setCustomSystemPrompt(e.target.value)} placeholder="Always output in DESIGN.md format..." rows={2} className="resize-none text-xs min-h-[44px]" />
        </div>
        <div>
          <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Output Templates</label>
          <div className="space-y-1">
            {['Minimal', 'Detailed', 'YAML Frontmatter', 'JSON'].map((f) => (
              <div key={f} className="flex items-center justify-between px-2 py-1.5 bg-secondary/50 rounded border border-border/50 text-xs">{f} <span className="text-muted-foreground">→</span></div>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" className="min-h-[44px] text-[10px] flex-1" variant="outline"
            onClick={() => {
              const blob = new Blob([JSON.stringify({ styleMd: store.styleMd, designMd: store.designMd, palette }, null, 2)], { type: 'application/json' })
              const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'style-preset.json'; a.click()
            }}>Export</Button>
          <Button size="sm" className="min-h-[44px] text-[10px] flex-1" variant="outline">Import</Button>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="perspective-1000 w-full min-h-[300px] md:min-h-[420px]">
      <motion.div className="relative w-full h-full preserve-3d" animate={{ rotateY: isFlipped ? 180 : 0 }} transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}>
        <div className="absolute inset-0 backface-hidden">{front}</div>
        <div className="absolute inset-0 backface-hidden" style={{ transform: 'rotateY(180deg)' }}>{back}</div>
      </motion.div>
    </div>
  )
}

function ActionButton({ icon, label, onClick, loading, disabled, accent }: {
  icon: React.ReactNode; label: string; onClick: () => void; loading?: boolean; disabled?: boolean; accent?: boolean
}) {
  return (
    <Button
      size="sm"
      variant={accent ? 'default' : 'outline'}
      className={`min-h-[44px] text-[10px] gap-1 ${accent ? 'bg-gradient-to-r from-primary to-pink-600 hover:from-primary/90 hover:to-pink-600' : ''}`}
      onClick={onClick}
      disabled={disabled || !!loading}
    >
      {loading ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-3 h-3 border-2 border-current border-t-transparent rounded-full" /> : icon}
      {label}
    </Button>
  )
}
