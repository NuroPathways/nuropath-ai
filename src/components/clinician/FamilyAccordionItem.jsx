import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ChevronRight, Baby, User, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function FamilyAccordionItem({ family, children, parentUsers }) {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();

  const childCount = children.length;
  const parentCount = parentUsers.length;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <button
        className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors text-left"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
          <span className="text-accent-foreground text-sm font-semibold">
            {family.family_name?.[0]?.toUpperCase() || "F"}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{family.family_name} Family</p>
          <p className="text-xs text-muted-foreground">
            {childCount} child{childCount !== 1 ? "ren" : ""}
            {parentCount > 0 ? ` · ${parentCount} guardian${parentCount !== 1 ? "s" : ""}` : ""}
          </p>
        </div>
        {expanded ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        )}
      </button>

      {/* Expanded Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
              {/* Children */}
              {childCount > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Baby className="w-3 h-3" /> Children
                  </p>
                  <div className="space-y-2">
                    {children.map((child) => (
                      <div
                        key={child.id}
                        className="flex items-center justify-between bg-background rounded-lg px-3 py-2.5 cursor-pointer hover:border-primary/50 border border-border group transition-all"
                        onClick={() => navigate(`/ClientDetail?child_id=${child.id}`)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-primary text-xs font-semibold">
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
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Guardians/Parents */}
              {parentCount > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Users className="w-3 h-3" /> Guardians
                  </p>
                  <div className="space-y-2">
                    {parentUsers.map((parent) => (
                      <div
                        key={parent.id}
                        className="flex items-center gap-3 bg-background rounded-lg px-3 py-2.5 border border-border"
                      >
                        <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-secondary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{parent.full_name || "Guardian"}</p>
                          <p className="text-xs text-muted-foreground">{parent.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {childCount === 0 && parentCount === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">No members linked to this family yet.</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}