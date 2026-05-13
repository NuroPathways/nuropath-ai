import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { MessageSquare, Sparkles, Baby, ChevronRight, AlertCircle, FileText, Star, ClipboardList, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function ParentDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const me = await base44.auth.me().catch(() => null);
      if (!me) { navigate("/"); return; }
      setUser(me);
      const kids = await base44.entities.Child.filter({ parent_id: me.id }).catch(() => []);
      setChildren(kids);
      setLoading(false);
    };
    load();
  }, []);

  const firstName = user?.full_name?.split(" ")[0] || "there";

  return (
    <div className="min-h-screen bg-background font-inter">
      {/* Hero */}
      <div className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, hsl(216,38%,47%) 0%, hsl(180,29%,55%) 100%)" }}>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-2 right-8 w-32 h-32 rounded-full bg-white" />
          <div className="absolute -bottom-6 left-12 w-48 h-48 rounded-full bg-white" />
        </div>
        <div className="relative px-6 py-10 max-w-2xl mx-auto">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <span className="text-white/80 text-sm font-medium">NuroPathways</span>
          </div>
          <p className="text-white/70 text-sm">Welcome back,</p>
          <h1 className="text-2xl md:text-3xl font-bold text-white mt-0.5 mb-1">{loading ? "..." : firstName} 👋</h1>
          <p className="text-white/60 text-sm">Here's your family's support hub</p>
        </div>
      </div>

      <div className="px-5 py-6 max-w-2xl mx-auto space-y-6">

        {/* Emergency Help */}
        <motion.button
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate("/HelpNow")}
          className="w-full bg-red-600 hover:bg-red-700 rounded-2xl p-5 flex items-center justify-between text-left transition-colors shadow-lg shadow-red-200"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-base">I Need Help Right Now</p>
              <p className="text-white/70 text-xs">Get instant clinician-approved guidance</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-white/70" />
        </motion.button>

        {/* AI Chat CTA */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="bg-gradient-to-br from-primary/5 to-accent/10 border border-primary/20 rounded-2xl p-5"
        >
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-primary text-xs font-semibold uppercase tracking-wide">Aspire AI</span>
          </div>
          <p className="text-foreground font-semibold mb-1">Questions about your child's plan?</p>
          <p className="text-muted-foreground text-sm mb-4">Ask about schedules, behavior strategies, treatment summaries and more.</p>
          <Button
            className="w-full gap-2 rounded-xl"
            onClick={() => navigate("/AIChat")}
          >
            <MessageSquare className="w-4 h-4" /> Chat with Aspire AI
          </Button>
        </motion.div>

        {/* Quick Links */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Quick Access</h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Documents", icon: FileText, color: "bg-blue-50 text-blue-600", path: "/DocumentCenter" },
              { label: "Rewards", icon: Star, color: "bg-yellow-50 text-yellow-600", path: "/RewardTracker" },
              { label: "Messages", icon: MessageSquare, color: "bg-green-50 text-green-600", path: "/Messages" },
            ].map((item, i) => (
              <motion.button
                key={item.label}
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 + i * 0.05 }}
                onClick={() => navigate(item.path)}
                className="bg-card border border-border rounded-2xl p-4 flex flex-col items-center gap-2 hover:border-primary/30 hover:shadow-sm transition-all"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.color}`}>
                  <item.icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold text-foreground">{item.label}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Children */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Baby className="w-4 h-4 text-primary" /> My Children
          </h2>
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map(i => <div key={i} className="h-20 bg-muted rounded-2xl animate-pulse" />)}
            </div>
          ) : children.length === 0 ? (
            <div className="bg-card rounded-2xl border-2 border-dashed border-border p-10 text-center">
              <Baby className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">No children linked yet</p>
              <p className="text-xs text-muted-foreground">Ask your clinician to connect your account to your child's profile.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {children.map((child, i) => (
                <motion.div
                  key={child.id}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 + i * 0.08 }}
                  className="bg-card border border-border rounded-2xl p-5 flex items-center justify-between cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all group"
                  onClick={() => navigate(`/ChildProfile?child_id=${child.id}`)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary text-xl font-bold">{child.child_name?.[0]?.toUpperCase() || "?"}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{child.child_name}</p>
                      <div className="flex gap-3 mt-0.5">
                        {child.age && <p className="text-xs text-muted-foreground">Age {child.age}</p>}
                        {child.diagnosis && <p className="text-xs text-muted-foreground">{child.diagnosis}</p>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="hidden sm:flex gap-1.5">
                      <div onClick={e => { e.stopPropagation(); navigate(`/HelpNow?child_id=${child.id}`); }} className="px-2 py-1 rounded-lg bg-red-50 text-red-600 text-xs font-medium hover:bg-red-100 transition-colors">Help</div>
                      <div onClick={e => { e.stopPropagation(); navigate(`/LogBehavior?child_id=${child.id}`); }} className="px-2 py-1 rounded-lg bg-purple-50 text-purple-600 text-xs font-medium hover:bg-purple-100 transition-colors">Log</div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

      </div>
    </div>
  );
}