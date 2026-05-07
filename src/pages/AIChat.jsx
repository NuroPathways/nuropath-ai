import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useFirebaseUser } from "@/lib/useFirebaseUser";
import { Collections } from "@/lib/firestore";
import { Send, Brain, Sparkles, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";

const SUGGESTED = [
  "Give me a summary of my child's treatment plan",
  "Create a daily behavior schedule for today",
  "What happened in our last session?",
  "Help me plan homework time for this afternoon",
  "What are the main triggers I should watch for?",
  "Show me a morning routine based on the plan",
];

// ─── Build full context from all clinician data ──────────────────────────────

async function buildContext(childId, childName) {
  const [plans, documents, interventions, sessions, logs] = await Promise.all([
    Collections.BehaviorPlan.filter({ child_id: childId }).catch(() => []),
    Collections.Document.filter({ child_id: childId }).catch(() => []),
    Collections.InterventionPlan.filter({ child_id: childId }).catch(() => []),
    Collections.AIConversation.filter({ child_id: childId }).catch(() => []),
    Collections.BehaviorLog.filter({ child_id: childId }).catch(() => []),
  ]);

  let context = `== CHILD: ${childName} ==\n\n`;

  if (plans.length > 0) {
    context += `=== BEHAVIOR PLANS ===\n`;
    plans.forEach(p => {
      context += `\nPlan: ${p.behavior_name}\n`;
      if (p.behavior_description) context += `Description: ${p.behavior_description}\n`;
      if (p.behavior_function) context += `Function: ${p.behavior_function}\n`;
      if (p.common_triggers) context += `Triggers: ${p.common_triggers}\n`;
      if (p.strategy_title) context += `Strategy: ${p.strategy_title}\n`;
      if (p.strategy_steps) context += `Steps: ${p.strategy_steps}\n`;
      if (p.reinforcement_method) context += `Reinforcement: ${p.reinforcement_method}\n`;
      if (p.deescalation_steps) context += `De-escalation: ${p.deescalation_steps}\n`;
      if (p.avoid_actions) context += `Avoid: ${p.avoid_actions}\n`;
    });
    context += `\n`;
  }

  if (interventions.length > 0) {
    context += `=== INTERVENTION PLANS ===\n`;
    interventions.forEach(plan => {
      context += `\nIntervention: ${plan.title} (${plan.behavior_category?.replace(/_/g, " ")})\n`;
      if (plan.description) context += `Overview: ${plan.description}\n`;
      if (plan.immediate_steps) context += `Immediate Steps: ${plan.immediate_steps}\n`;
      if (plan.deescalation_steps) context += `De-escalation: ${plan.deescalation_steps}\n`;
      if (plan.reinforcement_steps) context += `Reinforcement: ${plan.reinforcement_steps}\n`;
      if (plan.prevention_tips) context += `Prevention: ${plan.prevention_tips}\n`;
      if (plan.things_to_avoid) context += `Avoid: ${plan.things_to_avoid}\n`;
    });
    context += `\n`;
  }

  if (documents.length > 0) {
    context += `=== UPLOADED DOCUMENTS ===\n`;
    documents.forEach(doc => {
      const uploadDate = doc.created_date ? new Date(doc.created_date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "Unknown date";
      context += `\nDocument: "${doc.title}" (${doc.category?.replace(/_/g, " ")}) — uploaded ${uploadDate}\n`;
      if (doc.notes) context += `Content/Notes: ${doc.notes}\n`;
      if (doc.file_name) context += `File: ${doc.file_name}\n`;
    });
    context += `\n`;
  }

  if (sessions.length > 0) {
    context += `=== SESSION HISTORY (AI Conversations / Logs) ===\n`;
    const sorted = [...sessions].sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, 20);
    sorted.forEach(s => {
      const sessionDate = s.created_date ? new Date(s.created_date).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }) : "Unknown date";
      context += `\nDate: ${sessionDate}\nQuestion: ${s.question}\nResponse Summary: ${s.ai_response?.slice(0, 300)}...\n`;
    });
    context += `\n`;
  }

  if (logs.length > 0) {
    context += `=== BEHAVIOR LOG HISTORY ===\n`;
    const recentLogs = [...logs].sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, 30);
    recentLogs.forEach(log => {
      const logDate = log.created_date ? new Date(log.created_date).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }) : "Unknown";
      context += `${logDate}: ${log.behavior_type || "Behavior"} (${log.intensity || "?"} intensity)`;
      if (log.context) context += ` — Context: ${log.context}`;
      if (log.possible_function) context += ` — Function: ${log.possible_function}`;
      if (log.parent_feedback) context += ` — Strategy worked: ${log.parent_feedback}`;
      context += `\n`;
    });
    context += `\n`;
  }

  return { context, hasPlans: plans.length + interventions.length > 0, hasDocuments: documents.length > 0 };
}

