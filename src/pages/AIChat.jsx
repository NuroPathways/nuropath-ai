import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Send, Brain, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import ChatMessage from "../components/chat/ChatMessage";
import ProcessingSteps from "../components/chat/ProcessingSteps";
import FeedbackBar from "../components/chat/FeedbackBar";

const SUGGESTED = [
  "My child is refusing to do homework",
  "How do I handle a meltdown in public?",
  "My child is hitting when frustrated",
  "What do I do when they won't calm down?",
];

// ─── Aspire AI Brain ────────────────────────────────────────────────────────

async function module1_BehaviorInterpreter(parentInput) {
  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `You are Aspire AI, a behavioral support assistant designed to help parents support children using strategies defined by their clinician's behavior plan.

Analyze the parent's description to understand what the child may be experiencing internally.

Children often escalate behavior when they feel:
• overwhelmed
• unsafe
• confused about expectations
• frustrated by a task
• unable to transition between activities
• unable to communicate a need
• overstimulated
• emotionally dysregulated

Parent's description: "${parentInput}"

Return ONLY valid JSON matching the schema exactly.`,
    response_json_schema: {
      type: "object",
      properties: {
        behavior_type: { type: "string", description: "Short clinical label, e.g. Task Refusal, Physical Aggression" },
        intensity: { type: "string", enum: ["low", "moderate", "high"] },
        context: { type: "string", description: "The setting or situation context" },
        possible_function: { type: "string", enum: ["Attention", "Escape/Avoidance", "Tangible", "Sensory", "Unknown"] },
      },
      required: ["behavior_type", "intensity", "context", "possible_function"],
    },
  });
  return result;
}

async function module2_ClinicalContextEngine(interpretation, plans, child) {
  const planText = plans.length === 0
    ? "No behavior plans are available."
    : plans.map((p) => `
=== BEHAVIOR PLAN: ${p.behavior_name} ===
Severity: ${p.severity_level || "N/A"}
Description: ${p.behavior_description || "N/A"}
Behavior Function: ${p.behavior_function || "N/A"}
Common Triggers: ${p.common_triggers || "N/A"}
--- INTERVENTION STRATEGIES ---
Strategy Title: ${p.strategy_title || "N/A"}
Step-by-Step Strategy: ${p.strategy_steps || "N/A"}
When to Use: ${p.when_to_use || "N/A"}
Reinforcement Method: ${p.reinforcement_method || "N/A"}
--- ESCALATION & SAFETY ---
Escalation Signs: ${p.escalation_signs || "N/A"}
De-escalation Steps: ${p.deescalation_steps || "N/A"}
Actions to Avoid: ${p.avoid_actions || "N/A"}
Safe Space Method: ${p.safe_space_method || "N/A"}
`.trim()).join("\n\n---\n\n");

  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `You are Aspire AI. Your role is to translate clinician behavior plans into clear, practical, real-time guidance for parents.

CRITICAL: The behavior plans below may have been uploaded directly from clinical documents. Read them in full and use ALL relevant information from them.

Child: ${child?.child_name || "Unknown"}, Age: ${child?.age || "N/A"}, Diagnosis: ${child?.diagnosis || "N/A"}

Interpreted Behavior:
- Type: ${interpretation.behavior_type}
- Intensity: ${interpretation.intensity}
- Context: ${interpretation.context}
- Function: ${interpretation.possible_function}

CLINICIAN-APPROVED BEHAVIOR PLANS (read the full content carefully):
${planText}

Match the most relevant strategies to this behavior. Use the exact clinician-defined language and steps where possible. Return ONLY valid JSON.`,
    response_json_schema: {
      type: "object",
      properties: {
        matched_plan_name: { type: "string" },
        relevant_triggers: { type: "string" },
        immediate_strategy: { type: "string" },
        deescalation_strategy: { type: "string" },
        reinforcement: { type: "string" },
        things_to_avoid: { type: "string" },
        has_plan: { type: "boolean" },
      },
      required: ["matched_plan_name", "immediate_strategy", "has_plan"],
    },
  });
  return result;
}

async function module3_StrategySelector(interpretation, clinicalContext) {
  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `You are Aspire AI. Your goal is to help parents feel calm, confident, and supported while staying aligned with the clinician's plan for the child.

Based on the interpreted behavior and matched clinical strategies, create a structured, prioritized intervention sequence using evidence-based behavioral supports:
• task breakdown
• visual supports
• transition supports
• reinforcement systems
• movement breaks
• emotional regulation supports

Behavior Type: ${interpretation.behavior_type}
Intensity: ${interpretation.intensity}
Function: ${interpretation.possible_function}
Matched Plan: ${clinicalContext.matched_plan_name}
Immediate Strategy: ${clinicalContext.immediate_strategy}
De-escalation: ${clinicalContext.deescalation_strategy || "N/A"}
Reinforcement: ${clinicalContext.reinforcement || "N/A"}
Avoid: ${clinicalContext.things_to_avoid || "N/A"}

Return ONLY valid JSON with a clear, ordered intervention plan that stays aligned with the clinician's approach.`,
    response_json_schema: {
      type: "object",
      properties: {
        phase1_immediate: { type: "array", items: { type: "string" }, description: "Immediate steps to take right now" },
        phase2_deescalation: { type: "array", items: { type: "string" }, description: "Steps if behavior escalates" },
        phase3_reinforcement: { type: "array", items: { type: "string" }, description: "Post-behavior reinforcement steps" },
        things_to_avoid: { type: "array", items: { type: "string" } },
        primary_strategy_summary: { type: "string" },
      },
      required: ["phase1_immediate", "primary_strategy_summary"],
    },
  });
  return result;
}

