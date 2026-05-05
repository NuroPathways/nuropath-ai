import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Baby, Users, MessageSquare, BarChart2, FileText, ShieldAlert, Pencil, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { format } from "date-fns";

export default function FamilyDetail() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const familyId = urlParams.get("family_id");

  const [family, setFamily] = useState(null);
  const [children, setChildren] = useState([]);
  const [parentUsers, setParentUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [messages, setMessages] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [interventions, setInterventions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [editingFamily, setEditingFamily] = useState(false);
  const [editName, setEditName] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!familyId) return;
    const load = async () => {
      let me;
      try { me = await base44.auth.me(); } catch { /* unauthenticated preview */ }
      const [fam, kids] = await Promise.all([
        base44.entities.Family.filter({ id: familyId }),
        base44.entities.Child.filter({ family_id: familyId }),
      ]);
      const f = fam[0];
      setFamily(f);
      setEditName(f?.family_name || "");
      setEditNotes(f?.notes || "");
      setChildren(kids);

      const childIds = kids.map(c => c.id);

      // Derive guardian info from child records (no User.list() needed)
      const guardianMap = {};
      for (const kid of kids) {
        if (kid.parent_email && !guardianMap[kid.parent_email]) {
          guardianMap[kid.parent_email] = { email: kid.parent_email, full_name: f?.parent_name || "" };
        }
      }

      const [logResults, msgResults, docResults, intResults] = await Promise.all([
        Promise.all(childIds.map(id => base44.entities.BehaviorLog.filter({ child_id: id }))),
        Promise.all(childIds.map(id => base44.entities.Message.filter({ child_id: id }))),
        Promise.all(childIds.map(id => base44.entities.Document.filter({ child_id: id }))),
        Promise.all(childIds.map(id => base44.entities.InterventionPlan.filter({ child_id: id }))),
      ]);

      setParentUsers(Object.values(guardianMap));
      setLogs(logResults.flat().sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
      setMessages(msgResults.flat().sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));

      setDocuments(docResults.flat());
      setInterventions(intResults.flat());
      setLoading(false);
    };
    load();
  }, [familyId]);

  const saveEdit = async () => {
    setSaving(true);
    await base44.entities.Family.update(familyId, { family_name: editName, notes: editNotes });
    setFamily(f => ({ ...f, family_name: editName, notes: editNotes }));
    setEditingFamily(false);
    setSaving(false);
  };

  const deleteFamily = async () => {
    // Delete all children first
    for (const child of children) {
      await base44.entities.Child.delete(child.id);
    }
    await base44.entities.Family.delete(familyId);
    navigate("/ClinicianUsers");
  };

  const childName = (id) => children.find(c => c.id === id)?.child_name || "";

  if (loading) return (
    <div className="p-6 space-y-3 max-w-3xl mx-auto">
      {[1,2,3,4].map(i => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}
    </div>
  );

  if (!family) return (
    <div className="p-6 text-center text-muted-foreground">Family not found.</div>
  );

  return (
    <div className="min-h-screen bg-background font-inter">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-foreground truncate">{family.family_name} Family</h1>
          <p className="text-xs text-muted-foreground">{children.length} child{children.length !== 1 ? "ren" : ""} · Invite {family?.invite_status || "pending"}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="rounded-xl gap-1.5 h-8 text-xs" onClick={() => setEditingFamily(true)}>
            <Pencil className="w-3.5 h-3.5" /> Edit
          </Button>
          <Button size="sm" variant="destructive" className="rounded-xl gap-1.5 h-8 text-xs" onClick={() => setConfirmDelete(true)}>
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </Button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4">
        {/* Edit form */}
        {editingFamily && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-2xl p-4 mb-4 space-y-3">
            <h3 className="font-semibold text-foreground text-sm">Edit Family</h3>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Family Name</p>
              <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Notes</p>
              <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={2} className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 rounded-xl text-sm h-9" onClick={() => setEditingFamily(false)}>Cancel</Button>
              <Button className="flex-1 rounded-xl text-sm h-9" onClick={saveEdit} disabled={saving}>{saving ? "Saving…" : "Save Changes"}</Button>
            </div>
          </motion.div>
        )}

        {/* Delete confirmation */}
        {confirmDelete && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="bg-destructive/10 border border-destructive/30 rounded-2xl p-4 mb-4">
            <p className="font-semibold text-destructive text-sm mb-1">Delete this family?</p>
            <p className="text-xs text-muted-foreground mb-3">This will permanently delete the family and all {children.length} linked child record{children.length !== 1 ? "s" : ""}. This cannot be undone.</p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 rounded-xl text-sm h-9" onClick={() => setConfirmDelete(false)}>Cancel</Button>
              <Button variant="destructive" className="flex-1 rounded-xl text-sm h-9" onClick={deleteFamily}>Yes, Delete</Button>
            </div>
          </motion.div>
        )}

        {/* Members summary */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Baby className="w-4 h-4 text-primary" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Children</p>
            </div>
            {children.length === 0 ? <p className="text-sm text-muted-foreground">None</p> : children.map(c => (
              <div key={c.id} className="flex items-center justify-between py-1 group cursor-pointer" onClick={() => navigate(`/ClientDetail?child_id=${c.id}`)}>
                <p className="text-sm font-medium text-foreground group-hover:text-primary">{c.child_name}</p>
                <span className="text-xs text-muted-foreground">{c.age ? `Age ${c.age}` : ""}</span>
              </div>
            ))}
          </div>
          <div className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-accent" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Guardians</p>
            </div>
            {parentUsers.length === 0 ? (
              <div>
                <p className="text-sm text-muted-foreground mb-1">No guardian linked yet</p>
                {family?.invite_email && (
                  <p className="text-xs text-muted-foreground">Invite sent to: {family.invite_email}</p>
                )}
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${family?.invite_status === "accepted" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                  {family?.invite_status === "accepted" ? "Joined" : "Invite pending"}
                </span>
              </div>
            ) : parentUsers.map((p, i) => (
              <div key={i} className="py-1">
                <p className="text-sm font-medium text-foreground">{p.full_name || "Guardian"}</p>
                <p className="text-xs text-muted-foreground">{p.email}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-0.5 inline-block ${family?.invite_status === "accepted" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                  {family?.invite_status === "accepted" ? "Joined" : "Invite pending"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="behavior">
          <TabsList className="w-full grid grid-cols-4 rounded-xl mb-4">
            <TabsTrigger value="behavior" className="text-xs rounded-lg">
              <BarChart2 className="w-3.5 h-3.5 mr-1" />Behavior
            </TabsTrigger>
            <TabsTrigger value="messages" className="text-xs rounded-lg">
              <MessageSquare className="w-3.5 h-3.5 mr-1" />Messages
            </TabsTrigger>
            <TabsTrigger value="docs" className="text-xs rounded-lg">
              <FileText className="w-3.5 h-3.5 mr-1" />Docs
            </TabsTrigger>
            <TabsTrigger value="plans" className="text-xs rounded-lg">
              <ShieldAlert className="w-3.5 h-3.5 mr-1" />Plans
            </TabsTrigger>
          </TabsList>

          {/* Behavior Logs */}
          <TabsContent value="behavior">
            <div className="bg-card border border-border rounded-2xl p-4">
              <h3 className="font-semibold text-foreground text-sm mb-3">Behavior Logs ({logs.length})</h3>
              {logs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No behavior logs yet.</p>
              ) : (
                <div className="space-y-2">
                  {logs.slice(0, 25).map(log => (
                    <div key={log.id} className="flex items-start gap-3 p-3 bg-background border border-border rounded-xl">
                      <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${log.intensity === "high" ? "bg-red-500" : log.intensity === "moderate" ? "bg-yellow-500" : "bg-green-500"}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-foreground">{log.behavior_type || "Behavior"}</p>
                          <span className="text-xs text-muted-foreground">· {childName(log.child_id)}</span>
                          {log.created_date && <span className="text-xs text-muted-foreground ml-auto">{format(new Date(log.created_date), "MMM d")}</span>}
                        </div>
                        {log.context && <p className="text-xs text-muted-foreground mt-0.5">{log.context}</p>}
                      </div>
                      {log.outcome && (
                        <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${log.outcome === "resolved" ? "bg-green-100 text-green-700" : log.outcome === "escalated" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                          {log.outcome}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Messages */}
          <TabsContent value="messages">
            <div className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-foreground text-sm">Messages ({messages.length})</h3>
                <Button size="sm" className="h-8 text-xs rounded-xl gap-1" onClick={() => navigate("/Messages")}>
                  <Plus className="w-3 h-3" /> Open Messaging
                </Button>
              </div>
              {messages.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No messages yet.</p>
              ) : (
                <div className="space-y-2">
                  {messages.slice(0, 15).map(msg => (
                    <div key={msg.id} className="p-3 bg-background border border-border rounded-xl">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${msg.sender_role === "clinician" ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"}`}>
                          {msg.sender_role === "clinician" ? "Clinician" : "Parent"}
                        </span>
                        <span className="text-xs text-muted-foreground ml-auto">{msg.created_date ? format(new Date(msg.created_date), "MMM d, h:mm a") : ""}</span>
                      </div>
                      <p className="text-sm text-foreground">{msg.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Documents */}
          <TabsContent value="docs">
            <div className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-foreground text-sm">Documents ({documents.length})</h3>
                <Button size="sm" className="h-8 text-xs rounded-xl gap-1" onClick={() => navigate("/ClinicianDocuments")}>
                  <Plus className="w-3 h-3" /> Upload
                </Button>
              </div>
              {documents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No documents uploaded yet.</p>
              ) : (
                <div className="space-y-2">
                  {documents.map(doc => (
                    <div key={doc.id} className="flex items-center gap-3 p-3 bg-background border border-border rounded-xl">
                      <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <a href={doc.file_url} target="_blank" rel="noreferrer" className="text-sm font-medium text-foreground hover:text-primary truncate block">{doc.title}</a>
                        <p className="text-xs text-muted-foreground">{childName(doc.child_id)} · {doc.category?.replace(/_/g, " ")}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Intervention Plans */}
          <TabsContent value="plans">
            <div className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-foreground text-sm">Intervention Plans ({interventions.length})</h3>
                <Button size="sm" className="h-8 text-xs rounded-xl gap-1" onClick={() => navigate("/InterventionBuilder")}>
                  <Plus className="w-3 h-3" /> New Plan
                </Button>
              </div>
              {interventions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No intervention plans yet.</p>
              ) : (
                <div className="space-y-2">
                  {interventions.map(plan => (
                    <div key={plan.id} className="p-3 bg-background border border-border rounded-xl">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-foreground">{plan.title}</p>
                          <p className="text-xs text-muted-foreground">{childName(plan.child_id)} · {plan.behavior_category?.replace(/_/g, " ")}</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${plan.is_active ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                          {plan.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}