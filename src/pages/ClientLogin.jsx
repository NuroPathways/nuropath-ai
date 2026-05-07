import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Brain, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";

export default function ClientLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      if (u) {
        const userDoc = await getDoc(doc(db, "User", u.uid));
        const profile = userDoc.exists() ? userDoc.data() : {};
        if (profile.app_role === "parent") navigate("/ClientDashboard");
        else if (profile.app_role === "clinician") navigate("/ClinicianDashboard");
        else navigate("/RoleSetup");
      }
    });
    return unsub;
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (isRegister) {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        if (name) await updateProfile(cred.user, { displayName: name });
        await setDoc(doc(db, "User", cred.user.uid), {
          email,
          full_name: name || "",
          role: "user",
          app_role: null,
          created_date: serverTimestamp(),
        });
        navigate("/RoleSetup");
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setError(err.message.replace("Firebase: ", "").replace(/ \(auth\/.*\)\.?/, ""));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 font-inter">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
          <Brain className="w-8 h-8 text-primary-foreground" />
        </div>
        <div className="inline-block px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-semibold uppercase tracking-wider mb-3">Client Login</div>
        <h1 className="text-2xl font-semibold text-foreground mb-2">Client Sign In</h1>
        <p className="text-sm text-muted-foreground mb-8">Access your client dashboard and behavioral guidance</p>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-sm text-left">
          <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-6">
            <Users className="w-7 h-7 text-accent" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <Input placeholder="Full name" value={name} onChange={e => setName(e.target.value)} />
            )}
            <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
            <Input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? "Please wait..." : isRegister ? "Create Account" : "Sign In"}
            </Button>
          </form>

          <button onClick={() => { setIsRegister(!isRegister); setError(""); }} className="mt-4 w-full text-sm text-muted-foreground hover:text-foreground text-center">
            {isRegister ? "Already have an account? Sign in" : "New client? Create account"}
          </button>
        </div>

        <button onClick={() => navigate("/")} className="mt-6 text-sm text-muted-foreground hover:text-foreground">
          ← Back to welcome page
        </button>
      </motion.div>
    </div>
  );
}