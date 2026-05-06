import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, TrendingUp, BarChart2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";
import { format } from "date-fns";

const INTENSITY_COLORS = { low: "#22c55e", moderate: "#f59e0b", high: "#ef4444" };

export default function ProgressReports() {
  const navigate = useNavigate();
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState("all");
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      let me;
      try {
        me = await base44.auth.me();
      } catch {
        navigate("/");
        return;
      }

      // If a parent lands here somehow, redirect them to their dashboard
      if (me.app_role !== "clinician") {
        navigate("/ParentDashboard");
        return;
      }

      const kids = await base44.entities.Child.filter({ clinician_id: me.id }).catch(() => []);
      setChildren(kids);
      if (kids.length > 0) {
        const results = await Promise.all(
          kids.map(k => base44.entities.BehaviorLog.filter({ child_id: k.id }).catch(() => []))
        );
        setLogs(results.flat());
      }
      setLoading(false);
    };
    load();
  }, []);

  const filteredLogs = selectedChildId === "all"
    ? logs
    : logs.filter(l => l.child_id === selectedChildId);

  const childName = selectedChildId === "all"
    ? "All Clients"
    : children.find(c => c.id === selectedChildId)?.child_name || "";

  // Behavior frequency by type
  const behaviorFreq = {};
  filteredLogs.forEach(l => {
    if (l.behavior_type) behaviorFreq[l.behavior_type] = (behaviorFreq[l.behavior_type] || 0) + 1;
  });
  const freqData = Object.entries(behaviorFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name: name.length > 18 ? name.slice(0, 16) + "\u2026" : name, count }));

  // Outcome breakdown
  const outcomeCount = { resolved: 0, partially: 0, escalated: 0, ongoing: 0 };
  filteredLogs.forEach(l => { if (l.outcome) outcomeCount[l.outcome] = (outcomeCount[l.outcome] || 0) + 1; });

  // Intensity breakdown
  const intensityCount = { low: 0, moderate: 0, high: 0 };
  filteredLogs.forEach(l => { if (l.intensity) intensityCount[l.intensity] = (intensityCount[l.intensity] || 0) + 1; });

  const total = filteredLogs.length;

  const STAT_CARDS = [
    { label: "Total Logs", value: total, icon: BarChart2, color: "bg-primary/10 text-primary" },
    { label: "Resolved", value: outcomeCount.resolved, icon: CheckCircle2, color: "bg-green-100 text-green-700" },
    { label: "Escalated", value: outcomeCount.escalated, icon: AlertTriangle, color: "bg-red-100 text-red-700" },
    { label: "High Intensity", value: intensityCount.high, icon: TrendingUp, color: "bg-orange-100 text-orange-700" },
  ];

  // Sort logs newest first (without mutating state)
  const sortedLogs = [...filteredLogs].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  return (
    <div className="min-h-screen bg-background font-inter">
      <div className="sticky top-0 z-10 bg-card border-b border-border px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-foreground flex-1">Progress Reports</h1>
      </div>

      <div className="p-5 max-w-3xl mx-auto">
        <div className="mb-5">
          <Select value={selectedChildId} onValueChange={setSelectedChildId}>
            <SelectTrigger className="rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              {children.map(c => <SelectItem key={c.id} value={c.id}>{c.child_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1,2,3,4].map(i => <div key={i} className="h-24 bg-muted rounded-2xl animate-pulse" />)}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {STAT_CARDS.map((s, i) => (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="bg-card border border-border rounded-2xl p-4"
                >
                  <div className={`w-9 h-9 rounded-xl ${s.color} flex items-center justify-center mb-2`}>
                    <s.icon className="w-4 h-4" />
                  </div>
                  <p className="text-2xl font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </motion.div>
              ))}
            </div>

            {freqData.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-border rounded-2xl p-5 mb-5"
              >
                <h2 className="font-semibold text-foreground text-sm mb-4">
                  Behavior Frequency — {childName}
                </h2>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={freqData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>
            )}

            {/* Recent logs */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-2xl p-5"
            >
              <h2 className="font-semibold text-foreground text-sm mb-4">Recent Behavior Logs</h2>
              {sortedLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No behavior logs yet.</p>
              ) : (
                <div className="space-y-2">
                  {sortedLogs.slice(0, 20).map(log => {
                    const child = children.find(c => c.id === log.child_id);
                    return (
                      <div key={log.id} className="flex items-start gap-3 p-3 bg-background border border-border rounded-xl">
                        <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${
                          log.intensity === "high" ? "bg-red-500"
                          : log.intensity === "moderate" ? "bg-yellow-500"
                          : "bg-green-500"
                        }`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                            <p className="text-sm font-medium text-foreground truncate">{log.behavior_type || "Behavior"}</p>
                            {child && <span className="text-xs text-muted-foreground">• {child.child_name}</span>}
                            {log.created_date && (
                              <span className="text-xs text-muted-foreground ml-auto flex-shrink-0">
                                {format(new Date(log.created_date), "MMM d, h:mm a")}
                              </span>
                            )}
                          </div>
                          {log.context && <p className="text-xs text-muted-foreground truncate">{log.context}</p>}
                          {log.strategy_used && <p className="text-xs text-muted-foreground">Strategy: {log.strategy_used}</p>}
                        </div>
                        {log.outcome && (
                          <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                            log.outcome === "resolved" ? "bg-green-100 text-green-700"
                            : log.outcome === "escalated" ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                          }`}>
                            {log.outcome}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
