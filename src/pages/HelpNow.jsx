import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, AlertTriangle, ChevronRight, CheckCircle2, ShieldAlert, Loader2, MessageSquare, Target, BookOpen, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

const CARD_COLORS = [
  "bg-red-50 border-red-200 text-red-700",
  "bg-orange-50 border-orange-200 text-orange-700",
  "bg-yellow-50 border-yellow-200 text-yellow-700",
  "bg-purple-50 border-purple-200 text-purple-700",
  "bg-blue-50 border-blue-200 text-blue-700",
  "bg-teal-50 border-teal-200 text-teal-700",
  "bg-pink-50 border-pink-200 text-pink-700",
  "bg-indigo-50 border-indigo-200 text-indigo-700",
  "bg-green-50 border-green-200 text-green-700",
];

function StepList({ label, items = [], color = "bg-primary/10 text-primary" }) {
  if (!items?.length) return null;
  return (
    <div className="mb-5">
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">{label}</h3>
      <div className="space-y-2">
        {items.map((line, i) => (
          <div key={i} className={`flex items-start gap-3 p-3 rounded-xl ${color}`}>
            <span className="text-xs font-bold mt-0.5 flex-shrink-0">{i + 1}</span>
            <p className="text-sm leading-snug">{line}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HelpNow() {
  const navigate = useNavigate();
  const [child, setChild] = useState(null);
  const [profile, setProfile] = useState(null);
  const [selectedBehavior, setSelectedBehavior] = useState(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState("select");
  const [isIndividualClient, setIsIndividualClient] = useState(false);

  const childId = new URLSearchParams(window.location.search).get("child_id");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const me = await base44.auth.me().catch(() => null);
      if (!me) { setLoading(false); return; }

      const byId = await base44.entities.Child.filter({ parent_id: me.id }).catch(() => []);
      const byEmail = byId.length === 0 && me.email
        ? await base44.entities.Child.filter({ parent_email: me.email }).catch(() => [])
        : [];
      const seen = new Set();
      const allChildren = [...byId, ...byEmail].filter(c => {
        if (seen.has(c.id)) return false;
        seen.add(c.id);
        return true;
      });

      const foundChild = childId ? allChildren.find(c => c.id === childId) : allChildren[0];
      if (!foundChild) { setLoading(false); return; }
      setChild(foundChild);

      // Check if individual client
      if (me.account_type === "individual" || foundChild.family_id) {
        if (me.account_type === "individual") {
          setIsIndividualClient(true);
        } else if (foundChild.family_id) {
          const fams = await base44.entities.Family.filter({ id: foundChild.family_id }).catch(() => []);
          if (fams[0]?.account_type === "individual") setIsIndividualClient(true);
        }
      }

      // Load ClientProfile (primary source)
      const profiles = await base44.entities.ClientProfile.filter({ child_id: foundChild.id }).catch(() => []);
      if (profiles[0]?.behaviors?.length > 0) {
        setProfile(profiles[0]);
        setLoading(false);
        return;
      }

      // Fallback: build from InterventionPlans + BehaviorPlans
      const [interventionPlans, behaviorPlans] = await Promise.all([
        base44.entities.InterventionPlan.filter({ child_id: foundChild.id }).catch(() => []),
        base44.entities.BehaviorPlan.filter({ child_id: foundChild.id }).catch(() => []),
      ]);

      const fallbackBehaviors = [];
      interventionPlans.filter(p => p.is_active !== false).forEach(p => {
        fallbackBehaviors.push({
          name: p.title || p.behavior_category?.replace(/_/g, " "),
          emoji: "📋",
          description: p.description || "",
          interventions: p.immediate_steps ? p.immediate_steps.split("\n").filter(Boolean) : [],
          avoid: p.things_to_avoid ? p.things_to_avoid.split("\n").filter(Boolean) : [],
          linked_goals: [],
          triggers: [],
          when_to_contact_clinician: p.emergency_instructions || "",
          _deescalation: p.deescalation_steps,
          _reinforcement: p.reinforcement_steps,
        });
      });
      behaviorPlans.forEach(p => {
        fallbackBehaviors.push({
          name: p.behavior_name,
          emoji: "📋",
          description: p.behavior_description || "",
          interventions: p.strategy_steps ? p.strategy_steps.split("\n").filter(Boolean) : [],
          avoid: p.avoid_actions ? p.avoid_actions.split("\n").filter(Boolean) : [],
          linked_goals: [],
          triggers: p.common_triggers ? p.common_triggers.split(",").map(t => t.trim()) : [],
          when_to_contact_clinician: "",
        });
      });

      if (fallbackBehaviors.length > 0) {
        setProfile({ behaviors: fallbackBehaviors, goals: [], diagnoses: [], reinforcers: [], safety_procedures: [], crisis_plan: [] });
      }

      setLoading(false);
    };
    load();
  }, [childId]);

  const handleSelectBehavior = (behavior) => {
    setSelectedBehavior(behavior);
    if (!behavior.interventions?.length) {
      setStep("no_plan");
    } else {
      setStep("show_guidance");
    }
    if (child) {
      base44.entities.BehaviorLog.create({
        child_id: child.id,
        behavior_type: behavior.name,
        context: "Parent requested help via Help Now"
      }).catch(() => {});
    }
  };

  const handleBack = () => {
    if (["show_guidance", "no_plan"].includes(step)) {
      setStep("select");
      setSelectedBehavior(null);
    } else {
      navigate(-1);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  const behaviors = profile?.behaviors || [];
  const goals = profile?.goals || [];
  const reinforcers = profile?.reinforcers || [];
  const safetyProcedures = profile?.safety_procedures || [];
  const crisisPlan = profile?.crisis_plan || [];

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
          <span className="text-white/80 text-xs bg-white/20 px-2 py-1 rounded-full">
            {child.child_name}
          </span>
        )}
      </div>

      <div className="p-5 max-w-2xl mx-auto">
        <AnimatePresence mode="wait">

          {/* Step 1: Select Behavior */}
          {step === "select" && (
            <motion.div key="select" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
              {!child ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground text-sm">No client profile linked to your account. Ask your clinician for an invite.</p>
                </div>
              ) : behaviors.length === 0 ? (
                <div className="text-center py-12 space-y-4">
                  <div className="text-5xl">📋</div>
                  <h2 className="font-bold text-foreground text-lg">No Approved Plans Yet</h2>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5 text-left">
                    <p className="text-sm font-semibold text-yellow-800 mb-1">Your clinician hasn't uploaded any clinical documents yet.</p>
                    <p className="text-sm text-yellow-700">Once your clinician uploads treatment plans or behavior protocols for {child.child_name}, personalized help cards will appear here.</p>
                  </div>
                  <Button variant="outline" className="w-full rounded-xl" onClick={() => navigate("/Messages")}>
                    <MessageSquare className="w-4 h-4 mr-2" /> Message Your Clinician
                  </Button>
                </div>
              ) : (
                <>
                  <div className="mb-5 text-center">
                    <p className="text-sm font-semibold text-foreground mb-1">What is happening right now?</p>
                    <p className="text-xs text-muted-foreground">Select a behavior. Only clinician-approved guidance will be shown.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {behaviors.map((behavior, i) => (
                      <button
                        key={behavior.name}
                        onClick={() => handleSelectBehavior(behavior)}
                        className={`border-2 rounded-2xl p-4 text-left transition-all hover:scale-[1.02] active:scale-100 ${CARD_COLORS[i % CARD_COLORS.length]}`}
                      >
                        <div className="text-3xl mb-2">{behavior.emoji || "📋"}</div>
                        <p className="text-sm font-semibold leading-snug">{behavior.name}</p>
                        <ChevronRight className="w-4 h-4 mt-1 opacity-60" />
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground text-center mt-4">
                    Only showing behaviors with clinician-approved plans for {child.child_name}.
                  </p>

                  {/* Profile summary chips */}
                  {(profile?.diagnoses?.length > 0 || reinforcers.length > 0) && (
                    <div className="mt-6 pt-5 border-t border-border space-y-3">
                      {profile?.diagnoses?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Diagnoses</p>
                          <div className="flex flex-wrap gap-1.5">
                            {profile.diagnoses.map(d => (
                              <span key={d} className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">{d}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {reinforcers.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Known Reinforcers</p>
                          <div className="flex flex-wrap gap-1.5">
                            {reinforcers.map(r => (
                              <span key={r} className="text-xs bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 rounded-full font-medium">{r}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {/* Step 2: Show Guidance */}
          {step === "show_guidance" && selectedBehavior && (
            <motion.div key="guidance" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              {/* Header card */}
              <div className="bg-card border border-border rounded-2xl p-5 mb-5">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{selectedBehavior.emoji || "📋"}</span>
                  <h2 className="font-bold text-foreground text-lg">{selectedBehavior.name}</h2>
                </div>
                {selectedBehavior.description && (
                  <p className="text-sm text-muted-foreground mb-2">{selectedBehavior.description}</p>
                )}
                {selectedBehavior.triggers?.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Common Triggers</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedBehavior.triggers.map(t => (
                        <span key={t} className="text-xs bg-yellow-50 text-yellow-700 border border-yellow-200 px-2 py-0.5 rounded-full">{t}</span>
                      ))}
                    </div>
                  </div>
                )}
                <p className="text-xs text-primary mt-3 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Clinician-approved strategies only
                </p>
              </div>

              {/* Goal Mapping */}
              {selectedBehavior.linked_goals?.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-blue-600" />
                    <h3 className="text-sm font-bold text-blue-800">Treatment Goal Connection</h3>
                  </div>
                  <p className="text-xs text-blue-700 mb-2">
                    Working through this behavior supports {isIndividualClient ? "your" : `${child?.child_name}'s`} treatment goals:
                  </p>
                  <div className="space-y-1">
                    {selectedBehavior.linked_goals.map(g => (
                      <div key={g} className="flex items-center gap-2 text-sm text-blue-800">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                        <span>{g}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Interventions */}
              <StepList
                label="Clinician-Approved Strategies"
                items={selectedBehavior.interventions}
                color="bg-green-50 border border-green-200 text-green-800"
              />

              {/* Things to Avoid */}
              {selectedBehavior.avoid?.length > 0 && (
                <div className="mb-5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Things to Avoid</h3>
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-1.5">
                    {selectedBehavior.avoid.map((item, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-red-800">
                        <span className="font-bold text-red-400 flex-shrink-0">✕</span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Deescalation (from fallback plans) */}
              {selectedBehavior._deescalation && (
                <StepList
                  label="If It Escalates"
                  items={selectedBehavior._deescalation.split("\n").filter(Boolean)}
                  color="bg-yellow-50 border border-yellow-200 text-yellow-800"
                />
              )}

              {/* Reinforcement (from fallback plans) */}
              {selectedBehavior._reinforcement && (
                <StepList
                  label="Reinforcement & Rewards"
                  items={selectedBehavior._reinforcement.split("\n").filter(Boolean)}
                  color="bg-blue-50 border border-blue-200 text-blue-800"
                />
              )}

              {/* Safety / Crisis */}
              {(safetyProcedures.length > 0 || crisisPlan.length > 0) && (
                <div className="mb-5">
                  <div className="bg-red-600 rounded-2xl p-4 flex gap-3">
                    <ShieldAlert className="w-5 h-5 text-white flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-white text-sm mb-1">Safety Procedures</p>
                      <ul className="space-y-1">
                        {[...safetyProcedures, ...crisisPlan].map((s, i) => (
                          <li key={i} className="text-white/90 text-sm">{s}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Contact clinician if */}
              {selectedBehavior.when_to_contact_clinician && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-5 flex gap-3">
                  <AlertCircle className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-orange-800 uppercase tracking-wide mb-0.5">Contact Your Clinician If</p>
                    <p className="text-sm text-orange-800">{selectedBehavior.when_to_contact_clinician}</p>
                  </div>
                </div>
              )}

              <Button className="w-full rounded-xl gap-2 mb-3" onClick={() => navigate(`/LogBehavior?child_id=${child?.id}&behavior=${selectedBehavior?.name}`)}>
                <CheckCircle2 className="w-4 h-4" /> Log This Behavior
              </Button>
              <Button variant="outline" className="w-full rounded-xl gap-2" onClick={() => navigate("/Messages")}>
                <MessageSquare className="w-4 h-4" /> Message Your Clinician
              </Button>
            </motion.div>
          )}

          {/* Step 3: No Plan */}
          {step === "no_plan" && selectedBehavior && (
            <motion.div key="noplan" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center py-10">
              <div className="text-5xl mb-4">{selectedBehavior.emoji || "📋"}</div>
              <h2 className="font-bold text-foreground text-lg mb-2">{selectedBehavior.name}</h2>
              <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5 text-left mb-5">
                <div className="flex gap-2 mb-2">
                  <BookOpen className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm font-semibold text-yellow-800">No clinician-approved strategy was found for this behavior.</p>
                </div>
                <p className="text-sm text-yellow-700">Please contact your clinician for guidance on how to handle this situation.</p>
              </div>
              <Button variant="outline" className="w-full rounded-xl gap-2" onClick={() => navigate("/Messages")}>
                <MessageSquare className="w-4 h-4" /> Message Your Clinician
              </Button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}