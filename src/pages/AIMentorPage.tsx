import { useEffect, useRef, useState } from 'react';
import { ChatAPI } from '@/services/api';
import type { ChatMessage } from '@/types';
import { Button }    from '@/components/ui/button';
import { Textarea }  from '@/components/ui/textarea';
import { Bot, Send, Trash2, User, Loader2, MessageSquare, Sparkles } from 'lucide-react';
import { toast }     from 'sonner';
import { cn }        from '@/lib/utils';

const SUGGESTED_PROMPTS = [
  'How can I improve my attendance in weak subjects?',
  'What study strategies help for Internal Assessments?',
  'How to calculate my predicted marks and improve them?',
  'Create a 2-week study plan focused on my weak subjects.',
];

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 mb-3">
      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
        style={{ background: 'linear-gradient(135deg, hsl(258 78% 60%), hsl(258 78% 42%))' }}>
        <Bot className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-card border border-border">
        <div className="flex gap-1 items-center h-4">
          {[0, 1, 2].map((i) => (
            <span key={i} className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AIMentorPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [histLoad, setHistLoad] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ChatAPI.getHistory()
      .then((d) => setMessages(d.history))
      .catch(() => {})
      .finally(() => setHistLoad(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (text: string) => {
    const msg = text.trim();
    if (!msg || loading) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', message: msg }]);
    setLoading(true);
    try {
      const res = await ChatAPI.send(msg);
      setMessages((prev) => [...prev, { role: 'model', message: res.reply }]);
    } catch {
      toast.error('Failed to get a response. Please try again.');
      setMessages((prev) => prev.filter((m) => !(m.role === 'user' && m.message === msg)));
    } finally {
      setLoading(false);
    }
  };

  const clear = async () => {
    await ChatAPI.clearHistory().catch(() => {});
    setMessages([]);
    toast.success('Conversation cleared.');
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] max-h-[820px] animate-fade-up">

      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, hsl(258 78% 60%), hsl(258 78% 42%))' }}>
            <Bot className="w-6 h-6 text-white" />
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-success border-2 border-background" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-bold text-foreground flex items-center gap-1.5 text-balance">
              AI Mentor
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center gap-0.5">
                <Sparkles className="w-2.5 h-2.5" />Gemini
              </span>
            </h1>
            <p className="text-xs text-muted-foreground">Your personal academic assistant — ask anything!</p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button onClick={clear} variant="ghost" size="sm"
            className="border border-border text-muted-foreground hover:text-foreground shrink-0 text-xs h-8">
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />Clear
          </Button>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 min-h-0 overflow-y-auto mb-3 pr-1">

        {/* Empty state */}
        {!histLoad && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-5 py-8 animate-fade-up">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, hsl(258 78% 60%), hsl(258 78% 42%))' }}>
              <MessageSquare className="w-8 h-8 text-white" />
            </div>
            <div>
              <p className="text-base font-bold text-foreground text-balance">Chat with your AI Mentor</p>
              <p className="text-sm text-muted-foreground mt-1 text-pretty max-w-xs">
                Ask about your attendance, marks, study plans, or any academic concern.
              </p>
            </div>
            {/* Suggested prompts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full max-w-lg">
              {SUGGESTED_PROMPTS.map((p) => (
                <button key={p} onClick={() => send(p)}
                  className="text-left px-3 py-2.5 rounded-xl border border-border bg-card hover:bg-secondary/60 text-xs text-muted-foreground hover:text-foreground transition-colors text-pretty shadow-[var(--shadow-card)]">
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message bubbles */}
        <div className="space-y-1">
          {messages.map((m, i) => (
            <div key={i} className={cn('flex items-end gap-2 mb-3', m.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
              {/* Avatar */}
              <div className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center shrink-0',
                m.role === 'user'
                  ? 'bg-secondary border border-border'
                  : ''
              )} style={m.role === 'model' ? { background: 'linear-gradient(135deg, hsl(258 78% 60%), hsl(258 78% 42%))' } : {}}>
                {m.role === 'user'
                  ? <User className="w-3.5 h-3.5 text-muted-foreground" />
                  : <Bot className="w-3.5 h-3.5 text-white" />}
              </div>

              {/* Bubble */}
              <div className={cn(
                'max-w-[78%] px-4 py-3 rounded-2xl text-sm text-pretty leading-relaxed',
                m.role === 'user'
                  ? 'text-primary-foreground rounded-br-sm'
                  : 'bg-card border border-border text-foreground rounded-bl-sm shadow-[var(--shadow-card)]',
              )} style={m.role === 'user' ? { background: 'linear-gradient(135deg, hsl(258 78% 58%), hsl(258 78% 48%))' } : {}}>
                {m.role === 'user'
                  ? m.message.split('\n').map((line, j) =>
                      line ? <p key={j} className="mb-0.5 last:mb-0">{line}</p> : <br key={j} />
                    )
                  : m.message.split('\n').map((line, j) => {
                      if (!line) return <br key={j} />;
                      const parts = line.split(/(\*\*[^*]+\*\*)/g);
                      return (
                        <p key={j} className="mb-1 last:mb-0">
                          {parts.map((part, k) =>
                            part.startsWith('**') && part.endsWith('**')
                              ? <strong key={k} className="font-semibold text-primary">{part.slice(2, -2)}</strong>
                              : part
                          )}
                        </p>
                      );
                    })
                }
              </div>
            </div>
          ))}
          {loading && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input bar */}
      <div className="shrink-0 flex items-end gap-2 p-3 rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Ask anything… attendance, marks, study tips (Enter to send)"
          rows={2}
          disabled={loading}
          className="flex-1 min-w-0 resize-none border-0 bg-transparent focus-visible:ring-0 text-sm px-2 py-1 placeholder:text-muted-foreground/60"
        />
        <Button
          onClick={() => send(input)}
          disabled={loading || !input.trim()}
          size="icon"
          className="shrink-0 h-9 w-9 rounded-xl text-primary-foreground"
          style={{ background: 'linear-gradient(135deg, hsl(258 78% 58%), hsl(258 78% 48%))' }}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}
