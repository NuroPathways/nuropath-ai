import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Moon, Sun, User, LogOut, Link, Copy, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";

export default function Settings() {
  const [user, setUser] = useState(null);
  const [darkMode, setDarkMode] = useState(() => document.documentElement.classList.contains("dark"));
  const [clinicianCodeInput, setClinicianCodeInput] = useState("");
  const [linkStatus, setLinkStatus] = useState(null); // 'success' | 'error' | null
  const [linkMessage, setLinkMessage] = useState("");
  const [linking, setLinking] = useState(false);
  const [copied, setCopied] = useState(false);

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
    base44.auth.logout(window.location.origin + "/Splash");
  };

  const copyCode = () => {
    navigator.clipboard.writeText(user.clinician_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const linkClinician = async () => {
    const code = clinicianCodeInput.trim().toUpperCase();
    if (!code) return;
    setLinking(true);
    setLinkStatus(null);
    // Find the clinician with this code
    const users = await base44.entities.User.list();
    const clinician = users.find(u => u.clinician_code === code && u.app_role === "clinician");
    if (!clinician) {
      setLinkStatus("error");
      setLinkMessage("No clinician found with that code. Please check and try again.");
      setLinking(false);
      return;
    }
    await base44.auth.updateMe({ linked_clinician_code: code, linked_clinician_id: clinician.id });
    setUser(prev => ({ ...prev, linked_clinician_code: code, linked_clinician_id: clinician.id }));
    setLinkStatus("success");
    setLinkMessage(`Successfully linked to Dr. ${clinician.full_name || "your clinician"}!`);
    setLinking(false);
  };

  return (
    <div className="p-6 md:p-8 max-w-xl mx-auto font-inter">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your preferences</p>
      </div>

      {/* Profile */}
      {user && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-2xl p-6 mb-4">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <User className="w-3.5 h-3.5" /> Profile
          </h2>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-accent flex items-center justify-center">
              <span className="text-accent-foreground text-xl font-semibold">
                {user.full_name?.[0]?.toUpperCase() || "U"}
              </span>
            </div>
            <div>
              <p className="font-semibold text-foreground">{user.full_name}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize mt-1 inline-block">{user.role || "user"}</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Clinician Code (for clinicians) */}
      {user?.app_role === "clinician" && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card border border-border rounded-2xl p-6 mb-4">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <Link className="w-3.5 h-3.5" /> Your Clinician Code
          </h2>
          <p className="text-sm text-muted-foreground mb-3">Share this code with parents so they can link their account to you.</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-muted rounded-xl px-4 py-3 font-mono text-xl font-bold text-foreground tracking-widest text-center">
              {user.clinician_code || "—"}
            </div>
            <Button variant="outline" size="icon" onClick={copyCode} className="rounded-xl flex-shrink-0">
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </motion.div>
      )}

      {/* Link Clinician (for clients/parents) */}
      {user?.app_role !== "clinician" && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card border border-border rounded-2xl p-6 mb-4">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <Link className="w-3.5 h-3.5" /> Link to Your Clinician
          </h2>
          {user.linked_clinician_id ? (
            <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
              <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-800 dark:text-green-300">Clinician linked</p>
                <p className="text-xs text-green-600 dark:text-green-400">Code: {user.linked_clinician_code}</p>
              </div>
              <Button variant="ghost" size="sm" className="ml-auto text-xs text-muted-foreground" onClick={() => { setLinkStatus(null); base44.auth.updateMe({ linked_clinician_code: "", linked_clinician_id: "" }).then(() => setUser(prev => ({ ...prev, linked_clinician_code: "", linked_clinician_id: "" }))); }}>
                Unlink
              </Button>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-3">Enter the 6-character code provided by your clinician.</p>
              <div className="flex gap-2">
                <Input
                  value={clinicianCodeInput}
                  onChange={e => setClinicianCodeInput(e.target.value.toUpperCase())}
                  placeholder="e.g. AB12CD"
                  maxLength={6}
                  className="font-mono tracking-widest rounded-xl"
                />
                <Button onClick={linkClinician} disabled={linking || !clinicianCodeInput.trim()} className="rounded-xl">
                  {linking ? "Linking..." : "Link"}
                </Button>
              </div>
              {linkStatus && (
                <div className={`mt-3 flex items-center gap-2 text-sm p-3 rounded-xl ${linkStatus === "success" ? "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300" : "bg-destructive/10 text-destructive"}`}>
                  {linkStatus === "success" ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  {linkMessage}
                </div>
              )}
            </>
          )}
        </motion.div>
      )}

      {/* Appearance */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card border border-border rounded-2xl p-6 mb-4">
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

      {/* Logout */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-card border border-border rounded-2xl p-6">
        <Button
          variant="destructive"
          className="w-full gap-2"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
      </motion.div>
    </div>
  );
}