// ─── Intelligent Response Engine ─────────────────────────────────────────────

async function generateResponse(userMessage, child, clinicianContext, conversationHistory) {
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const historyText = conversationHistory.slice(-8).map(m => `${m.role === "user" ? "Parent" : "Aspire AI"}: ${m.content}`).join("\n\n");

  const systemPrompt = `You are Aspire AI — an intelligent, warm, and highly capable behavioral support assistant for parents and caregivers. You have been provided with all of the clinician's documented plans, uploaded documents, session history, and behavior logs for this child. You are NOT a generic chatbot. You respond with precision, warmth, and specificity based on the actual data provided.

TODAY'S DATE: ${today}
CHILD: ${child?.child_name || "Unknown"}, Age: ${child?.age || "N/A"}, Diagnosis: ${child?.diagnosis || "N/A"}

=== ALL CLINICIAN DATA & CONTEXT ===
${clinicianContext.context || "No data loaded yet."}
=== END CONTEXT ===

=== RECENT CONVERSATION ===
${historyText || "No prior messages."}
=== END CONVERSATION ===

YOUR CAPABILITIES — respond to ANY of these intelligently:
1. **Document summaries** — If asked about a document, treatment plan, or overview, provide a clear, organized summary of the actual content from the data above.
2. **Daily schedules** — If asked for a schedule or routine, create a realistic, time-blocked daily plan based on the actual intervention plans, behavior strategies, and the child's needs. Include specific times (morning, school, afternoon, evening).
3. **Homework & task planning** — Help plan specific tasks, break them into manageable steps using strategies from the plan.
4. **Specific date queries** — If asked about a specific session or date, search the session history and logs above and report what actually happened. Be specific.
5. **Behavior guidance** — Give real-time, step-by-step guidance based on the clinician-approved strategies in the data.
6. **Progress summaries** — Analyze behavior log patterns, identify trends, highlight improvements or concerns.
7. **Prevention & triggers** — Identify known triggers from the plans and give proactive tips.
8. **Anything the parent needs** — Be flexible and genuinely helpful. If they ask something outside clinical scope, you can briefly help and gently note if clinical guidance would be better.

RESPONSE STYLE:
- Warm, clear, specific — never generic
- Use the actual child's name
- Reference specific content from the clinician data when relevant (quote strategies, steps, dates)
- Use markdown for structure (bold, bullet points, numbered steps) — but keep it conversational
- Vary your responses naturally — do NOT follow a fixed template every time
- If no clinician data exists, be honest and suggest they ask their clinician, but still be as helpful as possible
- For schedules, use time-blocked format (e.g., 7:00 AM — Morning routine...)
- For summaries, use clear sections with headers
- For date queries, be specific: "Based on the log from [date]..."`;

  const response = await base44.integrations.Core.InvokeLLM({
    model: "claude_sonnet_4_6",
    prompt: `${systemPrompt}\n\nParent's message: "${userMessage}"\n\nRespond directly and helpfully:`
  });

  return response;
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function AIChat() {
  const { user } = useFirebaseUser();
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState("");
  const [clinicianContext, setClinicianContext] = useState({ context: "", hasPlans: false, hasDocuments: false });
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingContext, setLoadingContext] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [byId, byEmail] = await Promise.all([
        Collections.Child.filter({ parent_id: user.id }).catch(() => []),
        Collections.Child.filter({ parent_email: user.email }).catch(() => []),
      ]);
      const seen = new Set();
      const merged = [...byId, ...byEmail].filter(c => { if (seen.has(c.id)) return false; seen.add(c.id); return true; });
      setChildren(merged);
      if (merged.length > 0) setSelectedChildId(merged[0].id);
    };
    load();
  }, [user?.id]);

  useEffect(() => {
    if (!selectedChildId) return;
    const child = children.find(c => c.id === selectedChildId);
    setLoadingContext(true);
    buildContext(selectedChildId, child?.child_name || "").then(ctx => {
      setClinicianContext(ctx);
      setLoadingContext(false);
    });
  }, [selectedChildId, children]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg || isLoading) return;
    setInput("");

    const userMsg = { role: "user", content: msg };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    const child = children.find(c => c.id === selectedChildId);
    const updatedHistory = [...messages, userMsg];

    const response = await generateResponse(msg, child, clinicianContext, updatedHistory);

    setMessages(prev => [...prev, { role: "assistant", content: response }]);
    setIsLoading(false);

    // Log conversation
    if (user && selectedChildId) {
      Collections.AIConversation.create({
        parent_id: user.id,
        child_id: selectedChildId,
        child_name: child?.child_name || "",
        question: msg,
        ai_response: response
      }).catch(() => {});
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen font-inter">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-card flex-shrink-0">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <Brain className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">Aspire AI</p>
              <p className="text-xs text-muted-foreground">
                {loadingContext ? "Loading your data..." : clinicianContext.hasPlans || clinicianContext.hasDocuments ? "Clinician data loaded ✓" : "Connected"}
              </p>
            </div>
          </div>
          {children.length > 0 && (
            <Select value={selectedChildId} onValueChange={setSelectedChildId}>
              <SelectTrigger className="w-36 h-8 text-xs rounded-lg border-border">
                <SelectValue placeholder="Select child" />
              </SelectTrigger>
              <SelectContent>
                {children.map(c => <SelectItem key={c.id} value={c.id}>{c.child_name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-5">
          {messages.length === 0 && !isLoading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-8">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h2 className="font-semibold text-foreground mb-1">How can I help today?</h2>
              <p className="text-sm text-muted-foreground mb-6">
                I can summarize your child's treatment plan, build daily schedules, answer questions about specific sessions, help with homework planning, and more.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SUGGESTED.map(s => (
                  <button key={s} onClick={() => sendMessage(s)}
                    className="text-left px-4 py-3 rounded-xl bg-card border border-border hover:border-primary/50 hover:bg-muted/50 text-sm text-foreground transition-all">
                    {s}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          <AnimatePresence>
            {messages.map((m, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "assistant" && (
                  <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Brain className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-sm"
                    : "bg-card border border-border rounded-tl-sm text-foreground"
                }`}>
                  {m.role === "user" ? (
                    <p>{m.content}</p>
                  ) : (
                    <ReactMarkdown
                      className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-strong:font-semibold prose-headings:font-semibold prose-headings:text-foreground"
                      components={{
                        p: ({ children }) => <p className="my-1 leading-relaxed text-foreground">{children}</p>,
                        strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                        ul: ({ children }) => <ul className="my-1.5 ml-4 list-disc space-y-0.5">{children}</ul>,
                        ol: ({ children }) => <ol className="my-1.5 ml-4 list-decimal space-y-0.5">{children}</ol>,
                        li: ({ children }) => <li className="text-foreground">{children}</li>,
                        h1: ({ children }) => <h1 className="text-base font-semibold text-foreground mt-3 mb-1">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-sm font-semibold text-foreground mt-3 mb-1">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-sm font-medium text-foreground mt-2 mb-1">{children}</h3>,
                        blockquote: ({ children }) => <blockquote className="border-l-2 border-primary/40 pl-3 my-2 text-muted-foreground italic">{children}</blockquote>,
                        code: ({ children }) => <code className="bg-muted px-1 py-0.5 rounded text-xs">{children}</code>,
                        hr: () => <hr className="my-3 border-border" />,
                      }}
                    >
                      {m.content}
                    </ReactMarkdown>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isLoading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
              <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                <Brain className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <motion.div key={i} className="w-2 h-2 rounded-full bg-primary/60"
                      animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }} />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">Thinking...</span>
              </div>
            </motion.div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-border bg-card px-4 py-4">
        <div className="max-w-2xl mx-auto flex gap-3 items-end">
          <Textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything — schedules, document summaries, session history, behavior help..."
            rows={1}
            disabled={isLoading}
            className="flex-1 resize-none rounded-xl border-border text-sm max-h-32 min-h-[44px]"
          />
          <Button
            onClick={() => sendMessage()}
            disabled={isLoading || !input.trim()}
            className="h-11 w-11 p-0 rounded-xl bg-primary hover:bg-primary/90 flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-2 max-w-2xl mx-auto">
          Aspire AI reads all your clinician's documents, plans, and session history to give you personalized answers.
        </p>
      </div>
    </div>
  );
}