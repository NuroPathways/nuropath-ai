import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  ArrowLeft, FileText, Plus, Upload, Download, User,
  Calendar, Brain, AlertTriangle, ChevronRight, Stethoscope
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const SEVERITY_STYLES = {
  low: "bg-green-100 text-green-700",
  moderate: "bg-yellow-100 text-yellow-700",
  high: "bg-orange-100 text-orange-700",
  crisis: "bg-red-100 text-red-700",
};

export default function ClientDetail() {
  const [child, setChild] = useState(null);
  const [plans, setPlans] = useState(null);
  const navigate = useNavigate();

  const childId = new URLSearchParams(window.location.search).get("child_id");

  useEffect(() => {
    if (!childId) { navigate("/ClinicianDashboard"); return; }
    const load = async () => {
      const [kids, ps] = await Promise.all([
        base44.entities.Child.filter({ id: childId }),
        base44.entities.BehaviorPlan.filter({ child_id: childId }),
      ]);
      setChild(kids[0] || null);
      setPlans(ps);
    };
    load();
  }, [childId, navigate]);

  const handleDownload = (plan) => {
    if (!plan.file_url) return;
    const a = document.createElement("a");
    a.href = plan.file_url;
    a.download = plan.file_name || plan.behavior_name + ".pdf";
    a.target = "_blank";
    a.click();
  };

  const loading = !child || plans === null;

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const uploadedPlans = plans.filter(p => p.file_url);
  const manualPlans = plans.filter(p => !p.file_url);

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto font-inter">
      {/* Back */}
      <button
        onClick={() => navigate("/ClinicianDashboard")}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </button>

      {/* Client Profile Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-2xl p-6 mb-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-primary text-2xl font-bold">
                {child.child_name?.[0]?.toUpperCase() || "?"}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{child.child_name}</h1>
              {child.age && (
                <p className="text-muted-foreground text-sm flex items-center gap-1.5 mt-1">
                  <Calendar className="w-3.5 h-3.5" /> Age {child.age}
                </p>
              )}
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(`/UploadBehaviorPlan?child_id=${childId}`)}
          >
            <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload Plan
          </Button>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          {child.diagnosis && (
            <InfoField icon={Stethoscope} label="Diagnosis" value={child.diagnosis} />
          )}
          {child.triggers && (
            <InfoField icon={AlertTriangle} label="Known Triggers" value={child.triggers} />
          )}
          {child.notes && (
            <InfoField icon={FileText} label="Notes" value={child.notes} fullWidth />
          )}
        </div>
      </motion.div>

      {/* Uploaded Files */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card border border-border rounded-2xl p-6 mb-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            Uploaded Behavior Plan Files
            <span className="text-xs text-muted-foreground font-normal">({uploadedPlans.length})</span>
          </h2>
        </div>

        {uploadedPlans.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-border rounded-xl">
            <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-3">No files uploaded yet</p>
            <Button size="sm" variant="outline" onClick={() => navigate(`/UploadBehaviorPlan?child_id=${childId}`)}>
              Upload First Plan
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {uploadedPlans.map((plan) => (
              <div key={plan.id} className="flex items-center justify-between p-3 bg-background border border-border rounded-xl">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {plan.file_name || plan.behavior_name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${SEVERITY_STYLES[plan.severity_level] || SEVERITY_STYLES.moderate}`}>
                        {plan.severity_level || "moderate"}
                      </span>
                      <span className="text-xs text-muted-foreground">{plan.behavior_name}</span>
                    </div>
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => handleDownload(plan)} className="flex-shrink-0 ml-2">
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Manually Created Plans */}
      {manualPlans.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card border border-border rounded-2xl p-6 mb-6"
        >
          <h2 className="font-semibold text-foreground flex items-center gap-2 mb-4">
            <Brain className="w-4 h-4 text-primary" />
            Manually Created Plans
            <span className="text-xs text-muted-foreground font-normal">({manualPlans.length})</span>
          </h2>
          <div className="space-y-2">
            {manualPlans.map((plan) => (
              <div key={plan.id}
                className="flex items-center justify-between p-3 bg-background border border-border rounded-xl cursor-pointer hover:border-primary/40 transition-all group"
                onClick={() => navigate(`/BehaviorPlanBuilder?child_id=${childId}&plan_id=${plan.id}`)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <Brain className="w-4 h-4 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{plan.behavior_name}</p>
                    {plan.strategy_title && <p className="text-xs text-muted-foreground mt-0.5">{plan.strategy_title}</p>}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => navigate(`/BehaviorPlanBuilder?child_id=${childId}`)}
        >
          <Plus className="w-4 h-4 mr-2" /> Create New Plan
        </Button>
        <Button
          className="w-full"
          onClick={() => navigate(`/UploadBehaviorPlan?child_id=${childId}`)}
        >
          <Upload className="w-4 h-4 mr-2" /> Upload Plan Document
        </Button>
      </div>
    </div>
  );
}

function InfoField({ icon: Icon, label, value, fullWidth }) {
  return (
    <div className={`bg-background border border-border rounded-xl p-4 ${fullWidth ? "sm:col-span-2" : ""}`}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  );
}