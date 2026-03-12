import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Users, FileText, Plus, TrendingUp, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import ChildCard from "../components/clinician/ChildCard";
import AddChildModal from "../components/clinician/AddChildModal";

export default function ClinicianDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [children, setChildren] = useState([]);
  const [plans, setPlans] = useState([]);
  const [showAddChild, setShowAddChild] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const me = await base44.auth.me();
      setUser(me);
      const [kids, ps] = await Promise.all([
        base44.entities.Child.filter({ clinician_id: me.id }),
        base44.entities.BehaviorPlan.filter({ created_by: me.id }),
      ]);
      setChildren(kids);
      setPlans(ps);
      setLoading(false);
    };
    load();
  }, []);

  const refresh = async () => {
    if (!user) return;
    const kids = await base44.entities.Child.filter({ clinician_id: user.id });
    setChildren(kids);
  };

  const stats = [
    { label: "Active Clients", value: children.length, icon: Users, color: "bg-primary/10 text-primary" },
    { label: "Behavior Plans", value: plans.length, icon: FileText, color: "bg-accent/10 text-accent" },
  ];

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto font-inter">
      {/* Header */}
      <div className="mb-8">
        <p className="text-muted-foreground text-sm mb-1">Good morning</p>
        <h1 className="text-2xl font-bold text-foreground">
          {user?.full_name || "Clinician"}
        </h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-card rounded-2xl border border-border p-5"
          >
            <div className={`w-9 h-9 rounded-xl ${s.color} flex items-center justify-center mb-3`}>
              <s.icon className="w-4.5 h-4.5" />
            </div>
            <p className="text-2xl font-bold text-foreground">{loading ? "—" : s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Clients */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground">My Clients</h2>
          <Button
            size="sm"
            className="rounded-xl bg-primary hover:bg-primary/90 gap-1.5 text-xs h-8"
            onClick={() => setShowAddChild(true)}
          >
            <Plus className="w-3.5 h-3.5" />
            Add Client
          </Button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : children.length === 0 ? (
          <div className="bg-card rounded-2xl border border-dashed border-border p-10 text-center">
            <Users className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">No clients yet</p>
            <p className="text-xs text-muted-foreground mb-4">Add your first client to get started</p>
            <Button
              size="sm"
              className="rounded-xl bg-primary hover:bg-primary/90 gap-1.5"
              onClick={() => setShowAddChild(true)}
            >
              <Plus className="w-3.5 h-3.5" />
              Add Client
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {children.map((child) => (
              <ChildCard key={child.id} child={child} />
            ))}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          className="bg-primary rounded-2xl p-6 flex items-center justify-between cursor-pointer group"
          onClick={() => navigate(createPageUrl("BehaviorPlanBuilder"))}
        >
          <div>
            <p className="font-semibold text-white text-sm">Create Behavior Plan</p>
            <p className="text-white/70 text-xs mt-0.5">Build a new plan for a client</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/20 group-hover:bg-white/30 flex items-center justify-center transition-colors">
            <FileText className="w-5 h-5 text-white" />
          </div>
        </div>

        <div
          className="bg-secondary rounded-2xl p-6 flex items-center justify-between cursor-pointer group"
          onClick={() => navigate("/UploadBehaviorPlan")}
        >
          <div>
            <p className="font-semibold text-white text-sm">Upload Behavior Plan</p>
            <p className="text-white/70 text-xs mt-0.5">Import existing plan documents</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/20 group-hover:bg-white/30 flex items-center justify-center transition-colors">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
        </div>
      </div>

      <AddChildModal
        open={showAddChild}
        onClose={() => setShowAddChild(false)}
        onSuccess={refresh}
        clinicianId={user?.id}
      />
    </div>
  );
}