async function module4_ParentGuidanceGenerator(child, interpretation, strategyPlan) {
  const phase1 = (strategyPlan.phase1_immediate || []).map((s, i) => `Step ${i + 1}: ${s}`).join("\n");
  const phase2 = strategyPlan.phase2_deescalation?.length
    ? "\n\nIf they escalate:\n" + (strategyPlan.phase2_deescalation || []).map((s) => `- ${s}`).join("\n")
    : "";
  const phase3 = strategyPlan.phase3_reinforcement?.length
    ? "\n\nAfterwards:\n" + (strategyPlan.phase3_reinforcement || []).map((s) => `- ${s}`).join("\n")
    : "";
  const avoid = strategyPlan.things_to_avoid?.length
    ? "\n\n**Things to avoid:**\n" + (strategyPlan.things_to_avoid || []).map((s) => `- ${s}`).join("\n")
    : "";

  const response = await base44.integrations.Core.InvokeLLM({
    prompt: `You are Aspire AI, a behavioral support assistant designed to help parents support children using strategies defined by their clinician's behavior plan.

RESPONSE STRUCTURE - Follow this order:

1. Emotional validation - Acknowledge the parent's experience.

2. Behavioral insight - Explain what the child may be feeling internally. Help the parent understand why their child may be feeling overwhelmed, unsafe, frustrated, or unable to complete a task.

3. Clinician strategy steps - Provide step-by-step guidance using strategies from the clinician's behavior plan.

4. Escalation guidance - If the behavior escalates, guide the parent using calming strategies.

COMMUNICATION STYLE:
• calm, supportive, respectful, clear, practical
• Avoid clinical jargon whenever possible
• Use short steps that can be followed immediately
• Parents should feel like they are receiving guidance from a supportive professional

Child: ${child?.child_name || "your child"}, Age: ${child?.age || "N/A"}, Diagnosis: ${child?.diagnosis || "N/A"}
Behavior: ${interpretation.behavior_type} (${interpretation.intensity} intensity)
Function: ${interpretation.possible_function}

Intervention Plan:
${phase1}${phase2}${phase3}${avoid}

Write the response as a helpful, friendly message using markdown formatting (bold for steps, line breaks between sections). Keep it concise and actionable.`,
  });
  return response;
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function AIChat() {
  const [user, setUser] = useState(null);
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState("");
  const [plans, setPlans] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [processingStep, setProcessingStep] = useState(0); // 0 = idle, 1-4 = active module
  const [pendingFeedback, setPendingFeedback] = useState(null); // { logId, conversationId }
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
  }, [messages, processingStep]);

  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg || processingStep > 0) return;
    setInput("");

    const userMessage = { role: "user", content: msg };
    setMessages((prev) => [...prev, userMessage]);

    const child = children.find((c) => c.id === selectedChildId);

    // Module 1 — Behavior Interpreter
    setProcessingStep(1);
    const interpretation = await module1_BehaviorInterpreter(msg);

    // Module 2 — Clinical Context Engine
    setProcessingStep(2);
    const clinicalContext = await module2_ClinicalContextEngine(interpretation, plans, child);

    // Module 3 — Strategy Selection
    setProcessingStep(3);
    const strategyPlan = await module3_StrategySelector(interpretation, clinicalContext);

    // Module 4 — Parent Guidance Generator
    setProcessingStep(4);
    const guidanceText = await module4_ParentGuidanceGenerator(child, interpretation, strategyPlan);

    setProcessingStep(0);

    const aiMessage = { role: "assistant", content: guidanceText };
    setMessages((prev) => [...prev, aiMessage]);

    // Module 5 — Data Logging
    let conversationRecord = null;
    let logRecord = null;

    if (user) {
      conversationRecord = await base44.entities.AIConversation.create({
        parent_id: user.id,
        child_id: selectedChildId,
        child_name: child?.child_name || "",
        question: msg,
        ai_response: guidanceText,
      });

      logRecord = await base44.entities.BehaviorLog.create({
        child_id: selectedChildId,
        parent_id: user.id,
        conversation_id: conversationRecord?.id,
        behavior_type: interpretation.behavior_type,
        intensity: interpretation.intensity,
        context: interpretation.context,
        possible_function: interpretation.possible_function,
        strategy_used: strategyPlan.primary_strategy_summary,
      });

      setPendingFeedback({
        logId: logRecord?.id,
        conversationId: conversationRecord?.id,
      });
    }
  };

  const handleFeedback = async (feedback) => {
    if (!pendingFeedback?.logId) return;
    await base44.entities.BehaviorLog.update(pendingFeedback.logId, {
      parent_feedback: feedback,
    });
    setPendingFeedback(null);
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content:
          feedback === "yes"
            ? "Great to hear it helped! Keep up the great work. 💙"
            : feedback === "partially"
            ? "Thanks for the feedback. Your clinician will be able to see this and may adjust the plan."
            : "Thanks for letting me know. This has been logged so your clinician can review and update the strategy.",
      },
    ]);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const isLoading = processingStep > 0;

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
              <p className="text-xs text-muted-foreground">Clinical reasoning assistant</p>
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
          {messages.length === 0 && !isLoading && (
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
                Describe what's happening and Aspire AI will analyze the behavior, review the plan, and give you step-by-step guidance.
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

          {/* Module 5 feedback prompt */}
          {pendingFeedback && !isLoading && (
            <FeedbackBar onFeedback={handleFeedback} />
          )}

          {/* Processing state with step indicators */}
          {isLoading && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                <Brain className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3">
                <ProcessingSteps currentStep={processingStep} />
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
          Aspire AI processes through 4 clinical reasoning steps before responding.
        </p>
      </div>
    </div>
  );
}