import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";

const LABEL = "text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1";

export default function LogBehavior() {
  const navigate = useNavigate();
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

  const { user } = useFirebaseUser();

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [byId, byEmail] = await Promise.all([
        Collections.Child.filter({ parent_id: user.id }),
        Collections.Child.filter({ parent_email: user.email }),
      ]);
      const seen = new Set();
      const merged = [...byId, ...byEmail].filter(c => { if (seen.has(c.id)) return false; seen.add(c.id); return true; });
      setChildren(merged);
      if (!form.child_id && merged[0]) setForm(f => ({ ...f, child_id: merged[0].id }));
    };
    load();
  }, [user?.id]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = async () => {
    if (!form.child_id || !form.behavior_type) return;
    setSaving(true);
    await Collections.BehaviorLog.create({
      child_id: form.child_id,
      behavior_type: form.behavior_type,
      context: form.trigger,
      intensity: form.intensity || undefined,
      strategy_used: form.intervention_used,
      notes: form.notes,
      duration: form.duration,
      outcome: form.outcome,
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => navigate(-1), 1500);
  };

  if (saved) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-3" />
        <p className="font-semibold text-foreground text-lg">Behavior Logged!</p>
        <p className="text-sm text-muted-foreground">Your clinician can review this log.</p>
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background font-inter">
      <div className="sticky top-0 z-10 bg-card border-b border-border px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-foreground">Log Behavior</h1>
      </div>

      <div className="p-5 max-w-xl mx-auto space-y-4">
        {children.length > 1 && (
          <div>
            <p className={LABEL}>Child</p>
            <Select value={form.child_id} onValueChange={v => set("child_id", v)}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select child" /></SelectTrigger>
              <SelectContent>
                {children.map(c => <SelectItem key={c.id} value={c.id}>{c.child_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        <div>
          <p className={LABEL}>Behavior Type *</p>
          <Input value={form.behavior_type} onChange={e => set("behavior_type", e.target.value)} placeholder="e.g. Meltdown, Aggression" className="rounded-xl" />
        </div>

        <div>
          <p className={LABEL}>Trigger / What happened before?</p>
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
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="moderate">Moderate</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <p className={LABEL}>Intervention Used</p>
          <Textarea value={form.intervention_used} onChange={e => set("intervention_used", e.target.value)} placeholder="What strategy did you use?" className="rounded-xl" rows={2} />
        </div>

        <div>
          <p className={LABEL}>Outcome</p>
          <Select value={form.outcome} onValueChange={v => set("outcome", v)}>
            <SelectTrigger className="rounded-xl"><SelectValue placeholder="How did it go?" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="resolved">Resolved — Worked well</SelectItem>
              <SelectItem value="partially">Partially — Some improvement</SelectItem>
              <SelectItem value="escalated">Escalated — Got worse</SelectItem>
              <SelectItem value="ongoing">Ongoing — Still happening</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <p className={LABEL}>Additional Notes</p>
          <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Any other details..." className="rounded-xl" rows={3} />
        </div>

        <Button onClick={handleSave} disabled={saving || !form.child_id || !form.behavior_type} className="w-full rounded-xl h-11">
          {saving ? "Saving..." : "Save Log"}
        </Button>
      </div>
    </div>
  );
}