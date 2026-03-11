import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { MessageSquare, FileText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import ChildOverviewCard from "../components/parent/ChildOverviewCard";
import BehaviorPlanSummary from "../components/parent/BehaviorPlanSummary";

export default function ParentDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [children, setChildren] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const me = await base44.auth.me();
      setUser(me);

      // Parents see children linked to them
      const kids = await base44.entities.Child.filter({ parent_id: me.id });

      // Also check by created_by (if parent was set up that way)
      let allKids = kids;
      if (kids.length === 0) {
        // Try fetching all children (in case parent_id wasn't set)
        const all = await base44.entities.Child.list();
        allKids = all;
      }

      setChildren(allKids);

      if (allKids.length > 0) {
        const ps = await base44.entities.BehaviorPlan.filter({ child_id: allKids[0].id });
        setPlans(ps);
      }

      setLoading(false);
    };
    load();
  }, []);

  const primaryChild = children[0] || null;

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto font-inter">
      <div className="mb-8">
        <p className="text-muted-foreground text-sm mb-1">Welcome back</p>
        <h1 className="text-2xl font-bold text-foreground">{user?.full_name || "Parent"}</h1>
      </div>

      {/* Ask Aspire AI — hero CTA */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-6 mb-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-white/80" />
              <span className="text-white/80 text-xs font-medium uppercase tracking-wide">Aspire AI</span>
            </div>
            <p className="text-white font-semibold text-base mb-1">Need help right now?</p>
            <p className="text-white/70 text-sm">Ask about any behavior and get step-by-step guidance from the plan.</p>
          </div>
        </div>
        <Button
          className="mt-4 w-full bg-white text-primary hover:bg-white/90 font-medium rounded-xl h-10 text-sm gap-2"
          onClick={() => navigate(createPageUrl("AIChat"))}
        >
          <MessageSquare className="w-4 h-4" />
          Ask Aspire AI
        </Button>
      </motion.div>

      {/* Child overview */}
      {loading ? (
        <div className="h-24 bg-muted rounded-2xl animate-pulse mb-6" />
      ) : primaryChild ? (
        <div className="mb-6">
          <h2 className="font-semibold text-foreground mb-3">Child Overview</h2>
          <ChildOverviewCard child={primaryChild} />
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-dashed border-border p-8 text-center mb-6">
          <p className="text-sm text-muted-foreground">No child profile linked yet. Ask your clinician to connect your account.</p>
        </div>
      )}

      {/* Behavior Plans */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold text-foreground">Active Behavior Plans</h2>
        </div>
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <div key={i} className="h-16 bg-muted rounded-2xl animate-pulse" />)}
          </div>
        ) : plans.length === 0 ? (
          <div className="bg-card rounded-2xl border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">No behavior plans yet. Your clinician will add them here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {plans.map((plan) => (
              <BehaviorPlanSummary key={plan.id} plan={plan} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}