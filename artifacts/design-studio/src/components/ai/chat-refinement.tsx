import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Bot, User, Settings2, KeyRound, CheckCircle, XCircle } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";

interface DesignDiff {
  property: string;
  from: string;
  to: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  diffs?: DesignDiff[];
  diffAccepted?: boolean | null;
}

interface Props {
  projectId: number;
  canvasJson?: string;
}

function parseDiffs(content: string): DesignDiff[] {
  const diffs: DesignDiff[] = [];
  const lines = content.split("\n");
  for (const line of lines) {
    const match = line.match(/^[-•*]\s*\*?\*?([^:*]+)\*?\*?:\s*(.+?)\s*→\s*(.+)$/i);
    if (match) {
      diffs.push({ property: match[1]!.trim(), from: match[2]!.trim(), to: match[3]!.trim() });
    }
    const matchAlt = line.match(/^[-•*]\s*Change\s+(.+?)\s+from\s+"?(.+?)"?\s+to\s+"?(.+?)"?\s*\.?$/i);
    if (matchAlt) {
      diffs.push({ property: matchAlt[1]!.trim(), from: matchAlt[2]!.trim(), to: matchAlt[3]!.trim() });
    }
  }
  return diffs;
}

function buildStructuredPrompt(userPrompt: string): string {
  return `${userPrompt}

Please respond with specific design changes in this exact format:
- Property Name: current value → new value

For example:
- Saturation: 0% → +30%
- Primary color: #1B4FD8 → #E53E3E
- Blend mode: normal → multiply
- Typography weight: Regular → Bold

Then add a one-sentence explanation after the list.`;
}

export function ChatRefinement({ projectId: _projectId, canvasJson }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi! I'm your AI design assistant. Describe how you'd like to change your design — colors, style, mood, layout — and I'll suggest specific edits you can accept or reject one by one.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [providerCfg, setProviderCfg] = useState(loadProviderConfig);
  const [tempApiKey, setTempApiKey] = useState(providerCfg.apiKey ?? "");
  const [tempProvider, setTempProvider] = useState<"local" | "gemini-web2api" | "openrouter" | "openai" | "nous" | "groq">(providerCfg.provider);
  const [acceptedDiffs, setAcceptedDiffs] = useState<Set<string>>(new Set());
  const [rejectedDiffs, setRejectedDiffs] = useState<Set<string>>(new Set());
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
      const structuredPrompt = buildStructuredPrompt(text);
      const apiMessages = [
        ...messages.map(({ role, content }) => ({ role, content })),
        { role: "user" as const, content: structuredPrompt },
      ];

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          canvasContext: canvasJson,
          apiKey: cfg.apiKey,
          model: cfg.model ?? "openai/gpt-4o-mini",
        }),
      });
      const data = await res.json() as { content: string };
      const diffs = parseDiffs(data.content);
      setMessages((prev) => [...prev, { role: "assistant", content: data.content, diffs: diffs.length > 0 ? diffs : undefined }]);
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

  function acceptDiff(key: string) {
    setAcceptedDiffs((prev) => new Set([...prev, key]));
    setRejectedDiffs((prev) => { const s = new Set(prev); s.delete(key); return s; });
  }

  function rejectDiff(key: string) {
    setRejectedDiffs((prev) => new Set([...prev, key]));
    setAcceptedDiffs((prev) => { const s = new Set(prev); s.delete(key); return s; });
  }

  return (
    <div className="flex flex-col h-[480px]">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-muted-foreground">
          AI returns structured change suggestions — accept or reject each one
        </p>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setShowSettings(true)}>
          <Settings2 className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 mb-3">
        {messages.map((msg, i) => (
          <div key={i} className={cn("flex gap-2 items-start", msg.role === "user" ? "flex-row-reverse" : "flex-row")}>
            <div className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center shrink-0",
              msg.role === "user" ? "bg-primary" : "bg-muted border border-border",
            )}>
              {msg.role === "user"
                ? <User className="w-3.5 h-3.5 text-primary-foreground" />
                : <Bot className="w-3.5 h-3.5 text-muted-foreground" />
              }
            </div>
            <div className="flex-1 space-y-2">
              {/* Structured diffs — show as accept/reject cards */}
              {msg.role === "assistant" && msg.diffs && msg.diffs.length > 0 ? (
                <div className="space-y-1.5">
                  {msg.diffs.map((diff, di) => {
                    const key = `${i}-${di}`;
                    const accepted = acceptedDiffs.has(key);
                    const rejected = rejectedDiffs.has(key);
                    return (
                      <div
                        key={di}
                        className={cn(
                          "rounded-lg border px-3 py-2 text-xs space-y-1 transition-colors",
                          accepted ? "border-green-500/40 bg-green-500/5" : rejected ? "border-destructive/40 bg-destructive/5 opacity-60" : "border-border bg-muted",
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-foreground">{diff.property}</span>
                          {!accepted && !rejected && (
                            <div className="flex gap-1">
                              <button
                                onClick={() => acceptDiff(key)}
                                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-colors"
                              >
                                <CheckCircle className="w-2.5 h-2.5" />Apply
                              </button>
                              <button
                                onClick={() => rejectDiff(key)}
                                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                              >
                                <XCircle className="w-2.5 h-2.5" />Skip
                              </button>
                            </div>
                          )}
                          {accepted && <Badge className="text-[9px] h-4 bg-green-500/20 text-green-400 border-0">Applied</Badge>}
                          {rejected && <Badge className="text-[9px] h-4 bg-destructive/20 text-destructive border-0">Skipped</Badge>}
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <span className="line-through">{diff.from}</span>
                          <span>→</span>
                          <span className="text-foreground font-medium">{diff.to}</span>
                        </div>
                      </div>
                    );
                  })}
                  {/* Plain text portion (after diffs) */}
                  {(() => {
                    const plain = msg.content.split("\n").filter(l =>
                      !l.match(/^[-•*]\s/) && l.trim().length > 0
                    ).join(" ").trim();
                    return plain ? (
                      <p className="text-xs text-muted-foreground leading-relaxed mt-1">{plain}</p>
                    ) : null;
                  })()}
                </div>
              ) : (
                <div className={cn(
                  "max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed",
                  msg.role === "user" ? "bg-primary text-primary-foreground ml-auto" : "bg-muted text-foreground",
                )}>
                  {msg.content}
                </div>
              )}
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
                  <SelectItem value="gemini-web2api">Gemini (Free)</SelectItem>
                  <SelectItem value="openrouter">OpenRouter</SelectItem>
                  <SelectItem value="openai">OpenAI / compatible</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {tempProvider !== "local" && tempProvider !== "gemini-web2api" && (
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
