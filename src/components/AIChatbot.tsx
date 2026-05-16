import { useEffect, useRef, useState, KeyboardEvent } from "react";
import { Pill, X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Message = { role: "user" | "model"; content: string };

const SYSTEM_PROMPT =
  "You are MediTrack AI, a helpful pharmacy assistant. You only answer medicine related questions such as: medicine usage, dosage, side effects, drug interactions, storage instructions, and general health queries. If asked anything unrelated to medicine or pharmacy, politely say you can only help with medicine related questions. Always recommend consulting a doctor for serious medical advice. Keep answers short, clear and simple.";

const SUGGESTIONS = [
  "What is Paracetamol used for?",
  "Side effects of Ibuprofen?",
  "How to store insulin?",
  "What is safe dosage of Vitamin C?",
];

export function AIChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    if (!apiKey) {
      setMessages((m) => [...m, { role: "user", content: trimmed }, { role: "model", content: "Gemini API key not configured." }]);
      return;
    }

    const newUserMsg: Message = { role: "user", content: trimmed };
    const history = [...messages, newUserMsg];
    setMessages(history);
    setInput("");
    setLoading(true);

    try {
      const userMessage = `${SYSTEM_PROMPT}\n\nUser: ${trimmed}`;
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ 
              role: "user", 
              parts: [{ text: userMessage }] 
            }],
            systemInstruction: {
              parts: [{ 
                text: "You are MediTrack AI, a helpful pharmacy assistant. Only answer medicine related questions such as medicine usage, dosage, side effects, drug interactions, storage instructions, and general health queries. If asked anything unrelated to medicine, politely say you can only help with medicine related questions. Always recommend consulting a doctor for serious medical advice. Keep answers short, clear and simple." 
              }]
            }
          })
        }
      );

      if (response.status === 429) {
        setMessages((m) => [...m, { role: "model", content: "I'm receiving too many requests right now. Please wait 10 seconds and try again. ⏳" }]);
        return;
      }

      const data = await response.json();

      if (response.status === 200 && (!data.candidates || data.candidates.length === 0)) {
        setMessages((m) => [...m, { role: "model", content: "Sorry, no response received. Please try again." }]);
        return;
      }

      const reply = data.candidates[0].content.parts[0].text;
      setMessages((m) => [...m, { role: "model", content: reply }]);
    } catch (e: any) {
      console.error(e);
      setMessages((m) => [...m, { role: "model", content: e?.message ? `Error: ${e.message}` : "Sorry, something went wrong. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open MediTrack AI Assistant"
          className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 hover:scale-105 transition flex items-center justify-center"
        >
          <Pill className="h-6 w-6" />
        </button>
      )}

      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[92vw] max-w-sm h-[600px] max-h-[85vh] rounded-2xl bg-background border shadow-2xl flex flex-col overflow-hidden">
          <div className="flex items-start justify-between p-4 bg-blue-600 text-white">
            <div>
              <div className="font-semibold">MediTrack AI Assistant 🤖</div>
              <div className="text-xs opacity-90">Ask anything about medicines</div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close" className="hover:bg-white/20 rounded p-1">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/30">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Try asking:</p>
                <div className="flex flex-col gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => sendMessage(s)}
                      className="text-left text-sm px-3 py-2 rounded-lg border bg-background hover:bg-accent transition"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap",
                    m.role === "user" ? "bg-blue-600 text-white rounded-br-sm" : "bg-gray-200 text-gray-900 rounded-bl-sm"
                  )}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-200 text-gray-700 rounded-2xl rounded-bl-sm px-3 py-2 text-sm flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  AI is thinking...
                </div>
              </div>
            )}
          </div>

          <div className="p-3 border-t bg-background flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Type your question..."
              disabled={loading}
            />
            <Button onClick={() => sendMessage(input)} disabled={loading || !input.trim()} size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
