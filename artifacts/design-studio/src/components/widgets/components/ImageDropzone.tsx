import { useState, useCallback, type ReactNode } from 'react'
import { Upload, X, Image } from 'lucide-react'

interface ImageDropzoneProps {
  images: Array<{ base64?: string; url?: string; role: 'style' | 'subject' }>
  onAdd: (img: { base64?: string; url?: string; role: 'style' | 'subject' }) => void
  onRemove: (index: number) => void
}

export default function ImageDropzone({ images, onAdd, onRemove }: ImageDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [activeRole, setActiveRole] = useState<'style' | 'subject'>('style')

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (!files) return
      Array.from(files).forEach((file) => {
        const reader = new FileReader()
        reader.onload = () => onAdd({ base64: reader.result as string, role: activeRole })
        reader.readAsDataURL(file)
      })
    },
    [onAdd, activeRole],
  )

  const handleUrlAdd = useCallback(() => {
    if (urlInput.trim()) {
      onAdd({ url: urlInput.trim(), role: activeRole })
      setUrlInput('')
    }
  }, [urlInput, onAdd, activeRole])

  return (
    <div className="space-y-2">
      <div className="flex gap-1.5">
        {(['style', 'subject'] as const).map((role) => (
          <button
            key={role}
            onClick={() => setActiveRole(role)}
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium transition-all ${
              activeRole === role
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
            }`}
          >
            {role === 'style' ? '🎨 Style' : '🖼️ Subject'}
          </button>
        ))}
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setIsDragging(false)
          Array.from(e.dataTransfer.files).forEach((file) => {
            const reader = new FileReader()
            reader.onload = () => onAdd({ base64: reader.result as string, role: activeRole })
            reader.readAsDataURL(file)
          })
        }}
        className={`relative border-2 border-dashed rounded-lg p-3 text-center transition-all ${
          isDragging ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/50'
        }`}
      >
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <Upload className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
        <p className="text-[10px] text-muted-foreground">
          Drop or <span className="text-primary underline">browse</span>
        </p>
      </div>

      <div className="flex gap-1.5">
        <input
          type="text"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleUrlAdd()}
          placeholder="https://..."
          className="flex-1 bg-background border border-border rounded-lg px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          onClick={handleUrlAdd}
          className="px-2 py-1 bg-primary text-primary-foreground text-[10px] rounded-lg hover:bg-primary/90 transition"
        >
          Add
        </button>
      </div>

      {images.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {images.map((img, i) => (
            <div key={i} className="relative w-12 h-12 rounded-lg overflow-hidden bg-secondary border">
              <img src={img.base64 || img.url} alt="" className="w-full h-full object-cover" />
              <button
                onClick={() => onRemove(i)}
                className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full flex items-center justify-center"
              >
                <X className="w-2.5 h-2.5 text-destructive-foreground" />
              </button>
              <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-[8px] text-center text-white">
                {img.role === 'style' ? 'S' : 'R'}
              </span>
            </div>
          ))}
        </div>
      )}

      {images.length === 0 && (
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <Image className="w-3.5 h-3.5" />
          No reference images
        </div>
      )}
    </div>
  )
}
