import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Brain, Users, MessageSquare, LogOut, Menu, X, ChevronRight, FileText, Settings, Baby, AlertCircle, BarChart2, Upload, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

const noLayoutPages = ["Splash", "Login", "RoleSelection", "ClinicianLogin", "ParentLogin", "ClientLogin", "RoleSetup", "HelpNow"];

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [children_list, setChildrenList] = useState([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.me().then((me) => {
      setUser(me);
      if (me?.app_role === "clinician") {
        base44.entities.Child.filter({ clinician_id: me.id }).then(setChildrenList).catch(() => {});
      } else if (me?.app_role === "parent") {
        base44.entities.Child.filter({ parent_id: me.id }).then(setChildrenList).catch(() => {});
      }
    }).catch(() => {});
  }, [currentPageName]);

  if (noLayoutPages.includes(currentPageName)) {
    return <>{children}</>;
  }

  if (!user) return <>{children}</>;

  const role = user.app_role || user.role;

  const handleLogout = () => {
    base44.auth.logout(window.location.origin + "/Splash");
  };

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
              <p className="font-semibold text-foreground text-sm">NuroPath AI</p>
              <p className="text-xs text-muted-foreground">{role === "clinician" ? "Clinician Portal" : "Client Portal"}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {role === "clinician" ?
          <>
              <Link
              to="/ClinicianDashboard"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
              currentPageName === "ClinicianDashboard" ?
              "bg-primary text-primary-foreground" :
              "text-muted-foreground hover:text-foreground hover:bg-muted"}`
              }>
              
                <Users className="w-4 h-4" />
                Dashboard
                {currentPageName === "ClinicianDashboard" && <ChevronRight className="w-3 h-3 ml-auto" />}
              </Link>
              <Link
              to="/ClinicianUsers"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
              currentPageName === "ClinicianUsers" ?
              "bg-primary text-primary-foreground" :
              "text-muted-foreground hover:text-foreground hover:bg-muted"}`
              }>
              
                <Users className="w-4 h-4" />
                Users
                {currentPageName === "ClinicianUsers" && <ChevronRight className="w-3 h-3 ml-auto" />}
              </Link>
              <Link
              to="/InterventionBuilder"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
              currentPageName === "InterventionBuilder" ?
              "bg-primary text-primary-foreground" :
              "text-muted-foreground hover:text-foreground hover:bg-muted"}`
              }>
                <ShieldAlert className="w-4 h-4" />
                Intervention Plans
                {currentPageName === "InterventionBuilder" && <ChevronRight className="w-3 h-3 ml-auto" />}
              </Link>
              <Link
              to="/ClinicianDocuments"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
              currentPageName === "ClinicianDocuments" ?
              "bg-primary text-primary-foreground" :
              "text-muted-foreground hover:text-foreground hover:bg-muted"}`
              }>
                <Upload className="w-4 h-4" />
                Documents
                {currentPageName === "ClinicianDocuments" && <ChevronRight className="w-3 h-3 ml-auto" />}
              </Link>
              <Link
              to="/ProgressReports"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
              currentPageName === "ProgressReports" ?
              "bg-primary text-primary-foreground" :
              "text-muted-foreground hover:text-foreground hover:bg-muted"}`
              }>
                <BarChart2 className="w-4 h-4" />
                Progress Reports
                {currentPageName === "ProgressReports" && <ChevronRight className="w-3 h-3 ml-auto" />}
              </Link>
              <Link
              to="/Messages"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
              currentPageName === "Messages" ?
              "bg-primary text-primary-foreground" :
              "text-muted-foreground hover:text-foreground hover:bg-muted"}`
              }>
                <MessageSquare className="w-4 h-4" />
                Messages
                {currentPageName === "Messages" && <ChevronRight className="w-3 h-3 ml-auto" />}
              </Link>
              <Link
              to="/Settings"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
              currentPageName === "Settings" ?
              "bg-primary text-primary-foreground" :
              "text-muted-foreground hover:text-foreground hover:bg-muted"}`
              }>
              
                <Settings className="w-4 h-4" />
                Settings
                {currentPageName === "Settings" && <ChevronRight className="w-3 h-3 ml-auto" />}
              </Link>
            </> :

          <>
              <Link
              to="/ClientDashboard"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
              currentPageName === "ClientDashboard" ?
              "bg-primary text-primary-foreground" :
              "text-muted-foreground hover:text-foreground hover:bg-muted"}`
              }>
              
                <Users className="w-4 h-4" />
                Dashboard
                {currentPageName === "ParentDashboard" && <ChevronRight className="w-3 h-3 ml-auto" />}
              </Link>

              {children_list.length > 0 &&
            <div className="mt-2">
                  <p className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Children</p>
                  {children_list.map((child) => {
                const isActive = currentPageName === "ChildProfile" && new URLSearchParams(window.location.search).get("child_id") === child.id;
                return (
                  <Link
                    key={child.id}
                    to={`/ChildProfile?child_id=${child.id}`}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                    isActive ?
                    "bg-primary text-primary-foreground" :
                    "text-muted-foreground hover:text-foreground hover:bg-muted"}`
                    }>
                    
                        <Baby className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{child.child_name}</span>
                      </Link>);

              })}
                </div>
            }

              <Link
              to="/HelpNow"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
              currentPageName === "HelpNow" ?
              "bg-red-600 text-white" :
              "text-red-600 hover:text-red-700 hover:bg-red-50"}`
              }>
                <AlertCircle className="w-4 h-4" />
                Help Now
                {currentPageName === "HelpNow" && <ChevronRight className="w-3 h-3 ml-auto" />}
              </Link>
              <Link
              to="/DocumentCenter"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
              currentPageName === "DocumentCenter" ?
              "bg-primary text-primary-foreground" :
              "text-muted-foreground hover:text-foreground hover:bg-muted"}`
              }>
                <FileText className="w-4 h-4" />
                Documents
                {currentPageName === "DocumentCenter" && <ChevronRight className="w-3 h-3 ml-auto" />}
              </Link>
              <Link
              to="/Messages"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
              currentPageName === "Messages" ?
              "bg-primary text-primary-foreground" :
              "text-muted-foreground hover:text-foreground hover:bg-muted"}`
              }>
                <MessageSquare className="w-4 h-4" />
                Messages
                {currentPageName === "Messages" && <ChevronRight className="w-3 h-3 ml-auto" />}
              </Link>

              <Link
              to="/Settings"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
              currentPageName === "Settings" ?
              "bg-primary text-primary-foreground" :
              "text-muted-foreground hover:text-foreground hover:bg-muted"}`
              }>
              
                <Settings className="w-4 h-4" />
                Settings
                {currentPageName === "Settings" && <ChevronRight className="w-3 h-3 ml-auto" />}
              </Link>
            </>
          }
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 mb-3 px-1">
            <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
              <span className="text-accent-foreground text-xs font-semibold">
                {user.full_name?.[0]?.toUpperCase() || "U"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{user.full_name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-foreground gap-2"
            onClick={handleLogout}>
            
            <LogOut className="w-4 h-4" />
            Sign out
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

      {/* Mobile drawer */}
      {mobileOpen &&
      <div className="md:hidden fixed inset-0 z-40 bg-black/40" onClick={() => setMobileOpen(false)}>
          <div
          className="absolute left-0 top-14 bottom-0 w-64 bg-card border-r border-border p-4"
          onClick={(e) => e.stopPropagation()}>
          
            <nav className="space-y-1">
              {role === "clinician" ?
            <>
                  <Link
                to="/ClinicianDashboard"
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                currentPageName === "ClinicianDashboard" ?
                "bg-primary text-primary-foreground" :
                "text-muted-foreground hover:text-foreground hover:bg-muted"}`
                }>
                
                    <Users className="w-4 h-4" />
                    Dashboard
                  </Link>

                </> :

            <>
                  <Link to="/ClientDashboard" onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${currentPageName === "ClientDashboard" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
                    <Users className="w-4 h-4" /> Dashboard
                  </Link>
                  {children_list.map((child) =>
              <Link key={child.id} to={`/ChildProfile?child_id=${child.id}`} onClick={() => setMobileOpen(false)} className="flex items-center gap-2 ml-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all">
                      <Baby className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">{child.child_name}</span>
                    </Link>
              )}
                  <Link to="/AIChat" onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${currentPageName === "AIChat" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
                    <MessageSquare className="w-4 h-4" /> Ask Aspire AI
                  </Link>
                  <Link to="/Settings" onClick={() => setMobileOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${currentPageName === "Settings" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
                    <Settings className="w-4 h-4" /> Settings
                  </Link>
                </>
            }
            </nav>
            <div className="mt-4 pt-4 border-t border-border">
              <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start text-muted-foreground gap-2"
              onClick={handleLogout}>
              
                <LogOut className="w-4 h-4" />
                Sign out
              </Button>
            </div>
          </div>
        </div>
      }

      {/* Main content */}
      <main className="flex-1 md:overflow-auto min-h-screen pt-14 md:pt-0">
        {children}
      </main>
    </div>);

}