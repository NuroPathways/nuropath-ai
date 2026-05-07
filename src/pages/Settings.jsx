import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Moon, Sun, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function Settings() {
  const [user, setUser] = useState(null);
  const [darkMode, setDarkMode] = useState(() => document.documentElement.classList.contains("dark"));

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

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

  const handleLogout = () => {
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
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-accent flex items-center justify-center">
              <span className="text-accent-foreground text-xl font-semibold">{user.full_name?.[0]?.toUpperCase() || "U"}</span>
            </div>
            <div>
              <p className="font-semibold text-foreground">{user.full_name}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize mt-1 inline-block">
                {user.app_role || user.role || "user"}
              </span>
            </div>
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

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card border border-border rounded-2xl p-6">
        <Button variant="destructive" className="w-full gap-2" onClick={handleLogout}>
          <LogOut className="w-4 h-4" /> Sign Out
        </Button>
      </motion.div>
    </div>
  );
}