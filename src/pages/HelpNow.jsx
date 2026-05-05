import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, AlertTriangle, ChevronRight, CheckCircle2, ShieldAlert, Loader2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

const BEHAVIOR_CATEGORIES = [
  { key: "tantrum_meltdown", label: "Tantrum / Meltdown", emoji: "🌊", color: "bg-red-50 border-red-200 text-red-700" },
  { key: "aggression", label: "Aggression", emoji: "⚡", color: "bg-orange-50 border-orange-200 text-orange-700" },
  { key: "anxiety_episode", label: "Anxiety Episode", emoji: "😰", color: "bg-yellow-50 border-yellow-200 text-yellow-700" },
  { key: "task_refusal", label: "Task Refusal", emoji: "🚫", color: "bg-purple-50 border-purple-200 text-purple-700" },
  { key: "bedtime_refusal", label: "Bedtime Refusal", emoji: "🌙", color: "bg-indigo-50 border-indigo-200 text-indigo-700" },
  { key: "school_refusal", label: "School Refusal", emoji: "🏫", color: "bg-blue-50 border-blue-200 text-blue-700" },
  { key: "transition_difficulty", label: "Transition Difficulty", emoji: "🔄", color: "bg-teal-50 border-teal-200 text-teal-700" },
  { key: "emotional_dysregulation", label: "Emotional Dysregulation", emoji: "💭", color: "bg-pink-50 border-pink-200 text-pink-700" },
];

