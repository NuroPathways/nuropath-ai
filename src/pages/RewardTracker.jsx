import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useFirebaseUser } from "@/lib/useFirebaseUser";
import { Collections } from "@/lib/firestore";
import { ArrowLeft, Star, Plus, Trophy, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";

export default function RewardTracker() {
  const navigate = useNavigate();
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState("");
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ token_name: "Star", tokens_earned: 0, tokens_goal: 10, reward_description: "", milestone_notes: "" });
  const [saving, setSaving] = useState(false);
  const childIdParam = new URLSearchParams(window.location.search).get("child_id");

  const { user } = useFirebaseUser();

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [byId, byEmail] = await Promise.all([
        Collections.Child.filter({ parent_id: user.id }).catch(() => []),
        Collections.Child.filter({ parent_email: user.email }).catch(() => []),
      ]);
      const seen = new Set();
      const merged = [...byId, ...byEmail].filter(c => { if (seen.has(c.id)) return false; seen.add(c.id); return true; });
      setChildren(merged);
      const cid = childIdParam || merged[0]?.id || "";
      setSelectedChildId(cid);
    };
    load();
  }, [user?.id, childIdParam]);

  useEffect(() => {
    if (!selectedChildId) return;
    setLoading(true);
    Collections.RewardToken.filter({ child_id: selectedChildId }).then(r => { setTokens(r); setLoading(false); });
  }, [selectedChildId]);

  const handleAdd = async () => {
    if (!selectedChildId) return;
    setSaving(true);
    await Collections.RewardToken.create({ ...form, child_id: selectedChildId, parent_id: user?.id, tokens_earned: Number(form.tokens_earned), tokens_goal: Number(form.tokens_goal) });
    const updated = await Collections.RewardToken.filter({ child_id: selectedChildId });
    setTokens(updated);
    setShowForm(false);
    setSaving(false);
    setForm({ token_name: "Star", tokens_earned: 0, tokens_goal: 10, reward_description: "", milestone_notes: "" });
  };

  const addToken = async (tokenRecord) => {
    const newEarned = tokenRecord.tokens_earned + 1;
    await Collections.RewardToken.update(tokenRecord.id, { tokens_earned: newEarned });
    setTokens(prev => prev.map(t => t.id === tokenRecord.id ? { ...t, tokens_earned: newEarned } : t));
  };

  const selectedChild = children.find(c => c.id === selectedChildId);

  return (
    <div className="min-h-screen bg-background font-inter">
      <div className="sticky top-0 z-10 bg-card border-b border-border px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-foreground flex-1">Reward Tracker</h1>
        <Button size="sm" className="rounded-xl gap-1.5 h-8 text-xs" onClick={() => setShowForm(true)}>
          <Plus className="w-3.5 h-3.5" /> New Reward
        </Button>
      </div>

      <div className="p-5 max-w-xl mx-auto">
        {children.length > 1 && (
          <Select value={selectedChildId} onValueChange={setSelectedChildId}>
            <SelectTrigger className="rounded-xl mb-5"><SelectValue placeholder="Select child" /></SelectTrigger>
            <SelectContent>
              {children.map(c => <SelectItem key={c.id} value={c.id}>{c.child_name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        {selectedChild && (
          <div className="flex items-center gap-3 mb-5 p-3 bg-card border border-border rounded-xl">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-bold text-lg">{selectedChild.child_name[0]}</span>
            </div>
            <p className="font-semibold text-foreground">{selectedChild.child_name}'s Rewards</p>
          </div>
        )}

        <AnimatePresence>
          {showForm && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-card border border-border rounded-2xl p-5 mb-5 space-y-3">
              <h3 className="font-semibold text-foreground">New Reward Goal</h3>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Token Name</p>
                <Input value={form.token_name} onChange={e => setForm(f => ({ ...f, token_name: e.target.value }))} placeholder="e.g. Star, Point" className="rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Starting Tokens</p>
                  <Input type="number" value={form.tokens_earned} onChange={e => setForm(f => ({ ...f, tokens_earned: e.target.value }))} className="rounded-xl" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Goal (total)</p>
                  <Input type="number" value={form.tokens_goal} onChange={e => setForm(f => ({ ...f, tokens_goal: e.target.value }))} className="rounded-xl" />
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Reward Description</p>
                <Input value={form.reward_description} onChange={e => setForm(f => ({ ...f, reward_description: e.target.value }))} placeholder="e.g. 30 mins extra screen time" className="rounded-xl" />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button className="flex-1 rounded-xl" onClick={handleAdd} disabled={saving}>{saving ? "Saving..." : "Create"}</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-28 bg-muted rounded-2xl animate-pulse" />)}</div>
        ) : tokens.length === 0 ? (
          <div className="text-center py-14 border-2 border-dashed border-border rounded-2xl">
            <Trophy className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium text-foreground mb-1">No reward goals yet</p>
            <p className="text-sm text-muted-foreground">Create a reward goal to start tracking progress.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tokens.map((t, i) => {
              const pct = Math.min(100, Math.round((t.tokens_earned / (t.tokens_goal || 1)) * 100));
              const achieved = t.tokens_earned >= t.tokens_goal;
              return (
                <motion.div key={t.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className={`bg-card border rounded-2xl p-5 ${achieved ? "border-yellow-400" : "border-border"}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {achieved ? <Trophy className="w-5 h-5 text-yellow-500" /> : <Target className="w-5 h-5 text-primary" />}
                      <p className="font-semibold text-foreground">{t.reward_description || `${t.token_name} Reward`}</p>
                    </div>
                    <button onClick={() => addToken(t)} disabled={achieved} className="w-9 h-9 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                      <Plus className="w-4 h-4 text-primary" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-foreground">{t.tokens_earned}/{t.tokens_goal}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {[...Array(Math.min(t.tokens_goal, 20))].map((_, idx) => (
                      <Star key={idx} className={`w-4 h-4 ${idx < t.tokens_earned ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/30"}`} />
                    ))}
                    {t.tokens_goal > 20 && <span className="text-xs text-muted-foreground">...</span>}
                  </div>
                  {achieved && <p className="text-xs font-semibold text-yellow-600 mt-2">🎉 Goal achieved!</p>}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}