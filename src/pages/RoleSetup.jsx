import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Brain, Stethoscope, Users, Loader2, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function RoleSetup() {
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState(null);
  const [inviteFamily, setInviteFamily] = useState(null);
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const inviteToken = new URLSearchParams(window.location.search).get("invite");
  const forceRole = new URLSearchParams(window.location.search).get("role");

  useEffect(() => {
    const init = async () => {
      const me = await base44.auth.me().catch(() => null);
      if (!me) { base44.auth.redirectToLogin(window.location.href); return; }
      setUser(me);

      if (me.app_role === "clinician" || forceRole === "clinician") {
        if (me.app_role !== "clinician") {
          await base44.auth.updateMe({ app_role: "clinician", role: "admin", account_type: "clinician" });
        }
        navigate("/ClinicianDashboard");
        return;
      }

      if (inviteToken) {
        const families = await base44.entities.Family.filter({ invite_token: inviteToken }).catch(() => []);
        if (families[0]) {
          setInviteFamily(families[0]);
          // If already a parent, auto-accept and link without showing role selection
          if (me.app_role === "parent") {
            await acceptInvite(me, families[0]);
            return;
          }
        } else {
          // Invalid token — if already a parent just go to dashboard
          if (me.app_role === "parent") { navigate("/ParentDashboard"); return; }
        }
      } else {
        if (me.app_role === "parent") { navigate("/ParentDashboard"); return; }
      }
    };
    init();
  }, [inviteToken]);

  const acceptInvite = async (me, family) => {
    setSaving(true);
    const isIndividual = family.account_type === "individual";
    const kids = await base44.entities.Child.filter({ family_id: family.id }).catch(() => []);
    for (const kid of kids) {
      await base44.entities.Child.update(kid.id, { parent_id: me.id, parent_email: me.email });
    }
    await base44.entities.Family.update(family.id, { invite_status: "accepted" });
    await base44.auth.updateMe({
      linked_family_id: family.id,
      linked_clinician_id: family.clinician_id,
      account_type: family.account_type || "parent_family",
    });
    await refreshUser();
    navigate("/ParentDashboard");
  };

  const setupClinician = async () => {
    setSaving(true);
    await base44.auth.updateMe({ app_role: "clinician", role: "admin", account_type: "clinician" });
    await refreshUser();
    navigate("/ClinicianDashboard");
  };

  const setupParent = async () => {
    setSaving(true);
    const updates = { app_role: "parent" };

    if (inviteFamily) {
      updates.linked_family_id = inviteFamily.id;
      updates.linked_clinician_id = inviteFamily.clinician_id;
      updates.account_type = inviteFamily.account_type || "parent_family";
      const kids = await base44.entities.Child.filter({ family_id: inviteFamily.id }).catch(() => []);
      for (const kid of kids) {
        await base44.entities.Child.update(kid.id, { parent_id: user.id, parent_email: user.email });
      }
      await base44.entities.Family.update(inviteFamily.id, { invite_status: "accepted" });
    }

    await base44.auth.updateMe(updates);
    await refreshUser();
    navigate("/ParentDashboard");
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
          <h1 className="text-2xl font-semibold text-foreground mb-2">Welcome to NuroPathways</h1>

          {inviteFamily ? (
            <>
              {inviteFamily.account_type === "individual" ? (
                <>
                  <p className="text-muted-foreground mb-2">Your clinician has set up a personal care account for <strong>{inviteFamily.family_name}</strong>.</p>
                  <p className="text-sm text-muted-foreground mb-8">Your treatment plans, documents, and AI support are ready for you.</p>
                </>
              ) : (
                <>
                  <p className="text-muted-foreground mb-2">You've been invited to join the <strong>{inviteFamily.family_name}</strong> family profile.</p>
                  <p className="text-sm text-muted-foreground mb-8">Your clinician has already set up your child's plans and documents.</p>
                </>
              )}
              <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 mb-6 text-left">
                <div className="flex items-center gap-3 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                  <p className="text-sm font-medium text-foreground">{inviteFamily.account_type === "individual" ? "Personal profile ready" : "Family profile ready"}</p>
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
          <h1 className="text-2xl font-semibold text-foreground mb-2">Welcome to NuroPathways</h1>
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