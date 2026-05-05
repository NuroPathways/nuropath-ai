import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Brain, Stethoscope, Users, Loader2, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function RoleSetup() {
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const [inviteFamily, setInviteFamily] = useState(null); // family record from invite token
  const navigate = useNavigate();

  const inviteToken = new URLSearchParams(window.location.search).get("invite");

  useEffect(() => {
    const init = async () => {
      let me;
      try {
        me = await base44.auth.me();
      } catch {
        navigate("/");
        return;
      }
      setUser(me);

      // If already set up, redirect
      if (me?.app_role === "clinician") { navigate("/ClinicianDashboard"); return; }
      if (me?.app_role === "parent") { navigate("/ClientDashboard"); return; }

      // If there's an invite token, look up the family
      if (inviteToken) {
        const families = await base44.entities.Family.filter({ invite_token: inviteToken }).catch(() => []);
        if (families[0]) setInviteFamily(families[0]);
      }
    };
    init();
  }, [navigate, inviteToken]);

  const setupClinician = async () => {
    setSaving(true);
    await base44.auth.updateMe({ app_role: "clinician" });
    navigate("/ClinicianDashboard");
  };

  const setupParent = async () => {
    setSaving(true);
    const updates = { app_role: "parent" };

    if (inviteFamily) {
      // Link parent to family and clinician
      updates.linked_family_id = inviteFamily.id;
      updates.linked_clinician_id = inviteFamily.clinician_id;
      updates.invite_token = inviteToken;

      // Update children in this family to store parent_id
      const kids = await base44.entities.Child.filter({ family_id: inviteFamily.id }).catch(() => []);
      for (const kid of kids) {
        await base44.entities.Child.update(kid.id, { parent_id: user.id, parent_email: user.email });
      }

      // Mark family invite as accepted
      await base44.entities.Family.update(inviteFamily.id, { invite_status: "accepted" });
    }

    await base44.auth.updateMe(updates);
    navigate("/ClientDashboard");
  };

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );

  // If parent coming via invite link — show simplified confirmation
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

  // Default: role selection (for clinicians and manually-onboarded parents)
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
            <button
              disabled={saving}
              onClick={setupParent}
              className="bg-card border-2 border-border hover:border-primary rounded-2xl p-8 transition-all group text-left"
            >
              <div className="w-14 h-14 rounded-xl bg-accent/10 flex items-center justify-center mb-3 group-hover:bg-accent/20 transition-colors">
                <Users className="w-7 h-7 text-accent" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-1">I'm a Parent / Guardian</h2>
              <p className="text-sm text-muted-foreground">Access AI guidance and support for my child</p>
            </button>

            <button
              disabled={saving}
              onClick={setupClinician}
              className="bg-card border-2 border-border hover:border-primary rounded-2xl p-8 transition-all group text-left"
            >
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