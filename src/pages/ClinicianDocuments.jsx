import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Upload, FileText, Trash2, Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";

const CATEGORIES = [
  { key: "treatment_plan", label: "Treatment Plan" },
  { key: "behavior_protocol", label: "Behavior Protocol" },
  { key: "worksheet", label: "Worksheet" },
  { key: "session_notes", label: "Session Notes" },
  { key: "visual_schedule", label: "Visual Schedule" },
  { key: "reinforcement_plan", label: "Reinforcement Plan" },
  { key: "coping_strategy", label: "Coping Strategy" },
  { key: "other", label: "Other" },
];

const LABEL = "text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1";

export default function ClinicianDocuments() {
  const navigate = useNavigate();
  const [children, setChildren] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [clinicianId, setClinicianId] = useState("");
  const [form, setForm] = useState({ child_id: "", title: "", category: "treatment_plan", notes: "" });
  const [file, setFile] = useState(null);
  const [generatingPlan, setGeneratingPlan] = useState(null); // doc id being processed
  const [generatedMsg, setGeneratedMsg] = useState(null); // success doc id

  useEffect(() => {
    const load = async () => {
      const me = await base44.auth.me();
      setClinicianId(me.id);
      const kids = await base44.entities.Child.filter({ clinician_id: me.id });
      setChildren(kids);
      if (kids.length > 0) {
        const docPromises = kids.map(k => base44.entities.Document.filter({ child_id: k.id }));
        const results = await Promise.all(docPromises);
        setDocuments(results.flat());
      }
      setLoading(false);
    };
    load();
  }, []);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleUpload = async () => {
    if (!file || !form.child_id || !form.title) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const doc = await base44.entities.Document.create({
      child_id: form.child_id,
      clinician_id: clinicianId,
      title: form.title,
      category: form.category,
      file_url,
      file_name: file.name,
      notes: form.notes,
    });

    // Auto-sync: extract behavior plans and intervention plans from clinical documents immediately
    const autoSyncCategories = ["treatment_plan", "behavior_protocol", "reinforcement_plan", "coping_strategy", "session_notes"];
    if (autoSyncCategories.includes(form.category)) {
      generateInterventionPlan(doc).catch(() => {});
    }

    const allDocs = [];
    for (const kid of children) {
      const docs = await base44.entities.Document.filter({ child_id: kid.id });
      allDocs.push(...docs);
    }
    setDocuments(allDocs);
    setShowForm(false);
    setForm({ child_id: "", title: "", category: "treatment_plan", notes: "" });
    setFile(null);
    setUploading(false);
  };

  const handleDelete = async (docId) => {
    await base44.entities.Document.delete(docId);
    setDocuments(prev => prev.filter(d => d.id !== docId));
  };

  const generateInterventionPlan = async (doc) => {
    setGeneratingPlan(doc.id);
    setGeneratedMsg(null);

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a behavioral intervention specialist. Read the clinical document and extract ALL structured information from it.

Document title: "${doc.title}"
Category: ${doc.category}

Extract:
1. A primary intervention plan (behavior category + step-by-step guidance)
2. All behavior plans mentioned (behavior name, description, strategy steps, triggers)

Return ONLY valid JSON matching the schema.`,
      file_urls: [doc.file_url],
      response_json_schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          behavior_category: { type: "string", enum: ["tantrum_meltdown", "aggression", "anxiety_episode", "task_refusal", "bedtime_refusal", "school_refusal", "transition_difficulty", "emotional_dysregulation", "other"] },
          description: { type: "string" },
          immediate_steps: { type: "string" },
          deescalation_steps: { type: "string" },
          reinforcement_steps: { type: "string" },
          prevention_tips: { type: "string" },
          things_to_avoid: { type: "string" },
          emergency_instructions: { type: "string" },
          behavior_plans: {
            type: "array",
            items: {
              type: "object",
              properties: {
                behavior_name: { type: "string" },
                behavior_description: { type: "string" },
                behavior_function: { type: "string" },
                common_triggers: { type: "string" },
                severity_level: { type: "string", enum: ["low", "moderate", "high", "crisis"] },
                strategy_title: { type: "string" },
                strategy_steps: { type: "string" },
                reinforcement_method: { type: "string" },
                deescalation_steps: { type: "string" },
                avoid_actions: { type: "string" },
              },
              required: ["behavior_name"]
            }
          }
        },
        required: ["title", "behavior_category", "immediate_steps"]
      }
    });

    // Create the intervention plan
    await base44.entities.InterventionPlan.create({
      child_id: doc.child_id,
      clinician_id: clinicianId,
      title: result.title || doc.title,
      behavior_category: result.behavior_category || "other",
      description: result.description || "",
      immediate_steps: result.immediate_steps || "",
      deescalation_steps: result.deescalation_steps || "",
      reinforcement_steps: result.reinforcement_steps || "",
      prevention_tips: result.prevention_tips || "",
      things_to_avoid: result.things_to_avoid || "",
      emergency_instructions: result.emergency_instructions || "",
      is_active: true,
    });

    // Also create BehaviorPlan records for each behavior found — AI can read these immediately
    if (result.behavior_plans && result.behavior_plans.length > 0) {
      await Promise.all(result.behavior_plans.map(bp =>
        base44.entities.BehaviorPlan.create({
          child_id: doc.child_id,
          behavior_name: bp.behavior_name,
          behavior_description: bp.behavior_description || "",
          behavior_function: bp.behavior_function || "",
          common_triggers: bp.common_triggers || "",
          severity_level: bp.severity_level || "moderate",
          strategy_title: bp.strategy_title || "",
          strategy_steps: bp.strategy_steps || "",
          reinforcement_method: bp.reinforcement_method || "",
          deescalation_steps: bp.deescalation_steps || "",
          avoid_actions: bp.avoid_actions || "",
          file_url: doc.file_url,
          file_name: doc.file_name || doc.title,
          created_by: clinicianId,
        }).catch(() => {})
      ));
    }

    setGeneratingPlan(null);
    setGeneratedMsg(doc.id);
    setTimeout(() => setGeneratedMsg(null), 4000);
  };

  const childMap = Object.fromEntries(children.map(c => [c.id, c.child_name]));

  return (
    <div className="min-h-screen bg-background font-inter">
      <div className="sticky top-0 z-10 bg-card border-b border-border px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-foreground flex-1">Client Documents</h1>
        <Button size="sm" className="rounded-xl gap-1.5 h-8 text-xs" onClick={() => setShowForm(true)}>
          <Upload className="w-3.5 h-3.5" /> Upload
        </Button>
      </div>

      <div className="p-5 max-w-2xl mx-auto">
        <AnimatePresence>
          {showForm && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-card border border-border rounded-2xl p-5 mb-5 space-y-3">
              <div>
                <h3 className="font-semibold text-foreground">Upload Care Document</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Treatment plans, behavioral protocols, and session notes are automatically extracted and made available to the AI immediately after upload.</p>
              </div>
              <div>
                <p className={LABEL}>Client *</p>
                <Select value={form.child_id} onValueChange={v => set("child_id", v)}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>
                    {children.map(c => <SelectItem key={c.id} value={c.id}>{c.child_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className={LABEL}>Document Title *</p>
                <Input value={form.title} onChange={e => set("title", e.target.value)} placeholder="e.g. Behavior Protocol — Aggression" className="rounded-xl" />
              </div>
              <div>
                <p className={LABEL}>Category</p>
                <Select value={form.category} onValueChange={v => set("category", v)}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className={LABEL}>File *</p>
                <input type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" onChange={e => setFile(e.target.files[0])} className="text-sm text-muted-foreground" />
              </div>
              <div>
                <p className={LABEL}>Notes</p>
                <Input value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Optional notes..." className="rounded-xl" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => { setShowForm(false); setFile(null); }}>Cancel</Button>
                <Button className="flex-1 rounded-xl gap-1.5" onClick={handleUpload} disabled={uploading || !file || !form.child_id || !form.title}>
                  {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</> : <><Upload className="w-4 h-4" /> Upload</>}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}</div>
        ) : documents.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-border rounded-2xl">
            <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium text-foreground mb-1">No documents uploaded yet</p>
            <p className="text-sm text-muted-foreground">Upload care documents, treatment plans, and behavioral protocols for your clients.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc, i) => (
              <motion.div key={doc.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="flex items-center gap-4 p-4 bg-card border border-border rounded-2xl">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <a href={doc.file_url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-foreground hover:text-primary truncate block">{doc.title}</a>
                  <p className="text-xs text-muted-foreground">{childMap[doc.child_id] || "Unknown"} • {doc.category?.replace(/_/g, " ")}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {generatedMsg === doc.id ? (
                    <span className="flex items-center gap-1 text-xs text-green-600 font-medium"><CheckCircle2 className="w-3.5 h-3.5" /> Synced to AI!</span>
                  ) : (
                    <button
                      onClick={() => generateInterventionPlan(doc)}
                      disabled={generatingPlan === doc.id}
                      title="Extract behavior & intervention plans from this document (makes it available to AI immediately)"
                      className="text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
                    >
                      {generatingPlan === doc.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    </button>
                  )}
                  <button onClick={() => handleDelete(doc.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}