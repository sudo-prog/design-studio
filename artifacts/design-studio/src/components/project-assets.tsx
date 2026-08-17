import { useState, useRef, useCallback } from "react";
import { useListAssets, useDeleteAsset, useUploadAsset, getListAssetsQueryKey } from "@workspace/api-client-react";
import type { AssetUploadFormType } from "@workspace/api-zod";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Upload, Trash2, Image, FileCode, Layers, Camera,
  ExternalLink, Grid3X3, Search
} from "lucide-react";

const TYPE_ICONS: Record<string, React.ElementType> = {
  photo: Camera,
  vector: FileCode,
  texture: Layers,
  reference: Image,
};

const TYPE_COLORS: Record<string, string> = {
  photo: "bg-blue-500/20 text-blue-400",
  vector: "bg-purple-500/20 text-purple-400",
  texture: "bg-orange-500/20 text-orange-400",
  reference: "bg-green-500/20 text-green-400",
};

function formatBytes(bytes: number | null | undefined) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface ProjectAssetsProps {
  projectId: number;
}

export function ProjectAssets({ projectId }: ProjectAssetsProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [isDragging, setIsDragging] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: assets = [], isLoading } = useListAssets(projectId, {
    query: { enabled: !!projectId, queryKey: getListAssetsQueryKey(projectId) },
  });

  const deleteAsset = useDeleteAsset();
  const uploadAsset = useUploadAsset();

  const filtered = assets.filter((a) => {
    const matchSearch =
      !search || a.filename.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || a.type === typeFilter;
    return matchSearch && matchType;
  });

  const selectedAssetData = selectedAsset ? assets.find((a) => a.id === selectedAsset) : null;

  async function handleFiles(files: FileList) {
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("file", file);
      const assetType: AssetUploadFormType = file.type.startsWith("image/svg") ? "vector" : "photo";
      formData.append("type", assetType);
      await uploadAsset.mutateAsync(
        { id: projectId, data: formData as unknown as { file: File; type?: AssetUploadFormType } },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListAssetsQueryKey(projectId) });
            toast({ title: "Asset uploaded", description: file.name });
          },
          onError: () => toast({ title: "Upload failed", variant: "destructive" }),
        }
      );
    }
  }

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
    },
    [projectId]
  );

  function handleDelete(id: number) {
    deleteAsset.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListAssetsQueryKey(projectId) });
          if (selectedAsset === id) setSelectedAsset(null);
          toast({ title: "Asset deleted" });
        },
      }
    );
  }

  return (
    <div className="space-y-4">
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
          isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
        }`}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm font-medium">Drop files here or click to upload</p>
        <p className="text-xs text-muted-foreground mt-1">PNG, JPG, SVG, WebP up to 50MB</p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      {uploadAsset.isPending && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground px-1">
          <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary animate-pulse rounded-full w-2/3" />
          </div>
          <span>Uploading…</span>
        </div>
      )}

      <div className="flex gap-2 items-center flex-wrap">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search assets..."
            className="pl-8 h-8 min-h-[44px] text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-32 h-8 min-h-[44px] text-sm">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="photo">Photo</SelectItem>
            <SelectItem value="vector">Vector</SelectItem>
            <SelectItem value="texture">Texture</SelectItem>
            <SelectItem value="reference">Reference</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 overflow-x-auto">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-md" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <Grid3X3 className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">{search ? "No assets match your search." : "No assets yet. Upload some files above."}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 overflow-x-auto">
          {filtered.map((asset) => {
            const Icon = TYPE_ICONS[asset.type] ?? Image;
            const isImage = asset.mimeType?.startsWith("image/");
            return (
              <div
                key={asset.id}
                className="group relative aspect-square rounded-md border border-border overflow-hidden cursor-pointer bg-muted hover:border-primary/50 transition-all"
                onClick={() => setSelectedAsset(asset.id)}
              >
                {isImage ? (
                  <img
                    src={asset.thumbnailUrl ?? asset.url}
                    alt={asset.filename}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Icon className="w-8 h-8 text-muted-foreground" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                  <Badge
                    variant="secondary"
                    className={`text-[9px] ${TYPE_COLORS[asset.type] ?? ""}`}
                  >
                    {asset.type}
                  </Badge>
                  <Button
                    size="icon"
                    variant="destructive"
                    className="h-6 w-6 min-h-[44px] min-w-[44px]"
                    onClick={(e) => { e.stopPropagation(); handleDelete(asset.id); }}
                    aria-label={`Delete ${asset.filename ?? "asset"}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!selectedAsset} onOpenChange={(open) => !open && setSelectedAsset(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="truncate">{selectedAssetData?.filename}</DialogTitle>
          </DialogHeader>
          {selectedAssetData && (
            <div className="space-y-4">
              {selectedAssetData.mimeType?.startsWith("image/") && (
                <div className="rounded-lg overflow-hidden bg-muted aspect-video flex items-center justify-center">
                  <img
                    src={selectedAssetData.url}
                    alt={selectedAssetData.filename}
                    className="max-h-64 max-w-full object-contain"
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-muted/50 rounded p-2">
                  <span className="text-muted-foreground text-xs">Type</span>
                  <p className="font-medium capitalize">{selectedAssetData.type}</p>
                </div>
                <div className="bg-muted/50 rounded p-2">
                  <span className="text-muted-foreground text-xs">Size</span>
                  <p className="font-medium">{formatBytes(selectedAssetData.fileSize)}</p>
                </div>
                {selectedAssetData.width && (
                  <div className="bg-muted/50 rounded p-2">
                    <span className="text-muted-foreground text-xs">Dimensions</span>
                    <p className="font-medium">{selectedAssetData.width} × {selectedAssetData.height}px</p>
                  </div>
                )}
                <div className="bg-muted/50 rounded p-2">
                  <span className="text-muted-foreground text-xs">Format</span>
                  <p className="font-medium font-mono text-xs">{selectedAssetData.mimeType}</p>
                </div>
              </div>
              {(selectedAssetData.tags?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedAssetData.tags?.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                  ))}
                </div>
              )}
              <div className="flex gap-2 flex-wrap">
                <Button asChild variant="outline" size="sm" className="flex-1 min-h-[44px]">
                  <a href={selectedAssetData.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                    Open
                  </a>
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="min-h-[44px]"
                  onClick={() => handleDelete(selectedAssetData.id)}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
