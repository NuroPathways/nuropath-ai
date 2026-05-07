import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, AlertCircle, FileText, Star, ClipboardList, MessageCircle, AlertTriangle, Stethoscope, Calendar, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const SEVERITY_STYLES = {
  low: "bg-green-100 text-green-700",
  moderate: "bg-yellow-100 text-yellow-700",
  high: "bg-orange-100 text-orange-700",
  crisis: "bg-red-100 text-red-700",
};

export default function ChildProfile() {
  const navigate = useNavigate();
  const [child, setChild] = useState(null);
  const [plans, setPlans] = useState([]);
  const [interventionPlans, setInterventionPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  const childId = new URLSearchParams(window.location.search).get("child_id");

  useEffect(() => {
    if (!childId) { navigate("/ClientDashboard"); return; }
    const load = async () => {
      const [kids, ps, ips] = await Promise.all([
        base44.entities.Child.filter({ id: childId }),
        base44.entities.BehaviorPlan.filter({ child_id: childId }),
        base44.entities.InterventionPlan.filter({ child_id: childId }),
      ]);
      setChild(kids[0] || null);
      setPlans(ps);
      setInterventionPlans(ips);
      setLoading(false);
    };
    load();
  }, [childId, navigate]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!child) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-muted-foreground">Child not found.</p>
    </div>
  );

  return (
    <div className="p-5 md:p-8 max-w-2xl mx-auto font-inter">
      <button onClick={() => navigate("/ClientDashboard")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-5">
        <ArrowLeft className="w-4 h-4" /> Dashboard
      </button>

      {/* Profile */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-2xl p-5 mb-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-primary text-2xl font-bold">{child.child_name?.[0]?.toUpperCase() || "?"}</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">{child.child_name}</h1>
            <div className="flex flex-wrap gap-3 mt-1">
              {child.age && <p className="text-muted-foreground text-xs flex items-center gap-1"><Calendar className="w-3 h-3" /> Age {child.age}</p>}
              {child.diagnosis && <p className="text-muted-foreground text-xs flex items-center gap-1"><Stethoscope className="w-3 h-3" /> {child.diagnosis}</p>}
            </div>
          </div>
        </div>
        {child.triggers && (
          <div className="mt-4 bg-background border border-border rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <AlertTriangle className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Known Triggers</span>
            </div>
            <p className="text-sm text-foreground">{child.triggers}</p>
          </div>
        )}
      </motion.div>

      {/* Help Now */}
      <motion.button
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => navigate(`/HelpNow?child_id=${childId}`)}
        className="w-full bg-red-600 hover:bg-red-700 rounded-2xl p-5 mb-5 flex items-center justify-between text-left transition-colors"
      >
        <div className="flex items-center gap-3">
          <AlertCircle className="w-7 h-7 text-white" />
          <div>
            <p className="text-white font-bold">I Need Help Now</p>
            <p className="text-white/70 text-xs">Get step-by-step intervention guidance</p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-white/70" />
      </motion.button>

      {/* Quick Actions */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-3 gap-3 mb-5">
        <ActionBtn icon={ClipboardList} label="Log" color="text-purple-600 bg-purple-50" onClick={() => navigate(`/LogBehavior?child_id=${childId}`)} />
        <ActionBtn icon={Star} label="Rewards" color="text-yellow-600 bg-yellow-50" onClick={() => navigate(`/RewardTracker?child_id=${childId}`)} />
        <ActionBtn icon={MessageCircle} label="Message" color="text-green-600 bg-green-50" onClick={() => navigate("/Messages")} />
      </motion.div>

      {/* Intervention Plans */}
      {interventionPlans.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-card border border-border rounded-2xl p-5 mb-5">
          <h2 className="font-semibold text-foreground flex items-center gap-2 mb-3 text-sm">
            <AlertCircle className="w-4 h-4 text-primary" /> Intervention Plans ({interventionPlans.length})
          </h2>
          <div className="space-y-2">
            {interventionPlans.map(ip => (
              <button key={ip.id} onClick={() => navigate(`/HelpNow?child_id=${childId}`)} className="w-full flex items-center gap-3 p-3 bg-background border border-border rounded-xl hover:border-primary/40 transition-all text-left">
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{ip.title}</p>
                  <p className="text-xs text-muted-foreground">{ip.behavior_category?.replace(/_/g, " ")}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Behavior Plans (legacy docs) */}
      {plans.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card border border-border rounded-2xl p-5">
          <h2 className="font-semibold text-foreground flex items-center gap-2 mb-3 text-sm">
            <FileText className="w-4 h-4 text-primary" /> Clinical Documents ({plans.length})
          </h2>
          <div className="space-y-2">
            {plans.map(plan => (
              <div key={plan.id} className="flex items-center justify-between p-3 bg-background border border-border rounded-xl">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{plan.behavior_name}</p>
                    {plan.severity_level && (
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${SEVERITY_STYLES[plan.severity_level] || SEVERITY_STYLES.moderate}`}>
                        {plan.severity_level}
                      </span>
                    )}
                  </div>
                </div>
                {plan.file_url && (
                  <a href={plan.file_url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline ml-2 flex-shrink-0">View</a>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

function ActionBtn({ icon: Icon, label, color, onClick }) {
  return (
    <button onClick={onClick} className={`border border-border rounded-2xl p-4 flex flex-col items-center gap-1.5 bg-card hover:border-primary/40 transition-all`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-4.5 h-4.5" />
      </div>
      <span className="text-xs font-medium text-foreground">{label}</span>
    </button>
  );
}