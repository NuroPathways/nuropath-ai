import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Collections } from "@/lib/firestore";
import { auth } from "@/lib/firebase";
import { ArrowLeft, TrendingUp, BarChart2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";
import { format } from "date-fns";

export default function ProgressReports() {
  const navigate = useNavigate();
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState("");
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) { navigate("/"); return; }

    const load = async () => {
      try {
        const kids = await Collections.Child.filter({ clinician_id: firebaseUser.uid }).catch(() => []);
        setChildren(kids);
        if (kids.length > 0) {
          setSelectedChildId(kids[0].id);
          const allLogs = await Promise.all(
            kids.map(k => Collections.BehaviorLog.filter({ child_id: k.id }).catch(() => []))
          );
          setLogs(allLogs.flat());
        }
      } catch (e) {
        console.error("Failed to load data:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const childLogs = logs.filter(l => l.child_id === selectedChildId);
  const selectedChild = children.find(c => c.id === selectedChildId);

  const chartData = childLogs.slice(-14).map((log, i) => ({
    day: log.created_date?.toDate ? format(log.created_date.toDate(), "MMM d") : `Day ${i + 1}`,
    intensity: Number(log.intensity) || 0,
  }));

  const avgIntensity = childLogs.length
    ? (childLogs.reduce((a, b) => a + (Number(b.intensity) || 0), 0) / childLogs.length).toFixed(1)
    : 0;

  const strategyBreakdown = childLogs.reduce((acc, log) => {
    if (log.strategy_used) acc[log.strategy_used] = (acc[log.strategy_used] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background font-inter">
      <div className="sticky top-0 z-10 bg-card border-b border-border px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-foreground flex-1">Progress Reports</h1>
      </div>

      <div className="p-5 max-w-2xl mx-auto space-y-5">
        {children.length > 1 && (
          <Select value={selectedChildId} onValueChange={setSelectedChildId}>
            <SelectTrigger className="rounded-xl"><SelectValue placeholder="Select client" /></SelectTrigger>
            <SelectContent>{children.map(c => <SelectItem key={c.id} value={c.id}>{c.child_name}</SelectItem>)}</SelectContent>
          </Select>
        )}

        {loading ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-32 bg-muted rounded-2xl animate-pulse" />)}</div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3">
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-2xl p-4 text-center">
                <BarChart2 className="w-5 h-5 text-primary mx-auto mb-1" />
                <p className="text-2xl font-bold text-foreground">{childLogs.length}</p>
                <p className="text-xs text-muted-foreground">Total Logs</p>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-card border border-border rounded-2xl p-4 text-center">
                <TrendingUp className="w-5 h-5 text-orange-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-foreground">{avgIntensity}</p>
                <p className="text-xs text-muted-foreground">Avg Intensity</p>
              </motion.div>
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card border border-border rounded-2xl p-4 text-center">
                <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-foreground">{Object.keys(strategyBreakdown).length}</p>
                <p className="text-xs text-muted-foreground">Strategies Used</p>
              </motion.div>
            </div>

            {chartData.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-5">
                <h2 className="font-semibold text-foreground text-sm mb-4">Intensity Over Time (Last 14 Logs)</h2>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={chartData}>
                    <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 10]} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="intensity" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {Object.keys(strategyBreakdown).length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-5">
                <h2 className="font-semibold text-foreground text-sm mb-3">Strategy Usage</h2>
                <div className="space-y-2">
                  {Object.entries(strategyBreakdown).sort((a, b) => b[1] - a[1]).map(([strategy, count]) => (
                    <div key={strategy} className="flex items-center gap-3">
                      <p className="text-sm text-foreground flex-1 truncate">{strategy}</p>
                      <div className="flex items-center gap-2">
                        <div className="h-2 bg-primary rounded-full" style={{ width: `${(count / childLogs.length) * 100}px` }} />
                        <span className="text-xs text-muted-foreground w-6 text-right">{count}x</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {childLogs.length === 0 && (
              <div className="text-center py-14 border-2 border-dashed border-border rounded-2xl">
                <AlertTriangle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="font-medium text-foreground mb-1">No behavior logs yet</p>
                <p className="text-sm text-muted-foreground">Behavior logs will appear here as parents log incidents.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
