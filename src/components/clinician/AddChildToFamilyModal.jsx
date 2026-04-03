import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { X, Baby, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";

const emptyChild = () => ({ child_name: "", age: "", diagnosis: "", triggers: "", is_patient: false });

export default function AddChildToFamilyModal({ open, onClose, onSuccess, clinicianId }) {
  const [families, setFamilies] = useState([]);
  const [selectedFamilyId, setSelectedFamilyId] = useState("");
  const [children, setChildren] = useState([emptyChild()]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && clinicianId) {
      base44.entities.Family.filter({ clinician_id: clinicianId }).then(setFamilies);
    }
  }, [open, clinicianId]);

  const updateChild = (i, k, v) => setChildren(c => c.map((x, idx) => idx === i ? { ...x, [k]: v } : x));
  const addChild = () => setChildren(c => [...c, emptyChild()]);
  const removeChild = (i) => setChildren(c => c.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    if (!selectedFamilyId) return;
    setSaving(true);

    const family = families.find(f => f.id === selectedFamilyId);
    // Get family's parent email from existing children in that family
    const existingKids = await base44.entities.Child.filter({ family_id: selectedFamilyId });
    const parentEmail = existingKids[0]?.parent_email;
    const parentId = existingKids[0]?.parent_id;

    for (const child of children) {
      if (!child.child_name.trim()) continue;
      await base44.entities.Child.create({
        child_name: child.child_name.trim(),
        age: child.age ? Number(child.age) : undefined,
        diagnosis: child.diagnosis || undefined,
        triggers: child.triggers || undefined,
        is_patient: child.is_patient || false,
        family_id: selectedFamilyId,
        clinician_id: clinicianId,
        parent_id: parentId,
        parent_email: parentEmail,
      });
    }

    setSaving(false);
    setChildren([emptyChild()]);
    setSelectedFamilyId("");
    onSuccess();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card rounded-2xl shadow-2xl w-full max-w-lg border border-border max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between p-6 border-b border-border flex-shrink-0">
          <div>
            <h2 className="font-semibold text-foreground text-base">Add Child to Existing Family</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Select a family and add new children</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* Family selector */}
          <div>
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Select Family *</Label>
            <select
              value={selectedFamilyId}
              onChange={e => setSelectedFamilyId(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">— Choose a family —</option>
              {families.map(f => (
                <option key={f.id} value={f.id}>{f.family_name}</option>
              ))}
            </select>
          </div>

          {/* Children */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Baby className="w-4 h-4 text-secondary" />
              <p className="text-sm font-medium text-foreground">Children to Add</p>
            </div>
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
                  <Input value={c.child_name} onChange={e => updateChild(i, "child_name", e.target.value)} placeholder="Full name" className="mt-1 rounded-xl border-border text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Age</Label>
                    <Input type="number" value={c.age} onChange={e => updateChild(i, "age", e.target.value)} placeholder="e.g. 8" className="mt-1 rounded-xl border-border text-sm" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Diagnosis</Label>
                    <Input value={c.diagnosis} onChange={e => updateChild(i, "diagnosis", e.target.value)} placeholder="e.g. ASD" className="mt-1 rounded-xl border-border text-sm" />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Known Triggers</Label>
                  <Textarea value={c.triggers} onChange={e => updateChild(i, "triggers", e.target.value)} placeholder="What commonly triggers difficult behaviors?" rows={2} className="mt-1 rounded-xl border-border resize-none text-sm" />
                </div>
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
        </div>

        <div className="px-6 pb-6 pt-4 border-t border-border flex gap-3 flex-shrink-0">
          <Button variant="outline" className="flex-1 rounded-xl" onClick={onClose}>Cancel</Button>
          <Button
            className="flex-1 rounded-xl bg-primary hover:bg-primary/90"
            onClick={handleSave}
            disabled={saving || !selectedFamilyId || !children.some(c => c.child_name.trim())}
          >
            {saving ? "Saving..." : "Add to Family"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}