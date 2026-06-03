import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Brain, Eye, EyeOff, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function UsernameLogin() {
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim()) return;
    setLoading(true);
    setError("");

    try {
      const res = await base44.functions.invoke("lookupClientEmail", {
        identifier: identifier.trim(),
      });

      const { email, error: lookupError } = res.data;

      if (lookupError || !email) {
        setError(lookupError || "No account found. Please check your username or email.");
        setLoading(false);
        return;
      }

      // Redirect to Base44 login pre-filled with the resolved email
      base44.auth.redirectToLogin("/RoleSetup", { email });
    } catch {
      setError("Could not connect. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 font-inter">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Brain className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-foreground">NeuroPathways</span>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-foreground mb-1">Client Sign In</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Enter the username or email provided by your clinician.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Username or Email
              </label>
              <input
                type="text"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                placeholder="e.g. jsmith-2048 or email@example.com"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="w-full min-h-[44px] border border-border rounded-xl px-4 py-2.5 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            {error && (
              <div className="bg-destructive/10 text-destructive text-sm rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full min-h-[44px] rounded-xl"
              disabled={loading || !identifier.trim()}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Looking up account...
                </span>
              ) : "Continue"}
            </Button>
          </form>

          <p className="text-xs text-muted-foreground mt-4 text-center">
            You'll be asked to verify via email to complete sign in.
          </p>
        </div>

        <div className="mt-6 text-center space-y-3">
          <p className="text-xs text-muted-foreground">
            Are you a clinician?{" "}
            <button
              onClick={() => base44.auth.redirectToLogin("/RoleSetup")}
              className="text-primary hover:underline font-medium"
            >
              Sign in with email
            </button>
          </p>
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mx-auto"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
        </div>
      </motion.div>
    </div>
  );
}