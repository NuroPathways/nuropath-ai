import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Brain, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function ClinicianLogin() {
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.me().then((user) => {
      if (user?.app_role === "clinician") navigate("/ClinicianDashboard");
      else if (user?.app_role === "parent") navigate("/ClientDashboard");
      else if (user) navigate("/RoleSetup");
    }).catch(() => {});
  }, [navigate]);

  const handleLogin = () => {
    base44.auth.redirectToLogin(window.location.origin + "/ClinicianDashboard");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 font-inter">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md text-center"
      >
        <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
          <Brain className="w-8 h-8 text-primary-foreground" />
        </div>
        <div className="inline-block px-3 py-1 rounded-full bg-secondary/10 text-secondary text-xs font-semibold uppercase tracking-wider mb-3">Clinician Login</div>
        <h1 className="text-2xl font-semibold text-foreground mb-2">Clinician Sign In</h1>
        <p className="text-sm text-muted-foreground mb-8">Access your clinical dashboard and client behavior plans</p>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
          <div className="w-14 h-14 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-4">
            <Stethoscope className="w-7 h-7 text-secondary" />
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Sign in or create an account to access your clinical dashboard.
          </p>
          <Button onClick={handleLogin} className="w-full" size="lg">
            Sign In / Create Account
          </Button>
        </div>

        <button
          onClick={() => navigate("/")}
          className="mt-6 text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to welcome page
        </button>
      </motion.div>
    </div>
  );
}
