import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Send, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { format } from "date-fns";

export default function Messages() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState("");
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [recipientId, setRecipientId] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      const me = await base44.auth.me();
      setUser(me);

      if (me.app_role === "clinician") {
        const kids = await base44.entities.Child.filter({ clinician_id: me.id });
        setChildren(kids);
        if (kids[0]) setSelectedChildId(kids[0].id);
      } else {
        const [byId, byEmail] = await Promise.all([
          base44.entities.Child.filter({ parent_id: me.id }),
          base44.entities.Child.filter({ parent_email: me.email }),
        ]);
        const seen = new Set();
        const merged = [...byId, ...byEmail].filter(c => { if (seen.has(c.id)) return false; seen.add(c.id); return true; });
        setChildren(merged);
        if (merged[0]) {
          setSelectedChildId(merged[0].id);
          setRecipientId(merged[0].clinician_id || "");
        }
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!user || !selectedChildId) return;
    base44.entities.Message.filter({ child_id: selectedChildId }).then(msgs => {
      setMessages(msgs.sort((a, b) => new Date(a.created_date) - new Date(b.created_date)));
    });
    if (user.app_role !== "clinician") {
      const child = children.find(c => c.id === selectedChildId);
      if (child?.clinician_id) setRecipientId(child.clinician_id);
    }
  }, [selectedChildId, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!newMsg.trim() || !recipientId) return;
    setSending(true);
    const msg = await base44.entities.Message.create({
      from_user_id: user.id,
      to_user_id: recipientId,
      child_id: selectedChildId,
      body: newMsg.trim(),
      sender_role: user.app_role === "clinician" ? "clinician" : "parent",
      is_read: false,
    });
    setMessages(prev => [...prev, msg]);
    setNewMsg("");
    setSending(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const selectedChild = children.find(c => c.id === selectedChildId);

  return (
    <div className="flex flex-col h-screen bg-background font-inter">
      <div className="bg-card border-b border-border px-4 py-4 flex items-center gap-3 flex-shrink-0">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <MessageCircle className="w-5 h-5 text-primary" />
        <h1 className="font-bold text-foreground flex-1">Messages</h1>
      </div>

      {children.length > 1 && (
        <div className="px-4 py-3 bg-card border-b border-border flex-shrink-0">
          <Select value={selectedChildId} onValueChange={setSelectedChildId}>
            <SelectTrigger className="rounded-xl text-sm h-9">
              <SelectValue placeholder="Select child" />
            </SelectTrigger>
            <SelectContent>
              {children.map(c => <SelectItem key={c.id} value={c.id}>{c.child_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-5">
        {messages.length === 0 ? (
          <div className="text-center py-16">
            <MessageCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No messages yet for {selectedChild?.child_name || "this child"}.</p>
          </div>
        ) : (
          <div className="space-y-3 max-w-xl mx-auto">
            {messages.map((msg, i) => {
              const isMe = msg.from_user_id === user?.id;
              return (
                <motion.div key={msg.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-sm ${isMe ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-card border border-border text-foreground rounded-bl-sm"}`}>
                    <p>{msg.body}</p>
                    <p className={`text-xs mt-1 ${isMe ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                      {msg.created_date ? format(new Date(msg.created_date), "MMM d, h:mm a") : ""}
                    </p>
                  </div>
                </motion.div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {!recipientId && user?.app_role !== "clinician" && (
        <div className="px-4 py-3 bg-yellow-50 border-t border-yellow-200 text-xs text-yellow-700 text-center flex-shrink-0">
          No clinician linked to this child yet. Ask your clinician to set up your account.
        </div>
      )}

      <div className="flex-shrink-0 border-t border-border bg-card px-4 py-3">
        <div className="max-w-xl mx-auto flex gap-2 items-end">
          <Textarea
            value={newMsg}
            onChange={e => setNewMsg(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 resize-none rounded-xl text-sm max-h-28 min-h-[40px]"
            disabled={!recipientId && user?.app_role !== "clinician"}
          />
          <Button onClick={handleSend} disabled={sending || !newMsg.trim() || (!recipientId && user?.app_role !== "clinician")} className="h-10 w-10 p-0 rounded-xl flex-shrink-0">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}