import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { MessageSquare, Sparkles, Baby, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function ClientDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const me = await base44.auth.me();
      setUser(me);
      const kids = await base44.entities.Child.filter({ parent_id: me.id });
      setChildren(kids);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto font-inter">
      <div className="mb-8">
        <p className="text-muted-foreground text-sm mb-1">Welcome back</p>
        <h1 className="text-2xl font-bold text-foreground">{user?.full_name || "Client"}</h1>
      </div>

      {/* Ask AI CTA */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-6 mb-8"
      >
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-white/80" />
          <span className="text-white/80 text-xs font-medium uppercase tracking-wide">Aspire AI</span>
        </div>
        <p className="text-white font-semibold text-base mb-1">Need help right now?</p>
        <p className="text-white/70 text-sm">Ask about any behavior and get step-by-step guidance.</p>
        <Button
          className="mt-4 w-full bg-white text-primary hover:bg-white/90 font-medium rounded-xl h-10 text-sm gap-2"
          onClick={() => navigate("/AIChat")}
        >
          <MessageSquare className="w-4 h-4" />
          Ask Aspire AI
        </Button>
      </motion.div>

      {/* Children */}
      <div>
        <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
          <Baby className="w-4 h-4" /> My Children
        </h2>
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <div key={i} className="h-20 bg-muted rounded-2xl animate-pulse" />)}
          </div>
        ) : children.length === 0 ? (
          <div className="bg-card rounded-2xl border border-dashed border-border p-10 text-center">
            <Baby className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">No children linked yet</p>
            <p className="text-xs text-muted-foreground">Ask your clinician to connect your account to your child's profile.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {children.map((child, i) => (
              <motion.div
                key={child.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-card border border-border rounded-2xl p-5 flex items-center justify-between cursor-pointer hover:border-primary/50 transition-all group"
                onClick={() => navigate(`/ChildProfile?child_id=${child.id}`)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary text-xl font-bold">{child.child_name?.[0]?.toUpperCase() || "?"}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{child.child_name}</p>
                    {child.age && <p className="text-xs text-muted-foreground">Age {child.age}</p>}
                    {child.diagnosis && <p className="text-xs text-muted-foreground">{child.diagnosis}</p>}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}