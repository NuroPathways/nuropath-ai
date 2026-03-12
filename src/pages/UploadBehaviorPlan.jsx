import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";

export default function UploadBehaviorPlan() {
  const [user, setUser] = useState(null);
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState("");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      const me = await base44.auth.me();
      setUser(me);
      const kids = await base44.entities.Child.filter({ clinician_id: me.id });
      setChildren(kids);
    };
    load();
  }, []);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setStatus(null);
  };

  const handleUpload = async () => {
    if (!file || !selectedChildId) {
      setStatus({ type: "error", message: "Please select a child and upload a file" });
      return;
    }

    setUploading(true);
    setStatus(null);

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      const extractedData = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            behavior_name: { type: "string" },
            behavior_description: { type: "string" },
            behavior_function: { type: "string" },
            common_triggers: { type: "string" },
            severity_level: { type: "string" },
            strategy_title: { type: "string" },
            strategy_steps: { type: "string" },
            when_to_use: { type: "string" },
            reinforcement_method: { type: "string" },
            escalation_signs: { type: "string" },
            deescalation_steps: { type: "string" },
            avoid_actions: { type: "string" },
            safe_space_method: { type: "string" },
          },
        },
      });

      if (extractedData.status === "error") {
        setStatus({ type: "error", message: extractedData.details || "Failed to extract data from file" });
        setUploading(false);
        return;
      }

      const planData = extractedData.output;
      await base44.entities.BehaviorPlan.create({
        child_id: selectedChildId,
        created_by: user.id,
        behavior_name: planData.behavior_name || "Untitled Behavior",
        behavior_description: planData.behavior_description,
        behavior_function: planData.behavior_function,
        common_triggers: planData.common_triggers,
        severity_level: planData.severity_level || "moderate",
        strategy_title: planData.strategy_title,
        strategy_steps: planData.strategy_steps,
        when_to_use: planData.when_to_use,
        reinforcement_method: planData.reinforcement_method,
        escalation_signs: planData.escalation_signs,
        deescalation_steps: planData.deescalation_steps,
        avoid_actions: planData.avoid_actions,
        safe_space_method: planData.safe_space_method,
      });

      setStatus({ type: "success", message: "Behavior plan uploaded successfully!" });
      setTimeout(() => navigate("/ClinicianDashboard"), 2000);
    } catch (error) {
      setStatus({ type: "error", message: "Upload failed. Please try again." });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 font-inter">
      <div className="max-w-2xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => navigate("/ClinicianDashboard")}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-2xl p-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Upload className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Upload Behavior Plan</h1>
              <p className="text-sm text-muted-foreground">Import existing plans from PDF, DOCX, or TXT files</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Select Child
              </label>
              <Select value={selectedChildId} onValueChange={setSelectedChildId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a child" />
                </SelectTrigger>
                <SelectContent>
                  {children.map((child) => (
                    <SelectItem key={child.id} value={child.id}>
                      {child.child_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Upload Document
              </label>
              <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  {file ? (
                    <p className="text-foreground font-medium">{file.name}</p>
                  ) : (
                    <>
                      <p className="text-foreground font-medium mb-1">Click to upload</p>
                      <p className="text-sm text-muted-foreground">PDF, DOCX, or TXT</p>
                    </>
                  )}
                </label>
              </div>
            </div>

            {status && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-center gap-3 p-4 rounded-xl ${
                  status.type === "success"
                    ? "bg-green-500/10 text-green-600"
                    : "bg-red-500/10 text-red-600"
                }`}
              >
                {status.type === "success" ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <AlertCircle className="w-5 h-5" />
                )}
                <p className="text-sm font-medium">{status.message}</p>
              </motion.div>
            )}

            <Button
              onClick={handleUpload}
              disabled={uploading || !file || !selectedChildId}
              className="w-full"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload & Create Plan
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}