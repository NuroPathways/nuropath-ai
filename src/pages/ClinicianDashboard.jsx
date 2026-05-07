import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useFirebaseUser } from "@/lib/useFirebaseUser";
import { Collections } from "@/lib/firestore";
import { Users, FileText, Plus, TrendingUp, MessageCircle, BarChart2, Upload, Stethoscope, ShieldAlert, Database, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import ChildCard from "../components/clinician/ChildCard";
import AddClientModal from "../components/clinician/AddClientModal";
import AddChildToFamilyModal from "../components/clinician/AddChildToFamilyModal";

export default function ClinicianDashboard() {
  const navigate = useNavigate();
  const { user } = useFirebaseUser();
  const [children, setChildren] = useState([]);
  const [plans, setPlans] = useState([]);
  const [showAddFamily, setShowAddFamily] = useState(false);
  const [showAddChild, setShowAddChild] = useState(false);
  const [loading, setLoading] = useState(true);
  const [migrating, setMigrating] = useState(false);
  const [migrateResult, setMigrateResult] = useState(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const kids = await Collections.Child.filter({ clinician_id: user.id });
      setChildren(kids);
      let allPlans = [];
      if (kids.length > 0) {
        const results = await Promise.all(kids.map(k => Collections.BehaviorPlan.filter({ child_id: k.id })));
        allPlans = results.flat();
      }
      setPlans(allPlans);
      setLoading(false);
    };
    load();
  }, [user?.id]);

  const refresh = async () => {
    if (!user) return;
    const kids = await Collections.Child.filter({ clinician_id: user.id });
    setChildren(kids);
  };

  const stats = [
    { label: "Active Clients", value: children.length, icon: Users, color: "bg-primary/10 text-primary" },
    { label: "Behavior Plans", value: plans.length, icon: FileText, color: "bg-accent/10 text-accent" },
    { label: "Progress Reports", value: null, icon: BarChart2, color: "bg-secondary/10 text-secondary", link: "/ProgressReports" },
    { label: "Messages", value: null, icon: MessageCircle, color: "bg-green-100 text-green-700", link: "/Messages" },
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            onClick={() => s.link && navigate(s.link)}
            className={`bg-card rounded-2xl border border-border p-5 ${s.link ? "cursor-pointer hover:border-primary/40 transition-all" : ""}`}
          >
            <div className={`w-9 h-9 rounded-xl ${s.color} flex items-center justify-center mb-3`}>
              <s.icon className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold text-foreground">{loading ? "—" : (s.value ?? "→")}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Clients */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground">My Clients</h2>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl gap-1.5 text-xs h-8"
              onClick={() => setShowAddChild(true)}
            >
              <Plus className="w-3.5 h-3.5" />
              Add to Family
            </Button>
            <Button
              size="sm"
              className="rounded-xl bg-primary hover:bg-primary/90 gap-1.5 text-xs h-8"
              onClick={() => setShowAddFamily(true)}
            >
              <Plus className="w-3.5 h-3.5" />
              Add Client
            </Button>
          </div>
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
              onClick={() => setShowAddFamily(true)}
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

      {/* Migrate to Firestore */}
      {user?.role === 'admin' && (
        <div className="mb-8 bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Migrate Data to Firestore</p>
                <p className="text-xs text-muted-foreground">Export all records to your Firebase project</p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl gap-1.5 text-xs h-8"
              disabled={migrating}
              onClick={async () => {
                setMigrating(true);
                setMigrateResult(null);
                const res = await base44.functions.invoke('migrateToFirestore', {});
                setMigrateResult(res.data);
                setMigrating(false);
              }}
            >
              <Database className="w-3.5 h-3.5" />
              {migrating ? 'Migrating...' : 'Run Migration'}
            </Button>
          </div>
          {migrateResult && (
            <div className="mt-4 p-3 rounded-xl bg-muted text-xs space-y-1">
              {migrateResult.success ? (
                <>
                  <div className="flex items-center gap-1.5 text-green-700 font-medium mb-2">
                    <CheckCircle className="w-3.5 h-3.5" /> Migration complete
                  </div>
                  {Object.entries(migrateResult.results).map(([entity, info]) => (
                    <div key={entity} className="flex justify-between text-muted-foreground">
                      <span>{entity}</span>
                      <span>{info.error ? <span className="text-red-500">{info.error}</span> : `${info.migrated} migrated${info.errors ? `, ${info.errors} errors` : ''}`}</span>
                    </div>
                  ))}
                </>
              ) : (
                <div className="flex items-center gap-1.5 text-red-600">
                  <AlertCircle className="w-3.5 h-3.5" /> {migrateResult.error}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <ActionCard label="Create Intervention Plan" sub="Build step-by-step behavior plans" color="bg-primary" icon={ShieldAlert} onClick={() => navigate("/InterventionBuilder")} />
        <ActionCard label="Upload Documents" sub="PDFs, protocols, worksheets" color="bg-secondary" icon={Upload} onClick={() => navigate("/ClinicianDocuments")} />
        <ActionCard label="Progress Reports" sub="View behavior logs & trends" color="bg-accent" icon={BarChart2} onClick={() => navigate("/ProgressReports")} />
      </div>

      <AddClientModal
        open={showAddFamily}
        onClose={() => setShowAddFamily(false)}
        onSuccess={refresh}
        clinicianId={user?.id}
      />
      <AddChildToFamilyModal
        open={showAddChild}
        onClose={() => setShowAddChild(false)}
        onSuccess={refresh}
        clinicianId={user?.id}
      />
    </div>
  );
}

function ActionCard({ label, sub, color, icon: Icon, onClick }) {
  return (
    <div onClick={onClick} className={`${color} rounded-2xl p-6 flex items-center justify-between cursor-pointer group`}>
      <div>
        <p className="font-semibold text-white text-sm">{label}</p>
        <p className="text-white/70 text-xs mt-0.5">{sub}</p>
      </div>
      <div className="w-10 h-10 rounded-xl bg-white/20 group-hover:bg-white/30 flex items-center justify-center transition-colors flex-shrink-0">
        <Icon className="w-5 h-5 text-white" />
      </div>
    </div>
  );
}