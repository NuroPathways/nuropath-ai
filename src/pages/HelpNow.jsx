import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, AlertTriangle, ChevronRight, CheckCircle2, ShieldAlert } from "lucide-react";
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
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("select_behavior"); // select_behavior | show_plan | no_plan

  const childId = new URLSearchParams(window.location.search).get("child_id");

  useEffect(() => {
    const load = async () => {
      const me = await base44.auth.me();
      const [byId, byEmail] = await Promise.all([
        base44.entities.Child.filter({ parent_id: me.id }),
        base44.entities.Child.filter({ parent_email: me.email }),
      ]);
      const seen = new Set();
      const merged = [...byId, ...byEmail].filter(c => { if (seen.has(c.id)) return false; seen.add(c.id); return true; });
      setChildren(merged);
      if (childId) {
        setSelectedChild(merged.find(c => c.id === childId) || merged[0] || null);
      } else {
        setSelectedChild(merged[0] || null);
      }
    };
    load();
  }, [childId]);

  const handleSelectCategory = async (cat) => {
    setSelectedCategory(cat);
    setLoading(true);
    setStep("loading");
    const plans = await base44.entities.InterventionPlan.filter({
      child_id: selectedChild?.id,
      behavior_category: cat.key,
    });
    const activePlan = plans.find(p => p.is_active !== false) || plans[0];
    setPlan(activePlan || null);
    setStep(activePlan ? "show_plan" : "no_plan");
    setLoading(false);

    // Log the help request
    if (selectedChild) {
      await base44.entities.BehaviorLog.create({
        child_id: selectedChild.id,
        behavior_type: cat.label,
        context: "Parent requested help via Help Now",
      }).catch(() => {});
    }
  };

  const handleBack = () => {
    if (step === "show_plan" || step === "no_plan") {
      setStep("select_behavior");
      setSelectedCategory(null);
      setPlan(null);
    } else {
      navigate(-1);
    }
  };

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
        {selectedChild && (
          <span className="text-white/80 text-xs bg-white/20 px-2 py-1 rounded-full">{selectedChild.child_name}</span>
        )}
      </div>

      <div className="p-5 max-w-2xl mx-auto">
        <AnimatePresence mode="wait">
          {step === "select_behavior" && (
            <motion.div key="select" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
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
            </motion.div>
          )}

          {step === "loading" && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground text-sm">Loading intervention plan...</p>
            </motion.div>
          )}

          {step === "show_plan" && plan && (
            <motion.div key="plan" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <div className="bg-card border border-border rounded-2xl p-5 mb-5">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">{selectedCategory?.emoji}</span>
                  <h2 className="font-bold text-foreground text-lg">{plan.title}</h2>
                </div>
                {plan.description && <p className="text-sm text-muted-foreground">{plan.description}</p>}
              </div>

              <StepList
                label="Do This Right Now"
                content={plan.immediate_steps}
                color="bg-green-50 border border-green-200 text-green-800"
              />
              <StepList
                label="If It Escalates"
                content={plan.deescalation_steps}
                color="bg-yellow-50 border border-yellow-200 text-yellow-800"
              />
              <StepList
                label="Reinforcement & Rewards"
                content={plan.reinforcement_steps}
                color="bg-blue-50 border border-blue-200 text-blue-800"
              />
              <StepList
                label="Prevention Tips"
                content={plan.prevention_tips}
                color="bg-purple-50 border border-purple-200 text-purple-800"
              />
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

              <Button
                className="w-full rounded-xl gap-2"
                onClick={() => navigate(`/LogBehavior?child_id=${selectedChild?.id}&behavior=${selectedCategory?.label}`)}
              >
                <CheckCircle2 className="w-4 h-4" />
                Log This Behavior
              </Button>
            </motion.div>
          )}

          {step === "no_plan" && (
            <motion.div key="noplan" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center py-10">
              <div className="text-5xl mb-4">{selectedCategory?.emoji}</div>
              <h2 className="font-bold text-foreground text-lg mb-2">{selectedCategory?.label}</h2>
              <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5 text-left mb-5">
                <p className="text-sm font-semibold text-yellow-800 mb-1">No intervention plan on file yet.</p>
                <p className="text-sm text-yellow-700">Your clinician hasn't created a plan for this situation yet. Contact them to request one.</p>
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