import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Brain, Stethoscope, Users, User, Baby, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function RoleSetup() {
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const [step, setStep] = useState("role"); // "role" | "parent_type"
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.me().then((u) => {
      setUser(u);
      if (u?.app_role === "clinician") navigate("/ClinicianDashboard");
      else if (u?.app_role === "parent") navigate("/ClientDashboard");
    }).catch(() => navigate("/"));
  }, [navigate]);

  const generateClinicianCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

  const selectRole = async (role) => {
    if (role === "parent") {
      setStep("parent_type");
      return;
    }
    setSaving(true);
    await base44.auth.updateMe({ app_role: "clinician", clinician_code: generateClinicianCode() });
    navigate("/ClinicianDashboard");
  };

  const selectParentType = async (type) => {
    // type: "self" (managing for themselves) or "with_child" (account shared with child)
    setSaving(true);
    await base44.auth.updateMe({ app_role: "parent", account_type: type });
    navigate("/Settings");
  };

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 font-inter">
      <AnimatePresence mode="wait">
        {step === "role" && (
          <motion.div key="role" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="text-center max-w-2xl w-full">
            <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
              <Brain className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-semibold text-foreground mb-2">Welcome!</h1>
            <p className="text-muted-foreground mb-8">Please select your role to continue.</p>

            <div className="grid md:grid-cols-2 gap-4">
              <button
                disabled={saving}
                onClick={() => selectRole("parent")}
                className="bg-card border-2 border-border hover:border-primary rounded-2xl p-8 transition-all group text-left"
              >
                <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center mb-3 group-hover:bg-accent/20 transition-colors">
                  <Users className="w-7 h-7 text-accent" />
                </div>
                <h2 className="text-xl font-semibold text-foreground mb-1">I'm a Parent / Guardian</h2>
                <p className="text-sm text-muted-foreground">Access AI guidance and support for my child</p>
              </button>

              <button
                disabled={saving}
                onClick={() => selectRole("clinician")}
                className="bg-card border-2 border-border hover:border-primary rounded-2xl p-8 transition-all group text-left"
              >
                <div className="w-14 h-14 rounded-xl bg-secondary/10 flex items-center justify-center mb-3 group-hover:bg-secondary/20 transition-colors">
                  <Stethoscope className="w-7 h-7 text-secondary" />
                </div>
                <h2 className="text-xl font-semibold text-foreground mb-1">I'm a Clinician</h2>
                <p className="text-sm text-muted-foreground">Manage clients and behavior plans</p>
              </button>
            </div>
          </motion.div>
        )}

        {step === "parent_type" && (
          <motion.div key="parent_type" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="text-center max-w-2xl w-full">
            <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-accent-foreground" />
            </div>
            <h1 className="text-2xl font-semibold text-foreground mb-2">Who is this account for?</h1>
            <p className="text-muted-foreground mb-8">This helps us personalize your experience.</p>

            <div className="grid md:grid-cols-2 gap-4">
              <button
                disabled={saving}
                onClick={() => selectParentType("self")}
                className="bg-card border-2 border-border hover:border-primary rounded-2xl p-8 transition-all group text-left"
              >
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                  <User className="w-7 h-7 text-primary" />
                </div>
                <h2 className="text-xl font-semibold text-foreground mb-1">Just for me</h2>
                <p className="text-sm text-muted-foreground">I am the parent or guardian managing this account on my own device</p>
              </button>

              <button
                disabled={saving}
                onClick={() => selectParentType("with_child")}
                className="bg-card border-2 border-border hover:border-primary rounded-2xl p-8 transition-all group text-left"
              >
                <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center mb-3 group-hover:bg-accent/20 transition-colors">
                  <Baby className="w-7 h-7 text-accent" />
                </div>
                <h2 className="text-xl font-semibold text-foreground mb-1">Me and my child</h2>
                <p className="text-sm text-muted-foreground">This device is shared — both my child and I will use this account</p>
              </button>
            </div>

            <button onClick={() => setStep("role")} className="mt-6 text-sm text-muted-foreground hover:text-foreground underline">
              ← Go back
            </button>

            {saving && <p className="mt-4 text-sm text-muted-foreground flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Setting up your account...</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}