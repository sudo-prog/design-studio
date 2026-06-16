import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Bot, User, Settings2, KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { loadProviderConfig, saveProviderConfig } from "@/lib/ai-adapters";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  projectId: number;
  canvasJson?: string;
}

export function ChatRefinement({ projectId: _projectId, canvasJson }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi! I'm your AI design assistant. Describe how you'd like to change your design — colors, style, mood, layout — and I'll suggest specific edits.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [providerCfg, setProviderCfg] = useState(loadProviderConfig);
  const [tempApiKey, setTempApiKey] = useState(providerCfg.apiKey ?? "");
  const [tempProvider, setTempProvider] = useState<"local" | "openrouter" | "openai">(providerCfg.provider);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || isSending) return;
    setInput("");

    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setIsSending(true);

    try {
      const cfg = loadProviderConfig();
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(({ role, content }) => ({ role, content })),
          canvasContext: canvasJson,
          apiKey: cfg.apiKey,
          model: cfg.model ?? "openai/gpt-4o-mini",
        }),
      });
      const data = await res.json() as { content: string };
      setMessages((prev) => [...prev, { role: "assistant", content: data.content }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I had trouble responding. Please try again." }]);
    } finally {
      setIsSending(false);
    }
  }

  function saveSettings() {
    const cfg = { ...providerCfg, provider: tempProvider, apiKey: tempApiKey || undefined };
    saveProviderConfig(cfg);
    setProviderCfg(cfg);
    setShowSettings(false);
  }

  return (
    <div className="flex flex-col h-[420px]">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-muted-foreground">
          Type instructions to refine your design
        </p>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setShowSettings(true)}>
          <Settings2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 mb-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              "flex gap-2 items-start text-sm",
              msg.role === "user" ? "flex-row-reverse" : "flex-row",
            )}
          >
            <div className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center shrink-0",
              msg.role === "user" ? "bg-primary" : "bg-muted border border-border",
            )}>
              {msg.role === "user"
                ? <User className="w-3.5 h-3.5 text-primary-foreground" />
                : <Bot className="w-3.5 h-3.5 text-muted-foreground" />
              }
            </div>
            <div className={cn(
              "max-w-[80%] rounded-lg px-3 py-2 text-xs leading-relaxed",
              msg.role === "user"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground",
            )}>
              {msg.content}
            </div>
          </div>
        ))}
        {isSending && (
          <div className="flex gap-2 items-center">
            <div className="w-6 h-6 rounded-full bg-muted border border-border flex items-center justify-center">
              <Bot className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <div className="bg-muted rounded-lg px-3 py-2 text-xs">
              <span className="animate-pulse">Thinking…</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <Input
          placeholder="e.g. make it more grungy, shift to earth tones…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          className="text-xs h-8"
        />
        <Button size="icon" className="h-8 w-8 shrink-0" onClick={handleSend} disabled={isSending}>
          <Send className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Settings dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <KeyRound className="w-4 h-4" />
              AI Provider Settings
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Connect your own API key for live AI responses. Without a key, the assistant uses built-in design suggestions.
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs">Provider</Label>
              <Select value={tempProvider} onValueChange={(v) => setTempProvider(v as typeof tempProvider)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="local">Built-in (no key needed)</SelectItem>
                  <SelectItem value="openrouter">OpenRouter</SelectItem>
                  <SelectItem value="openai">OpenAI / compatible</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {tempProvider !== "local" && (
              <div className="space-y-1.5">
                <Label className="text-xs">API Key</Label>
                <Input
                  type="password"
                  placeholder="sk-…"
                  value={tempApiKey}
                  onChange={(e) => setTempApiKey(e.target.value)}
                  className="text-xs h-8 font-mono"
                />
              </div>
            )}
            <div className="flex gap-2">
              <Button size="sm" className="flex-1" onClick={saveSettings}>Save</Button>
              <Button size="sm" variant="outline" className="flex-1" onClick={() => setShowSettings(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
