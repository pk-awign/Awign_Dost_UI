import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Target, RefreshCw, ExternalLink, Filter } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ScreeningRecord {
  id?: string;
  "Application ID": string;
  "Job Title": string | null;
  "Role Code": string | null;
  "Candidate Name": string | null;
  "Screening Outcome": string | null;
  "Screening Summary": string | null;
  "Call Status": string | null;
  "Call Score": string | null;
  "Similarity Score": string | null;
  "Final Score": string | null;
  "Conversation ID": string | null;
  "Recording Link": string | null;
  "Notice Period": string | null;
  "Current CTC": string | null;
  "Expected CTC": string | null;
  "Other Job Offers": string | null;
  "Current Location": string | null;
  "Call Route": string | null;
  "Similarity Summary": string | null;
  "Rejection Reason": string | null;
  "Date Created": string | null;
  isWaiting?: boolean; // Flag to identify waiting candidates
}

const Screening = () => {
  const [screenings, setScreenings] = useState<ScreeningRecord[]>([]);
  const [filteredScreenings, setFilteredScreenings] = useState<ScreeningRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<ScreeningRecord | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [expandedView, setExpandedView] = useState(false);
  const [showWaitingCandidates, setShowWaitingCandidates] = useState(false);
  
  // Filter states
  const [callStatusFilter, setCallStatusFilter] = useState<string>("all");
  const [finalScoreMin, setFinalScoreMin] = useState<string>("");
  const [finalScoreMax, setFinalScoreMax] = useState<string>("");
  const [roleCodeFilter, setRoleCodeFilter] = useState<string>("all");
  const [screeningOutcomeFilter, setScreeningOutcomeFilter] = useState<string>("all");
  const [dateSortOrder, setDateSortOrder] = useState<"new" | "old">("new");
  
  // Get unique values for filters
  const [uniqueCallStatuses, setUniqueCallStatuses] = useState<string[]>([]);
  const [uniqueRoleCodes, setUniqueRoleCodes] = useState<string[]>([]);
  const [uniqueOutcomes, setUniqueOutcomes] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchScreenings();
  }, [showWaitingCandidates]);

  const fetchScreenings = async () => {
    try {
      setLoading(true);
      console.log("Fetching from AEX_Screening_Tracker...");
      
      // Fetch from AEX_Screening_Tracker
      const { data: trackerData, error: trackerError } = await supabase
        .from("AEX_Screening_Tracker")
        .select("*")
        .order("created_at", { ascending: false });

      if (trackerError) {
        console.error("Error fetching screenings:", trackerError);
        console.error("Error details:", JSON.stringify(trackerError, null, 2));
        throw trackerError;
      }
      
      console.log("Fetched tracker data:", trackerData?.length || 0, "records");
      
      // Fetch all entries from AEX_Screening_Batch_Queue to check status
      console.log("Fetching queue status from AEX_Screening_Batch_Queue...");
      const { data: queueData, error: queueError } = await supabase
        .from("AEX_Screening_Batch_Queue")
        .select('*');

      if (queueError) {
        console.error("Error fetching queue data:", queueError);
        // Don't throw, just log the error
      }

      // Create a map of Application ID -> Status from queue
      const queueStatusMap = new Map<string, string>();
      if (queueData) {
        queueData.forEach((row: any) => {
          const appId = row["Application ID"] || row.application_id;
          const status = row["Status"] || row.status;
          if (appId && status) {
            queueStatusMap.set(appId, status);
          }
        });
      }
      console.log("Queue status map:", queueStatusMap.size, "entries");

      // Create a map of Application IDs in tracker for quick lookup
      const trackerAppIds = new Set<string>();
      if (trackerData) {
        trackerData.forEach((row: any) => {
          const appId = row["Application ID"] || row.application_id;
          if (appId) {
            trackerAppIds.add(appId);
          }
        });
      }

      // Transform and filter tracker data based on queue status
      const transformedData: ScreeningRecord[] = [];
      
      if (trackerData) {
        for (const row of trackerData) {
          // Check if row uses exact column names (with spaces) or snake_case
          const hasExactNames = row["Application ID"] !== undefined;
          const appId = hasExactNames ? (row["Application ID"] || "") : (row.application_id || "");
          
          if (!appId) continue; // Skip if no Application ID
          
          // Check queue status for this Application ID
          const queueStatus = queueStatusMap.get(appId);
          
          // Only display if:
          // 1. Status=Completed in queue (show by default)
          // 2. Status=Waiting in queue (only show when toggle is ON)
          // 3. No entry in queue (don't display - requirement says to check queue status)
          
          if (queueStatus === "Completed") {
            // Display completed entries by default
            const dateCreated = row.created_at || row["Date Created"] || null;
            
            transformedData.push({
              id: row.id,
              "Application ID": appId,
              "Job Title": hasExactNames ? row["Job Title"] : row.job_title,
              "Role Code": hasExactNames ? row["Role Code"] : row.role_code,
              "Candidate Name": hasExactNames ? row["Candidate Name"] : row.candidate_name,
              "Screening Outcome": hasExactNames ? row["Screening Outcome"] : row.screening_outcome,
              "Screening Summary": hasExactNames ? row["Screening Summary"] : row.screening_summary,
              "Call Status": hasExactNames ? row["Call Status"] : row.call_status,
              "Call Score": hasExactNames ? (row["Call Score"]?.toString() || null) : (row.call_score?.toString() || null),
              "Similarity Score": hasExactNames ? (row["Similarity Score"]?.toString() || null) : (row.similarity_score?.toString() || null),
              "Final Score": hasExactNames ? (row["Final Score"]?.toString() || null) : (row.final_score?.toString() || null),
              "Conversation ID": hasExactNames ? row["Conversation ID"] : row.conversation_id,
              "Recording Link": hasExactNames ? row["Recording Link"] : row.recording_link,
              "Notice Period": hasExactNames ? (row["Notice Period"]?.toString() || null) : (row.notice_period?.toString() || null),
              "Current CTC": hasExactNames ? (row["Current CTC"]?.toString() || null) : (row.current_ctc?.toString() || null),
              "Expected CTC": hasExactNames ? (row["Expected CTC"]?.toString() || null) : (row.expected_ctc?.toString() || null),
              "Other Job Offers": hasExactNames ? row["Other Job Offers"] : row.other_job_offers,
              "Current Location": hasExactNames ? row["Current Location"] : row.current_location,
              "Call Route": hasExactNames ? row["Call Route"] : row.call_route,
              "Similarity Summary": hasExactNames ? row["Similarity Summary"] : row.similarity_summary,
              "Rejection Reason": hasExactNames ? row["Rejection Reason"] : row.rejection_reason,
              "Date Created": dateCreated,
              isWaiting: false,
            });
          } else if (queueStatus === "Waiting" && showWaitingCandidates) {
            // Display waiting entries from tracker when toggle is ON
            // Use tracker data directly (entry found in tracker)
            const dateCreated = row.created_at || row["Date Created"] || null;
            
            transformedData.push({
              id: row.id,
              "Application ID": appId,
              "Job Title": hasExactNames ? row["Job Title"] : row.job_title,
              "Role Code": hasExactNames ? row["Role Code"] : row.role_code,
              "Candidate Name": hasExactNames ? row["Candidate Name"] : row.candidate_name,
              "Screening Outcome": hasExactNames ? row["Screening Outcome"] : row.screening_outcome,
              "Screening Summary": hasExactNames ? row["Screening Summary"] : row.screening_summary,
              "Call Status": hasExactNames ? row["Call Status"] : row.call_status,
              "Call Score": hasExactNames ? (row["Call Score"]?.toString() || null) : (row.call_score?.toString() || null),
              "Similarity Score": hasExactNames ? (row["Similarity Score"]?.toString() || null) : (row.similarity_score?.toString() || null),
              "Final Score": hasExactNames ? (row["Final Score"]?.toString() || null) : (row.final_score?.toString() || null),
              "Conversation ID": hasExactNames ? row["Conversation ID"] : row.conversation_id,
              "Recording Link": hasExactNames ? row["Recording Link"] : row.recording_link,
              "Notice Period": hasExactNames ? (row["Notice Period"]?.toString() || null) : (row.notice_period?.toString() || null),
              "Current CTC": hasExactNames ? (row["Current CTC"]?.toString() || null) : (row.current_ctc?.toString() || null),
              "Expected CTC": hasExactNames ? (row["Expected CTC"]?.toString() || null) : (row.expected_ctc?.toString() || null),
              "Other Job Offers": hasExactNames ? row["Other Job Offers"] : row.other_job_offers,
              "Current Location": hasExactNames ? row["Current Location"] : row.current_location,
              "Call Route": hasExactNames ? row["Call Route"] : row.call_route,
              "Similarity Summary": hasExactNames ? row["Similarity Summary"] : row.similarity_summary,
              "Rejection Reason": hasExactNames ? row["Rejection Reason"] : row.rejection_reason,
              "Date Created": dateCreated,
              isWaiting: true,
            });
          }
          // If no queue entry or status is not Completed/Waiting, don't display
        }
      }
      
      // Fetch waiting candidates that are NOT in tracker (standalone waiting entries)
      // For these, fetch specific fields from AEX_Candidate_Data
      if (showWaitingCandidates) {
        console.log("Fetching standalone waiting candidates from AEX_Screening_Batch_Queue...");
        const { data: waitingQueueData, error: waitingQueueError } = await supabase
          .from("AEX_Screening_Batch_Queue")
          .select('*')
          .eq("Status", "Waiting");

        if (!waitingQueueError && waitingQueueData && waitingQueueData.length > 0) {
          // Get Application IDs that are in waiting queue but NOT in tracker
          const standaloneWaitingIds = waitingQueueData
            .map((row: any) => row["Application ID"] || row.application_id)
            .filter((id: string | null): id is string => id !== null && !trackerAppIds.has(id));

          if (standaloneWaitingIds.length > 0) {
            // Fetch candidate details from AEX_Candidate_Data
            const { data: candidateData, error: candidateError } = await supabase
              .from("AEX_Candidate_Data")
              .select('"Application ID", "Candidate Name", "Job Applied", "Role Code", "Profile Status", created_at')
              .in("Application ID", standaloneWaitingIds);

            if (!candidateError && candidateData) {
              // Create a map of Application ID to candidate data
              const candidateMap = new Map<string, any>();
              candidateData.forEach((candidate: any) => {
                const appId = candidate["Application ID"];
                if (appId) {
                  candidateMap.set(appId, candidate);
                }
              });

              // Create waiting candidate records
              const waitingRecords: ScreeningRecord[] = waitingQueueData
                .filter((queueRow: any) => {
                  const appId = queueRow["Application ID"] || queueRow.application_id;
                  return appId && !trackerAppIds.has(appId) && candidateMap.has(appId);
                })
                .map((queueRow: any) => {
                  const appId = queueRow["Application ID"] || queueRow.application_id;
                  const candidate = candidateMap.get(appId);
                  
                  if (!candidate) return null;

                  const dateCreated = queueRow.created_at || queueRow["Date Created"] || candidate.created_at || null;
                  const callStatus = candidate["Profile Status"] || null;

                  return {
                    id: queueRow.id,
                    "Application ID": appId,
                    "Job Title": candidate["Job Applied"] || null,
                    "Role Code": candidate["Role Code"] || queueRow["Role Code"] || queueRow.role_code || null,
                    "Candidate Name": candidate["Candidate Name"] || null,
                    "Screening Outcome": null,
                    "Screening Summary": null,
                    "Call Status": callStatus,
                    "Call Score": null,
                    "Similarity Score": null,
                    "Final Score": null,
                    "Conversation ID": null,
                    "Recording Link": null,
                    "Notice Period": null,
                    "Current CTC": null,
                    "Expected CTC": null,
                    "Other Job Offers": null,
                    "Current Location": null,
                    "Call Route": null,
                    "Similarity Summary": null,
                    "Rejection Reason": null,
                    "Date Created": dateCreated,
                    isWaiting: true,
                  };
                })
                .filter((record): record is ScreeningRecord => record !== null);

              transformedData.push(...waitingRecords);
              console.log("Added", waitingRecords.length, "standalone waiting candidates to the list");
            }
          }
        }
      }
      
      // Debug: Log first row to see what data structure we're getting
      if (transformedData.length > 0) {
        console.log("Sample row data:", transformedData[0]);
        console.log("Total records:", transformedData.length);
      }
      
      setScreenings(transformedData);
      
      // Extract unique values for filters
      const callStatuses = new Set<string>();
      const roleCodes = new Set<string>();
      const outcomes = new Set<string>();
      
      transformedData.forEach((record) => {
        if (record["Call Status"]) callStatuses.add(record["Call Status"]);
        if (record["Role Code"]) roleCodes.add(record["Role Code"]);
        if (record["Screening Outcome"]) outcomes.add(record["Screening Outcome"]);
      });
      
      setUniqueCallStatuses(Array.from(callStatuses).sort());
      setUniqueRoleCodes(Array.from(roleCodes).sort());
      setUniqueOutcomes(Array.from(outcomes).sort());
      
      // Apply filters
      applyFilters(transformedData);
    } catch (error: any) {
      console.error("Error fetching screenings:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch screening data. Please check your permissions and RLS policies.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (data: ScreeningRecord[]) => {
    let filtered = [...data];

    // Filter by Call Status
    if (callStatusFilter !== "all") {
      filtered = filtered.filter((s) => s["Call Status"] === callStatusFilter);
    }

    // Filter by Role Code
    if (roleCodeFilter !== "all") {
      filtered = filtered.filter((s) => s["Role Code"] === roleCodeFilter);
    }

    // Filter by Screening Outcome
    if (screeningOutcomeFilter !== "all") {
      filtered = filtered.filter((s) => s["Screening Outcome"] === screeningOutcomeFilter);
    }

    // Filter by Final Score range
    if (finalScoreMin || finalScoreMax) {
      filtered = filtered.filter((s) => {
        const score = s["Final Score"] ? parseFloat(s["Final Score"]) : null;
        if (score === null) return false;

        const min = finalScoreMin ? parseFloat(finalScoreMin) : 0;
        const max = finalScoreMax ? parseFloat(finalScoreMax) : 100;

        return score >= min && score <= max;
      });
    }

    // Sort by Date Created (using created_at from database)
    filtered.sort((a, b) => {
      const dateA = a["Date Created"] ? new Date(a["Date Created"]).getTime() : -Infinity;
      const dateB = b["Date Created"] ? new Date(b["Date Created"]).getTime() : -Infinity;
      
      // If both dates are invalid, maintain original order
      if (dateA === -Infinity && dateB === -Infinity) return 0;
      // If only A is invalid, put it at the end
      if (dateA === -Infinity) return 1;
      // If only B is invalid, put it at the end
      if (dateB === -Infinity) return -1;
      
      // Sort based on selected order: "new" = newest first (descending), "old" = oldest first (ascending)
      return dateSortOrder === "new" ? dateB - dateA : dateA - dateB;
    });

    setFilteredScreenings(filtered);
  };

  useEffect(() => {
    applyFilters(screenings);
  }, [callStatusFilter, finalScoreMin, finalScoreMax, roleCodeFilter, screeningOutcomeFilter, dateSortOrder, screenings]);

  const getOutcomeColor = (outcome: string | null) => {
    if (!outcome) return "bg-muted text-muted-foreground";
    switch (outcome.toLowerCase()) {
      case "pass":
      case "passed":
      case "selected":
        return "bg-status-success text-white";
      case "reject":
      case "rejected":
        return "bg-status-rejected text-white";
      case "pending":
      case "hold":
        return "bg-status-pending text-white";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getScoreColor = (score: string | null) => {
    if (!score) return "text-muted-foreground";
    const numScore = parseFloat(score);
    if (isNaN(numScore)) return "text-muted-foreground";
    if (numScore >= 80) return "text-status-success font-semibold";
    if (numScore >= 60) return "text-status-pending font-semibold";
    return "text-status-rejected font-semibold";
  };

  const handleRowClick = (record: ScreeningRecord) => {
    setSelectedRecord(record);
    setDetailDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const handleResetFilters = () => {
    setCallStatusFilter("all");
    setFinalScoreMin("");
    setFinalScoreMax("");
    setRoleCodeFilter("all");
    setScreeningOutcomeFilter("all");
    setDateSortOrder("new");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Screening Tracker</h2>
          <p className="text-muted-foreground mt-1">Monitor and review candidate screening results</p>
        </div>
        <div className="flex items-center gap-2">
          <Card className="px-4 py-2">
            <div className="text-sm text-muted-foreground">
              Total: <span className="font-semibold text-foreground">{filteredScreenings.length}</span>
              {filteredScreenings.length !== screenings.length && (
                <span className="text-muted-foreground ml-1">
                  (of {screenings.length})
                </span>
              )}
            </div>
          </Card>
          <Button onClick={fetchScreenings} variant="outline" disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="space-y-2">
              <Label>Call Status</Label>
              <Select value={callStatusFilter} onValueChange={setCallStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {uniqueCallStatuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Role Code</Label>
              <Select value={roleCodeFilter} onValueChange={setRoleCodeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {uniqueRoleCodes.map((roleCode) => (
                    <SelectItem key={roleCode} value={roleCode}>
                      {roleCode}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Screening Outcome</Label>
              <Select value={screeningOutcomeFilter} onValueChange={setScreeningOutcomeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {uniqueOutcomes.map((outcome) => (
                    <SelectItem key={outcome} value={outcome}>
                      {outcome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Final Score Min</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={finalScoreMin}
                onChange={(e) => setFinalScoreMin(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Final Score Max</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={finalScoreMax}
                onChange={(e) => setFinalScoreMax(e.target.value)}
                placeholder="100"
              />
            </div>
            <div className="space-y-2">
              <Label>Date Sort</Label>
              <Select value={dateSortOrder} onValueChange={(value) => setDateSortOrder(value as "new" | "old")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">Newest First</SelectItem>
                  <SelectItem value="old">Oldest First</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4">
            <Button onClick={handleResetFilters} variant="outline" size="sm">
              Reset Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {filteredScreenings.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="flex justify-end items-center gap-4 px-4 pt-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="show-waiting" className="text-sm">
                  Show No-Response Candidates
                </Label>
                <Switch
                  id="show-waiting"
                  checked={showWaitingCandidates}
                  onCheckedChange={setShowWaitingCandidates}
                />
              </div>
              <Button
                variant={expandedView ? "default" : "outline"}
                size="sm"
                onClick={() => setExpandedView((prev) => !prev)}
              >
                {expandedView ? "Collapse View" : "Expanded View"}
              </Button>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date Created</TableHead>
                    <TableHead>Application ID</TableHead>
                    <TableHead>Candidate Name</TableHead>
                    <TableHead>Job Title</TableHead>
                    <TableHead>Role Code</TableHead>
                    <TableHead>Call Status</TableHead>
                    <TableHead>Call Score</TableHead>
                    <TableHead>Similarity Score</TableHead>
                    <TableHead>Final Score</TableHead>
                    <TableHead>Screening Outcome</TableHead>
                    <TableHead>Notice Period</TableHead>
                    <TableHead>Expected CTC</TableHead>
                    <TableHead>Current CTC</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Other Job Offers</TableHead>
                    {expandedView && (
                      <>
                        <TableHead className="min-w-[220px]">Screening Summary</TableHead>
                        <TableHead className="min-w-[220px]">Similarity Summary</TableHead>
                        <TableHead>Call Route</TableHead>
                        <TableHead>Recording Link</TableHead>
                        <TableHead>Conversation ID</TableHead>
                      </>
                    )}
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredScreenings.map((screening, index) => (
                    <TableRow 
                      key={screening["Application ID"] || index}
                      className="cursor-pointer hover:bg-muted/50"
                    >
                      <TableCell className="text-sm text-muted-foreground">
                        {screening["Date Created"]
                          ? new Date(screening["Date Created"]).toLocaleDateString()
                          : "—"}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {screening["Application ID"] || "—"}
                      </TableCell>
                      <TableCell className="font-medium">
                        {screening["Candidate Name"] || "—"}
                      </TableCell>
                      <TableCell>{screening["Job Title"] || "—"}</TableCell>
                      <TableCell>{screening["Role Code"] || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {screening["Call Status"] || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={getScoreColor(screening["Call Score"])}>
                          {screening["Call Score"] || "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={getScoreColor(screening["Similarity Score"])}>
                          {screening["Similarity Score"] || "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={getScoreColor(screening["Final Score"])}>
                          {screening["Final Score"] || "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        {screening["Screening Outcome"] ? (
                          <Badge className={getOutcomeColor(screening["Screening Outcome"])}>
                            {screening["Screening Outcome"]}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>{screening["Notice Period"] || "—"}</TableCell>
                      <TableCell>{screening["Expected CTC"] || "—"}</TableCell>
                      <TableCell>{screening["Current CTC"] || "—"}</TableCell>
                      <TableCell>{screening["Current Location"] || "—"}</TableCell>
                      <TableCell className="max-w-[150px] truncate">
                        {screening["Other Job Offers"] || "—"}
                      </TableCell>
                      {expandedView && (
                        <>
                          <TableCell className="min-w-[220px] max-w-[260px] whitespace-pre-wrap break-words text-sm">
                            {screening["Screening Summary"] || "—"}
                          </TableCell>
                          <TableCell className="min-w-[220px] max-w-[260px] whitespace-pre-wrap break-words text-sm">
                            {screening["Similarity Summary"] || "—"}
                          </TableCell>
                          <TableCell>{screening["Call Route"] || "—"}</TableCell>
                          <TableCell>
                            {screening["Recording Link"] ? (
                              <a
                                href={screening["Recording Link"]}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                Open
                              </a>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {screening["Conversation ID"] || "—"}
                          </TableCell>
                        </>
                      )}
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRowClick(screening);
                          }}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Target className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {screenings.length === 0 
                ? "No screening data yet" 
                : "No results match your filters"}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {screenings.length === 0
                ? "Screening results will appear here once candidates are processed"
                : "Try adjusting your filter criteria"}
            </p>
            {screenings.length > 0 && (
              <Button onClick={handleResetFilters} variant="outline" size="sm">
                Reset Filters
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Screening Details</DialogTitle>
            <DialogDescription>
              Complete screening information for {selectedRecord?.["Candidate Name"] || "Candidate"}
            </DialogDescription>
          </DialogHeader>
          {selectedRecord && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <div>
                  <label className="text-sm font-semibold text-muted-foreground">Application ID</label>
                  <p className="text-sm font-mono">{selectedRecord["Application ID"] || "—"}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-muted-foreground">Candidate Name</label>
                  <p className="text-sm">{selectedRecord["Candidate Name"] || "—"}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-muted-foreground">Job Title</label>
                  <p className="text-sm">{selectedRecord["Job Title"] || "—"}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-muted-foreground">Role Code</label>
                  <p className="text-sm">{selectedRecord["Role Code"] || "—"}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-muted-foreground">Screening Outcome</label>
                  <div className="mt-1">
                    {selectedRecord["Screening Outcome"] ? (
                      <Badge className={getOutcomeColor(selectedRecord["Screening Outcome"])}>
                        {selectedRecord["Screening Outcome"]}
                      </Badge>
                    ) : (
                      <span className="text-sm">—</span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-muted-foreground">Call Status</label>
                  <p className="text-sm">
                    <Badge variant="outline">{selectedRecord["Call Status"] || "—"}</Badge>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-muted-foreground">Call Score</label>
                  <p className={`text-sm ${getScoreColor(selectedRecord["Call Score"])}`}>
                    {selectedRecord["Call Score"] || "—"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-muted-foreground">Similarity Score</label>
                  <p className={`text-sm ${getScoreColor(selectedRecord["Similarity Score"])}`}>
                    {selectedRecord["Similarity Score"] || "—"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-muted-foreground">Final Score</label>
                  <p className={`text-sm ${getScoreColor(selectedRecord["Final Score"])}`}>
                    {selectedRecord["Final Score"] || "—"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-muted-foreground">Conversation ID</label>
                  <p className="text-sm font-mono">{selectedRecord["Conversation ID"] || "—"}</p>
                </div>
              </div>
              <div className="space-y-2">
                <div>
                  <label className="text-sm font-semibold text-muted-foreground">Recording Link</label>
                  {selectedRecord["Recording Link"] ? (
                    <a
                      href={selectedRecord["Recording Link"]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Open Recording
                    </a>
                  ) : (
                    <p className="text-sm">—</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-semibold text-muted-foreground">Notice Period</label>
                  <p className="text-sm">{selectedRecord["Notice Period"] || "—"}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-muted-foreground">Current CTC</label>
                  <p className="text-sm">{selectedRecord["Current CTC"] || "—"}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-muted-foreground">Expected CTC</label>
                  <p className="text-sm">{selectedRecord["Expected CTC"] || "—"}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-muted-foreground">Other Job Offers</label>
                  <p className="text-sm">{selectedRecord["Other Job Offers"] || "—"}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-muted-foreground">Current Location</label>
                  <p className="text-sm">{selectedRecord["Current Location"] || "—"}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-muted-foreground">Call Route</label>
                  <p className="text-sm">{selectedRecord["Call Route"] || "—"}</p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-muted-foreground">Screening Summary</label>
                  <p className="text-sm whitespace-pre-wrap">
                    {selectedRecord["Screening Summary"] || "—"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-muted-foreground">Similarity Summary</label>
                  <p className="text-sm whitespace-pre-wrap">
                    {selectedRecord["Similarity Summary"] || "—"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-semibold text-muted-foreground">Rejection Reason</label>
                  <p className="text-sm whitespace-pre-wrap text-status-rejected">
                    {selectedRecord["Rejection Reason"] || "—"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Screening;
