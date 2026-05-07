import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Collections } from "@/lib/firestore";
import { X, Plus, Trash2, ChevronRight, ChevronLeft, Users, User, Baby, Mail, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";

const ACCOUNT_TYPES = [
  {
    key: "parent_family",
    label: "Parent / Family",
    desc: "A parent or guardian managing care for a child",
    icon: "👨‍👩‍👧",
  },
  {
    key: "individual",
    label: "Individual Client",
    desc: "The client will use the app directly for their own care",
    icon: "🧑",
  },
  {
    key: "caregiver",
    label: "Caregiver / Guardian",
    desc: "A non-parent caregiver managing care for a child",
    icon: "🤝",
  },
];

const emptyChild = () => ({ child_name: "", age: "", diagnosis: "", triggers: "", notes: "", is_patient: true });

function generateToken() {
  return Math.random().toString(36).substring(2, 10).toUpperCase() +
    Math.random().toString(36).substring(2, 6).toUpperCase();
}

export default function AddClientModal({ open, onClose, onSuccess, clinicianId }) {
  const [step, setStep] = useState(0); // 0=AccountType, 1=AccountHolder, 2=Children(family only), 3=Done
  const [saving, setSaving] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [resending, setResending] = useState(false);
  const [accountType, setAccountType] = useState(null);

  // Shared holder info (parent, individual, or caregiver)
  const [holder, setHolder] = useState({ name: "", email: "" });
  // For family/caregiver: client/child details
  const [clientName, setClientName] = useState(""); // family name or individual name
  const [clientNotes, setClientNotes] = useState("");
  const [children, setChildren] = useState([emptyChild()]);
  // For individual: extra fields
  const [individual, setIndividual] = useState({ age: "", diagnosis: "", goals: "", notes: "" });

  const setHld = (k, v) => setHolder(p => ({ ...p, [k]: v }));
  const updateChild = (i, k, v) => setChildren(c => c.map((x, idx) => idx === i ? { ...x, [k]: v } : x));
  const addChild = () => setChildren(c => [...c, emptyChild()]);
  const removeChild = (i) => setChildren(c => c.filter((_, idx) => idx !== i));

  const isFamily = accountType === "parent_family" || accountType === "caregiver";

  const getSteps = () => {
    if (isFamily) return ["Account Type", "Account Holder", "Client Profile"];
    return ["Account Type", "Client Details"];
  };

  const totalSteps = getSteps().length;

  const sendInviteEmail = async (email, name, link) => {
    const response = await base44.functions.invoke('sendInviteEmail', {
      to: email,
      name,
      link,
      type: accountType,
    });
    if (response.data?.error) throw new Error(response.data.error);
  };

  const handleSave = async () => {
    setSaving(true);
    setEmailError(false);
    setEmailSent(false);
    const token = generateToken();
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/RoleSetup?invite=${token}`;

    if (isFamily) {
      // Create family record
      const fam = await Collections.Family.create({
        family_name: clientName.trim() || `${holder.name}'s Family`,
        notes: clientNotes || undefined,
        clinician_id: clinicianId,
        invite_token: token,
        invite_email: holder.email || undefined,
        invite_status: "pending",
        parent_name: holder.name || undefined,
      });

      // Create children linked to family
      for (const child of children) {
        if (!child.child_name.trim()) continue;
        await Collections.Child.create({
          child_name: child.child_name.trim(),
          age: child.age ? Number(child.age) : undefined,
          diagnosis: child.diagnosis || undefined,
          triggers: child.triggers || undefined,
          notes: child.notes || undefined,
          is_patient: child.is_patient || false,
          family_id: fam.id,
          clinician_id: clinicianId,
          parent_email: holder.email || undefined,
        });
      }
    } else {
      // Individual client — create as Child record (the "child" IS the client)
      const fam = await Collections.Family.create({
        family_name: holder.name.trim() || "Individual Client",
        notes: individual.notes || undefined,
        clinician_id: clinicianId,
        invite_token: token,
        invite_email: holder.email || undefined,
        invite_status: "pending",
        parent_name: holder.name || undefined,
      });

      await Collections.Child.create({
        child_name: holder.name.trim(),
        age: individual.age ? Number(individual.age) : undefined,
        diagnosis: individual.diagnosis || undefined,
        notes: individual.goals ? `Goals: ${individual.goals}\n${individual.notes || ""}`.trim() : (individual.notes || undefined),
        is_patient: true,
        family_id: fam.id,
        clinician_id: clinicianId,
        parent_email: holder.email || undefined,
      });
    }

    setInviteLink(link);

    // Send invite email
    if (holder.email) {
      try {
        await sendInviteEmail(holder.email, holder.name, link);
        setEmailSent(true);
      } catch {
        setEmailError(true);
      }
    }

    setSaving(false);
    setStep(isFamily ? 3 : 2);
    onSuccess();
  };

  const handleResend = async () => {
    if (!holder.email || !inviteLink) return;
    setResending(true);
    setEmailError(false);
    try {
      await sendInviteEmail(holder.email, holder.name, inviteLink);
      setEmailSent(true);
    } catch {
      setEmailError(true);
    }
    setResending(false);
  };

  const handleClose = () => {
    setStep(0);
    setAccountType(null);
    setHolder({ name: "", email: "" });
    setClientName("");
    setClientNotes("");
    setChildren([emptyChild()]);
    setIndividual({ age: "", diagnosis: "", goals: "", notes: "" });
    setInviteLink("");
    setEmailSent(false);
    setEmailError(false);
    onClose();
  };

  const copyLink = () => navigator.clipboard.writeText(inviteLink);

  const canProceedStep1 = accountType !== null;
  const canProceedStep2 = holder.name.trim().length > 0;
  const canSaveFamily = children.some(c => c.child_name.trim());
  const canSaveIndividual = holder.name.trim().length > 0;

  const doneStep = isFamily ? 3 : 2;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card rounded-2xl shadow-2xl w-full max-w-lg border border-border max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border flex-shrink-0">
          <div>
            <h2 className="font-semibold text-foreground text-base">Add New Client</h2>
            {step < doneStep && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Step {step + 1} of {totalSteps}
              </p>
            )}
          </div>
          <button onClick={handleClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step indicator */}
        {step < doneStep && (
          <div className="px-6 pt-4 flex gap-2 flex-shrink-0">
            {getSteps().map((s, i) => (
              <div key={s} className={`flex-1 h-1.5 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-muted"}`} />
            ))}
          </div>
        )}

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">

          {/* Step 0: Account Type Selection */}
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-foreground mb-1">Who will primarily use this account?</p>
                <p className="text-xs text-muted-foreground mb-4">Choose the account type that best fits this client's situation.</p>
              </div>
              <div className="space-y-3">
                {ACCOUNT_TYPES.map((type) => (
                  <button
                    key={type.key}
                    onClick={() => setAccountType(type.key)}
                    className={`w-full text-left rounded-xl border-2 p-4 flex items-start gap-3 transition-all ${
                      accountType === type.key
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40 bg-card"
                    }`}
                  >
                    <span className="text-2xl mt-0.5">{type.icon}</span>
                    <div>
                      <p className="font-semibold text-sm text-foreground">{type.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{type.desc}</p>
                    </div>
                    {accountType === type.key && (
                      <CheckCircle2 className="w-5 h-5 text-primary ml-auto flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 1: Account Holder Info */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2">
                <User className="w-6 h-6 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground -mt-1 mb-2">
                {isFamily
                  ? "Enter the account holder's details. They will receive the invite to access Aspire."
                  : "Enter the client's details. They will receive a direct invite to their personal Aspire account."}
              </p>

              {/* For family: collect family/group name */}
              {isFamily && (
                <div>
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Client / Family Name
                  </Label>
                  <Input
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="e.g. The Johnson Family"
                    className="mt-1.5 rounded-xl border-border"
                  />
                </div>
              )}

              <div>
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {isFamily ? "Account Holder Name *" : "Client Name *"}
                </Label>
                <Input
                  value={holder.name}
                  onChange={(e) => setHld("name", e.target.value)}
                  placeholder={isFamily ? "Primary guardian / caregiver full name" : "Client's full name"}
                  className="mt-1.5 rounded-xl border-border"
                />
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Email (for invite)</Label>
                <Input
                  type="email"
                  value={holder.email}
                  onChange={(e) => setHld("email", e.target.value)}
                  placeholder="email@example.com"
                  className="mt-1.5 rounded-xl border-border"
                />
                <p className="text-xs text-muted-foreground mt-1">A secure invite link will be emailed to this address.</p>
              </div>

              {/* Individual-only extra fields */}
              {!isFamily && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Age</Label>
                      <Input
                        type="number"
                        value={individual.age}
                        onChange={(e) => setIndividual(p => ({ ...p, age: e.target.value }))}
                        placeholder="e.g. 24"
                        className="mt-1 rounded-xl border-border text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Diagnosis</Label>
                      <Input
                        value={individual.diagnosis}
                        onChange={(e) => setIndividual(p => ({ ...p, diagnosis: e.target.value }))}
                        placeholder="e.g. Anxiety"
                        className="mt-1 rounded-xl border-border text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Treatment Goals</Label>
                    <Textarea
                      value={individual.goals}
                      onChange={(e) => setIndividual(p => ({ ...p, goals: e.target.value }))}
                      placeholder="List primary behavioral or therapeutic goals..."
                      rows={2}
                      className="mt-1 rounded-xl border-border resize-none text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Notes (optional)</Label>
                    <Textarea
                      value={individual.notes}
                      onChange={(e) => setIndividual(p => ({ ...p, notes: e.target.value }))}
                      placeholder="Any general notes..."
                      rows={2}
                      className="mt-1 rounded-xl border-border resize-none text-sm"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 2 (Family only): Child/Client Profile */}
          {step === 2 && isFamily && (
            <div className="space-y-5">
              <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center mb-2">
                <Baby className="w-6 h-6 text-secondary" />
              </div>
              <p className="text-xs text-muted-foreground -mt-2">Add the child or children receiving services. Check "Is the patient/client" for the primary client.</p>
              {children.map((c, i) => (
                <div key={i} className="bg-background border border-border rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">Child {i + 1}</p>
                    {children.length > 1 && (
                      <button onClick={() => removeChild(i)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Child's Name *</Label>
                    <Input value={c.child_name} onChange={(e) => updateChild(i, "child_name", e.target.value)} placeholder="First name or nickname" className="mt-1 rounded-xl border-border text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Age</Label>
                      <Input type="number" value={c.age} onChange={(e) => updateChild(i, "age", e.target.value)} placeholder="e.g. 8" className="mt-1 rounded-xl border-border text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Diagnosis</Label>
                      <Input value={c.diagnosis} onChange={(e) => updateChild(i, "diagnosis", e.target.value)} placeholder="e.g. ASD" className="mt-1 rounded-xl border-border text-sm" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Known Triggers</Label>
                    <Textarea value={c.triggers} onChange={(e) => updateChild(i, "triggers", e.target.value)} placeholder="What commonly triggers difficult behaviors?" rows={2} className="mt-1 rounded-xl border-border resize-none text-sm" />
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div
                      onClick={() => updateChild(i, "is_patient", !c.is_patient)}
                      className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors flex-shrink-0 ${c.is_patient ? "bg-primary border-primary" : "border-border bg-background"}`}
                    >
                      {c.is_patient && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                    <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">This is the patient / client</span>
                  </label>
                </div>
              ))}
              <button onClick={addChild} className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium">
                <Plus className="w-4 h-4" /> Add Another Child
              </button>
            </div>
          )}

          {/* Done step */}
          {step === doneStep && (
            <div className="text-center py-4 space-y-5">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-lg">Client Added!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {holder.email
                    ? emailSent
                      ? `Invite email sent to ${holder.email}.`
                      : emailError
                        ? `Email delivery failed. Use the link below.`
                        : `Processing invite for ${holder.email}...`
                    : "Share the invite link below manually."}
                </p>
              </div>

              {/* Email status badge */}
              {holder.email && (
                <div className={`flex items-center justify-center gap-2 text-xs font-medium px-3 py-2 rounded-xl mx-auto w-fit ${
                  emailSent ? "bg-green-50 text-green-700" :
                  emailError ? "bg-red-50 text-red-700" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {emailSent && <><CheckCircle2 className="w-3.5 h-3.5" /> Email Sent Successfully</>}
                  {emailError && <><AlertCircle className="w-3.5 h-3.5" /> Email Failed — Copy link below</>}
                </div>
              )}

              {/* Email failed explanation */}
              {emailError && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-left text-xs text-amber-800 space-y-1">
                  <p className="font-semibold">⚠️ Why did the email fail?</p>
                  <p>Email delivery requires integration credits. Your workspace may be out of credits or the email service is temporarily unavailable. <strong>The client profile was created successfully.</strong> You can still onboard them by copying the invite link below and sending it manually.</p>
                </div>
              )}

              {/* Resend button on error */}
              {emailError && holder.email && (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl gap-1.5 text-xs"
                  onClick={handleResend}
                  disabled={resending}
                >
                  {resending ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Resending...</> : <><RefreshCw className="w-3.5 h-3.5" /> Try Resend Email</>}
                </Button>
              )}

              {inviteLink && (
                <div className="bg-muted rounded-xl p-4 text-left space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Mail className="w-4 h-4 text-primary" />
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Invite Link</p>
                  </div>
                  <p className="text-xs font-mono text-foreground break-all">{inviteLink}</p>
                  <Button variant="outline" size="sm" className="w-full rounded-xl mt-2" onClick={copyLink}>
                    Copy Link
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3 flex-shrink-0 border-t border-border pt-4">
          {step === 0 && (
            <Button
              className="flex-1 rounded-xl gap-1.5 bg-primary hover:bg-primary/90"
              disabled={!canProceedStep1}
              onClick={() => setStep(1)}
            >
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          )}
          {step === 1 && (
            <>
              <Button variant="outline" className="flex-1 rounded-xl gap-1.5" onClick={() => setStep(0)}>
                <ChevronLeft className="w-4 h-4" /> Back
              </Button>
              {isFamily ? (
                <Button
                  className="flex-1 rounded-xl bg-primary hover:bg-primary/90"
                  disabled={!canProceedStep2}
                  onClick={() => setStep(2)}
                >
                  Next <ChevronRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  className="flex-1 rounded-xl bg-primary hover:bg-primary/90"
                  onClick={handleSave}
                  disabled={saving || !canSaveIndividual}
                >
                  {saving ? "Saving..." : "Save & Send Invite"}
                </Button>
              )}
            </>
          )}
          {step === 2 && isFamily && (
            <>
              <Button variant="outline" className="flex-1 rounded-xl gap-1.5" onClick={() => setStep(1)}>
                <ChevronLeft className="w-4 h-4" /> Back
              </Button>
              <Button
                className="flex-1 rounded-xl bg-primary hover:bg-primary/90"
                onClick={handleSave}
                disabled={saving || !canSaveFamily}
              >
                {saving ? "Saving..." : "Save & Send Invite"}
              </Button>
            </>
          )}
          {step === doneStep && (
            <Button className="flex-1 rounded-xl bg-primary hover:bg-primary/90" onClick={handleClose}>
              Done
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
}