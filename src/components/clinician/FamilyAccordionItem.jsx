import { useNavigate } from "react-router-dom";
import { ChevronRight, Baby, Users } from "lucide-react";

export default function FamilyAccordionItem({ family, children, parentUsers }) {
  const navigate = useNavigate();

  const childCount = children.length;
  const parentCount = parentUsers.length;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header — click goes to FamilyDetail */}
      <button
        className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors text-left"
        onClick={() => navigate(`/FamilyDetail?family_id=${family.id}`)}
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
        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      </button>
    </div>
  );
}