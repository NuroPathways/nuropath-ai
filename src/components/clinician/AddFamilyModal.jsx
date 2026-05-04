import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, Plus, Trash2, ChevronRight, ChevronLeft, Users, User, Baby } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";

const emptyGuardian = () => ({ name: "", relationship: "", email: "" });
const emptyChild = () => ({ child_name: "", age: "", diagnosis: "", triggers: "", notes: "", is_patient: false });

export default function AddFamilyModal({ open, onClose, onSuccess, clinicianId }) {
  const [step, setStep] = useState(0); // 0=Family, 1=Guardians, 2=Children
  const [saving, setSaving] = useState(false);
  const [family, setFamily] = useState({ family_name: "", notes: "" });
  const [guardians, setGuardians] = useState([emptyGuardian()]);
  const [children, setChildren] = useState([emptyChild()]);

  const setFam = (k, v) => setFamily(p => ({ ...p, [k]: v }));

  const updateGuardian = (i, k, v) => setGuardians(g => g.map((x, idx) => idx === i ? { ...x, [k]: v } : x));
  const addGuardian = () => setGuardians(g => [...g, emptyGuardian()]);
  const removeGuardian = (i) => setGuardians(g => g.filter((_, idx) => idx !== i));

  const updateChild = (i, k, v) => setChildren(c => c.map((x, idx) => idx === i ? { ...x, [k]: v } : x));
  const addChild = () => setChildren(c => [...c, emptyChild()]);
  const removeChild = (i) => setChildren(c => c.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    setSaving(true);
    // Create Family
    const fam = await base44.entities.Family.create({
      family_name: family.family_name.trim(),
      notes: family.notes || undefined,
      clinician_id: clinicianId,
    });

    // Create children — store guardian email directly, no User.list() needed
    for (const child of children) {
      if (!child.child_name.trim()) continue;
      const primaryGuardianEmail = guardians[0]?.email || undefined;
      await base44.entities.Child.create({
        child_name: child.child_name.trim(),
        age: child.age ? Number(child.age) : undefined,
        diagnosis: child.diagnosis || undefined,
        triggers: child.triggers || undefined,
        notes: child.notes || undefined,
        is_patient: child.is_patient || false,
        family_id: fam.id,
        clinician_id: clinicianId,
        parent_email: primaryGuardianEmail,
      });
    }

    setSaving(false);
    // reset
    setStep(0);
    setFamily({ family_name: "", notes: "" });
    setGuardians([emptyGuardian()]);
    setChildren([emptyChild()]);
    onSuccess();
    onClose();
  };

  const steps = ["Family", "Guardians", "Children"];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card rounded-2xl shadow-2xl w-full max-w-lg border border-border max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border flex-shrink-0">
          <div>
            <h2 className="font-semibold text-foreground text-base">Add New Family</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Step {step + 1} of 3 — {steps[step]}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="px-6 pt-4 flex gap-2 flex-shrink-0">
          {steps.map((s, i) => (
            <div key={s} className={`flex-1 h-1.5 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-muted"}`} />
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {step === 0 && (
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Family Name *</Label>
                <Input
                  value={family.family_name}
                  onChange={(e) => setFam("family_name", e.target.value)}
                  placeholder="e.g. The Johnson Family"
                  className="mt-1.5 rounded-xl border-border"
                />
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Notes (optional)</Label>
                <Textarea
                  value={family.notes}
                  onChange={(e) => setFam("notes", e.target.value)}
                  placeholder="Any general notes about this family..."
                  rows={3}
                  className="mt-1.5 rounded-xl border-border resize-none"
                />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
                <User className="w-6 h-6 text-accent" />
              </div>
              <p className="text-xs text-muted-foreground -mt-2">Add the parent(s) or guardian(s) for this family.</p>
              {guardians.map((g, i) => (
                <div key={i} className="bg-background border border-border rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">Guardian {i + 1}</p>
                    {guardians.length > 1 && (
                      <button onClick={() => removeGuardian(i)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Full Name</Label>
                      <Input value={g.name} onChange={(e) => updateGuardian(i, "name", e.target.value)} placeholder="Full name" className="mt-1 rounded-xl border-border text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Relationship</Label>
                      <Input value={g.relationship} onChange={(e) => updateGuardian(i, "relationship", e.target.value)} placeholder="e.g. Mother" className="mt-1 rounded-xl border-border text-sm" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Email (to link app account)</Label>
                    <Input type="email" value={g.email} onChange={(e) => updateGuardian(i, "email", e.target.value)} placeholder="parent@email.com" className="mt-1 rounded-xl border-border text-sm" />
                  </div>
                </div>
              ))}
              <button onClick={addGuardian} className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium">
                <Plus className="w-4 h-4" /> Add Another Guardian
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center mb-4">
                <Baby className="w-6 h-6 text-secondary" />
              </div>
              <p className="text-xs text-muted-foreground -mt-2">Add the children in this family. Check "Is the patient/client" for the child receiving services.</p>
              {children.map((c, i) => (
                <div key={i} className="bg-background border border-border rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">Child {i + 1}</p>
                    {children.length > 1 && (
                      <button onClick={() => removeChild(i)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Child's Name *</Label>
                    <Input value={c.child_name} onChange={(e) => updateChild(i, "child_name", e.target.value)} placeholder="Full name" className="mt-1 rounded-xl border-border text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Age</Label>
                      <Input type="number" value={c.age} onChange={(e) => updateChild(i, "age", e.target.value)} placeholder="e.g. 8" className="mt-1 rounded-xl border-border text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Diagnosis</Label>
                      <Input value={c.diagnosis} onChange={(e) => updateChild(i, "diagnosis", e.target.value)} placeholder="e.g. ASD" className="mt-1 rounded-xl border-border text-sm" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Known Triggers</Label>
                    <Textarea value={c.triggers} onChange={(e) => updateChild(i, "triggers", e.target.value)} placeholder="What commonly triggers difficult behaviors?" rows={2} className="mt-1 rounded-xl border-border resize-none text-sm" />
                  </div>
                  {/* Is Patient checkbox */}
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div
                      onClick={() => updateChild(i, "is_patient", !c.is_patient)}
                      className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors flex-shrink-0 ${c.is_patient ? "bg-primary border-primary" : "border-border bg-background"}`}
                    >
                      {c.is_patient && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                    <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">This is the patient / client</span>
                  </label>
                </div>
              ))}
              <button onClick={addChild} className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium">
                <Plus className="w-4 h-4" /> Add Another Child
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3 flex-shrink-0 border-t border-border pt-4">
          {step > 0 && (
            <Button variant="outline" className="flex-1 rounded-xl gap-1.5" onClick={() => setStep(s => s - 1)}>
              <ChevronLeft className="w-4 h-4" /> Back
            </Button>
          )}
          {step < 2 ? (
            <Button
              className="flex-1 rounded-xl gap-1.5 bg-primary hover:bg-primary/90"
              disabled={step === 0 && !family.family_name.trim()}
              onClick={() => setStep(s => s + 1)}
            >
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              className="flex-1 rounded-xl bg-primary hover:bg-primary/90"
              onClick={handleSave}
              disabled={saving || !children.some(c => c.child_name.trim())}
            >
              {saving ? "Saving..." : "Save Family"}
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
}