function StepList({ label, content, color = "bg-primary/10 text-primary" }) {
  if (!content) return null;
  const lines = content.split("\n").filter(l => l.trim());
  return (
    <div className="mb-5">
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">{label}</h3>
      <div className="space-y-2">
        {lines.map((line, i) => (
          <div key={i} className={`flex items-start gap-3 p-3 rounded-xl ${color}`}>
            <span className="text-xs font-bold mt-0.5 flex-shrink-0">{i + 1}</span>
            <p className="text-sm leading-snug">{line.replace(/^\d+[\.\)]\s*/, "")}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HelpNow() {
  const navigate = useNavigate();
  const [childData, setChildData] = useState({ child: null, documents: [], interventionPlans: [] });
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [plan, setPlan] = useState(null);
  const [aiGuidance, setAiGuidance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [step, setStep] = useState("select_behavior");

  const childId = new URLSearchParams(window.location.search).get("child_id");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const me = await base44.auth.me().catch(() => null);
      if (!me) { setLoading(false); return; }

      // Get linked child
      const [byId, byEmail] = await Promise.all([
        base44.entities.Child.filter({ parent_id: me.id }),
        base44.entities.Child.filter({ parent_email: me.email }),
      ]);
      const seen = new Set();
      const allChildren = [...byId, ...byEmail].filter(c => { if (seen.has(c.id)) return false; seen.add(c.id); return true; });

      let child = childId ? allChildren.find(c => c.id === childId) : allChildren[0];
      if (!child) { setLoading(false); return; }

      // Load all documents and intervention plans for this child in parallel
      const [docs, plans] = await Promise.all([
        base44.entities.Document.filter({ child_id: child.id }),
        base44.entities.InterventionPlan.filter({ child_id: child.id }),
      ]);

      setChildData({ child, documents: docs, interventionPlans: plans });
      setLoading(false);
    };
    load();
  }, [childId]);

  const handleSelectCategory = async (cat) => {
    setSelectedCategory(cat);
    setSearching(true);
    setStep("loading");

    const { child, documents, interventionPlans } = childData;

    // First: look for a matching structured intervention plan
    const matchedPlan = interventionPlans.find(p =>
      p.behavior_category === cat.key && p.is_active !== false
    );

    if (matchedPlan) {
      setPlan(matchedPlan);
      setAiGuidance(null);
      setStep("show_plan");
      setSearching(false);

      if (child) {
        await base44.entities.BehaviorLog.create({
          child_id: child.id,
          behavior_type: cat.label,
          context: "Parent requested help via Help Now",
        }).catch(() => {});
      }
      return;
    }

    // Second: search uploaded documents for relevant content via AI
    const relevantDocs = documents.filter(d =>
      ["treatment_plan", "behavior_protocol", "reinforcement_plan", "coping_strategy", "other"].includes(d.category)
    );

    if (relevantDocs.length > 0) {
      // Use AI to extract relevant guidance from the uploaded documents
      const docContext = relevantDocs.map(d => `Document: "${d.title}" (${d.category?.replace(/_/g, " ")})\nURL: ${d.file_url}`).join("\n\n");

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a clinical support assistant. A parent needs help right now with their child who is having: "${cat.label}".

The child's name is ${child?.child_name || "the child"}.
${child?.diagnosis ? `Diagnosis: ${child.diagnosis}` : ""}
${child?.triggers ? `Known triggers: ${child.triggers}` : ""}

The clinician has uploaded the following documents for this child:
${docContext}

Read these documents and extract ONLY clinician-approved guidance that is relevant to "${cat.label}". 

IMPORTANT RULES:
- Only provide guidance that comes directly from the uploaded documents.
- Do NOT generate generic behavioral advice outside what the documents say.
- If the documents don't address this specific behavior, say so clearly.
- Write in calm, clear, parent-friendly language.
- Give immediate step-by-step instructions.

Return as JSON.`,
        file_urls: relevantDocs.slice(0, 3).map(d => d.file_url),
        response_json_schema: {
          type: "object",
          properties: {
            has_relevant_guidance: { type: "boolean" },
            immediate_steps: { type: "string", description: "Step-by-step actions to take right now, one per line" },
            deescalation_tips: { type: "string", description: "What to do if it gets worse, one per line" },
            things_to_avoid: { type: "string" },
            source_document: { type: "string", description: "Which document this came from" },
          },
          required: ["has_relevant_guidance"]
        }
      }).catch(() => null);

      if (result?.has_relevant_guidance && result?.immediate_steps) {
        setAiGuidance(result);
        setPlan(null);
        setStep("show_doc_guidance");
        setSearching(false);
        if (child) {
          await base44.entities.BehaviorLog.create({
            child_id: child.id,
            behavior_type: cat.label,
            context: "Parent requested help via Help Now (document-based)",
          }).catch(() => {});
        }
        return;
      }
    }

    // No plan and no relevant docs — show "contact clinician" message
    setPlan(null);
    setAiGuidance(null);
    setStep("no_plan");
    setSearching(false);
  };

  const handleBack = () => {
    if (["show_plan", "show_doc_guidance", "no_plan"].includes(step)) {
      setStep("select_behavior");
      setSelectedCategory(null);
      setPlan(null);
      setAiGuidance(null);
    } else {
      navigate(-1);
    }
  };

  const { child } = childData;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-inter">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-red-600 px-4 py-4 flex items-center gap-3">
        <button onClick={handleBack} className="text-white/80 hover:text-white">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <AlertTriangle className="w-5 h-5 text-white" />
          <h1 className="text-white font-bold text-base">I Need Help Now</h1>
        </div>
        {child && (
          <span className="text-white/80 text-xs bg-white/20 px-2 py-1 rounded-full">{child.child_name}</span>
        )}
      </div>

      <div className="p-5 max-w-2xl mx-auto">
        <AnimatePresence mode="wait">

          {/* Select behavior */}
          {step === "select_behavior" && (
            <motion.div key="select" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
              {!child ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground text-sm">No child profile linked to your account. Ask your clinician for an invite.</p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground mb-5 text-center">What is happening right now? Select the situation.</p>
                  <div className="grid grid-cols-2 gap-3">
                    {BEHAVIOR_CATEGORIES.map((cat) => (
                      <button
                        key={cat.key}
                        onClick={() => handleSelectCategory(cat)}
                        className={`border-2 rounded-2xl p-4 text-left transition-all hover:scale-[1.02] active:scale-100 ${cat.color}`}
                      >
                        <div className="text-3xl mb-2">{cat.emoji}</div>
                        <p className="text-sm font-semibold leading-snug">{cat.label}</p>
                        <ChevronRight className="w-4 h-4 mt-1 opacity-60" />
                      </button>
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* Loading */}
          {step === "loading" && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground text-sm">Finding your clinician-approved plan...</p>
            </motion.div>
          )}

          {/* Show structured intervention plan */}
          {step === "show_plan" && plan && (
            <motion.div key="plan" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <div className="bg-card border border-border rounded-2xl p-5 mb-5">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">{selectedCategory?.emoji}</span>
                  <h2 className="font-bold text-foreground text-lg">{plan.title}</h2>
                </div>
                {plan.description && <p className="text-sm text-muted-foreground">{plan.description}</p>}
                <p className="text-xs text-primary mt-2 font-medium">✓ Clinician-approved plan</p>
              </div>

              <StepList label="Do This Right Now" content={plan.immediate_steps} color="bg-green-50 border border-green-200 text-green-800" />
              <StepList label="If It Escalates" content={plan.deescalation_steps} color="bg-yellow-50 border border-yellow-200 text-yellow-800" />
              <StepList label="Reinforcement & Rewards" content={plan.reinforcement_steps} color="bg-blue-50 border border-blue-200 text-blue-800" />
              <StepList label="Prevention Tips" content={plan.prevention_tips} color="bg-purple-50 border border-purple-200 text-purple-800" />

              {plan.things_to_avoid && (
                <div className="mb-5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Things to Avoid</h3>
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <p className="text-sm text-red-800 whitespace-pre-line">{plan.things_to_avoid}</p>
                  </div>
                </div>
              )}
              {plan.emergency_instructions && (
                <div className="mb-5">
                  <div className="bg-red-600 rounded-2xl p-4 flex gap-3">
                    <ShieldAlert className="w-5 h-5 text-white flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-white text-sm mb-1">Emergency Instructions</p>
                      <p className="text-white/90 text-sm whitespace-pre-line">{plan.emergency_instructions}</p>
                    </div>
                  </div>
                </div>
              )}

              <Button className="w-full rounded-xl gap-2" onClick={() => navigate(`/LogBehavior?child_id=${child?.id}&behavior=${selectedCategory?.label}`)}>
                <CheckCircle2 className="w-4 h-4" />
                Log This Behavior
              </Button>
            </motion.div>
          )}

          {/* Show document-based AI guidance */}
          {step === "show_doc_guidance" && aiGuidance && (
            <motion.div key="docguidance" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <div className="bg-card border border-border rounded-2xl p-5 mb-5">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">{selectedCategory?.emoji}</span>
                  <h2 className="font-bold text-foreground text-lg">{selectedCategory?.label}</h2>
                </div>
                <p className="text-xs text-primary mt-1 font-medium">✓ Guidance from your clinician's uploaded documents</p>
                {aiGuidance.source_document && (
                  <p className="text-xs text-muted-foreground mt-0.5">Source: {aiGuidance.source_document}</p>
                )}
              </div>

              <StepList label="Do This Right Now" content={aiGuidance.immediate_steps} color="bg-green-50 border border-green-200 text-green-800" />
              <StepList label="If It Escalates" content={aiGuidance.deescalation_tips} color="bg-yellow-50 border border-yellow-200 text-yellow-800" />

              {aiGuidance.things_to_avoid && (
                <div className="mb-5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Things to Avoid</h3>
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <p className="text-sm text-red-800 whitespace-pre-line">{aiGuidance.things_to_avoid}</p>
                  </div>
                </div>
              )}

              <Button className="w-full rounded-xl gap-2 mb-3" onClick={() => navigate(`/LogBehavior?child_id=${child?.id}&behavior=${selectedCategory?.label}`)}>
                <CheckCircle2 className="w-4 h-4" />
                Log This Behavior
              </Button>
              <Button variant="outline" className="w-full rounded-xl gap-2" onClick={() => navigate("/Messages")}>
                <MessageSquare className="w-4 h-4" />
                Message Your Clinician
              </Button>
            </motion.div>
          )}

          {/* No plan */}
          {step === "no_plan" && (
            <motion.div key="noplan" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center py-10">
              <div className="text-5xl mb-4">{selectedCategory?.emoji}</div>
              <h2 className="font-bold text-foreground text-lg mb-2">{selectedCategory?.label}</h2>
              <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5 text-left mb-5">
                <p className="text-sm font-semibold text-yellow-800 mb-1">No clinician-approved intervention plan exists for this behavior.</p>
                <p className="text-sm text-yellow-700">Please contact your provider. Your clinician has not yet uploaded a plan or document that addresses this situation.</p>
              </div>
              <Button variant="outline" className="w-full rounded-xl" onClick={() => navigate("/Messages")}>
                Message Your Clinician
              </Button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}