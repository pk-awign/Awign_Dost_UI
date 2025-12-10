import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Loader2, Users, Mail, Phone, Upload, FileSpreadsheet, RefreshCw } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CandidateDetailDialog } from "@/components/CandidateDetailDialog";

interface AEXCandidate {
  id: number;
  created_at: string;
  "Application ID": string | null;
  "Role Code": string | null;
  "Candidate Name": string | null;
  "Candidate Email ID": string | null;
  "Candidate Contact Number": string | null;
  "Candidate years of experience": string | null;
  "Candidate relevant years of experience": string | null;
  "Notice Period": string | null;
  "Current CTC": string | null;
  "Candidate Salary Expectation": string | null;
  "Current Location": string | null;
  "Candidate Resume": string | null;
  "Job Applied": string | null;
  "Skills": string | null;
  "Documents": string | null;
  "Screening Response": string | null;
}

interface GroupedCandidate {
  contact: string;
  name: string;
  location: string;
  date: string;
  roleCodeList: string[];
  lastApplied: string | null;
  lastAppliedRoles: string[]; // Format: "RoleCode-Score-ScreeningResponse"
  timesApplied: number;
  allApplications: AEXCandidate[];
}

type AEXCandidateInsert = Omit<AEXCandidate, "id" | "created_at">;
type Job = Tables<"AEX_Job_Data">;

