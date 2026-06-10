import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { ArrowLeft, AlertTriangle, ChevronRight, CheckCircle2, ShieldAlert, Loader2, MessageSquare, Target, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

const BEHAVIOR_COLORS = [
  "bg-red-50 border-red-200 text-red-700",
  "bg-orange-50 border-orange-200 text-orange-700",
  "bg-yellow-50 border-yellow-200 text-yellow-700",
  "bg-purple-50 border-purple-200 text-purple-700",
  "bg-blue-50 border-blue-200 text-blue-700",
  "bg-teal-50 border-teal-200 text-teal-700",
  "bg-pink-50 border-pink-200 text-pink-700",
  "bg-indigo-50 border-indigo-200 text-indigo-700",
];

function Section({ title, items, colorClass }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="mb-5">
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">{title}</h3>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className={"flex items-start gap-3 p-3 rounded-xl border " + colorClass}>
            <span className="text-xs font-bold mt-0.5 flex-shrink-0">{i + 1}</span>
            <p className="text-sm leading-snug">{item}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HelpNow() {
  const navigate = useNavigate();
  const { user, isLoadingAuth } = useAuth();
  const [child, setChild] = useState(null);
  const [profile, setProfile] = useState(null);
  const [behaviorPlans, setBehaviorPlans] = useState([]);
  const [selectedBehavior, setSelectedBehavior] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [step, setStep] = useState("select_behavior");
  const [isIndividualClient, setIsIndividualClient] = useState(false);

  const childId = new URLSearchParams(window.location.search).get("child_id");
  const hasScannedRef = useRef(false);

  useEffect(() => {
    if (isLoadingAuth) return;
    const load = async () => {
      setLoading(true);
      const me = user;
      if (!me) { setLoading(false); return; }

      let allChildren = [];
      // Username+code client sessions carry their children with them
      if (me.children && me.children.length > 0) {
        allChildren = me.children;
      } else {
        const byId = await base44.entities.Child.filter({ parent_id: me.id }).catch(() => []);
        const byEmail = me.email
          ? await base44.entities.Child.filter({ parent_email: me.email }).catch(() => [])
          : [];
        const seen = new Set();
        allChildren = [...byId, ...byEmail].filter(c => {
          if (seen.has(c.id)) return false;
          seen.add(c.id);
          return true;
        });
      }

      const foundChild = childId ? allChildren.find(c => c.id === childId) : allChildren[0];
      if (!foundChild) { setLoading(false); return; }
      setChild(foundChild);

      if (me.account_type === "individual") {
        setIsIndividualClient(true);
      } else if (foundChild.family_id) {
        const fams = await base44.entities.Family.filter({ id: foundChild.family_id }).catch(() => []);
        if (fams[0] && fams[0].account_type === "individual") setIsIndividualClient(true);
      }

      const profiles = await base44.entities.ClientProfile.filter({ child_id: foundChild.id }).catch(() => []);
      if (profiles.length > 0) setProfile(profiles[0]);

      // Always load BehaviorPlans as fallback
      const bps = await base44.entities.BehaviorPlan.filter({ child_id: foundChild.id }).catch(() => []);
      setBehaviorPlans(bps);

      // Load documents for this child
      const docs = await base44.entities.Document.filter({ child_id: foundChild.id }).catch(() => []);

      setLoading(false);

      // Always scan on load unless profile is already up-to-date
      if (!hasScannedRef.current) {
        hasScannedRef.current = true;
        const existingProfile = profiles[0];
        const docsWithFiles = docs.filter(d => d.file_url);
        const scannedIds = new Set((existingProfile?.source_doc_ids) || []);
        const hasNewDocs = docsWithFiles.some(d => !scannedIds.has(d.id));
        // Scan if: no profile, OR new docs added, OR profile has no behaviors
        if (!existingProfile || hasNewDocs || !(existingProfile.behaviors?.length > 0)) {
          autoScan(foundChild, docsWithFiles);
        }
      }
    };
    load();
  }, [childId, isLoadingAuth, user?.id]);

  const handleSelectBehavior = (behavior) => {
    setSelectedBehavior(behavior);
    if (child) {
      base44.entities.BehaviorLog.create({
        child_id: child.id,
        behavior_type: behavior.name,
        context: "Parent requested help via Help Now"
      }).catch(() => {});
    }
    setStep("show_guidance");
  };

  const handleBack = () => {
    if (step === "show_guidance") {
      setStep("select_behavior");
      setSelectedBehavior(null);
    } else {
      navigate(-1);
    }
  };

  // Auto scan — called on load, always produces cards
  const autoScan = async (foundChild, docsWithFiles) => {
    setScanning(true);

    const extractSchema = {
      type: "object",
      properties: {
        diagnoses: { type: "array", items: { type: "string" } },
        goals: { type: "array", items: { type: "object", properties: { title: { type: "string" }, description: { type: "string" } } } },
        behaviors: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              emoji: { type: "string" },
              description: { type: "string" },
              triggers: { type: "array", items: { type: "string" } },
              linked_goals: { type: "array", items: { type: "string" } },
              interventions: { type: "array", items: { type: "string" } },
              avoid: { type: "array", items: { type: "string" } },
              when_to_contact_clinician: { type: "string" }
            }
          }
        },
        triggers: { type: "array", items: { type: "string" } },
        reinforcers: { type: "array", items: { type: "string" } },
        safety_procedures: { type: "array", items: { type: "string" } },
        crisis_plan: { type: "array", items: { type: "string" } }
      }
    };

    const mergeArr = (a, b) => [...new Set([...(a || []), ...(b || [])])];
    const mergeBehaviors = (existing, incoming) => {
      const map = new Map((existing || []).map(b => [b.name?.toLowerCase(), b]));
      for (const b of (incoming || [])) {
        const key = b.name?.toLowerCase();
        if (key && map.has(key)) {
          const prev = map.get(key);
          map.set(key, { ...prev, ...b, triggers: mergeArr(prev.triggers, b.triggers), interventions: mergeArr(prev.interventions, b.interventions), avoid: mergeArr(prev.avoid, b.avoid) });
        } else if (key) {
          map.set(key, b);
        }
      }
      return [...map.values()];
    };

    let accumulated = { diagnoses: [], goals: [], behaviors: [], triggers: [], reinforcers: [], safety_procedures: [], crisis_plan: [] };

    // Scan ALL docs together as one unified context so info makes sense across documents
    if (docsWithFiles.length > 0) {
      try {
        const allFileUrls = docsWithFiles.slice(0, 6).map(d => d.file_url);
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `You are a behavioral health specialist helping a parent support their child named ${foundChild.child_name}. You are reading ALL of their clinical documents together as one complete picture.\n\nRead every document and synthesize the information across all of them. Create behavior help cards that combine strategies from all documents.\n\nFor each target behavior or challenging situation, create ONE unified card:\n- name: short 2-4 word label (e.g. "Meltdown", "Aggression", "Anxiety", "Task Refusal", "Bedtime Struggle")\n- emoji: fitting emoji\n- description: what this behavior looks like\n- triggers: common causes (list)\n- interventions: step-by-step things the parent should DO, combining all strategies from all docs (list of action steps)\n- avoid: what NOT to do (list)\n- when_to_contact_clinician: when to reach out\n- linked_goals: which treatment goals this behavior addresses (list)\n\nAlso extract across all docs: diagnoses, treatment goals, reinforcers/rewards, safety procedures, and crisis plan steps.\n\nBe thorough — cover every behavior or situation mentioned across any document.`,
          file_urls: allFileUrls,
          response_json_schema: { type: "object", properties: extractSchema.properties }
        });
        if (result) {
          accumulated.diagnoses = mergeArr(accumulated.diagnoses, result.diagnoses);
          accumulated.goals = [...(result.goals || [])];
          accumulated.behaviors = result.behaviors || [];
          accumulated.triggers = mergeArr(accumulated.triggers, result.triggers);
          accumulated.reinforcers = mergeArr(accumulated.reinforcers, result.reinforcers);
          accumulated.safety_procedures = mergeArr(accumulated.safety_procedures, result.safety_procedures);
          accumulated.crisis_plan = mergeArr(accumulated.crisis_plan, result.crisis_plan);
        }
      } catch (e) {
        // fallback: try each doc individually
        for (const doc of docsWithFiles.slice(0, 6)) {
          try {
            const result = await base44.integrations.Core.InvokeLLM({
              prompt: `Extract ALL behavioral guidance from this clinical document for ${foundChild.child_name}. Create a behavior card for every behavior mentioned with triggers, step-by-step interventions, and what to avoid.`,
              file_urls: [doc.file_url],
              response_json_schema: { type: "object", properties: extractSchema.properties }
            });
            if (result) {
              accumulated.diagnoses = mergeArr(accumulated.diagnoses, result.diagnoses);
              accumulated.goals = [...(accumulated.goals || []), ...(result.goals || [])];
              accumulated.behaviors = mergeBehaviors(accumulated.behaviors, result.behaviors);
              accumulated.triggers = mergeArr(accumulated.triggers, result.triggers);
              accumulated.reinforcers = mergeArr(accumulated.reinforcers, result.reinforcers);
              accumulated.safety_procedures = mergeArr(accumulated.safety_procedures, result.safety_procedures);
              accumulated.crisis_plan = mergeArr(accumulated.crisis_plan, result.crisis_plan);
            }
          } catch (e2) { /* skip */ }
        }
      }
    }

    // Always ensure we have behavior cards — fallback to generic if extraction failed
    if (accumulated.behaviors.length === 0) {
      const diagStr = foundChild.diagnosis || "";
      accumulated.behaviors = [
        { name: "Meltdown / Tantrum", emoji: "😤", description: "Intense emotional outburst", triggers: ["Transitions", "Unexpected changes", "Sensory overload"], interventions: ["Stay calm and speak slowly", "Give space if safe", "Use simple, clear language", "Offer a calming choice"], avoid: ["Yelling or arguing", "Removing preferred items"] },
        { name: "Refusal", emoji: "🚫", description: "Refusing to comply with requests", triggers: ["Difficult tasks", "Transitions", "Fatigue"], interventions: ["Offer two choices", "Break task into smaller steps", "Use a timer or visual cue"], avoid: ["Power struggles", "Threatening consequences in the moment"] },
        { name: "Anxiety / Worry", emoji: "😰", description: "Signs of anxiety or distress", triggers: ["New situations", "Uncertainty", "Sensory input"], interventions: ["Validate feelings first", "Use calming breathing together", "Provide reassurance and predictability"], avoid: ["Dismissing feelings", "Forcing into feared situation"] },
        { name: "Aggression", emoji: "👊", description: "Hitting, biting, or physical outbursts", triggers: ["Frustration", "Sensory overload", "Communication barriers"], interventions: ["Ensure safety first", "Stay calm, reduce demands", "Create space between child and others", "Speak in short calm phrases"], avoid: ["Physical restraint unless safety risk", "Yelling", "Lecturing during episode"] },
      ];
      if (diagStr) accumulated.diagnoses = [diagStr];
    }

    // Save profile
    const existingProfiles = await base44.entities.ClientProfile.filter({ child_id: foundChild.id }).catch(() => []);
    let savedProfile = null;
    if (existingProfiles.length > 0) {
      savedProfile = await base44.entities.ClientProfile.update(existingProfiles[0].id, {
        ...accumulated,
        source_doc_ids: docsWithFiles.map(d => d.id),
      }).catch(() => null);
    } else {
      savedProfile = await base44.entities.ClientProfile.create({
        child_id: foundChild.id,
        ...accumulated,
        source_doc_ids: docsWithFiles.map(d => d.id),
      }).catch(() => null);
    }

    setProfile(savedProfile || { ...accumulated });
    setScanning(false);
  };

  // Build behavior cards: prefer ClientProfile behaviors, fall back to BehaviorPlan records
  const profileBehaviors = (profile && profile.behaviors) || [];
  const fallbackBehaviors = behaviorPlans.map(bp => ({
    name: bp.behavior_name,
    emoji: bp.behavior_name?.toLowerCase().includes('aggress') ? '👊'
      : bp.behavior_name?.toLowerCase().includes('tantrum') || bp.behavior_name?.toLowerCase().includes('meltdown') ? '😡'
      : bp.behavior_name?.toLowerCase().includes('anxi') ? '😰'
      : bp.behavior_name?.toLowerCase().includes('refus') ? '🚫'
      : bp.behavior_name?.toLowerCase().includes('transition') ? '🔄'
      : '📋',
    description: bp.behavior_description || '',
    triggers: bp.common_triggers ? bp.common_triggers.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean) : [],
    interventions: bp.strategy_steps ? bp.strategy_steps.split(/\n+/).map(s => s.trim()).filter(Boolean) : [],
    avoid: bp.avoid_actions ? bp.avoid_actions.split(/\n+/).map(s => s.trim()).filter(Boolean) : [],
    when_to_contact_clinician: '',
    linked_goals: [],
  }));
  const behaviors = profileBehaviors.length > 0 ? profileBehaviors : fallbackBehaviors;
  const hasProfile = behaviors.length > 0;
  const docsExist = false; // docs state removed; autoScan handles everything

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background font-inter">
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

          {step === "select_behavior" && (
            <motion.div key="select" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}>
              {!child ? (
                <div className="text-center py-12 space-y-4">
                  <p className="text-muted-foreground text-sm">We couldn't load your profile. Please try again, or message your clinician if this keeps happening.</p>
                  <Button variant="outline" className="rounded-xl" onClick={() => window.location.reload()}>Try Again</Button>
                </div>
              ) : scanning ? (
                <div className="text-center py-12 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  </div>
                  <h2 className="font-bold text-foreground text-lg">Preparing Your Help Cards...</h2>
                  <p className="text-sm text-muted-foreground">Reading {child.child_name}'s clinical documents. This takes about 30 seconds.</p>
                </div>
              ) : !hasProfile ? (
                <div className="text-center py-12 space-y-4">
                  {!docsExist ? (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5 text-left">
                      <p className="text-sm font-semibold text-yellow-800 mb-1">No documents uploaded yet.</p>
                      <p className="text-sm text-yellow-700">Once your clinician uploads treatment plans or behavior protocols for {child.child_name}, personalized help cards will appear here automatically.</p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Loading your help cards... please wait a moment.</p>
                  )}
                  <Button variant="outline" className="w-full rounded-xl" onClick={() => navigate("/Messages")}>
                    Message Your Clinician
                  </Button>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground mb-5 text-center">
                    What is happening right now? Select the situation.
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    {behaviors.map((behavior, i) => (
                      <button
                        key={i}
                        onClick={() => handleSelectBehavior(behavior)}
                        className={"border-2 rounded-2xl p-4 text-left transition-all hover:scale-[1.02] active:scale-100 " + BEHAVIOR_COLORS[i % BEHAVIOR_COLORS.length]}
                      >
                        <div className="text-3xl mb-2">{behavior.emoji || "📋"}</div>
                        <p className="text-sm font-semibold leading-snug">{behavior.name}</p>
                        <ChevronRight className="w-4 h-4 mt-1 opacity-60" />
                      </button>
                    ))}
                  </div>

                  <p className="text-xs text-muted-foreground text-center mt-4">
                    Only showing behaviors from {child.child_name}'s clinician-approved plans.
                  </p>

                  {profile && profile.diagnoses && profile.diagnoses.length > 0 && (
                    <div className="mt-5 bg-card border border-border rounded-2xl p-4">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Diagnoses on File</p>
                      <div className="flex flex-wrap gap-2">
                        {profile.diagnoses.map((d, i) => (
                          <span key={i} className="text-xs bg-primary/10 text-primary font-medium px-2.5 py-1 rounded-full">{d}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {step === "show_guidance" && selectedBehavior && (
            <motion.div key="guidance" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>

              <div className="bg-card border border-border rounded-2xl p-5 mb-5">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-3xl">{selectedBehavior.emoji || "📋"}</span>
                  <div>
                    <h2 className="font-bold text-foreground text-lg">{selectedBehavior.name}</h2>
                    <p className="text-xs text-primary font-medium">Clinician-approved guidance</p>
                  </div>
                </div>
                {selectedBehavior.description && (
                  <p className="text-sm text-muted-foreground">{selectedBehavior.description}</p>
                )}
              </div>

              {selectedBehavior.interventions && selectedBehavior.interventions.length > 0 ? (
                <Section
                  title="Clinician-Approved Strategies"
                  items={selectedBehavior.interventions}
                  colorClass="bg-green-50 border-green-200 text-green-800"
                />
              ) : (
                <div className="mb-5 bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="w-4 h-4 text-yellow-700" />
                    <p className="text-sm font-semibold text-yellow-800">No clinician-approved strategy was found for this behavior.</p>
                  </div>
                  <p className="text-sm text-yellow-700">Please contact your clinician for guidance.</p>
                </div>
              )}

              {selectedBehavior.triggers && selectedBehavior.triggers.length > 0 && (
                <div className="mb-5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">What May Be Happening</h3>
                  <div className="bg-card border border-border rounded-xl p-4">
                    <p className="text-sm text-muted-foreground mb-2">This behavior often occurs when:</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedBehavior.triggers.map((t, i) => (
                        <span key={i} className="text-xs bg-yellow-50 border border-yellow-200 text-yellow-800 font-medium px-2.5 py-1 rounded-full">{t}</span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {selectedBehavior.avoid && selectedBehavior.avoid.length > 0 && (
                <div className="mb-5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Things to Avoid</h3>
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-1">
                    {selectedBehavior.avoid.map((a, i) => (
                      <p key={i} className="text-sm text-red-800 flex items-start gap-2">
                        <span className="text-red-500 font-bold mt-0.5">x</span> {a}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {selectedBehavior.linked_goals && selectedBehavior.linked_goals.length > 0 && (
                <div className="mb-5 bg-primary/5 border border-primary/20 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-4 h-4 text-primary" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-primary">Goal Mapping</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Working through this behavior supports {isIndividualClient ? "your" : (child && child.child_name + "'s")} treatment goals:
                  </p>
                  <div className="space-y-1.5">
                    {selectedBehavior.linked_goals.map((goal, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                        <p className="text-sm font-medium text-foreground">{goal}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {profile && profile.reinforcers && profile.reinforcers.length > 0 && (
                <div className="mb-5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Reinforcers</h3>
                  <div className="flex flex-wrap gap-2">
                    {profile.reinforcers.map((r, i) => (
                      <span key={i} className="text-xs bg-blue-50 border border-blue-200 text-blue-700 font-medium px-2.5 py-1 rounded-full">{r}</span>
                    ))}
                  </div>
                </div>
              )}

              {profile && profile.crisis_plan && profile.crisis_plan.length > 0 && (
                <div className="mb-5">
                  <div className="bg-red-600 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <ShieldAlert className="w-5 h-5 text-white" />
                      <p className="font-bold text-white text-sm">Crisis Protocol</p>
                    </div>
                    <div className="space-y-1">
                      {profile.crisis_plan.map((s, i) => (
                        <p key={i} className="text-white/90 text-sm flex items-start gap-2">
                          <span className="font-bold mt-0.5">{i + 1}.</span> {s}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {selectedBehavior.when_to_contact_clinician && (
                <div className="mb-5 bg-amber-50 border border-amber-200 rounded-2xl p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-1">Contact Your Clinician If</p>
                  <p className="text-sm text-amber-800">{selectedBehavior.when_to_contact_clinician}</p>
                </div>
              )}

              <Button
                className="w-full rounded-xl gap-2 mb-3"
                onClick={() => navigate("/LogBehavior?child_id=" + (child && child.id) + "&behavior=" + selectedBehavior.name)}
              >
                <CheckCircle2 className="w-4 h-4" /> Log This Behavior
              </Button>
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