import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Users, Trash2, Edit2, Save, X, MessageCircle, FileText, ClipboardList, RefreshCw, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";

export default function FamilyDetail() {
  const navigate = useNavigate();
  const familyId = new URLSearchParams(window.location.search).get("family_id");
  const [family, setFamily] = useState(null);
  const [children, setChildren] = useState([]);
  const [stats, setStats] = useState({ logs: 0, messages: 0, documents: 0, plans: 0 });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [reconnectMsg, setReconnectMsg] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!familyId) { navigate(-1); return; }

    const load = async () => {
      const [familyArr, familyChildren] = await Promise.all([
        base44.entities.Family.filter({ id: familyId }).catch(() => []),
        base44.entities.Child.filter({ family_id: familyId }).catch(() => []),
      ]);
      const familyData = familyArr[0] || null;

      setFamily(familyData);
      setEditName(familyData?.family_name || "");
      setEditNotes(familyData?.notes || "");
      setChildren(familyChildren);

      if (familyChildren.length > 0) {
        const childIds = familyChildren.map(c => c.id);
        const [logsArr, messagesArr, docsArr, plansArr] = await Promise.all([
          Promise.all(childIds.map(id => base44.entities.BehaviorLog.filter({ child_id: id }).catch(() => []))),
          Promise.all(childIds.map(id => base44.entities.Message.filter({ child_id: id }).catch(() => []))),
          Promise.all(childIds.map(id => base44.entities.Document.filter({ child_id: id }).catch(() => []))),
          Promise.all(childIds.map(id => base44.entities.InterventionPlan.filter({ child_id: id }).catch(() => []))),
        ]);
        setStats({
          logs: logsArr.flat().length,
          messages: messagesArr.flat().length,
          documents: docsArr.flat().length,
          plans: plansArr.flat().length,
        });
      }
      setLoading(false);
    };
    load();
  }, [familyId]);

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.Family.update(familyId, { family_name: editName, notes: editNotes });
    setFamily(prev => ({ ...prev, family_name: editName, notes: editNotes }));
    setEditing(false);
    setSaving(false);
  };

  const handleReconnect = async () => {
    if (!family?.invite_email && !family?.invite_token) {
      setReconnectMsg("No invite email on record. Please edit the family and add one.");
      return;
    }
    setReconnecting(true);
    setReconnectMsg("");
    try {
      // Generate a new token
      const newToken = Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
      await base44.entities.Family.update(familyId, { invite_token: newToken, invite_status: "pending" });
      setFamily(prev => ({ ...prev, invite_token: newToken, invite_status: "pending" }));

      if (family.invite_email) {
        await base44.functions.invoke("sendInviteEmail", {
          to: family.invite_email,
          familyName: family.family_name,
          inviteToken: newToken,
        });
        setReconnectMsg(`Invite resent to ${family.invite_email}`);
      } else {
        setReconnectMsg("New invite link generated. Copy it below.");
      }
    } catch {
      setReconnectMsg("Failed to resend invite. Try copying the link manually.");
    }
    setReconnecting(false);
  };

  const handleCopyLink = () => {
    const token = family?.invite_token;
    if (!token) return;
    const link = `${window.location.origin}/RoleSetup?invite=${token}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this family and all associated data? This cannot be undone.")) return;
    await Promise.all(children.map(child => base44.entities.Child.delete(child.id)));
    await base44.entities.Family.delete(familyId);
    navigate("/ClinicianDashboard");
  };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (!family) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Family not found.</p></div>;

  return (
    <div className="min-h-screen bg-background font-inter">
      <div className="sticky top-0 z-10 bg-card border-b border-border px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="font-bold text-foreground flex-1">{family.family_name || "Family"}</h1>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <Button size="sm" variant="outline" className="rounded-xl h-8" onClick={() => setEditing(false)}><X className="w-3.5 h-3.5" /></Button>
              <Button size="sm" className="rounded-xl h-8" onClick={handleSave} disabled={saving}><Save className="w-3.5 h-3.5 mr-1" />{saving ? "Saving..." : "Save"}</Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="outline" className="rounded-xl h-8" onClick={() => setEditing(true)}><Edit2 className="w-3.5 h-3.5" /></Button>
              <Button size="sm" variant="destructive" className="rounded-xl h-8" onClick={handleDelete}><Trash2 className="w-3.5 h-3.5" /></Button>
            </>
          )}
        </div>
      </div>

      <div className="p-5 max-w-2xl mx-auto space-y-5">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="font-bold text-foreground">{family.family_name}</p>
              {family.parent_name && <p className="text-xs text-muted-foreground">Parent: {family.parent_name}</p>}
            </div>
          </div>

          {editing ? (
            <div className="space-y-3">
              <div><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Family Name</p><Input value={editName} onChange={e => setEditName(e.target.value)} className="rounded-xl" /></div>
              <div><p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Notes</p><Textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} className="rounded-xl" rows={3} /></div>
            </div>
          ) : (
            family.notes && <p className="text-sm text-muted-foreground mb-4">{family.notes}</p>
          )}

          {/* Reconnect section */}
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Parent Connection</p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${family.invite_status === "accepted" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                {family.invite_status === "accepted" ? "Connected" : "Pending"}
              </span>
              {family.invite_email && (
                <span className="text-xs text-muted-foreground">{family.invite_email}</span>
              )}
              <Button
                size="sm"
                variant="outline"
                className="rounded-xl h-7 text-xs ml-auto gap-1.5"
                onClick={handleReconnect}
                disabled={reconnecting}
              >
                <RefreshCw className={`w-3 h-3 ${reconnecting ? "animate-spin" : ""}`} />
                {reconnecting ? "Sending..." : "Resend Invite"}
              </Button>
              {family.invite_token && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-xl h-7 text-xs gap-1.5"
                  onClick={handleCopyLink}
                >
                  {copied ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                  {copied ? "Copied!" : "Copy Link"}
                </Button>
              )}
            </div>
            {reconnectMsg && (
              <p className="text-xs mt-2 text-muted-foreground">{reconnectMsg}</p>
            )}
          </div>
        </motion.div>

        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Logs", value: stats.logs, icon: ClipboardList, color: "text-blue-500" },
            { label: "Messages", value: stats.messages, icon: MessageCircle, color: "text-green-500" },
            { label: "Documents", value: stats.documents, icon: FileText, color: "text-purple-500" },
            { label: "Plans", value: stats.plans, icon: ClipboardList, color: "text-orange-500" },
          ].map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-card border border-border rounded-2xl p-3 text-center">
              <stat.icon className={`w-4 h-4 ${stat.color} mx-auto mb-1`} />
              <p className="text-xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        <div>
          <h2 className="font-semibold text-foreground text-sm mb-3 px-1">Children ({children.length})</h2>
          {children.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed border-border rounded-2xl">
              <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No children linked to this family.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {children.map((child, i) => (
                <motion.div key={child.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3 cursor-pointer hover:border-primary/40 transition-colors"
                  onClick={() => navigate(`/ClientDetail?child_id=${child.id}`)}>
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary font-bold">{child.child_name?.[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground text-sm">{child.child_name}</p>
                    <p className="text-xs text-muted-foreground">Age {child.age}{child.diagnosis ? ` · ${child.diagnosis}` : ""}</p>
                  </div>
                  <ArrowLeft className="w-4 h-4 text-muted-foreground rotate-180" />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}