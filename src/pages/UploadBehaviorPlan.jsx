import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, ArrowLeft, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";

export default function UploadBehaviorPlan() {
  const [user, setUser] = useState(null);
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState("");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStage, setUploadStage] = useState("");
  const [status, setStatus] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      const me = await base44.auth.me();
      setUser(me);
      const kids = await base44.entities.Child.filter({ clinician_id: me.id });
      setChildren(kids);
      // Pre-select child from URL param if provided
      const urlChildId = new URLSearchParams(window.location.search).get("child_id");
      if (urlChildId) setSelectedChildId(urlChildId);
    };
    load();
  }, []);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setStatus(null);
  };

  const handleUpload = async () => {
    if (!file || !selectedChildId) {
      setStatus({ type: "error", message: "Please select a child and upload a file." });
      return;
    }

    setUploading(true);
    setStatus(null);

    try {
      // Step 1: Upload the file
      setUploadStage("Uploading document...");
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Step 2: Extract ALL content from the document as raw text + structured fields
      setUploadStage("Reading and analyzing document...");
      const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            behavior_name: { type: "string", description: "Name or title of the behavior being addressed" },
            behavior_description: { type: "string", description: "Full description of the behavior" },
            behavior_function: { type: "string", description: "The function or purpose of the behavior (e.g., escape, attention, sensory)" },
            common_triggers: { type: "string", description: "Triggers or antecedents that precede the behavior" },
            severity_level: { type: "string", description: "Severity: low, moderate, high, or crisis" },
            strategy_title: { type: "string", description: "Title of the intervention strategy" },
            strategy_steps: { type: "string", description: "Step-by-step intervention instructions" },
            when_to_use: { type: "string", description: "When this strategy should be implemented" },
            reinforcement_method: { type: "string", description: "Reinforcement or reward strategies" },
            escalation_signs: { type: "string", description: "Signs that behavior is escalating" },
            deescalation_steps: { type: "string", description: "Steps to de-escalate the behavior" },
            avoid_actions: { type: "string", description: "Actions to avoid during this behavior" },
            safe_space_method: { type: "string", description: "Safe space or calming environment strategies" },
            full_document_text: { type: "string", description: "The complete verbatim text content of the entire document" },
          },
        },
      });

      if (extracted.status === "error") {
        setStatus({ type: "error", message: "Could not read the document. Please check the file format and try again." });
        setUploading(false);
        return;
      }

      const data = extracted.output;

      // Step 3: Use AI to fill in any gaps and ensure complete coverage
      setUploadStage("Structuring behavior plan...");
      const child = children.find(c => c.id === selectedChildId);
      const aiEnhanced = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a clinical behavior analyst. A behavior plan document has been uploaded for ${child?.child_name || "a child"}.

Here is the full extracted document content:
"""
${data.full_document_text || JSON.stringify(data)}
"""

Extract and structure ALL relevant clinical information from this document. Be thorough - capture every strategy, instruction, and clinical note. If a field is not explicitly mentioned, write "Not specified in plan".

