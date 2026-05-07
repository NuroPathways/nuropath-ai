import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Collections } from "@/lib/firestore";
import { auth } from "@/lib/firebase";
import { ArrowLeft, User, FileText, Trash2, Edit2, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";

export default function ClientDetail() {
  const navigate = useNavigate();
  const childId = new URLSearchParams(window.location.search).get("child_id");
  const [child, setChild] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!childId) { navigate("/ClinicianDashboard"); return; }
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) { navigate("/"); return; }

    const load = async () => {
      const [childData, behaviorPlans] = await Promise.all([
        Collections.Child.get(childId),
        Collections.BehaviorPlan.filter({ child_id: childId }),
      ]);
      setChild(childData);
      setEditForm(childData || {});
      setPlans(behaviorPlans);
      setLoading(false);
    };
    load();
  }, [childId]);

  const handleSave = async () => {
    setSaving(true);
    await Collections.Child.update(childId, {
      child_name: editForm.child_name,
      age: editForm.age,
      diagnosis: editForm.diagnosis,
      notes: editForm.notes,
      triggers: editForm.triggers,
    });
    setChild(prev => ({ ...prev, ...editForm }));
    setEditing(false);
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this client? This cannot be undone.")) return;
    setDeleting(true);
    await Collections.Child.delete(childId);
    navigate("/ClinicianDashboard");
  };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!child) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Client not found.</p></div>;

  return (
    <div className="min-h-screen bg-background font-inter">
      <div className="sticky top-0 z-10 bg-card border-b border-border px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="font-bold text-foreground flex-1">{child.child_name}</h1>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <Button size="sm" variant="outline" className="rounded-xl h-8" onClick={() => setEditing(false)}><X className="w-3.5 h-3.5" /></Button>
              <Button size="sm" className="rounded-xl h-8" onClick={handleSave} disabled={saving}><Save className="w-3.5 h-3.5 mr-1" />{saving ? "Saving..." : "Save"}</Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="outline" className="rounded-xl h-8" onClick={() => setEditing(true)}><Edit2 className="w-3.5 h-3.5" /></Button>
              <Button size="sm" variant="destructive" className="rounded-xl h-8" onClick={handleDelete} disabled={deleting}><Trash2 className="w-3.5 h-3.5" /></Button>
            </>
          )}
        </div>
      </div>

      <div className="p-5 max-w-2xl mx-auto space-y-5">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <User className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="font-bold text-foreground">{child.child_name}</p>
              <p className="text-xs text-muted-foreground">Age {child.age}{child.diagnosis ? ` · ${child.diagnosis}` : ""}</p>
            </div>
          </div>

          {editing ? (
            <div className="space-y-3">
              <div><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Name</p><Input value={editForm.child_name || ""} onChange={e => setEditForm(f => ({ ...f, child_name: e.target.value }))} className="rounded-xl" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Age</p><Input value={editForm.age || ""} onChange={e => setEditForm(f => ({ ...f, age: e.target.value }))} className="rounded-xl" /></div>
                <div><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Diagnosis</p><Input value={editForm.diagnosis || ""} onChange={e => setEditForm(f => ({ ...f, diagnosis: e.target.value }))} className="rounded-xl" /></div>
              </div>
              <div><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Triggers</p><Textarea value={editForm.triggers || ""} onChange={e => setEditForm(f => ({ ...f, triggers: e.target.value }))} className="rounded-xl" rows={2} /></div>
              <div><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Notes</p><Textarea value={editForm.notes || ""} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} className="rounded-xl" rows={3} /></div>
            </div>
          ) : (
            <div className="space-y-3">
              {child.diagnosis && <div><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Diagnosis</p><p className="text-sm text-foreground mt-0.5">{child.diagnosis}</p></div>}
              {child.triggers && <div><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Triggers</p><p className="text-sm text-foreground mt-0.5">{child.triggers}</p></div>}
              {child.notes && <div><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Notes</p><p className="text-sm text-foreground mt-0.5">{child.notes}</p></div>}
            </div>
          )}
        </motion.div>

        <div>
          <h2 className="font-semibold text-foreground text-sm mb-3 px-1">Behavior Plans ({plans.length})</h2>
          {plans.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed border-border rounded-2xl">
              <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No behavior plans yet.</p>
              <Button size="sm" className="mt-3 rounded-xl" onClick={() => navigate(`/BehaviorPlanBuilder?child_id=${childId}`)}>Create Plan</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {plans.map((plan, i) => (
                <motion.div key={plan.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-card border border-border rounded-2xl p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-foreground text-sm">{plan.behavior_name}</p>
                      {plan.severity_level && <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${plan.severity_level === "crisis" ? "bg-red-100 text-red-700" : plan.severity_level === "high" ? "bg-orange-100 text-orange-700" : plan.severity_level === "moderate" ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}`}>{plan.severity_level}</span>}
                    </div>
                  </div>
                  {plan.behavior_description && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{plan.behavior_description}</p>}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
