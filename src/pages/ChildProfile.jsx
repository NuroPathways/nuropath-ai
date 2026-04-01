import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, FileText, MessageSquare, User, Calendar, Stethoscope, AlertTriangle, Download } from "lucide-react";
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
  const [loading, setLoading] = useState(true);

  const childId = new URLSearchParams(window.location.search).get("child_id");

  useEffect(() => {
    if (!childId) { navigate("/ParentDashboard"); return; }
    const load = async () => {
      const [kids, ps] = await Promise.all([
        base44.entities.Child.filter({ id: childId }),
        base44.entities.BehaviorPlan.filter({ child_id: childId }),
      ]);
      setChild(kids[0] || null);
      setPlans(ps);
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
    <div className="p-6 md:p-8 max-w-3xl mx-auto font-inter">
      <button
        onClick={() => navigate("/ParentDashboard")}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </button>

      {/* Profile Card */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-primary text-3xl font-bold">{child.child_name?.[0]?.toUpperCase() || "?"}</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{child.child_name}</h1>
            {child.age && (
              <p className="text-muted-foreground text-sm flex items-center gap-1.5 mt-1">
                <Calendar className="w-3.5 h-3.5" /> Age {child.age}
              </p>
            )}
            {child.diagnosis && (
              <p className="text-muted-foreground text-sm flex items-center gap-1.5 mt-0.5">
                <Stethoscope className="w-3.5 h-3.5" /> {child.diagnosis}
              </p>
            )}
          </div>
        </div>

        {child.triggers && (
          <div className="mt-4 bg-background border border-border rounded-xl p-4">
            <div className="flex items-center gap-1.5 mb-1">
              <AlertTriangle className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Known Triggers</span>
            </div>
            <p className="text-sm text-foreground">{child.triggers}</p>
          </div>
        )}
      </motion.div>

      {/* Ask AI CTA */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-5 mb-6"
      >
        <p className="font-semibold text-white mb-1">Need guidance right now?</p>
        <p className="text-white/70 text-sm mb-4">Aspire AI will use {child.child_name}'s behavior plans to give you step-by-step support.</p>
        <Button
          className="w-full bg-white text-primary hover:bg-white/90 font-medium rounded-xl h-10 text-sm gap-2"
          onClick={() => navigate(`/AIChat?child_id=${childId}`)}
        >
          <MessageSquare className="w-4 h-4" />
          Ask AI For Guidance
        </Button>
      </motion.div>

      {/* Behavior Plans */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-card border border-border rounded-2xl p-6"
      >
        <h2 className="font-semibold text-foreground flex items-center gap-2 mb-4">
          <FileText className="w-4 h-4 text-primary" />
          Behavior Plans
          <span className="text-xs text-muted-foreground font-normal">({plans.length})</span>
        </h2>

        {plans.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-border rounded-xl">
            <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No behavior plans yet. Your clinician will add them here.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {plans.map((plan) => (
              <div key={plan.id} className="flex items-center justify-between p-3 bg-background border border-border rounded-xl">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-primary" />
                  </div>
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
                  <a href={plan.file_url} target="_blank" rel="noreferrer">
                    <Button size="sm" variant="ghost"><Download className="w-4 h-4" /></Button>
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}