import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  MessageSquare, Baby, ChevronRight, AlertCircle, FileText,
  Star, Brain, ClipboardList, TrendingUp, Bell, Calendar,
  Activity, Shield, BookOpen, Zap, ArrowUpRight, Heart
} from "lucide-react";
import { motion } from "framer-motion";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function ParentDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [children, setChildren] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const me = await base44.auth.me().catch(() => null);
      if (!me) return;
      setUser(me);

      const [kids, msgs] = await Promise.all([
        base44.entities.Child.filter({ parent_id: me.id }).catch(() => []),
        base44.entities.Message.filter({ to_user_id: me.id }).catch(() => []),
      ]);
      setChildren(kids);
      setUnreadMessages(msgs.filter(m => !m.is_read).length);

      if (kids.length > 0) {
        const logs = await base44.entities.BehaviorLog.filter({ parent_id: me.id }, "-created_date", 5).catch(() => []);
        setRecentLogs(logs);
      }

      setLoading(false);
    };
    load();
  }, []);

  const firstName = user?.full_name?.split(" ")[0] || "there";
  const totalChildren = children.length;

  return (
    <div className="min-h-screen bg-background font-inter">

      {/* Hero Header */}
      <div className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, hsl(216,38%,42%) 0%, hsl(180,29%,50%) 100%)" }}>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 right-10 w-40 h-40 rounded-full bg-white" />
          <div className="absolute -bottom-8 left-20 w-56 h-56 rounded-full bg-white" />
        </div>
        <div className="relative px-6 md:px-10 py-10 max-w-5xl mx-auto">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <Brain className="w-4 h-4 text-white" />
                </div>
                <span className="text-white/80 text-sm font-medium">NuroPathways</span>
              </div>
              <p className="text-white/70 text-sm">{getGreeting()},</p>
              <h1 className="text-2xl md:text-3xl font-bold text-white mt-0.5 mb-1">
                {loading ? "..." : firstName} 👋
              </h1>
              <p className="text-white/60 text-sm">Your family's behavioral support hub</p>
            </div>
            {unreadMessages > 0 && (
              <button
                onClick={() => navigate("/Messages")}
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 transition-colors rounded-xl px-3 py-2 text-white text-xs font-medium"
              >
                <Bell className="w-3.5 h-3.5" />
                {unreadMessages} new
              </button>
            )}
          </div>

          {/* Stat pills */}
          <div className="grid grid-cols-3 gap-3 mt-8">
            {[
              { label: "Children", value: loading ? "—" : totalChildren, icon: Baby },
              { label: "Logs This Week", value: loading ? "—" : recentLogs.length, icon: Activity },
              { label: "Messages", value: loading ? "—" : unreadMessages, icon: MessageSquare },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                className="bg-white/15 backdrop-blur-sm rounded-2xl p-3 border border-white/20 text-center"
              >
                <s.icon className="w-4 h-4 text-white/70 mx-auto mb-1" />
                <p className="text-xl font-bold text-white">{s.value}</p>
                <p className="text-xs text-white/60">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-5 md:px-10 py-7 max-w-5xl mx-auto space-y-7">

        {/* Emergency Help — always top */}
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
          <ChevronRight className="w-5 h-5 text-white/70 flex-shrink-0" />
        </motion.button>

        {/* My Children */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Baby className="w-4 h-4 text-primary" /> My Children
            </h2>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map(i => <div key={i} className="h-24 bg-muted rounded-2xl animate-pulse" />)}
            </div>
          ) : children.length === 0 ? (
            <div className="bg-card rounded-2xl border-2 border-dashed border-border p-10 text-center">
              <Baby className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">No children linked yet</p>
              <p className="text-xs text-muted-foreground">Ask your clinician to connect your account.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {children.map((child, i) => (
                <motion.div
                  key={child.id}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.07 }}
                  className="bg-card border border-border rounded-2xl p-5 cursor-pointer hover:border-primary/40 hover:shadow-md transition-all group"
                  onClick={() => navigate(`/ChildProfile?child_id=${child.id}`)}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary text-lg font-bold">{child.child_name?.[0]?.toUpperCase() || "?"}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground truncate">{child.child_name}</p>
                      <div className="flex gap-2 mt-0.5 flex-wrap">
                        {child.age && <span className="text-xs text-muted-foreground">Age {child.age}</span>}
                        {child.diagnosis && <span className="text-xs text-muted-foreground truncate">{child.diagnosis}</span>}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                  </div>

                  {/* Quick action buttons */}
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={e => { e.stopPropagation(); navigate(`/HelpNow?child_id=${child.id}`); }}
                      className="py-2 rounded-xl bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100 transition-colors flex flex-col items-center gap-1"
                    >
                      <Zap className="w-3.5 h-3.5" /> Help Now
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); navigate(`/LogBehavior?child_id=${child.id}`); }}
                      className="py-2 rounded-xl bg-purple-50 text-purple-600 text-xs font-semibold hover:bg-purple-100 transition-colors flex flex-col items-center gap-1"
                    >
                      <ClipboardList className="w-3.5 h-3.5" /> Log
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); navigate(`/ChildProfile?child_id=${child.id}`); }}
                      className="py-2 rounded-xl bg-primary/5 text-primary text-xs font-semibold hover:bg-primary/10 transition-colors flex flex-col items-center gap-1"
                    >
                      <BookOpen className="w-3.5 h-3.5" /> Plans
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Tools Grid */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Tools & Resources</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: "Aspire AI", sub: "Ask about your child's plan", icon: Brain, color: "bg-primary/10", iconColor: "text-primary", path: "/AIChat" },
              { label: "Documents", sub: "View care plans & materials", icon: FileText, color: "bg-blue-50", iconColor: "text-blue-600", path: "/DocumentCenter" },
              { label: "Reward Tracker", sub: "Track milestones & tokens", icon: Star, color: "bg-yellow-50", iconColor: "text-yellow-600", path: "/RewardTracker" },
              { label: "Messages", sub: "Chat with your clinician", icon: MessageSquare, color: "bg-green-50", iconColor: "text-green-600", path: "/Messages" },
              { label: "Progress", sub: "Behavior trends over time", icon: TrendingUp, color: "bg-purple-50", iconColor: "text-purple-600", path: "/ProgressReports" },
              { label: "Settings", sub: "Your account preferences", icon: Shield, color: "bg-muted", iconColor: "text-muted-foreground", path: "/Settings" },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.22 + i * 0.05 }}
                onClick={() => navigate(item.path)}
                className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 cursor-pointer hover:border-primary/30 hover:shadow-sm transition-all group"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${item.color}`}>
                  <item.icon className={`w-5 h-5 ${item.iconColor}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground truncate">{item.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{item.sub}</p>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Recent Behavior Activity */}
        {recentLogs.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recent Activity</h2>
              <button onClick={() => navigate("/LogBehavior")} className="text-xs text-primary font-medium hover:underline flex items-center gap-1">
                Log new <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="bg-card border border-border rounded-2xl divide-y divide-border">
              {recentLogs.map((log, i) => {
                const child = children.find(c => c.id === log.child_id);
                const intensityColor = log.intensity === "high" ? "bg-red-500" : log.intensity === "moderate" ? "bg-yellow-500" : "bg-green-500";
                return (
                  <div key={log.id} className="flex items-center gap-3 p-4">
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${intensityColor}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{log.behavior_type || "Behavior logged"}</p>
                      <p className="text-xs text-muted-foreground">{child?.child_name || "Child"} · {log.intensity || "—"} intensity</p>
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {new Date(log.created_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Wellbeing tip */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          className="bg-gradient-to-br from-accent/10 to-primary/5 border border-accent/20 rounded-2xl p-5 flex items-start gap-4"
        >
          <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center flex-shrink-0">
            <Heart className="w-5 h-5 text-accent" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground mb-1">You're doing great</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Consistent tracking and communication with your clinician makes a real difference. Use the AI chat anytime you need support between sessions.
            </p>
          </div>
        </motion.div>

      </div>
    </div>
  );
}