import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Users, User, Baby, Search, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";

export default function ClinicianUsers() {
  const navigate = useNavigate();
  const [allUsers, setAllUsers] = useState([]);
  const [children, setChildren] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [users, kids] = await Promise.all([
        base44.entities.User.list(),
        base44.entities.Child.list(),
      ]);
      setAllUsers(users.sort((a, b) => (a.full_name || "").localeCompare(b.full_name || "")));
      setChildren(kids.sort((a, b) => (a.child_name || "").localeCompare(b.child_name || "")));
      setLoading(false);
    };
    load();
  }, []);

  const filteredUsers = allUsers.filter((u) =>
    (u.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (u.email || "").toLowerCase().includes(search.toLowerCase())
  );

  const filteredChildren = children.filter((c) =>
    (c.child_name || "").toLowerCase().includes(search.toLowerCase())
  );

  const roleLabel = (role) => {
    if (role === "clinician") return { text: "Clinician", color: "bg-secondary/10 text-secondary" };
    if (role === "parent") return { text: "Parent", color: "bg-accent/10 text-accent" };
    return { text: role || "User", color: "bg-muted text-muted-foreground" };
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto font-inter">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-1">All Users</h1>
        <p className="text-muted-foreground text-sm">Parents, clients, and children</p>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="pl-9 rounded-xl border-border"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Users (Parents & Clinicians) */}
          {filteredUsers.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <Users className="w-3.5 h-3.5" /> Users ({filteredUsers.length})
              </h2>
              <div className="space-y-2">
                {filteredUsers.map((user, i) => {
                  const label = roleLabel(user.role);
                  return (
                    <motion.div
                      key={user.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="bg-card border border-border rounded-xl p-4 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                          <span className="text-accent-foreground text-sm font-semibold">
                            {user.full_name?.[0]?.toUpperCase() || "U"}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{user.full_name || "—"}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${label.color}`}>{label.text}</span>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Children */}
          {filteredChildren.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <Baby className="w-3.5 h-3.5" /> Children ({filteredChildren.length})
              </h2>
              <div className="space-y-2">
                {filteredChildren.map((child, i) => (
                  <motion.div
                    key={child.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="bg-card border border-border rounded-xl p-4 flex items-center justify-between cursor-pointer hover:border-primary/50 transition-all group"
                    onClick={() => navigate(`/ClientDetail?child_id=${child.id}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-primary text-sm font-semibold">
                          {child.child_name?.[0]?.toUpperCase() || "C"}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{child.child_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {child.age ? `Age ${child.age}` : ""}
                          {child.age && child.diagnosis ? " · " : ""}
                          {child.diagnosis || ""}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {filteredUsers.length === 0 && filteredChildren.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-sm">No results found.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}