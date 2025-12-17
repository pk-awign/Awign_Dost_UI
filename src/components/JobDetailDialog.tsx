import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Edit2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Tables } from "@/integrations/supabase/types";

type Job = Tables<"AEX_Job_Data">;

interface JobDetailDialogProps {
  job: Job | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}

export function JobDetailDialog({
  job,
  open,
  onOpenChange,
  onUpdated,
}: JobDetailDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    roleCode: "",
    roleName: "",
    status: "active",
    location: "",
    jdContext: "",
    currentUpdates: "",
    minimumExperience: "",
    duration: "",
    candidateMonthlyCtc: "",
    skills: "",
  });

  useEffect(() => {
    if (job) {
      setFormData({
        roleCode: job["Role Code"] || "",
        roleName: job["Role Name"] || "",
        status: job["Status"] || "active",
        location: job["Location"] || "",
        jdContext: job["Brief context about the role (JD)"] || "",
        currentUpdates: job["Current Updates"] || "",
        minimumExperience: job["Minimum Experience"] || "",
        duration: job["Duration"] || "",
        candidateMonthlyCtc: job["Candidate Monthly CTC"] || "",
        skills: job["Skills"] || "",
      });
      setIsEditing(false);
    }
  }, [job]);

  const handleSave = async () => {
    if (!job) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from("AEX_Job_Data")
        .update({
          "Role Name": formData.roleName || null,
          "Status": formData.status || "active",
          "Location": formData.location || null,
          "Brief context about the role (JD)": formData.jdContext || null,
          "Current Updates": formData.currentUpdates || null,
          "Minimum Experience": formData.minimumExperience || null,
          "Duration": formData.duration || null,
          "Candidate Monthly CTC": formData.candidateMonthlyCtc || null,
          "Skills": formData.skills || null,
        } as any)
        .eq("id", job.id);

      if (error) throw error;

      toast({ title: "Success", description: "Job updated successfully" });
      setIsEditing(false);
      onUpdated();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "active": return "default";
      case "paused": return "secondary";
      case "closed": return "destructive";
      default: return "secondary";
    }
  };

  if (!job) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                {job["Role Name"] || "—"}
                <Badge variant={getStatusColor(job["Status"])}>{job["Status"] || "N/A"}</Badge>
              </DialogTitle>
              <DialogDescription>
                {isEditing ? "Edit job information" : `Role Code: ${job["Role Code"] || "—"}`}
              </DialogDescription>
            </div>
            <Button
              variant={isEditing ? "outline" : "default"}
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? <X className="h-4 w-4 mr-1" /> : <Edit2 className="h-4 w-4 mr-1" />}
              {isEditing ? "Cancel" : "Edit"}
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Role Code</Label>
              <p className="text-sm text-muted-foreground p-2 bg-muted rounded font-mono">{job["Role Code"] || "—"}</p>
            </div>
            <div className="space-y-2">
              <Label>Role Name</Label>
              {isEditing ? (
                <Input
                  value={formData.roleName}
                  onChange={(e) => setFormData({ ...formData, roleName: e.target.value })}
                />
              ) : (
                <p className="text-sm text-muted-foreground p-2 bg-muted rounded">{job["Role Name"] || "—"}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              {isEditing ? (
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm p-2">
                  <Badge variant={getStatusColor(job["Status"])}>{job["Status"] || "N/A"}</Badge>
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              {isEditing ? (
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              ) : (
                <p className="text-sm text-muted-foreground p-2 bg-muted rounded">{job["Location"] || "—"}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Minimum Experience</Label>
              {isEditing ? (
                <Input
                  value={formData.minimumExperience}
                  onChange={(e) => setFormData({ ...formData, minimumExperience: e.target.value })}
                />
              ) : (
                <p className="text-sm text-muted-foreground p-2 bg-muted rounded">
                  {job["Minimum Experience"] || "—"}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Duration</Label>
              {isEditing ? (
                <Input
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                />
              ) : (
                <p className="text-sm text-muted-foreground p-2 bg-muted rounded">{job["Duration"] || "—"}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Candidate Annual CTC</Label>
            {isEditing ? (
              <Input
                value={formData.candidateMonthlyCtc}
                onChange={(e) => setFormData({ ...formData, candidateMonthlyCtc: e.target.value })}
              />
            ) : (
              <p className="text-sm text-muted-foreground p-2 bg-muted rounded">
                {job["Candidate Monthly CTC"] || "—"}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Skills</Label>
            {isEditing ? (
              <Input
                value={formData.skills}
                onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                placeholder="React, TypeScript, Node.js"
              />
            ) : (
              <div className="flex flex-wrap gap-1 p-2">
                {job["Skills"] ? (
                  job["Skills"].split(",").map((skill, idx) => (
                    <Badge key={idx} variant="outline">{skill.trim()}</Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Job Description (JD)</Label>
            {isEditing ? (
              <Textarea
                value={formData.jdContext}
                onChange={(e) => setFormData({ ...formData, jdContext: e.target.value })}
                rows={4}
              />
            ) : (
              <p className="text-sm text-muted-foreground p-2 bg-muted rounded whitespace-pre-wrap">
                {job["Brief context about the role (JD)"] || "—"}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Current Updates</Label>
            {isEditing ? (
              <Input
                value={formData.currentUpdates}
                onChange={(e) => setFormData({ ...formData, currentUpdates: e.target.value })}
              />
            ) : (
              <p className="text-sm text-muted-foreground p-2 bg-muted rounded">{job["Current Updates"] || "—"}</p>
            )}
          </div>

          {isEditing && (
            <Button onClick={handleSave} className="w-full" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
