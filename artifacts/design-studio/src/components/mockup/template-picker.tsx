import { useState } from "react";
import { useListMockupTemplates } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CheckCircle, Search } from "lucide-react";
import type { MockupTemplate } from "@workspace/api-client-react";

const CATEGORY_LABELS: Record<string, string> = {
  all: "All",
  tops: "Tops",
  accessories: "Accessories",
  bottoms: "Bottoms",
  outerwear: "Outerwear",
  flat: "Flat Goods",
};

interface Props {
  selected: MockupTemplate | null;
  onSelect(template: MockupTemplate): void;
  category?: string;
}

export function TemplatePicker({ selected, onSelect }: Props) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const { data: templates = [], isLoading } = useListMockupTemplates(
    category !== "all" ? { category } : undefined,
  );

  const filtered = templates.filter(
    (t) =>
      search === "" ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.tags ?? []).some((tag) => tag.includes(search.toLowerCase())),
  );

  const categories = ["all", ...Array.from(new Set(templates.map((t) => t.category)))];

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          placeholder="Search templates…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-h-[44px] pl-8 text-xs"
        />
      </div>

      <div className="flex flex-wrap gap-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={cn(
              "min-h-[44px] min-w-[44px] text-[10px] px-2 py-0.5 rounded-full border transition-colors capitalize",
              category === cat
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border hover:border-foreground/50",
            )}
          >
            {CATEGORY_LABELS[cat] ?? cat}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
          {filtered.map((t) => (
            <button
              key={t.id}
              onClick={() => onSelect(t)}
              className={cn(
                "relative aspect-square rounded-lg overflow-hidden border-2 transition-all group",
                selected?.id === t.id
                  ? "border-primary ring-2 ring-primary/30"
                  : "border-transparent hover:border-border",
              )}
            >
              <img src={t.thumbnailUrl} alt={t.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1">
                <p className="text-[9px] text-white leading-tight line-clamp-2">{t.name}</p>
              </div>
              {selected?.id === t.id && (
                <div className="absolute top-1 right-1">
                  <CheckCircle className="w-4 h-4 text-white drop-shadow" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 && !isLoading && (
        <p className="text-xs text-muted-foreground text-center py-4">No templates found</p>
      )}
    </div>
  );
}
