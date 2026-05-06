import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Upload, FileText, Trash2, Loader2, Sparkles, CheckCircle2, X, Plus } from "lucide-react";
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

const AUTO_SYNC = ["treatment_plan", "behavior_protocol", "reinforcement_plan", "coping_strategy", "session_notes"];
const LABEL = "text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1";

function cleanTitle(fileName) {
  return fileName
    .replace(/\.[^/.]+$/, "")
    .replace(/[_\-]+/g, " ")
    .replace(/\b\w/g, l => l.toUpperCase())
    .trim();
}

export default function ClinicianDocuments() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [children, setChildren] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [clinicianId, setClinicianId] = useState("");

  // Per-file queue: [{ file, title, category, status: idle|uploading|done|error, docId }]
  const [queue, setQueue] = useState([]);
  const [childId, setChildId] = useState("");
  const [uploading, setUploading] = useState(false);

  // Background AI scan tracking: { [docId]: "scanning" | "done" }
  const [scanStatus, setScanStatus] = useState({});

  useEffect(() => {
    const load = async () => {
      const me = await base44.auth.me();
      setClinicianId(me.id);
      const kids = await base44.entities.Child.filter({ clinician_id: me.id });
      setChildren(kids);
      if (kids.length > 0) {
        const results = await Promise.all(kids.map(k => base44.entities.Document.filter({ child_id: k.id })));
        setDocuments(results.flat());
      }
      setLoading(false);
    };
    load();
  }, []);

  const addFiles = (fileList) => {
    const newItems = Array.from(fileList).map(f => ({
      id: Math.random().toString(36).slice(2),
      file: f,
      title: "",
      category: "treatment_plan",
      status: "idle",
    }));
    setQueue(q => [...q, ...newItems]);
  };

  const updateQueue = (id, patch) => setQueue(q => q.map(item => item.id === id ? { ...item, ...patch } : item));
  const removeFromQueue = (id) => setQueue(q => q.filter(item => item.id !== id));

  const handleDrop = (e) => {
    e.preventDefault();
    addFiles(e.dataTransfer.files);
  };

  const handleUploadAll = async () => {
    if (!childId || queue.length === 0) return;
    setUploading(true);

    // Upload all files in parallel
    await Promise.all(queue.map(async (item) => {
      updateQueue(item.id, { status: "uploading" });
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: item.file });
        const title = item.title.trim() || cleanTitle(item.file.name);
        const doc = await base44.entities.Document.create({
          child_id: childId,
          clinician_id: clinicianId,
          title,
          category: item.category,
          file_url,
          file_name: item.file.name,
        });
        updateQueue(item.id, { status: "done", docId: doc.id });
        setDocuments(prev => [doc, ...prev]);

        // Kick off AI scanning in background — non-blocking
        if (AUTO_SYNC.includes(item.category)) {
          setScanStatus(s => ({ ...s, [doc.id]: "scanning" }));
          scanDocumentInBackground(doc, clinicianId).then(() => {
            setScanStatus(s => ({ ...s, [doc.id]: "done" }));
          }).catch(() => {
            setScanStatus(s => { const n = { ...s }; delete n[doc.id]; return n; });
          });
        }
      } catch {
        updateQueue(item.id, { status: "error" });
      }
    }));

    setUploading(false);
    // Close form after all uploads done
    setTimeout(() => {
      setShowForm(false);
      setQueue([]);
      setChildId("");
    }, 1200);
  };

  const handleDelete = async (docId) => {
    await base44.entities.Document.delete(docId);
    setDocuments(prev => prev.filter(d => d.id !== docId));
  };

  const manualScan = async (doc) => {
    setScanStatus(s => ({ ...s, [doc.id]: "scanning" }));
    try {
      await scanDocumentInBackground(doc, clinicianId);
      setScanStatus(s => ({ ...s, [doc.id]: "done" }));
    } catch {
      setScanStatus(s => { const n = { ...s }; delete n[doc.id]; return n; });
    }
  };

  const childMap = Object.fromEntries(children.map(c => [c.id, c.child_name]));
  const allDone = queue.length > 0 && queue.every(i => i.status === "done" || i.status === "error");

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
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-card border border-border rounded-2xl p-5 mb-5 space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-foreground">Upload Documents</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Select multiple files at once. AI scanning runs in the background after upload.</p>
                </div>
                <button onClick={() => { setShowForm(false); setQueue([]); setChildId(""); }} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Client selector */}
              <div>
                <p className={LABEL}>Client *</p>
                <Select value={childId} onValueChange={setChildId}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select client" /></SelectTrigger>
                  <SelectContent>
                    {children.map(c => <SelectItem key={c.id} value={c.id}>{c.child_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Drop zone */}
              <div
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border hover:border-primary/60 rounded-xl p-6 text-center cursor-pointer transition-colors"
              >
                <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground">Drop files here or click to browse</p>
                <p className="text-xs text-muted-foreground mt-1">PDF, DOC, DOCX, PNG, JPG — select multiple</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={e => { addFiles(e.target.files); e.target.value = ""; }}
                />
              </div>

              {/* File queue */}
              {queue.length > 0 && (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {queue.map(item => (
                    <div key={item.id} className="bg-background border border-border rounded-xl p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="text-xs font-medium text-foreground truncate flex-1">{item.file.name}</span>
                        {item.status === "idle" && (
                          <button onClick={() => removeFromQueue(item.id)} className="text-muted-foreground hover:text-destructive flex-shrink-0">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {item.status === "uploading" && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary flex-shrink-0" />}
                        {item.status === "done" && <CheckCircle2 className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />}
                        {item.status === "error" && <span className="text-xs text-destructive flex-shrink-0">Failed</span>}
                      </div>
                      {item.status === "idle" && (
                        <div className="flex gap-2">
                          <Input
                            value={item.title}
                            onChange={e => updateQueue(item.id, { title: e.target.value })}
                            placeholder={cleanTitle(item.file.name)}
                            className="rounded-lg text-xs h-7 flex-1"
                          />
                          <Select value={item.category} onValueChange={v => updateQueue(item.id, { category: v })}>
                            <SelectTrigger className="rounded-lg h-7 text-xs w-40 flex-shrink-0">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CATEGORIES.map(c => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium py-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add more files
                  </button>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <Button
                  className="flex-1 rounded-xl gap-1.5"
                  onClick={handleUploadAll}
                  disabled={uploading || !childId || queue.length === 0 || allDone}
                >
                  {uploading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading {queue.filter(i => i.status === "uploading").length}/{queue.length}...</>
                    : allDone
                      ? <><CheckCircle2 className="w-4 h-4" /> All Uploaded!</>
                      : <><Upload className="w-4 h-4" /> Upload {queue.length > 0 ? `${queue.length} File${queue.length > 1 ? "s" : ""}` : ""}</>
                  }
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}</div>
        ) : documents.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-border rounded-2xl">
            <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium text-foreground mb-1">No documents uploaded yet</p>
            <p className="text-sm text-muted-foreground">Upload care documents, treatment plans, and behavioral protocols for your clients.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc, i) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-4 p-4 bg-card border border-border rounded-2xl"
              >
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <a href={doc.file_url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-foreground hover:text-primary truncate block">
                    {doc.title}
                  </a>
                  <p className="text-xs text-muted-foreground">{childMap[doc.child_id] || "Unknown"} • {doc.category?.replace(/_/g, " ")}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {scanStatus[doc.id] === "scanning" && (
                    <span className="flex items-center gap-1 text-xs text-primary font-medium">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Scanning...
                    </span>
                  )}
                  {scanStatus[doc.id] === "done" && (
                    <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Synced!
                    </span>
                  )}
                  {!scanStatus[doc.id] && (
                    <button
                      onClick={() => manualScan(doc)}
                      title="Extract behavior & intervention plans (runs in background)"
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Sparkles className="w-4 h-4" />
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

// Runs entirely in background — doesn't block UI
async function scanDocumentInBackground(doc, clinicianId = "") {
  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `You are a behavioral intervention specialist. Read this clinical document and extract ALL structured behavioral information concisely.

Document: "${doc.title}" (${doc.category})

Extract a primary intervention plan and all behavior plans. Be brief but complete.`,
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

  if (result.behavior_plans?.length > 0) {
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
}