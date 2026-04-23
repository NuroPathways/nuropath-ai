import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Brain, Users, Stethoscope, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export default function Splash() {
  const navigate = useNavigate();

  useEffect(() => {
    // If already logged in, redirect based on role
    base44.auth.me().then((user) => {
      if (user?.app_role === "clinician") navigate("/ClinicianDashboard");else
      if (user?.app_role === "parent") navigate("/ClientDashboard");else
      if (user) navigate("/RoleSetup"); // logged in but no role set
    }).catch(() => {}); // not logged in, show the welcome screen
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 font-inter">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-4xl">
        
        <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-6">
          <Brain className="w-10 h-10 text-primary-foreground" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-3">Welcome to NuroP AI

        </h1>
        <p className="text-muted-foreground text-lg md:text-xl mb-12 max-w-2xl mx-auto">
          Clinical behavioral support assistant helping families implement evidence-based strategies
        </p>

        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
            <button
              onClick={() => navigate("/ClientLogin")}
              className="w-full bg-card border-2 border-border hover:border-primary rounded-2xl p-8 transition-all group">
              
              <div className="w-16 h-16 rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-accent/20 transition-colors">
                <Users className="w-8 h-8 text-accent" />
              </div>
              <h2 className="text-2xl font-semibold text-foreground mb-2">I'm a Parent</h2>
              <p className="text-muted-foreground mb-4">Access support strategies for your child</p>
              <div className="flex items-center justify-center gap-2 text-primary font-medium">
                Continue <ArrowRight className="w-4 h-4" />
              </div>
            </button>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
            <button
              onClick={() => navigate("/ClinicianLogin")}
              className="w-full bg-card border-2 border-border hover:border-primary rounded-2xl p-8 transition-all group">
              
              <div className="w-16 h-16 rounded-xl bg-secondary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-secondary/20 transition-colors">
                <Stethoscope className="w-8 h-8 text-secondary" />
              </div>
              <h2 className="text-2xl font-semibold text-foreground mb-2">I'm a Clinician</h2>
              <p className="text-muted-foreground mb-4">Manage behavior plans and client cases</p>
              <div className="flex items-center justify-center gap-2 text-primary font-medium">
                Continue <ArrowRight className="w-4 h-4" />
              </div>
            </button>
          </motion.div>
        </div>
      </motion.div>
    </div>);

}