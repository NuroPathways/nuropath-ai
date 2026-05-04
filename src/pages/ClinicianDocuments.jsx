import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Upload, FileText, Trash2, Loader2 } from "lucide-react";
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
    await base44.entities.Document.create({
      child_id: form.child_id,
      clinician_id: clinicianId,
      title: form.title,
      category: form.category,
      file_url,
      file_name: file.name,
      notes: form.notes,
    });
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

  const childMap = Object.fromEntries(children.map(c => [c.id, c.child_name]));

  return (
    <div className="min-h-screen bg-background font-inter">
      <div className="sticky top-0 z-10 bg-card border-b border-border px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-foreground flex-1">Document Upload Center</h1>
        <Button size="sm" className="rounded-xl gap-1.5 h-8 text-xs" onClick={() => setShowForm(true)}>
          <Upload className="w-3.5 h-3.5" /> Upload
        </Button>
      </div>

      <div className="p-5 max-w-2xl mx-auto">
        <AnimatePresence>
          {showForm && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-card border border-border rounded-2xl p-5 mb-5 space-y-3">
              <h3 className="font-semibold text-foreground">Upload Document</h3>
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
            <p className="text-sm text-muted-foreground">Upload PDFs, protocols, and resources for your clients.</p>
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
                <button onClick={() => handleDelete(doc.id)} className="text-muted-foreground hover:text-destructive flex-shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}