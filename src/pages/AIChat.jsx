import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Send, Brain, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import ChatMessage from "../components/chat/ChatMessage";

const SUGGESTED = [
  "My child is refusing to do homework",
  "How do I handle a meltdown in public?",
  "My child is hitting when frustrated",
  "What do I do when they won't calm down?",
];

export default function AIChat() {
  const [user, setUser] = useState(null);
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState("");
  const [plans, setPlans] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const bottomRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      const me = await base44.auth.me();
      setUser(me);
      const kids = await base44.entities.Child.list();
      setChildren(kids);
      if (kids.length > 0) setSelectedChildId(kids[0].id);
    };
    load();
  }, []);

  useEffect(() => {
    if (selectedChildId) {
      base44.entities.BehaviorPlan.filter({ child_id: selectedChildId }).then(setPlans);
    }
  }, [selectedChildId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const buildContext = () => {
    const plan = plans[0];
    if (!plan) return "No behavior plan is available for this child yet.";
    return `
Behavior: ${plan.behavior_name}
Description: ${plan.behavior_description || "N/A"}
Function: ${plan.behavior_function || "N/A"}
Triggers: ${plan.common_triggers || plan.common_triggers || "N/A"}
Strategy: ${plan.strategy_steps || "N/A"}
When to use: ${plan.when_to_use || "N/A"}
Reinforcement: ${plan.reinforcement_method || "N/A"}
Escalation signs: ${plan.escalation_signs || "N/A"}
De-escalation: ${plan.deescalation_steps || "N/A"}
Avoid: ${plan.avoid_actions || "N/A"}
Safe space: ${plan.safe_space_method || "N/A"}
    `.trim();
  };

  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg) return;
    setInput("");

    const userMessage = { role: "user", content: msg };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    const child = children.find((c) => c.id === selectedChildId);
    const context = buildContext();

    const prompt = `You are Aspire AI, a compassionate behavior support assistant. You help parents respond to their child's difficult behaviors using the child's personalized behavior plan.

Child: ${child?.child_name || "Unknown"}, Age: ${child?.age || "N/A"}, Diagnosis: ${child?.diagnosis || "N/A"}

Behavior Plan Context:
${context}

Parent's question: "${msg}"

Provide warm, practical, step-by-step guidance. Be specific. Keep response clear and actionable. Use the behavior plan context to personalize your answer. If the parent seems stressed, acknowledge their feelings first.`;

    const response = await base44.integrations.Core.InvokeLLM({ prompt });

    const aiMessage = { role: "assistant", content: response };
    const newHistory = [...history, userMessage, aiMessage];
    setMessages((prev) => [...prev, aiMessage]);
    setHistory(newHistory);
    setLoading(false);

    // Save conversation
    if (user) {
      base44.entities.AIConversation.create({
        parent_id: user.id,
        child_id: selectedChildId,
        child_name: child?.child_name || "",
        question: msg,
        ai_response: response,
      });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen md:h-[calc(100vh)] font-inter">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-card flex-shrink-0">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <Brain className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">Aspire AI</p>
              <p className="text-xs text-muted-foreground">Behavior support assistant</p>
            </div>
          </div>
          {children.length > 0 && (
            <Select value={selectedChildId} onValueChange={setSelectedChildId}>
              <SelectTrigger className="w-36 h-8 text-xs rounded-lg border-border">
                <SelectValue placeholder="Select child" />
              </SelectTrigger>
              <SelectContent>
                {children.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.child_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-4">
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-8"
            >
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h2 className="font-semibold text-foreground mb-1">How can I help?</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Ask me about any behavior your child is having right now.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SUGGESTED.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="text-left px-4 py-3 rounded-xl bg-card border border-border hover:border-primary/50 hover:bg-muted/50 text-sm text-foreground transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          <AnimatePresence>
            {messages.map((m, i) => (
              <ChatMessage key={i} message={m} />
            ))}
          </AnimatePresence>

          {loading && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                <Brain className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1.5 items-center h-5">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-muted-foreground"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-border bg-card px-4 py-4">
        <div className="max-w-2xl mx-auto flex gap-3 items-end">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe what's happening with your child..."
            rows={1}
            className="flex-1 resize-none rounded-xl border-border text-sm max-h-32 min-h-[44px]"
          />
          <Button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            className="h-11 w-11 p-0 rounded-xl bg-primary hover:bg-primary/90 flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-2 max-w-2xl mx-auto">
          Aspire AI uses your child's behavior plan to provide personalized guidance.
        </p>
      </div>
    </div>
  );
}