Return the most complete and accurate extraction possible.`,
        response_json_schema: {
          type: "object",
          properties: {
            behavior_name: { type: "string" },
            behavior_description: { type: "string" },
            behavior_function: { type: "string" },
            common_triggers: { type: "string" },
            severity_level: { type: "string", enum: ["low", "moderate", "high", "crisis"] },
            strategy_title: { type: "string" },
            strategy_steps: { type: "string" },
            when_to_use: { type: "string" },
            reinforcement_method: { type: "string" },
            escalation_signs: { type: "string" },
            deescalation_steps: { type: "string" },
            avoid_actions: { type: "string" },
            safe_space_method: { type: "string" },
          },
          required: ["behavior_name"],
        },
      });

      // Step 4: Save to database — include full document text for AI context
      setUploadStage("Saving behavior plan...");
      await base44.entities.BehaviorPlan.create({
        child_id: selectedChildId,
        created_by: user.id,
        file_url: file_url,
        file_name: file.name,
        behavior_name: aiEnhanced.behavior_name || data.behavior_name || file.name.replace(/\.[^/.]+$/, ""),
        behavior_description: aiEnhanced.behavior_description || data.behavior_description || data.full_document_text || "",
        behavior_function: aiEnhanced.behavior_function || data.behavior_function || "",
        common_triggers: aiEnhanced.common_triggers || data.common_triggers || "",
        severity_level: aiEnhanced.severity_level || data.severity_level || "moderate",
        strategy_title: aiEnhanced.strategy_title || data.strategy_title || "",
        strategy_steps: aiEnhanced.strategy_steps || data.strategy_steps || "",
        when_to_use: aiEnhanced.when_to_use || data.when_to_use || "",
        reinforcement_method: aiEnhanced.reinforcement_method || data.reinforcement_method || "",
        escalation_signs: aiEnhanced.escalation_signs || data.escalation_signs || "",
        deescalation_steps: aiEnhanced.deescalation_steps || data.deescalation_steps || "",
        avoid_actions: aiEnhanced.avoid_actions || data.avoid_actions || "",
        safe_space_method: aiEnhanced.safe_space_method || data.safe_space_method || "",
      });

      setStatus({ type: "success", message: "Behavior plan uploaded and saved successfully! The AI can now use this plan in conversations." });
      setFile(null);
      setSelectedChildId("");
    } catch (error) {
      setStatus({ type: "error", message: "Upload failed. Please try again." });
    } finally {
      setUploading(false);
      setUploadStage("");
    }
  };

  const selectedChild = children.find(c => c.id === selectedChildId);

  return (
    <div className="min-h-screen bg-background p-6 font-inter">
      <div className="max-w-2xl mx-auto">
        <Button variant="ghost" onClick={() => navigate("/ClinicianDashboard")} className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-2xl p-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Upload className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Upload Behavior Plan</h1>
              <p className="text-sm text-muted-foreground">AI will scan and extract the full plan content</p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground bg-muted/50 rounded-xl p-3 mb-6">
            Upload an existing behavior plan document (PDF, DOCX, or TXT). Aspire AI will read the entire document and make it available for parent guidance sessions.
          </p>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Select Client</label>
              <Select value={selectedChildId} onValueChange={setSelectedChildId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a client" />
                </SelectTrigger>
                <SelectContent>
                  {children.map((child) => (
                    <SelectItem key={child.id} value={child.id}>
                      {child.child_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedChild && (
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  <User className="w-3 h-3" />
                  {selectedChild.child_name}, Age {selectedChild.age} {selectedChild.diagnosis ? `· ${selectedChild.diagnosis}` : ""}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Upload Document</label>
              <label
                htmlFor="file-upload"
                className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-8 cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-all"
              >
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <FileText className="w-10 h-10 text-muted-foreground mb-3" />
                {file ? (
                  <>
                    <p className="text-foreground font-medium text-sm">{file.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">{(file.size / 1024).toFixed(1)} KB · Click to change</p>
                  </>
                ) : (
                  <>
                    <p className="text-foreground font-medium text-sm">Click to select a file</p>
                    <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, or TXT supported</p>
                  </>
                )}
              </label>
            </div>

            {uploading && (
              <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-xl">
                <Loader2 className="w-5 h-5 text-primary animate-spin flex-shrink-0" />
                <p className="text-sm text-primary font-medium">{uploadStage}</p>
              </div>
            )}

            {status && !uploading && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-start gap-3 p-4 rounded-xl ${
                  status.type === "success" ? "bg-green-500/10 text-green-700" : "bg-red-500/10 text-red-600"
                }`}
              >
                {status.type === "success" ? (
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                )}
                <p className="text-sm font-medium">{status.message}</p>
              </motion.div>
            )}

            <Button
              onClick={handleUpload}
              disabled={uploading || !file || !selectedChildId}
              className="w-full"
              size="lg"
            >
              {uploading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</>
              ) : (
                <><Upload className="w-4 h-4 mr-2" />Upload & Scan Plan</>
              )}
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}