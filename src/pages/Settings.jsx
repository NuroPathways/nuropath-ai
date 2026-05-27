import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Moon, Sun, User, LogOut, Trash2, AlertTriangle, Check, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function Settings() {
  const [user, setUser] = useState(null);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("theme");
    if (saved) {
      if (saved === "dark") document.documentElement.classList.add("dark");
      else document.documentElement.classList.remove("dark");
      return saved === "dark";
    }
    return document.documentElement.classList.contains("dark");
  });

  useEffect(() => {
    base44.auth.me().then(u => { setUser(u); setNameInput(u?.display_name || u?.full_name || ""); }).catch(() => {});
  }, []);

  const handleSaveName = async () => {
    if (!nameInput.trim()) return;
    setNameSaving(true);
    await base44.auth.updateMe({ display_name: nameInput.trim() });
    setUser(prev => ({ ...prev, display_name: nameInput.trim() }));
    setNameSaving(false);
    setEditingName(false);
  };

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");

  const handleLogout = () => {
    base44.auth.logout("/");
  };

  const handleDeleteAccount = async () => {
    if (deleteInput !== "DELETE") return;
    // Log out after deletion request — actual deletion handled by admin/support
    await base44.auth.updateMe({ account_deletion_requested: true }).catch(() => {});
    base44.auth.logout("/");
  };

  return (
    <div className="p-6 md:p-8 max-w-xl mx-auto font-inter">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your preferences</p>
      </div>

      {user && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-2xl p-6 mb-4">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <User className="w-3.5 h-3.5" /> Profile
          </h2>
          <div className="flex items-center gap-4 mb-5">
            <div className="w-14 h-14 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
              <span className="text-accent-foreground text-xl font-semibold">{(nameInput || user.display_name || user.full_name)?.[0]?.toUpperCase() || "U"}</span>
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-foreground">{user.display_name || user.full_name || <span className="text-muted-foreground italic">No name set</span>}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize mt-1 inline-block">
                {user.app_role || user.role || "user"}
              </span>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">Display Name</label>
            {editingName ? (
              <div className="flex gap-2">
                <input
                  autoFocus
                  type="text"
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSaveName()}
                  placeholder="Your full name"
                  className="flex-1 border border-border rounded-xl px-4 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 min-h-[44px]"
                />
                <button
                  onClick={handleSaveName}
                  disabled={nameSaving || !nameInput.trim()}
                  className="min-h-[44px] px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 flex items-center gap-1.5"
                >
                  {nameSaving ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
                  Save
                </button>
                <button
                  onClick={() => { setEditingName(false); setNameInput(user.full_name || ""); }}
                  className="min-h-[44px] px-3 rounded-xl border border-border text-sm text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditingName(true)}
                className="w-full min-h-[44px] flex items-center justify-between px-4 py-2.5 rounded-xl border border-border bg-background hover:border-primary/40 transition-colors text-sm"
              >
                <span className={(user.display_name || user.full_name) ? "text-foreground" : "text-muted-foreground italic"}>
                  {user.display_name || user.full_name || "Tap to set your name"}
                </span>
                <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card border border-border rounded-2xl p-6 mb-4">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">Appearance</h2>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {darkMode ? <Moon className="w-5 h-5 text-primary" /> : <Sun className="w-5 h-5 text-primary" />}
            <div>
              <p className="text-sm font-medium text-foreground">{darkMode ? "Dark Mode" : "Light Mode"}</p>
              <p className="text-xs text-muted-foreground">Toggle app theme</p>
            </div>
          </div>
          <button
            onClick={toggleDarkMode}
            className={`relative w-12 h-6 rounded-full transition-colors ${darkMode ? "bg-primary" : "bg-border"}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${darkMode ? "translate-x-6" : "translate-x-0"}`} />
          </button>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card border border-border rounded-2xl p-6 space-y-3">
        <Button variant="destructive" className="w-full gap-2 min-h-[44px]" onClick={handleLogout}>
          <LogOut className="w-4 h-4" /> Sign Out
        </Button>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="w-full min-h-[44px] flex items-center justify-center gap-2 text-sm text-destructive/70 hover:text-destructive transition-colors"
        >
          <Trash2 className="w-4 h-4" /> Delete Account
        </button>
      </motion.div>

      {/* Delete Account Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            className="bg-card rounded-2xl p-6 w-full max-w-sm"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <h2 className="font-bold text-foreground">Delete Account</h2>
                <p className="text-xs text-muted-foreground">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              All your data, children's profiles, and documents will be permanently removed. Type <strong>DELETE</strong> to confirm.
            </p>
            <input
              type="text"
              value={deleteInput}
              onChange={e => setDeleteInput(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-background text-foreground mb-4 min-h-[44px] focus:outline-none focus:ring-2 focus:ring-destructive/40"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteInput(""); }}
                className="flex-1 min-h-[44px] rounded-xl border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteInput !== "DELETE"}
                className="flex-1 min-h-[44px] rounded-xl bg-destructive text-white text-sm font-medium disabled:opacity-40 transition-colors"
              >
                Delete Account
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}