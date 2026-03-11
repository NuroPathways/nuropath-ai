import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Brain } from "lucide-react";
import { motion } from "framer-motion";

export default function Splash() {
  const navigate = useNavigate();

  useEffect(() => {
    const check = async () => {
      await new Promise((r) => setTimeout(r, 1800));
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) {
        navigate(createPageUrl("Login"));
        return;
      }
      const user = await base44.auth.me();
      if (!user.role) {
        navigate(createPageUrl("RoleSelection"));
      } else if (user.role === "clinician") {
        navigate(createPageUrl("ClinicianDashboard"));
      } else {
        navigate(createPageUrl("ParentDashboard"));
      }
    };
    check();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-primary flex flex-col items-center justify-center font-inter">
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="flex flex-col items-center gap-6"
      >
        <div className="w-24 h-24 rounded-3xl bg-white/20 flex items-center justify-center shadow-2xl">
          <Brain className="w-12 h-12 text-white" />
        </div>
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white tracking-tight">Aspire AI</h1>
          <p className="text-white/70 mt-2 text-base font-medium">Behavior support, powered by intelligence</p>
        </div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-4 flex gap-1.5"
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-white/60"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}