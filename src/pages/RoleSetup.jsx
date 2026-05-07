import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Collections } from "@/lib/firestore";
import { Brain, Stethoscope, Users, Loader2, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function RoleSetup() {
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const [inviteFamily, setInviteFamily] = useState(null);
  const navigate = useNavigate();

  const inviteToken = new URLSearchParams(window.location.search).get("invite");

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (firebaseUser) => {
      if (!firebaseUser) { navigate("/"); return; }

      const userDoc = await getDoc(doc(db, "User", firebaseUser.uid));
      const profile = userDoc.exists() ? userDoc.data() : {};
      const fullUser = { id: firebaseUser.uid, email: firebaseUser.email, full_name: firebaseUser.displayName || "", ...profile };
      setUser(fullUser);

      if (profile.app_role === "clinician") { navigate("/ClinicianDashboard"); return; }
      if (profile.app_role === "parent") { navigate("/ParentDashboard"); return; }

      if (inviteToken) {
        const families = await Collections.Family.filter({ invite_token: inviteToken }).catch(() => []);
        if (families[0]) setInviteFamily(families[0]);
      }
    });
    return unsub;
  }, [navigate, inviteToken]);

  const setupClinician = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, "User", user.id), { app_role: "clinician" }, { merge: true });
      navigate("/ClinicianDashboard");
    } catch {
      setSaving(false);
    }
  };

  const setupParent = async () => {
    setSaving(true);
    try {
      const updates = { app_role: "parent" };

      if (inviteFamily) {
        updates.linked_family_id = inviteFamily.id;
        updates.linked_clinician_id = inviteFamily.clinician_id;
        updates.invite_token = inviteToken;

        const kids = await Collections.Child.filter({ family_id: inviteFamily.id }).catch(() => []);
        for (const kid of kids) {
          await Collections.Child.update(kid.id, { parent_id: user.id, parent_email: user.email });
        }
        await Collections.Family.update(inviteFamily.id, { invite_status: "accepted" });
      }

      await setDoc(doc(db, "User", user.id), updates, { merge: true });
      navigate("/ParentDashboard");
    } catch {
      setSaving(false);
    }
  };

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );

  if (inviteToken) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 font-inter">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-md w-full">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
            <Brain className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground mb-2">Welcome to Aspire</h1>

          {inviteFamily ? (
            <>
              <p className="text-muted-foreground mb-2">You've been invited to join the <strong>{inviteFamily.family_name}</strong> family profile.</p>
              <p className="text-sm text-muted-foreground mb-8">Your clinician has already set up your child's plans and documents. They'll be ready as soon as you complete setup.</p>
              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 mb-6 text-left">
                <div className="flex items-center gap-3 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                  <p className="text-sm font-medium text-foreground">Family profile ready</p>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                  <p className="text-sm font-medium text-foreground">Clinician-approved plans included</p>
                </div>
              </div>
              <button
                disabled={saving}
                onClick={setupParent}
                className="w-full bg-primary text-primary-foreground rounded-2xl py-4 font-semibold text-base hover:bg-primary/90 transition-all disabled:opacity-60"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Complete Setup & Enter App"}
              </button>
            </>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5">
              <p className="text-sm font-semibold text-yellow-800 mb-1">Invalid or expired invite link</p>
              <p className="text-sm text-yellow-700">Please contact your clinician for a new invitation.</p>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 font-inter">
      <AnimatePresence mode="wait">
        <motion.div key="role" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="text-center max-w-2xl w-full">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
            <Brain className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground mb-2">Welcome to Aspire</h1>
          <p className="text-muted-foreground mb-8">Please select your role to continue.</p>

          <div className="grid md:grid-cols-2 gap-4">
            <button disabled={saving} onClick={setupParent} className="bg-card border-2 border-border hover:border-primary rounded-2xl p-8 transition-all group text-left">
              <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center mb-3 group-hover:bg-accent/20 transition-colors">
                <Users className="w-7 h-7 text-accent" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-1">I'm a Parent / Guardian</h2>
              <p className="text-sm text-muted-foreground">Access AI guidance and support for my child</p>
            </button>

            <button disabled={saving} onClick={setupClinician} className="bg-card border-2 border-border hover:border-primary rounded-2xl p-8 transition-all group text-left">
              <div className="w-14 h-14 rounded-xl bg-secondary/10 flex items-center justify-center mb-3 group-hover:bg-secondary/20 transition-colors">
                <Stethoscope className="w-7 h-7 text-secondary" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-1">I'm a Clinician</h2>
              <p className="text-sm text-muted-foreground">Manage clients and behavior plans</p>
            </button>
          </div>

          {saving && (
            <p className="mt-6 text-sm text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Setting up your account...
            </p>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}