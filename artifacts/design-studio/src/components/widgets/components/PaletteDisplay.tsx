import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

interface PaletteDisplayProps {
  colors: string[]
}

export default function PaletteDisplay({ colors }: PaletteDisplayProps) {
  const [copied, setCopied] = useState<string | null>(null)

  const copyColor = (hex: string) => {
    navigator.clipboard.writeText(hex)
    setCopied(hex)
    setTimeout(() => setCopied(null), 1500)
  }

  if (colors.length === 0) {
    return <p className="text-xs text-muted-foreground">Extract a palette to see colors</p>
  }

  return (
    <div className="flex flex-wrap gap-2">
      {colors.map((color, i) => (
        <button
          key={i}
          onClick={() => copyColor(color)}
          className="flex flex-col items-center gap-1 group"
          title={`Copy ${color}`}
        >
          <div
            className="w-9 h-9 rounded-lg border shadow-sm transition-transform group-hover:scale-110 relative"
            style={{ backgroundColor: color, borderColor: color + '40' }}
          >
            {copied === color && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg">
                <Check className="w-3.5 h-3.5 text-white" />
              </div>
            )}
          </div>
          <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
            {color}
            <Copy className="w-2 h-2 opacity-0 group-hover:opacity-100" />
          </span>
        </button>
      ))}
    </div>
  )
}
