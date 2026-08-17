import { useState } from 'react'
import { Settings, Play, AlertCircle, Zap } from 'lucide-react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useAIStudioStore } from './ai-studio-store'

export default function AiGeneratorWidget() {
  const store = useAIStudioStore()
  const [isFlipped, setIsFlipped] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [recentImage, setRecentImage] = useState<string | null>(null)
  const [localPrompt, setLocalPrompt] = useState('')
  const [resolution, setResolution] = useState({ width: 1024, height: 1024 })
  const [model, setModel] = useState('flux')
  const [steps, setSteps] = useState(28)

  const handleGenerate = async () => {
    if (!localPrompt && !store.currentPrompt) return
    setGenerating(true)
    await new Promise((r) => setTimeout(r, 2000))
    setRecentImage(`data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="512" height="512" fill="#09090b"/><text x="256" y="240" text-anchor="middle" fill="#34d399" font-size="16">${model}</text><text x="256" y="280" text-anchor="middle" fill="#52525b" font-size="11">${resolution.width}×${resolution.height} • ${steps} steps</text></svg>`)}`)
    setGenerating(false)
  }

  const front = (
    <Card className="h-full border-emerald-500/20 bg-gradient-to-br from-card via-card to-emerald-950/30">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between pb-2">
        <div className="flex items-center gap-2"><Zap className="w-4 h-4 text-emerald-400" /><CardTitle className="text-sm">AI Generator</CardTitle></div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <Badge variant="secondary" className="text-[10px]">Ready</Badge>
          <Button variant="ghost" size="icon" className="h-7 w-7 min-h-[44px] min-w-[44px]" onClick={() => setIsFlipped(true)} aria-label="Open AI Generator settings"><Settings className="h-3.5 w-3.5" /></Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="aspect-square rounded-lg bg-secondary/50 border border-border/50 flex items-center justify-center overflow-hidden">
          {recentImage ? <img src={recentImage} alt="" className="w-full h-full object-cover" /> : generating ? <div className="flex flex-col items-center gap-2"><motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }} className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full" /><span className="text-[9px] text-muted-foreground">Generating...</span></div> : <div className="flex flex-col items-center gap-1 text-muted-foreground/50"><AlertCircle className="w-5 h-5" /><span className="text-[10px]">No image yet</span></div>}
        </div>
        <Textarea value={localPrompt} onChange={(e) => setLocalPrompt(e.target.value)} placeholder="Enter prompt or pull from Style Engine..." rows={2} className="resize-none text-sm min-h-[44px]" onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleGenerate() }} />
        <div className="flex items-center justify-between text-[9px] text-muted-foreground"><span>{model} • {steps} steps</span><span>{resolution.width}×{resolution.height}</span></div>
        <div className="flex items-center justify-between pt-1 border-t border-border">
          <span className="text-[9px] text-muted-foreground">⌘+Enter to generate</span>
          <Button size="sm" className="min-h-[44px] text-[10px] gap-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500" disabled={generating || (!localPrompt && !store.currentPrompt)} onClick={handleGenerate}>
            {generating ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-3 h-3 border-2 border-white border-t-transparent rounded-full" /> : <Play className="w-3 h-3" />}
            Generate
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  const back = (
    <Card className="h-full border-emerald-500/20 bg-gradient-to-br from-card via-card to-card">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between pb-2">
        <div className="flex items-center gap-2"><Settings className="w-4 h-4 text-muted-foreground" /><CardTitle className="text-sm">Generator Settings</CardTitle></div>
        <Button variant="outline" size="sm" className="min-h-[44px] text-[10px]" onClick={() => setIsFlipped(false)}>← Back</Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <label className="text-[10px] font-medium text-muted-foreground mb-1.5 block">Connection</label>
          <div className="flex items-center justify-between px-2 py-1.5 bg-secondary/50 rounded border border-border/50">
            <span className="text-xs">Local Draw Things</span><Switch className="min-h-[44px] min-w-[44px]" />
          </div>
          <Input className="min-h-[44px] text-[10px] mt-1.5" placeholder="http://192.168.x.x:7860" />
        </div>
        <div>
          <label className="text-[10px] font-medium text-muted-foreground mb-1.5 block">Resolution</label>
          <div className="flex flex-wrap gap-1.5 items-center">
            <Input type="number" value={resolution.width} onChange={(e) => setResolution({ ...resolution, width: +e.target.value })} className="min-h-[44px] text-[10px] flex-1" />
            <span className="text-muted-foreground text-xs">×</span>
            <Input type="number" value={resolution.height} onChange={(e) => setResolution({ ...resolution, height: +e.target.value })} className="min-h-[44px] text-[10px] flex-1" />
          </div>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {[{ w: 512, h: 512 }, { w: 768, h: 768 }, { w: 1024, h: 1024 }, { w: 1024, h: 1344 }].map((r) => (
              <button key={`${r.w}x${r.h}`} onClick={() => setResolution({ width: r.w, height: r.h })} className={`flex-1 min-h-[44px] flex items-center justify-center px-1 rounded text-[9px] transition ${resolution.width === r.w && resolution.height === r.h ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'}`}>{r.w}×{r.h}</button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Model</label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="min-h-[44px] text-[10px]"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="flux">FLUX.2</SelectItem><SelectItem value="sdxl">SDXL</SelectItem><SelectItem value="sd15">SD 1.5</SelectItem></SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Steps</label>
            <Input type="number" value={steps} onChange={(e) => setSteps(+e.target.value)} min={1} max={50} className="min-h-[44px] text-[10px]" />
          </div>
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
