import { useState } from "react";
import { Loader2, CheckCircle2, RefreshCw, Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";

// Reusable AI scan / re-scan control for a single document.
// Rebuilds the child's full ClientProfile from their documents — the same reliable
// source of truth used by Help Now.
export default function DocScanButton({ doc, clinicianId, onScanned }) {
  const initial = doc.scan_status === "done" ? "done" : doc.scan_status === "scanning" ? "scanning" : "pending";
  const [status, setStatus] = useState(initial);

  const runScan = async () => {
    if (!clinicianId || status === "scanning") return;
    setStatus("scanning");
    try {
      const res = await base44.functions.invoke('buildClientProfile', { child_id: doc.child_id });
      if (res.data?.error) throw new Error(res.data.error);
      await base44.entities.Document.update(doc.id, { scan_status: "done" }).catch(() => {});
      setStatus("done");
      onScanned?.(doc.id);
    } catch {
      setStatus("error");
    }
  };

  if (status === "scanning") {
    return (
      <span className="flex items-center gap-1 text-xs text-primary font-medium">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Scanning...
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {status === "done" && (
        <span className="hidden sm:flex items-center gap-1 text-xs text-green-600 font-medium">
          <CheckCircle2 className="w-3.5 h-3.5" /> Synced
        </span>
      )}
      {status === "error" && (
        <span className="text-xs text-destructive font-medium">Failed</span>
      )}
      <button
        onClick={runScan}
        title={status === "done" ? "Re-scan document with AI" : "Scan document with AI"}
        className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg border border-border hover:border-primary hover:text-primary text-muted-foreground transition-colors"
      >
        {status === "done" ? <RefreshCw className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
        {status === "done" ? "Re-scan" : "Scan"}
      </button>
    </div>
  );
}