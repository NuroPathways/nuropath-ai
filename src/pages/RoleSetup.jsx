import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Brain, Stethoscope, Users, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

// This page is shown after first login when no role is set yet
export default function RoleSetup() {
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.me().then((u) => {
      setUser(u);
      // If role already set, redirect
      if (u?.app_role === "clinician") navigate("/ClinicianDashboard");
      else if (u?.app_role === "parent") navigate("/ParentDashboard");
    }).catch(() => navigate("/"));
  }, [navigate]);

  const selectRole = async (role) => {
    setSaving(true);
    await base44.auth.updateMe({ app_role: role });
    if (role === "clinician") navigate("/ClinicianDashboard");
    else navigate("/ParentDashboard");
  };

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 font-inter">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-2xl w-full">
        <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
          <Brain className="w-8 h-8 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-semibold text-foreground mb-2">Welcome!</h1>
        <p className="text-muted-foreground mb-8">Please select your role to continue.</p>

        <div className="grid md:grid-cols-2 gap-4">
          <button
            disabled={saving}
            onClick={() => selectRole("parent")}
            className="bg-card border-2 border-border hover:border-primary rounded-2xl p-8 transition-all group"
          >
            <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-3 group-hover:bg-accent/20 transition-colors">
              <Users className="w-7 h-7 text-accent" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-1">I'm a Parent</h2>
            <p className="text-sm text-muted-foreground">Access AI guidance for my child</p>
          </button>

          <button
            disabled={saving}
            onClick={() => selectRole("clinician")}
            className="bg-card border-2 border-border hover:border-primary rounded-2xl p-8 transition-all group"
          >
            <div className="w-14 h-14 rounded-xl bg-secondary/10 flex items-center justify-center mx-auto mb-3 group-hover:bg-secondary/20 transition-colors">
              <Stethoscope className="w-7 h-7 text-secondary" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-1">I'm a Clinician</h2>
            <p className="text-sm text-muted-foreground">Manage clients and behavior plans</p>
          </button>
        </div>
        {saving && <p className="mt-4 text-sm text-muted-foreground flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Setting up your account...</p>}
      </motion.div>
    </div>
  );
}