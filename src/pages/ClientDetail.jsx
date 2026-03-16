import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, FileText, Plus, Brain, Send, Sparkles, Upload, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";

export default function ClientDetail() {
  const [child, setChild] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [expandedPlan, setExpandedPlan] = useState(null);
  const bottomRef = useRef(null);
  const navigate = useNavigate();

  const childId = new URLSearchParams(window.location.search).get("child_id");

  useEffect(() => {
    if (!childId) { navigate("/ClinicianDashboard"); return; }
    const load = async () => {
      const kids = await base44.entities.Child.filter({ id: childId });
      const kid = kids[0];
      setChild(kid);
      const ps = await base44.entities.BehaviorPlan.filter({ child_id: childId });
      setPlans(ps);
      setLoading(false);
    };
    load();
  }, [childId, navigate]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  const buildPlanContext = () => {
    if (plans.length === 0) return "No behavior plans on file for this client.";
    return plans.map((p) => `
=== BEHAVIOR PLAN: ${p.behavior_name} ===
Severity: ${p.severity_level || "N/A"}
Description: ${p.behavior_description || "N/A"}
Function: ${p.behavior_function || "N/A"}
Triggers: ${p.common_triggers || "N/A"}
Strategy: ${p.strategy_title || "N/A"}
Steps: ${p.strategy_steps || "N/A"}
When To Use: ${p.when_to_use || "N/A"}
Reinforcement: ${p.reinforcement_method || "N/A"}
Escalation Signs: ${p.escalation_signs || "N/A"}
De-escalation: ${p.deescalation_steps || "N/A"}
Avoid: ${p.avoid_actions || "N/A"}
Safe Space: ${p.safe_space_method || "N/A"}
`.trim()).join("\n\n---\n\n");
  };

  const sendMessage = async (text) => {
    const msg = (text || input).trim();
    if (!msg || thinking) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: msg }]);
    setThinking(true);

    const response = await base44.integrations.Core.InvokeLLM({
      prompt: `You are Aspire AI, a clinical behavioral support assistant speaking directly to a clinician.

You have full access to the behavior plans for this client. Answer clinical questions accurately and in detail. You can discuss plan contents, suggest modifications, analyze behavior patterns, or explain clinical strategies.

CLIENT: ${child?.child_name}, Age: ${child?.age}, Diagnosis: ${child?.diagnosis || "N/A"}

BEHAVIOR PLANS ON FILE:
${buildPlanContext()}

CLINICIAN'S QUESTION: ${msg}

Respond as a knowledgeable clinical colleague. Be specific, reference the plan details directly, and be practical.`,
    });

    setThinking(false);
    setMessages((prev) => [...prev, { role: "assistant", content: response }]);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="flex flex-col h-screen font-inter">
      {/* Header */}
      <div className="flex-shrink-0 bg-card border-b border-border px-6 py-4">
        <div className="max-w-5xl mx-auto">
          <button onClick={() => navigate("/ClinicianDashboard")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-3">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-bold">{child?.child_name?.[0]}</span>
              </div>
              <div>
                <h1 className="font-semibold text-foreground">{child?.child_name}</h1>
                <p className="text-xs text-muted-foreground">Age {child?.age} {child?.diagnosis ? `· ${child.diagnosis}` : ""}</p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => navigate(`/UploadBehaviorPlan?child_id=${childId}`)}>
              <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload Plan
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex max-w-5xl w-full mx-auto">
        {/* Left: Behavior Plans */}
        <div className="w-72 flex-shrink-0 border-r border-border overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <FileText className="w-4 h-4" /> Behavior Plans ({plans.length})
            </h2>
            <button
              onClick={() => navigate(`/BehaviorPlanBuilder?child_id=${childId}`)}
              className="text-primary hover:text-primary/80"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {plans.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No plans yet</p>
              <Button size="sm" variant="outline" className="mt-3 text-xs" onClick={() => navigate(`/UploadBehaviorPlan?child_id=${childId}`)}>
                Upload a Plan
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {plans.map((plan) => (
                <div key={plan.id} className="bg-background border border-border rounded-xl overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between p-3 text-left"
                    onClick={() => setExpandedPlan(expandedPlan === plan.id ? null : plan.id)}
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="text-sm font-medium text-foreground truncate">{plan.behavior_name}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full inline-block mt-1 ${
                        plan.severity_level === "high" || plan.severity_level === "crisis" ? "bg-red-100 text-red-700" :
                        plan.severity_level === "moderate" ? "bg-yellow-100 text-yellow-700" :
                        "bg-green-100 text-green-700"
                      }`}>{plan.severity_level || "moderate"}</span>
                    </div>
                    {expandedPlan === plan.id ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                  </button>
                  {expandedPlan === plan.id && (
                    <div className="px-3 pb-3 text-xs text-muted-foreground space-y-1.5 border-t border-border pt-2">
                      {plan.behavior_description && <p><strong className="text-foreground">Description:</strong> {plan.behavior_description.slice(0, 120)}{plan.behavior_description.length > 120 ? "..." : ""}</p>}
                      {plan.strategy_title && <p><strong className="text-foreground">Strategy:</strong> {plan.strategy_title}</p>}
                      {plan.common_triggers && <p><strong className="text-foreground">Triggers:</strong> {plan.common_triggers.slice(0, 100)}</p>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: AI Chat */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {messages.length === 0 && !thinking && (
              <div className="text-center py-12">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Brain className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">Clinical AI Assistant</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
                  Ask about {child?.child_name}'s behavior plans, discuss strategies, or get clinical insights.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg mx-auto">
                  {[
                    `Summarize ${child?.child_name}'s behavior plans`,
                    "What strategies are recommended for escalation?",
                    "What triggers should parents watch for?",
                    "How should reinforcement be applied?",
                  ].map((s) => (
                    <button key={s} onClick={() => sendMessage(s)}
                      className="text-left px-4 py-3 rounded-xl bg-card border border-border hover:border-primary/50 text-sm text-foreground transition-all">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <AnimatePresence>
                {messages.map((m, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    {m.role === "assistant" && (
                      <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Brain className="w-4 h-4 text-primary-foreground" />
                      </div>
                    )}
                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                        : "bg-card border border-border rounded-tl-sm"
                    }`}>
                      {m.role === "assistant" ? (
                        <ReactMarkdown className="prose prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                          {m.content}
                        </ReactMarkdown>
                      ) : m.content}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {thinking && (
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
                    <Brain className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1.5 items-center">
                    {[0,1,2].map(i => (
                      <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-muted-foreground"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }} />
                    ))}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </div>

          {/* Input */}
          <div className="flex-shrink-0 border-t border-border bg-card px-6 py-4">
            <div className="flex gap-3 items-end">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Ask about ${child?.child_name}'s plans, strategies, triggers...`}
                rows={1}
                disabled={thinking}
                className="flex-1 resize-none rounded-xl text-sm max-h-28 min-h-[44px]"
              />
              <Button onClick={() => sendMessage()} disabled={thinking || !input.trim()}
                className="h-11 w-11 p-0 rounded-xl flex-shrink-0">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}