import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Brain, Users, MessageSquare, LogOut, Menu, X, ChevronRight, FileText, Settings, Baby, AlertCircle, BarChart2, Upload, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

const noLayoutPages = ["Splash", "Login", "RoleSelection", "ClinicianLogin", "ParentLogin", "ClientLogin", "RoleSetup", "HelpNow"];

export default function Layout({ children, currentPageName }) {
  const { user, isLoadingAuth } = useAuth();
  const [children_list, setChildrenList] = useState([]);
  const [isIndividualClient, setIsIndividualClient] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (user.app_role === "clinician") {
      base44.entities.Child.filter({ clinician_id: user.id }).then(setChildrenList).catch(() => {});
    } else if (user.app_role === "parent") {
      Promise.all([
        base44.entities.Child.filter({ parent_id: user.id }).catch(() => []),
        user.email ? base44.entities.Child.filter({ parent_email: user.email }).catch(() => []) : Promise.resolve([]),
      ]).then(([byId, byEmail]) => {
        const map = new Map();
        for (const k of [...byId, ...byEmail]) map.set(k.id, k);
        const kids = Array.from(map.values());
        setChildrenList(kids);

        // Check if individual client via family record
        const familyId = user.linked_family_id || (kids[0]?.family_id);
        if (familyId) {
          base44.entities.Family.filter({ id: familyId }).catch(() => []).then(fams => {
            if (fams[0]?.account_type === "individual") setIsIndividualClient(true);
          });
        }
      });
    }
  }, [user?.id]);

  if (noLayoutPages.includes(currentPageName)) {
    return <>{children}</>;
  }

  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-border border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <>{children}</>;

  const role = user.app_role || user.role;

  const handleLogout = () => {
    base44.auth.logout("/");
  };

  const parentDashboardActive = currentPageName === "ParentDashboard" || currentPageName === "ClientDashboard";

  return (
    <div className="min-h-screen bg-background font-inter flex">
      {/* Sidebar - desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-card border-r border-border">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <Brain className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">NuroPathways</p>
              <p className="text-xs text-muted-foreground">{role === "clinician" ? "Clinician Portal" : "Client Portal"}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {role === "clinician" ? (
            <>
              <Link to="/ClinicianDashboard" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${currentPageName === "ClinicianDashboard" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
                <Users className="w-4 h-4" /> Dashboard
                {currentPageName === "ClinicianDashboard" && <ChevronRight className="w-3 h-3 ml-auto" />}
              </Link>
              <Link to="/ClinicianUsers" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${currentPageName === "ClinicianUsers" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
                <Users className="w-4 h-4" /> Users
                {currentPageName === "ClinicianUsers" && <ChevronRight className="w-3 h-3 ml-auto" />}
              </Link>
              <Link to="/InterventionBuilder" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${currentPageName === "InterventionBuilder" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
                <ShieldAlert className="w-4 h-4" /> Intervention Plans
                {currentPageName === "InterventionBuilder" && <ChevronRight className="w-3 h-3 ml-auto" />}
              </Link>
              <Link to="/ClinicianDocuments" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${currentPageName === "ClinicianDocuments" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
                <Upload className="w-4 h-4" /> Documents
                {currentPageName === "ClinicianDocuments" && <ChevronRight className="w-3 h-3 ml-auto" />}
              </Link>
              <Link to="/ProgressReports" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${currentPageName === "ProgressReports" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
                <BarChart2 className="w-4 h-4" /> Progress Reports
                {currentPageName === "ProgressReports" && <ChevronRight className="w-3 h-3 ml-auto" />}
              </Link>
              <Link to="/Messages" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${currentPageName === "Messages" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
                <MessageSquare className="w-4 h-4" /> Messages
                {currentPageName === "Messages" && <ChevronRight className="w-3 h-3 ml-auto" />}
              </Link>
              <Link to="/Settings" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${currentPageName === "Settings" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
                <Settings className="w-4 h-4" /> Settings
                {currentPageName === "Settings" && <ChevronRight className="w-3 h-3 ml-auto" />}
              </Link>
            </>
          ) : (
            <>
              <Link to="/ParentDashboard" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${parentDashboardActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
                <Users className="w-4 h-4" /> Dashboard
                {parentDashboardActive && <ChevronRight className="w-3 h-3 ml-auto" />}
              </Link>

              {children_list.length > 0 && (
                <div className="mt-2">
                  <p className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{isIndividualClient ? "My Profile" : "Children"}</p>
                  {children_list.map((child) => {
                    const isActive = currentPageName === "ChildProfile" && new URLSearchParams(window.location.search).get("child_id") === child.id;
                    return (
                      <Link key={child.id} to={`/ChildProfile?child_id=${child.id}`} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
                        <Baby className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{child.child_name}</span>
                      </Link>
                    );
                  })}
                </div>
              )}

              <Link to="/AIChat" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${currentPageName === "AIChat" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
                <MessageSquare className="w-4 h-4" /> Aspire AI
                {currentPageName === "AIChat" && <ChevronRight className="w-3 h-3 ml-auto" />}
              </Link>
              <Link to="/HelpNow" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${currentPageName === "HelpNow" ? "bg-red-600 text-white" : "text-red-600 hover:text-red-700 hover:bg-red-50"}`}>
                <AlertCircle className="w-4 h-4" /> Help Now
                {currentPageName === "HelpNow" && <ChevronRight className="w-3 h-3 ml-auto" />}
              </Link>
              <Link to="/DocumentCenter" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${currentPageName === "DocumentCenter" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
                <FileText className="w-4 h-4" /> Documents
                {currentPageName === "DocumentCenter" && <ChevronRight className="w-3 h-3 ml-auto" />}
              </Link>
              <Link to="/Messages" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${currentPageName === "Messages" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
                <MessageSquare className="w-4 h-4" /> Messages
                {currentPageName === "Messages" && <ChevronRight className="w-3 h-3 ml-auto" />}
              </Link>
              <Link to="/Settings" className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${currentPageName === "Settings" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
                <Settings className="w-4 h-4" /> Settings
                {currentPageName === "Settings" && <ChevronRight className="w-3 h-3 ml-auto" />}
              </Link>
            </>
          )}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 mb-3 px-1">
            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
              <span className="text-accent-foreground text-xs font-semibold">{user.full_name?.[0]?.toUpperCase() || "U"}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{user.full_name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground hover:text-foreground gap-2" onClick={handleLogout}>
            <LogOut className="w-4 h-4" /> Sign out
          </Button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <Brain className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-foreground text-sm">Aspire AI</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {mobileOpen && <div className="md:hidden fixed inset-0 z-40 bg-black/40" onClick={() => setMobileOpen(false)} />}

      <div className={`md:hidden fixed top-14 left-0 bottom-0 z-50 w-72 bg-card border-r border-border transform transition-transform duration-200 ease-in-out overflow-y-auto ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <nav className="p-4 space-y-1">
          {role === "clinician" ? (
            <>
              <Link to="/ClinicianDashboard" onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${currentPageName === "ClinicianDashboard" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}><Users className="w-4 h-4" /> Dashboard</Link>
              <Link to="/ClinicianUsers" onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${currentPageName === "ClinicianUsers" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}><Users className="w-4 h-4" /> Users</Link>
              <Link to="/InterventionBuilder" onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${currentPageName === "InterventionBuilder" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}><ShieldAlert className="w-4 h-4" /> Intervention Plans</Link>
              <Link to="/ClinicianDocuments" onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${currentPageName === "ClinicianDocuments" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}><Upload className="w-4 h-4" /> Documents</Link>
              <Link to="/ProgressReports" onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${currentPageName === "ProgressReports" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}><BarChart2 className="w-4 h-4" /> Progress Reports</Link>
              <Link to="/Messages" onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${currentPageName === "Messages" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}><MessageSquare className="w-4 h-4" /> Messages</Link>
              <Link to="/Settings" onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${currentPageName === "Settings" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}><Settings className="w-4 h-4" /> Settings</Link>
            </>
          ) : (
            <>
              <Link to="/ParentDashboard" onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${parentDashboardActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}><Users className="w-4 h-4" /> Dashboard</Link>
              {children_list.length > 0 && (
                <div className="mt-2">
                  <p className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{isIndividualClient ? "My Profile" : "Children"}</p>
                  {children_list.map((child) => {
                    const isActive = currentPageName === "ChildProfile" && new URLSearchParams(window.location.search).get("child_id") === child.id;
                    return (
                      <Link key={child.id} to={`/ChildProfile?child_id=${child.id}`} onClick={() => setMobileOpen(false)} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
                        <Baby className="w-3.5 h-3.5 flex-shrink-0" /><span className="truncate">{child.child_name}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
              <Link to="/AIChat" onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${currentPageName === "AIChat" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}><MessageSquare className="w-4 h-4" /> Aspire AI</Link>
              <Link to="/HelpNow" onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${currentPageName === "HelpNow" ? "bg-red-600 text-white" : "text-red-600 hover:text-red-700 hover:bg-red-50"}`}><AlertCircle className="w-4 h-4" /> Help Now</Link>
              <Link to="/DocumentCenter" onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${currentPageName === "DocumentCenter" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}><FileText className="w-4 h-4" /> Documents</Link>
              <Link to="/Messages" onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${currentPageName === "Messages" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}><MessageSquare className="w-4 h-4" /> Messages</Link>
              <Link to="/Settings" onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${currentPageName === "Settings" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}><Settings className="w-4 h-4" /> Settings</Link>
            </>
          )}
        </nav>
        <div className="p-4 border-t border-border">
          <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground hover:text-foreground gap-2" onClick={handleLogout}>
            <LogOut className="w-4 h-4" /> Sign out
          </Button>
        </div>
      </div>

      <main className="flex-1 overflow-auto md:pt-0 pt-14">
        {children}
      </main>
    </div>
  );
}