const Candidates = () => {
  const [candidates, setCandidates] = useState<AEXCandidate[]>([]);
  const [groupedCandidates, setGroupedCandidates] = useState<GroupedCandidate[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingCsv, setUploadingCsv] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<AEXCandidate | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    roleCode: "",
    candidateName: "",
    candidateEmail: "",
    candidateContactNumber: "",
    candidateExperienceYears: "",
    candidateRelevantYears: "",
    noticePeriod: "",
    currentCtc: "",
    salaryExpectation: "",
    currentLocation: "",
    candidateResume: "",
    jobApplied: "",
    skills: "",
    documents: "",
  });

  // Function to generate Application ID: AEX_RoleCode_timestamp
  // For CSV uploads, we add a counter to ensure uniqueness
  const generateApplicationId = (roleCode: string | null, counter?: number): string => {
    const timestamp = Math.floor(Date.now() / 1000); // Time in seconds
    const roleCodePart = roleCode ? roleCode.trim() : "UNKNOWN";
    // Add counter for CSV bulk uploads to ensure uniqueness
    const suffix = counter !== undefined ? `_${counter}` : "";
    return `AEX_${roleCodePart}_${timestamp}${suffix}`;
  };

  useEffect(() => {
    checkUserRole();
    fetchCandidates();
    fetchJobs();
  }, []);

  const checkUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: roles, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);
        
        if (error) {
          console.error("Error checking user role:", error);
        } else {
          console.log("User roles:", roles);
          if (!roles || roles.length === 0) {
            console.warn("User has no roles assigned. Admin role is required to view data.");
            toast({
              title: "Permission Required",
              description: "You need an 'admin' role to view candidates. Please contact your administrator.",
              variant: "destructive",
            });
          }
        }
      }
    } catch (error) {
      console.error("Error in checkUserRole:", error);
    }
  };

  const fetchJobs = async () => {
    try {
      const { data, error } = await supabase
        .from("AEX_Job_Data")
        .select("*")
        .eq("Status", "active")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching jobs for dropdown:", error);
        throw error;
      }
      setJobs(data || []);
    } catch (error: any) {
      console.error("Error in fetchJobs (Candidates page):", error);
    }
  };

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("AEX_Candidate_Data")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching candidates:", error);
        throw error;
      }
      
      const candidatesData = (data as AEXCandidate[]) || [];
      console.log("Fetched candidates:", candidatesData.length, "candidates");
      setCandidates(candidatesData);
      
      if (candidatesData.length === 0) {
        console.warn("No candidates found. This might be due to RLS policies. Make sure your user has 'admin' role assigned.");
      }
      
      // Fetch CV matching data for scores
      const { data: cvMatchingData, error: cvError } = await supabase
        .from("AEX_CV_Matching")
        .select('"Application ID", "Role Code", "Score"');

      if (cvError) {
        console.error("Error fetching CV matching data:", cvError);
      }

      // Group candidates by contact number
      const grouped = await groupCandidatesByContact(candidatesData, cvMatchingData || []);
      setGroupedCandidates(grouped);
    } catch (error: any) {
      console.error("Error in fetchCandidates:", error);
      toast({
        title: "Error fetching candidates",
        description: error.message || "Failed to fetch candidates. Please check if you have the required permissions (admin role).",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const groupCandidatesByContact = (
    candidatesData: AEXCandidate[],
    cvMatchingData: Array<{ "Application ID": string | null; "Role Code": string | null; "Score": string | null }>
  ): GroupedCandidate[] => {
    const contactMap = new Map<string, AEXCandidate[]>();
    
    // Create a map for CV matching scores by Application ID and Role Code
    const cvScoreMap = new Map<string, string | null>();
    cvMatchingData.forEach(cv => {
      if (cv["Application ID"] && cv["Role Code"]) {
        const key = `${cv["Application ID"]}_${cv["Role Code"]}`;
        cvScoreMap.set(key, cv["Score"]);
      }
    });
    
    // Group by contact number
    candidatesData.forEach(candidate => {
      const contact = candidate["Candidate Contact Number"]?.trim() || "";
      if (contact) {
        if (!contactMap.has(contact)) {
          contactMap.set(contact, []);
        }
        contactMap.get(contact)!.push(candidate);
      }
    });

    const grouped: GroupedCandidate[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    contactMap.forEach((applications, contact) => {
      // Sort applications by date (most recent first)
      const sorted = [...applications].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      const latest = sorted[0];
      const roleCodeList = [...new Set(sorted.map(app => app["Role Code"]).filter((rc): rc is string => rc !== null))];
      
      // Get last applied (previous time, not the current one)
      const previousApplications = sorted.slice(1);
      
      // Get current application date (normalized to date only, no time)
      const currentAppDate = new Date(latest.created_at);
      currentAppDate.setHours(0, 0, 0, 0);
      
      // Only show Last Applied if:
      // 1. There are previous applications
      // 2. The last applied date is different from the current application date
      let lastApplied: string | null = null;
      const lastAppliedRoles: string[] = [];
      
      if (previousApplications.length > 0) {
        const lastAppliedDate = new Date(previousApplications[0].created_at);
        lastAppliedDate.setHours(0, 0, 0, 0);
        
        // Compare dates - only show if they're different
        if (lastAppliedDate.getTime() !== currentAppDate.getTime()) {
          lastApplied = lastAppliedDate.toLocaleDateString();
          
          // Get last applied roles with format: "RoleCode: Score, ScreeningResponse"
          const uniqueRoleCodes = new Set(
            previousApplications
              .map(app => app["Role Code"])
              .filter((rc): rc is string => rc !== null)
          );

          uniqueRoleCodes.forEach(roleCode => {
            // Find the most recent application with this role code
            const appWithRoleCode = previousApplications.find(
              app => app["Role Code"] === roleCode
            );
            
            if (appWithRoleCode) {
              // Get score from CV matching
              const cvKey = `${appWithRoleCode["Application ID"]}_${roleCode}`;
              const score = cvScoreMap.get(cvKey) || "—";
              
              // Get screening response (use "Null" if not exist)
              const screeningResponse = appWithRoleCode["Screening Response"] || "Null";
              
              // Format: "RoleCode: Score, ScreeningResponse"
              lastAppliedRoles.push(`${roleCode}: ${score}, ${screeningResponse}`);
            }
          });
        }
      }

      // Default value: No. of Times Applied = 1 for all entries
      const timesApplied = 1;

      grouped.push({
        contact,
        name: latest["Candidate Name"] || "—",
        location: latest["Current Location"] || "—",
        date: new Date(latest.created_at).toLocaleDateString(),
        roleCodeList,
        lastApplied,
        lastAppliedRoles,
        timesApplied,
        allApplications: sorted,
      });
    });

    // Sort by most recent date
    return grouped.sort((a, b) => 
      new Date(b.allApplications[0].created_at).getTime() - 
      new Date(a.allApplications[0].created_at).getTime()
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Check if Contact Number + Role Code already exists
      if (formData.candidateContactNumber && formData.roleCode) {
        const { data: existing, error: checkError } = await supabase
          .from("AEX_Candidate_Data")
          .select("id")
          .eq("Candidate Contact Number", formData.candidateContactNumber.trim())
          .eq("Role Code", formData.roleCode.trim())
          .maybeSingle();

        if (checkError && checkError.code !== 'PGRST116') {
          throw checkError;
        }

        if (existing) {
          toast({
            title: "Duplicate Entry",
            description: `Candidate with Contact Number "${formData.candidateContactNumber}" and Role Code "${formData.roleCode}" already exists. Entry skipped.`,
            variant: "destructive",
          });
          setSubmitting(false);
          return;
        }
      }

      // Auto-generate Application ID
      const applicationId = generateApplicationId(formData.roleCode);

      const candidateData: AEXCandidateInsert = {
        "Application ID": applicationId,
        "Role Code": formData.roleCode || null,
        "Candidate Name": formData.candidateName || null,
        "Candidate Email ID": formData.candidateEmail || null,
        "Candidate Contact Number": formData.candidateContactNumber || null,
        "Candidate years of experience": formData.candidateExperienceYears || null,
        "Candidate relevant years of experience": formData.candidateRelevantYears || null,
        "Notice Period": formData.noticePeriod || null,
        "Current CTC": formData.currentCtc || null,
        "Candidate Salary Expectation": formData.salaryExpectation || null,
        "Current Location": formData.currentLocation || null,
        "Candidate Resume": formData.candidateResume || null,
        "Job Applied": formData.jobApplied || null,
        "Skills": formData.skills || null,
        "Documents": formData.documents || null,
      };

      const { error } = await supabase
        .from("AEX_Candidate_Data")
        .insert(candidateData as any);

      if (error) throw error;

      toast({ title: "Success", description: "Candidate added successfully" });
      setDialogOpen(false);
      setFormData({
        roleCode: "",
        candidateName: "",
        candidateEmail: "",
        candidateContactNumber: "",
        candidateExperienceYears: "",
        candidateRelevantYears: "",
        noticePeriod: "",
        currentCtc: "",
        salaryExpectation: "",
        currentLocation: "",
        candidateResume: "",
        jobApplied: "",
        skills: "",
        documents: "",
      });
      fetchCandidates();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCsv(true);

    try {
      const text = await file.text();
      const lines = text.split("\n").filter(line => line.trim());
      const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
      
      // Map CSV headers to table columns (case-insensitive matching)
      const columnMap: Record<string, keyof AEXCandidateInsert> = {
        "application id": "Application ID",
        "role code": "Role Code",
        "candidate name": "Candidate Name",
        "candidate email id": "Candidate Email ID",
        "candidate contact number": "Candidate Contact Number",
        "candidate years of experience": "Candidate years of experience",
        "candidate relevant years of experience": "Candidate relevant years of experience",
        "notice period": "Notice Period",
        "current ctc": "Current CTC",
        "candidate salary expectation": "Candidate Salary Expectation",
        "current location": "Current Location",
        "candidate resume": "Candidate Resume",
        "job applied": "Job Applied",
        "skills": "Skills",
        "documents": "Documents",
      };

      // Fetch existing candidates to check for duplicates
      const { data: existingCandidates } = await supabase
        .from("AEX_Candidate_Data")
        .select('"Candidate Contact Number", "Role Code"');

      const existingSet = new Set<string>();
      (existingCandidates || []).forEach(c => {
        const contact = c["Candidate Contact Number"]?.trim();
        const roleCode = c["Role Code"]?.trim();
        if (contact && roleCode) {
          existingSet.add(`${contact}_${roleCode}`);
        }
      });

      const rows: AEXCandidateInsert[] = [];
      const skippedRows: Array<{ row: number; reason: string }> = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values: string[] = [];
        let current = "";
        let inQuotes = false;
        for (const char of lines[i]) {
          if (char === '"') inQuotes = !inQuotes;
          else if (char === "," && !inQuotes) {
            values.push(current.trim());
            current = "";
          } else current += char;
        }
        values.push(current.trim());

        const row: Partial<AEXCandidateInsert> = {};
        headers.forEach((h, idx) => {
          const key = columnMap[h.toLowerCase()];
          // Skip Application ID from CSV - we'll auto-generate it
          if (key === "Application ID") return;
          if (!key || !values[idx]) return;
          row[key] = values[idx].trim() || null;
        });

        // Check for duplicate Contact Number + Role Code
        const contactNumber = row["Candidate Contact Number"]?.trim();
        const roleCode = row["Role Code"]?.trim();
        
        if (contactNumber && roleCode) {
          const key = `${contactNumber}_${roleCode}`;
          if (existingSet.has(key)) {
            skippedRows.push({
              row: i + 1,
              reason: `Contact Number "${contactNumber}" and Role Code "${roleCode}" already exist`
            });
            toast({
              title: `Row ${i + 1} Skipped`,
              description: `Duplicate: Contact Number "${contactNumber}" and Role Code "${roleCode}" already exist`,
              variant: "destructive",
            });
            continue;
          }
          // Add to set to check for duplicates within CSV
          existingSet.add(key);
        }

        // Auto-generate Application ID for each row with counter to ensure uniqueness
        row["Application ID"] = generateApplicationId(roleCode || null, i - 1);

        // Auto-populate Job Applied from AEX_Job_Data if Role Code matches
        if (roleCode) {
          const matchingJob = jobs.find(j => j["Role Code"] === roleCode);
          if (matchingJob && matchingJob["Role Name"]) {
            row["Job Applied"] = matchingJob["Role Name"];
          }
        }

        // Only add rows that have at least Candidate Name
        if (row["Candidate Name"]) {
          rows.push(row as AEXCandidateInsert);
        }
      }

      if (rows.length === 0) {
        toast({
          title: "No Valid Rows",
          description: skippedRows.length > 0 
            ? `All rows were skipped. ${skippedRows.length} duplicate(s) found.`
            : "No valid rows found in CSV",
          variant: "destructive",
        });
        setUploadingCsv(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      
      const { error } = await supabase
        .from("AEX_Candidate_Data")
        .insert(rows as any);
      
      if (error) throw error;

      const successMessage = skippedRows.length > 0
        ? `${rows.length} candidate(s) uploaded. ${skippedRows.length} duplicate(s) skipped.`
        : `${rows.length} candidate(s) uploaded`;

      toast({ title: "Success", description: successMessage });
      setDialogOpen(false);
      fetchCandidates();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setUploadingCsv(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Candidates</h2>
          <p className="text-muted-foreground mt-1">Manage candidate profiles and applications</p>
        </div>
        <div className="flex items-center gap-2">
          <Card className="px-4 py-2">
            <div className="text-sm text-muted-foreground">Total: <span className="font-semibold text-foreground">{groupedCandidates.length}</span></div>
          </Card>
          <Button onClick={fetchCandidates} variant="outline" disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Add Candidate</Button>
            </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Candidate</DialogTitle>
              <DialogDescription>Add a single candidate or upload multiple via CSV</DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="form" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="form"><Plus className="h-4 w-4 mr-2" />Single Entry</TabsTrigger>
                <TabsTrigger value="csv"><FileSpreadsheet className="h-4 w-4 mr-2" />Bulk Upload</TabsTrigger>
              </TabsList>
              <TabsContent value="form" className="mt-4">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Candidate Name *</Label>
                      <Input value={formData.candidateName} onChange={(e) => setFormData({ ...formData, candidateName: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Role Code</Label>
                      <Select
                        value={formData.roleCode}
                        onValueChange={(value) => {
                          const selectedJob = jobs.find(j => j["Role Code"] === value);
                          setFormData({
                            ...formData,
                            roleCode: value,
                            jobApplied: selectedJob?.["Role Name"] || "",
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Role Code" />
                        </SelectTrigger>
                        <SelectContent>
                          {jobs.map((job) => (
                            <SelectItem key={job.id} value={job["Role Code"] || ""}>
                              {job["Role Code"]} - {job["Role Name"]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">Application ID will be auto-generated</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Email ID</Label>
                      <Input type="email" value={formData.candidateEmail} onChange={(e) => setFormData({ ...formData, candidateEmail: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Contact Number</Label>
                      <Input value={formData.candidateContactNumber} onChange={(e) => setFormData({ ...formData, candidateContactNumber: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Job Applied</Label>
                      <Input 
                        value={formData.jobApplied} 
                        onChange={(e) => setFormData({ ...formData, jobApplied: e.target.value })}
                        readOnly
                        className="bg-muted"
                      />
                      <p className="text-xs text-muted-foreground">Auto-filled from selected Role Code</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Years of Experience</Label>
                      <Input value={formData.candidateExperienceYears} onChange={(e) => setFormData({ ...formData, candidateExperienceYears: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Relevant Experience</Label>
                      <Input value={formData.candidateRelevantYears} onChange={(e) => setFormData({ ...formData, candidateRelevantYears: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Notice Period</Label>
                      <Input value={formData.noticePeriod} onChange={(e) => setFormData({ ...formData, noticePeriod: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Current Location</Label>
                      <Input value={formData.currentLocation} onChange={(e) => setFormData({ ...formData, currentLocation: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Current CTC</Label>
                      <Input value={formData.currentCtc} onChange={(e) => setFormData({ ...formData, currentCtc: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Salary Expectation</Label>
                      <Input value={formData.salaryExpectation} onChange={(e) => setFormData({ ...formData, salaryExpectation: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Skills</Label>
                    <Input value={formData.skills} onChange={(e) => setFormData({ ...formData, skills: e.target.value })} placeholder="React, TypeScript, Node.js" />
                  </div>
                  <div className="space-y-2">
                    <Label>Candidate Resume (URL)</Label>
                    <Input value={formData.candidateResume} onChange={(e) => setFormData({ ...formData, candidateResume: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Documents</Label>
                    <Input value={formData.documents} onChange={(e) => setFormData({ ...formData, documents: e.target.value })} />
                  </div>
                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add Candidate
                  </Button>
                </form>
              </TabsContent>
              <TabsContent value="csv" className="mt-4">
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Upload CSV File</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    CSV columns: Role Code, Candidate Name, Candidate Email ID, etc.
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Note: Application ID will be auto-generated for each entry (ignored if present in CSV)
                  </p>
                  <input type="file" ref={fileInputRef} accept=".csv" onChange={handleCsvUpload} className="hidden" />
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploadingCsv}>
                    {uploadingCsv ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Uploading...</>
                    ) : (
                      <><FileSpreadsheet className="mr-2 h-4 w-4" />Select CSV</>
                    )}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {groupedCandidates.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Role Code List</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Last Applied</TableHead>
                  <TableHead>Last Applied Roles</TableHead>
                  <TableHead>No. of Times Applied</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupedCandidates.map((group, idx) => (
                  <TableRow
                    key={`${group.contact}-${idx}`}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      // Show the most recent application
                      setSelectedCandidate(group.allApplications[0]);
                      setDetailDialogOpen(true);
                    }}
                  >
                    <TableCell>{group.date}</TableCell>
                    <TableCell className="font-medium">{group.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Phone className="h-3 w-3" />
                        {group.contact}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {group.roleCodeList.length > 0 ? (
                          group.roleCodeList.map((roleCode, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium"
                            >
                              {roleCode}
                            </span>
                          ))
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{group.location}</TableCell>
                    <TableCell>{group.lastApplied || "—"}</TableCell>
                    <TableCell>
                      {group.lastAppliedRoles.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {group.lastAppliedRoles.map((role, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center px-2 py-1 rounded-md bg-secondary text-secondary-foreground text-xs"
                            >
                              {role}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{group.timesApplied}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No candidates yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Start by adding your first candidate</p>
          </CardContent>
        </Card>
      )}

      <CandidateDetailDialog
        candidate={selectedCandidate}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        onUpdated={fetchCandidates}
      />
    </div>
  );
};

export default Candidates;
