import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Search, FileText, Download, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";

const CATEGORY_LABELS = {
  treatment_plan: "Treatment Plan",
  behavior_protocol: "Behavior Protocol",
  worksheet: "Worksheet",
  session_notes: "Session Notes",
  visual_schedule: "Visual Schedule",
  reinforcement_plan: "Reinforcement Plan",
  coping_strategy: "Coping Strategy",
  other: "Other",
};

const CATEGORY_COLORS = {
  treatment_plan: "bg-blue-100 text-blue-700",
  behavior_protocol: "bg-purple-100 text-purple-700",
  worksheet: "bg-green-100 text-green-700",
  session_notes: "bg-yellow-100 text-yellow-700",
  visual_schedule: "bg-orange-100 text-orange-700",
  reinforcement_plan: "bg-teal-100 text-teal-700",
  coping_strategy: "bg-pink-100 text-pink-700",
  other: "bg-gray-100 text-gray-700",
};

export default function DocumentCenter() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [children, setChildren] = useState([]);

  useEffect(() => {
    const load = async () => {
      const me = await base44.auth.me();
      const [byId, byEmail] = await Promise.all([
        base44.entities.Child.filter({ parent_id: me.id }),
        base44.entities.Child.filter({ parent_email: me.email }),
      ]);
      const seen = new Set();
      const merged = [...byId, ...byEmail].filter(c => { if (seen.has(c.id)) return false; seen.add(c.id); return true; });
      setChildren(merged);

      if (merged.length > 0) {
        const docPromises = merged.map(c => base44.entities.Document.filter({ child_id: c.id }));
        const results = await Promise.all(docPromises);
        setDocuments(results.flat());
      }

      // Also fetch behavior plans as accessible documents
      if (merged.length > 0) {
        const planPromises = merged.map(c => base44.entities.BehaviorPlan.filter({ child_id: c.id }));
        const planResults = await Promise.all(planPromises);
        const plans = planResults.flat().filter(p => p.file_url);
        const planDocs = plans.map(p => ({
          id: `plan_${p.id}`,
          title: p.behavior_name,
          category: "behavior_protocol",
          file_url: p.file_url,
          file_name: p.file_name || `${p.behavior_name}.pdf`,
          child_id: p.child_id,
        }));
        setDocuments(prev => [...prev, ...planDocs]);
      }
      setLoading(false);
    };
    load();
  }, []);

  const childMap = Object.fromEntries(children.map(c => [c.id, c.child_name]));

  const filtered = documents.filter(doc => {
    const matchSearch = search === "" || doc.title?.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === "all" || doc.category === filterCat;
    return matchSearch && matchCat;
  });

  const categories = [...new Set(documents.map(d => d.category).filter(Boolean))];

  return (
    <div className="min-h-screen bg-background font-inter">
      <div className="sticky top-0 z-10 bg-card border-b border-border px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-foreground flex-1">Document Center</h1>
        <span className="text-xs text-muted-foreground">{documents.length} files</span>
      </div>

      <div className="p-5 max-w-2xl mx-auto">
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search documents..." className="pl-9 rounded-xl" />
          </div>
        </div>

        {categories.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
            <button onClick={() => setFilterCat("all")} className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filterCat === "all" ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>
              All
            </button>
            {categories.map(cat => (
              <button key={cat} onClick={() => setFilterCat(cat)} className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filterCat === cat ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>
                {CATEGORY_LABELS[cat] || cat}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-border rounded-2xl">
            <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium text-foreground mb-1">No documents yet</p>
            <p className="text-sm text-muted-foreground">Your clinician will upload treatment plans and resources here.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((doc, i) => (
              <motion.a
                key={doc.id}
                href={doc.file_url}
                target="_blank"
                rel="noreferrer"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-4 p-4 bg-card border border-border rounded-2xl hover:border-primary/40 transition-all group"
              >
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{doc.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {doc.category && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${CATEGORY_COLORS[doc.category] || "bg-muted text-muted-foreground"}`}>
                        {CATEGORY_LABELS[doc.category] || doc.category}
                      </span>
                    )}
                    {doc.child_id && childMap[doc.child_id] && (
                      <span className="text-xs text-muted-foreground">{childMap[doc.child_id]}</span>
                    )}
                  </div>
                </div>
                <Download className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
              </motion.a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}