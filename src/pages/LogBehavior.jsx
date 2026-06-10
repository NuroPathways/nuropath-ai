import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, CheckCircle2, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "sonner";

const LABEL = "text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5";

export default function LogBehavior() {
  const navigate = useNavigate();
  const { user: authUser, isLoadingAuth } = useAuth();
  const [children, setChildren] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const childIdParam = new URLSearchParams(window.location.search).get("child_id");
  const behaviorParam = new URLSearchParams(window.location.search).get("behavior") || "";

  const [form, setForm] = useState({
    child_id: childIdParam || "",
    behavior_type: behaviorParam,
    trigger: "",
    duration: "",
    intensity: "",
    intervention_used: "",
    outcome: "",
    notes: "",
  });

  const user = authUser;

  useEffect(() => {
    if (isLoadingAuth) return;
    const load = async () => {
      const me = authUser;
      if (!me) return;
      let kids = [];
      if (me.children && me.children.length > 0) {
        kids = me.children;
      } else {
        const byId = await base44.entities.Child.filter({ parent_id: me.id }).catch(() => []);
        const byEmail = me.email ? await base44.entities.Child.filter({ parent_email: me.email }).catch(() => []) : [];
        const seen = new Set();
        kids = [...byId, ...byEmail].filter(c => { if (seen.has(c.id)) return false; seen.add(c.id); return true; });
      }
      setChildren(kids);
      if (!form.child_id && kids[0]) setForm(f => ({ ...f, child_id: kids[0].id }));
    };
    load();
  }, [isLoadingAuth, authUser?.id]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = async () => {
    if (!form.child_id || !form.behavior_type) {
      toast.error("Please fill in the behavior type before saving.");
      return;
    }
    setSaving(true);
    try {
      await base44.entities.BehaviorLog.create({
        child_id: form.child_id,
        parent_id: user?.id,
        behavior_type: form.behavior_type,
        context: form.trigger,
        intensity: form.intensity || undefined,
        strategy_used: form.intervention_used,
        parent_feedback: form.outcome === "resolved" ? "yes" : form.outcome === "partially" ? "partially" : form.outcome === "escalated" ? "no" : undefined,
      });
      toast.success("Behavior logged successfully!");
      setSaved(true);
      setTimeout(() => navigate(-1), 1800);
    } catch (e) {
      toast.error("Couldn't save the behavior log. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (saved) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center px-6">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-10 h-10 text-green-500" />
        </div>
        <p className="font-bold text-foreground text-xl mb-1">Behavior Logged!</p>
        <p className="text-sm text-muted-foreground">Your clinician can now review this entry.</p>
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background font-inter">
      {/* Header */}
      <div className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, hsl(270,50%,55%) 0%, hsl(250,45%,60%) 100%)" }}>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-2 right-8 w-24 h-24 rounded-full bg-white" />
        </div>
        <div className="relative px-5 pt-5 pb-7 max-w-xl mx-auto">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-white/70 hover:text-white text-sm mb-5 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Log Behavior</h1>
              <p className="text-white/60 text-xs">Document what happened for your clinician</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-5 max-w-xl mx-auto space-y-4 -mt-1">
        {children.length > 1 && (
          <div className="bg-card border border-border rounded-2xl p-4">
            <p className={LABEL}>Child</p>
            <Select value={form.child_id} onValueChange={v => set("child_id", v)}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select child" /></SelectTrigger>
              <SelectContent>
                {children.map(c => <SelectItem key={c.id} value={c.id}>{c.child_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <h2 className="font-semibold text-foreground text-sm">What Happened?</h2>

          <div>
            <p className={LABEL}>Behavior Type *</p>
            <Input value={form.behavior_type} onChange={e => set("behavior_type", e.target.value)} placeholder="e.g. Meltdown, Aggression, Refusal" className="rounded-xl" />
          </div>

          <div>
            <p className={LABEL}>What happened before? (Trigger)</p>
            <Textarea value={form.trigger} onChange={e => set("trigger", e.target.value)} placeholder="Describe what seemed to trigger the behavior..." className="rounded-xl" rows={2} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className={LABEL}>Duration</p>
              <Input value={form.duration} onChange={e => set("duration", e.target.value)} placeholder="e.g. 10 mins" className="rounded-xl" />
            </div>
            <div>
              <p className={LABEL}>Severity</p>
              <Select value={form.intensity} onValueChange={v => set("intensity", v)}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">🟢 Low</SelectItem>
                  <SelectItem value="moderate">🟡 Moderate</SelectItem>
                  <SelectItem value="high">🔴 High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <h2 className="font-semibold text-foreground text-sm">What Did You Do?</h2>

          <div>
            <p className={LABEL}>Strategy / Intervention Used</p>
            <Textarea value={form.intervention_used} onChange={e => set("intervention_used", e.target.value)} placeholder="What strategy or approach did you try?" className="rounded-xl" rows={2} />
          </div>

          <div>
            <p className={LABEL}>How Did It Go?</p>
            <Select value={form.outcome} onValueChange={v => set("outcome", v)}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select outcome" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="resolved">✅ Resolved — Worked well</SelectItem>
                <SelectItem value="partially">🔄 Partially — Some improvement</SelectItem>
                <SelectItem value="escalated">⚠️ Escalated — Got worse</SelectItem>
                <SelectItem value="ongoing">⏳ Ongoing — Still happening</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <p className={LABEL}>Additional Notes</p>
            <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Anything else your clinician should know..." className="rounded-xl" rows={3} />
          </div>
        </motion.div>

        <Button
          onClick={handleSave}
          disabled={saving || !form.child_id || !form.behavior_type}
          className="w-full rounded-xl h-12 text-base font-semibold"
        >
          {saving ? "Saving..." : "Save Behavior Log"}
        </Button>
      </div>
    </div>
  );
}