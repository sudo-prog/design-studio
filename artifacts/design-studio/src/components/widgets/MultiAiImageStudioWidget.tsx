import { useState } from 'react'
import { Settings, Zap, RefreshCw, Download, Plus, Trash2, Power, PowerOff } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useAIStudioStore } from './ai-studio-store'
import { useImageGenerators } from './useImageGenerators'
import type { ImageGeneratorConfig } from './types'

export default function MultiAiImageStudioWidget() {
  const store = useAIStudioStore()
  const { testConnection, generateWithProvider } = useImageGenerators()
  const [isFlipped, setIsFlipped] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [newGen, setNewGen] = useState({ name: '', type: 'custom' as const, baseUrl: '', apiKey: '' })

  const handleGenerateAll = async () => {
    if (!store.currentPrompt) return
    setGenerating(true)
    const payload = store.broadcastGeneration()
    for (const gen of store.generators) {
      if (gen.status !== 'online') continue
      store.addResult({ id: `r-${Date.now()}-${gen.id}`, generatorId: gen.id, generatorName: gen.name, status: 'generating', timestamp: new Date() })
      try {
        const result = await generateWithProvider(gen, payload)
        store.addResult({ id: `r-${Date.now()}-${gen.id}-ok`, generatorId: gen.id, generatorName: gen.name, imageUrl: result.images?.[0], status: 'complete', timestamp: new Date() })
      } catch {
        store.addResult({ id: `r-${Date.now()}-${gen.id}-err`, generatorId: gen.id, generatorName: gen.name, status: 'error', timestamp: new Date() })
      }
    }
    setGenerating(false)
  }

  const handleAdd = () => {
    if (!newGen.name || !newGen.baseUrl) return
    store.addGenerator({ id: `gen-${Date.now()}`, name: newGen.name, type: newGen.type, baseUrl: newGen.baseUrl, apiKey: newGen.apiKey, models: ['flux', 'sdxl'], status: 'offline', lastChecked: new Date() })
    setNewGen({ name: '', type: 'custom', baseUrl: '', apiKey: '' })
    setShowAdd(false)
  }

  const statusDot = (s: string) => s === 'online' ? 'bg-green-400' : s === 'error' ? 'bg-red-400' : 'bg-zinc-500'

  const front = (
    <Card className="h-full border-blue-500/20 bg-gradient-to-br from-card via-card to-blue-950/30">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2"><Zap className="w-4 h-4 text-blue-400" /><CardTitle className="text-sm">Multi Studio</CardTitle></div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-[10px]">{store.generators.filter(g => g.status === 'online').length}/{store.generators.length} active</Badge>
          <Button variant="ghost" size="icon" className="h-7 w-7 min-h-[44px] min-w-[44px]" onClick={() => setIsFlipped(true)} aria-label="Open Multi Studio generator settings"><Settings className="h-3.5 w-3.5" /></Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <label className="text-[9px] font-medium text-muted-foreground mb-1 block uppercase tracking-wider">Shared Prompt</label>
          <div className="flex gap-1.5">
            <Textarea value={store.currentPrompt} onChange={(e) => store.setPrompt(e.target.value)} placeholder="Pull from Style Engine..." rows={2} className="resize-none text-sm flex-1" />
            <Button size="sm" className="h-auto px-2 text-[10px] self-start" variant="outline">Pull</Button>
          </div>
        </div>
        <div className="flex gap-1.5">
          <Button size="sm" variant="outline" className="min-h-[44px] text-[10px] gap-1"><RefreshCw className="w-3 h-3" />Refine</Button>
          <Button size="sm" variant="outline" className="min-h-[44px] text-[10px] gap-1"><Zap className="w-3 h-3" />Extract</Button>
          <Button size="sm" variant="outline" className="min-h-[44px] text-[10px] gap-1"><Download className="w-3 h-3" />Save</Button>
        </div>
        <div>
          <label className="text-[9px] font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">Generators</label>
          <div className="space-y-1">
            {store.generators.map((g) => (
              <div key={g.id} className="flex items-center justify-between px-2 py-1.5 bg-secondary/50 rounded border border-border/50">
                <div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${statusDot(g.status)}`} /><span className="text-xs">{g.name}</span><span className="text-[9px] text-muted-foreground">{g.type}</span></div>
                <Button variant="ghost" size="sm" className="h-5 text-[9px] px-1.5 min-h-[44px] min-w-[44px]" onClick={() => testConnection(g)}>Test</Button>
              </div>
            ))}
            {!store.generators.length && <p className="text-[10px] text-muted-foreground text-center py-2">No generators</p>}
          </div>
        </div>
        <div>
          <label className="text-[9px] font-medium text-muted-foreground mb-1.5 block uppercase tracking-wider">Results</label>
          <div className="grid grid-cols-3 gap-1.5">
            {store.generatorResults.slice(-6).map((r) => (
              <div key={r.id} className="aspect-square rounded bg-secondary/50 border border-border/50 flex items-center justify-center overflow-hidden">
                {r.imageUrl ? <img src={r.imageUrl} alt="" className="w-full h-full object-cover" /> : r.status === 'generating' ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full" /> : r.status === 'error' ? <span className="text-[9px] text-destructive">Err</span> : <span className="text-[9px] text-muted-foreground/50">—</span>}
              </div>
            ))}
            {!store.generatorResults.length && <div className="col-span-3 py-4 text-center text-[10px] text-muted-foreground">Generate to see results</div>}
          </div>
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-border">
          <Button variant="ghost" size="sm" className="min-h-[44px] text-[9px]" onClick={() => store.clearResults()}>Clear</Button>
          <Button size="sm" className="min-h-[44px] text-[10px] gap-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500" disabled={generating || !store.currentPrompt || !store.generators.some(g => g.status === 'online')} onClick={handleGenerateAll}>
            {generating ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-3 h-3 border-2 border-white border-t-transparent rounded-full" /> : <Zap className="w-3 h-3" />}
            Send to All
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  const back = (
    <Card className="h-full border-blue-500/20 bg-gradient-to-br from-card via-card to-card">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2"><Settings className="w-4 h-4 text-muted-foreground" /><CardTitle className="text-sm">Generator Settings</CardTitle></div>
        <Button variant="outline" size="sm" className="min-h-[44px] text-[10px]" onClick={() => setIsFlipped(false)}>← Back</Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {store.generators.map((g) => (
          <div key={g.id} className="p-2 bg-secondary/50 rounded-lg border border-border/50 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">{g.name}</span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-5 w-5 min-h-[44px] min-w-[44px]" onClick={() => testConnection(g)} aria-label={`Test connection for ${g.name}`}>
                  {g.status === 'online' ? <Power className="w-3 h-3 text-green-400" /> : <PowerOff className="w-3 h-3 text-muted-foreground" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-5 w-5 min-h-[44px] min-w-[44px]" onClick={() => store.removeGenerator(g.id)} aria-label={`Remove generator ${g.name}`}><Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" /></Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <Input value={g.name} onChange={(e) => store.updateGenerator(g.id, { name: e.target.value })} className="min-h-[44px] text-[10px]" placeholder="Name" />
              <Select value={g.type} onValueChange={(v) => store.updateGenerator(g.id, { type: v as ImageGeneratorConfig['type'] })}>
                <SelectTrigger className="min-h-[44px] text-[10px]"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="drawthings">DrawThings</SelectItem><SelectItem value="openrouter">OpenRouter</SelectItem><SelectItem value="custom">Custom</SelectItem></SelectContent>
              </Select>
            </div>
            <Input value={g.baseUrl} onChange={(e) => store.updateGenerator(g.id, { baseUrl: e.target.value })} className="min-h-[44px] text-[10px] w-full" placeholder="http://localhost:7860" />
          </div>
        ))}
        <AnimatePresence>
          {showAdd ? (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="p-2 bg-secondary/50 rounded-lg border border-dashed border-border space-y-1.5">
              <Input value={newGen.name} onChange={(e) => setNewGen({ ...newGen, name: e.target.value })} className="min-h-[44px] text-[10px]" placeholder="Name" />
              <Select value={newGen.type} onValueChange={(v) => setNewGen({ ...newGen, type: v as 'custom' })}>
                <SelectTrigger className="min-h-[44px] text-[10px]"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="drawthings">DrawThings</SelectItem><SelectItem value="openrouter">OpenRouter</SelectItem><SelectItem value="custom">Custom</SelectItem></SelectContent>
              </Select>
              <Input value={newGen.baseUrl} onChange={(e) => setNewGen({ ...newGen, baseUrl: e.target.value })} className="min-h-[44px] text-[10px]" placeholder="URL" />
              <div className="flex gap-1.5">
                <Button size="sm" className="min-h-[44px] text-[10px] flex-1" onClick={handleAdd}>Add</Button>
                <Button size="sm" variant="outline" className="min-h-[44px] text-[10px]" onClick={() => setShowAdd(false)}>Cancel</Button>
              </div>
            </motion.div>
          ) : (
            <Button variant="outline" className="w-full min-h-[44px] text-[10px] border-dashed" onClick={() => setShowAdd(true)}><Plus className="w-3 h-3 mr-1" />Add Generator</Button>
          )}
        </AnimatePresence>
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
