import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, FileSearch, Play, RefreshCw } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Tables } from "@/integrations/supabase/types";

type CandidateRow = {
  id: number;
  "Application ID": string | null;
  "Candidate Name": string | null;
  "Role Code": string | null;
  "Job Applied": string | null;
  "Candidate Email ID": string | null;
  "JD_Mapping": string | null;
  Score?: string | null;
};

type CVMatchingRow = Tables<"AEX_CV_Matching">;
type Job = Tables<"AEX_Job_Data">;

const CVMapping = () => {
  const [cvMatchingData, setCvMatchingData] = useState<CVMatchingRow[]>([]);
  const [pendingCandidates, setPendingCandidates] = useState<CandidateRow[]>([]);
  const [allScreeningCandidates, setAllScreeningCandidates] = useState<CandidateRow[]>([]);
  const [filteredScreeningCandidates, setFilteredScreeningCandidates] = useState<CandidateRow[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedPendingIds, setSelectedPendingIds] = useState<number[]>([]);
  const [selectedScreeningIds, setSelectedScreeningIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTracker, setLoadingTracker] = useState(false);
  const [loadingPending, setLoadingPending] = useState(false);
  const [loadingScreening, setLoadingScreening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [startingScreening, setStartingScreening] = useState(false);
  const [activeTab, setActiveTab] = useState("tracker");
  const { toast } = useToast();

  // Filter states
  const [scoreMin, setScoreMin] = useState<string>("");
  const [scoreMax, setScoreMax] = useState<string>("");
  const [selectedRoleCode, setSelectedRoleCode] = useState<string>("all");

  const fetchCVMatchingData = async () => {
    setLoadingTracker(true);
    try {
      const { data, error } = await supabase
        .from("AEX_CV_Matching")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to fetch CV matching data",
          variant: "destructive",
        });
      } else {
        setCvMatchingData(data || []);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch CV matching data",
        variant: "destructive",
      });
    } finally {
      setLoadingTracker(false);
    }
  };

  const fetchPendingCandidates = async () => {
    setLoadingPending(true);
    try {
      const { data, error } = await supabase
        .from("AEX_Candidate_Data")
        .select('id, "Application ID", "Candidate Name", "Role Code", "Job Applied", "Candidate Email ID", "JD_Mapping"')
        .eq("JD_Mapping", "NOT STARTED");

      if (error) {
        toast({
          title: "Error",
          description: "Failed to fetch pending candidates",
          variant: "destructive",
        });
      } else {
        setPendingCandidates(data || []);
      }
    } finally {
      setLoadingPending(false);
    }
  };

  const fetchScreeningCandidates = async () => {
    setLoadingScreening(true);
    try {
      // Fetch candidates with JD_Mapping = 'DONE'
      const { data: candidatesData, error: candidatesError } = await supabase
        .from("AEX_Candidate_Data")
        .select('id, "Application ID", "Candidate Name", "Role Code", "Job Applied", "Candidate Email ID", "JD_Mapping"')
        .eq("JD_Mapping", "DONE");

      if (candidatesError) {
        throw candidatesError;
      }

      // Fetch CV matching data to get scores
      const { data: cvData, error: cvError } = await supabase
        .from("AEX_CV_Matching")
        .select('"Application ID", "Score"');

      if (cvError) {
        throw cvError;
      }

      // Create a map of Application ID to Score
      const scoreMap = new Map<string, string>();
      cvData?.forEach((row) => {
        if (row["Application ID"] && row["Score"]) {
          scoreMap.set(row["Application ID"], row["Score"]);
        }
      });

      // Merge scores with candidates
      const candidatesWithScores = (candidatesData || []).map((candidate) => ({
        ...candidate,
        Score: scoreMap.get(candidate["Application ID"] || "") || null,
      }));

      setAllScreeningCandidates(candidatesWithScores);
      applyFilters(candidatesWithScores, scoreMin, scoreMax, selectedRoleCode);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch screening candidates",
        variant: "destructive",
      });
    } finally {
      setLoadingScreening(false);
    }
  };

  const fetchJobs = async () => {
    try {
      const { data, error } = await supabase
        .from("AEX_Job_Data")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching jobs:", error);
      } else {
        setJobs(data || []);
      }
    } catch (error) {
      console.error("Error fetching jobs:", error);
    }
  };

  const applyFilters = (
    candidates: CandidateRow[],
    minScore: string,
    maxScore: string,
    roleCode: string
  ) => {
    let filtered = [...candidates];

    // Filter by Role Code
    if (roleCode !== "all") {
      filtered = filtered.filter((c) => c["Role Code"] === roleCode);
    }

    // Filter by Score range
    if (minScore || maxScore) {
      filtered = filtered.filter((c) => {
        const score = c.Score ? parseFloat(c.Score) : null;
        if (score === null) return false;

        const min = minScore ? parseFloat(minScore) : 0;
        const max = maxScore ? parseFloat(maxScore) : 100;

        return score >= min && score <= max;
      });
    }

    setFilteredScreeningCandidates(filtered);
  };

  useEffect(() => {
    if (activeTab === "screening") {
      applyFilters(allScreeningCandidates, scoreMin, scoreMax, selectedRoleCode);
    }
  }, [scoreMin, scoreMax, selectedRoleCode, allScreeningCandidates, activeTab]);

  const fetchAll = async () => {
    setLoading(true);
    await Promise.all([
      fetchCVMatchingData(),
      fetchPendingCandidates(),
      fetchScreeningCandidates(),
      fetchJobs(),
    ]);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleSelectAllPending = (checked: boolean) => {
    if (checked) {
      setSelectedPendingIds(pendingCandidates.map((c) => c.id));
    } else {
      setSelectedPendingIds([]);
    }
  };

  const handleSelectOnePending = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedPendingIds((prev) => [...prev, id]);
    } else {
      setSelectedPendingIds((prev) => prev.filter((i) => i !== id));
    }
  };

  const handleSelectAllScreening = (checked: boolean) => {
    if (checked) {
      setSelectedScreeningIds(filteredScreeningCandidates.map((c) => c.id));
    } else {
      setSelectedScreeningIds([]);
    }
  };

  const handleSelectOneScreening = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedScreeningIds((prev) => [...prev, id]);
    } else {
      setSelectedScreeningIds((prev) => prev.filter((i) => i !== id));
    }
  };

  const handlePerformMapping = async () => {
    if (selectedPendingIds.length === 0) {
      toast({
        title: "No selection",
        description: "Please select at least one candidate",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    try {
      // Step 1: Update JD_Mapping to 'STARTED'
      const { error: updateError } = await supabase
        .from("AEX_Candidate_Data")
        .update({ JD_Mapping: "STARTED" })
        .in("id", selectedPendingIds);

      if (updateError) {
        throw updateError;
      }

      // // Step 2: Call the webhook
      // const response = await fetch(
      //   "https://awign-pm-dev.app.n8n.cloud/webhook/c7555a20-201d-4812-8260-b6c602659c20",
      //   {
      //     method: "POST",
      //     headers: {
      //       "Content-Type": "application/json",
      //     },
      //     body: JSON.stringify({ action: "perform_jd_mapping" }),
      //   }
      // );

      // if (!response.ok) {
      //   throw new Error("Webhook call failed");
      // }

      toast({
        title: "Success",
        description: `${selectedPendingIds.length} candidate(s) marked as STARTED and CV Mapping workflow triggered`,
      });
      setSelectedPendingIds([]);
      await fetchPendingCandidates();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to perform CV mapping",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleStartScreening = async () => {
    if (selectedScreeningIds.length === 0) {
      toast({
        title: "No selection",
        description: "Please select at least one candidate",
        variant: "destructive",
      });
      return;
    }

    setStartingScreening(true);
    try {
      // Mark selected candidates as "Screening Started"
      const { error: updateError } = await supabase
        .from("AEX_Candidate_Data")
        .update({ JD_Mapping: "Screening Started" })
        .in("id", selectedScreeningIds);

      if (updateError) {
        throw updateError;
      }

      // Build rows for screening batch queue
      const selectedCandidates = filteredScreeningCandidates.filter((c) =>
        selectedScreeningIds.includes(c.id)
      );

      const rows = selectedCandidates
        .map((candidate) => {
          const applicationId = candidate["Application ID"];
          const roleCode = candidate["Role Code"];

          if (!applicationId || !roleCode) return null;

          return {
            "Application ID": applicationId,
            "Role Code": roleCode,
            Status: "Pending",
          };
        })
        .filter((row): row is { "Application ID": string; "Role Code": string; Status: string } => row !== null);

      if (rows.length === 0) {
        throw new Error("No valid rows to insert (missing Application ID or Role Code).");
      }

      const { error: insertError } = await supabase
        .from("AEX_Screening_Batch_Queue")
        .insert(rows as any);

      if (insertError) {
        throw insertError;
      }

      toast({
        title: "Success",
        description: `Screening started for ${rows.length} candidate(s)`,
      });
      setSelectedScreeningIds([]);
      await fetchScreeningCandidates();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to start screening",
        variant: "destructive",
      });
    } finally {
      setStartingScreening(false);
    }
  };

  const handleFilterChange = () => {
    applyFilters(allScreeningCandidates, scoreMin, scoreMax, selectedRoleCode);
  };

  const handleResetFilters = () => {
    setScoreMin("");
    setScoreMax("");
    setSelectedRoleCode("all");
    applyFilters(allScreeningCandidates, "", "", "all");
  };

  const allPendingSelected = pendingCandidates.length > 0 && selectedPendingIds.length === pendingCandidates.length;
  const allScreeningSelected = filteredScreeningCandidates.length > 0 && selectedScreeningIds.length === filteredScreeningCandidates.length;

  // Get unique role codes from jobs
  const uniqueRoleCodes = Array.from(
    new Set(jobs.map((j) => j["Role Code"]).filter((rc): rc is string => rc !== null))
  ).sort();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">CV Mapping</h1>
        <p className="text-muted-foreground">
          Manage CV mapping and screening workflows for candidates
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tracker">CV Mapping Tracker</TabsTrigger>
          <TabsTrigger value="pending">Pending CV Mapping</TabsTrigger>
          <TabsTrigger value="screening">Screening Pending</TabsTrigger>
        </TabsList>

        <TabsContent value="tracker" className="space-y-4">
          <div className="flex items-center justify-between">
            <Card>
              <CardContent className="px-4 py-2">
                <div className="text-sm text-muted-foreground">Total: <span className="font-semibold text-foreground">{cvMatchingData.length}</span></div>
              </CardContent>
            </Card>
            <Button
              onClick={fetchCVMatchingData}
              disabled={loadingTracker}
              variant="outline"
            >
              {loadingTracker ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Refresh
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>CV Mapping Tracker</CardTitle>
              <CardDescription>
                Complete details of CV matching results from AEX_CV_Matching table
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingTracker ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : cvMatchingData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No CV matching data available
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Application ID</TableHead>
                        <TableHead>Role Code</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead className="min-w-[300px]">JD Summary</TableHead>
                        <TableHead>Created At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cvMatchingData.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell className="font-medium font-mono text-sm">
                            {row["Application ID"] || "-"}
                          </TableCell>
                          <TableCell>{row["Role Code"] || "-"}</TableCell>
                          <TableCell>
                            {row["Score"] ? (
                              <span className="font-semibold">{row["Score"]}</span>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell className="max-w-md">
                            <div className="whitespace-pre-wrap break-words">
                              {row["JD Summary"] || "-"}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {row.created_at
                              ? new Date(row.created_at).toLocaleString()
                              : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <div className="flex items-center justify-between">
            <Card>
              <CardContent className="px-4 py-2">
                <div className="text-sm text-muted-foreground">Total: <span className="font-semibold text-foreground">{pendingCandidates.length}</span></div>
              </CardContent>
            </Card>
            <div className="flex gap-2">
              <Button
                onClick={fetchPendingCandidates}
                disabled={loadingPending}
                variant="outline"
              >
                {loadingPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Refresh
              </Button>
              <Button
                onClick={handlePerformMapping}
                disabled={selectedPendingIds.length === 0 || processing}
              >
                {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <FileSearch className="mr-2 h-4 w-4" />
                Perform Mapping ({selectedPendingIds.length})
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Candidates Pending CV Mapping</CardTitle>
              <CardDescription>
                Showing candidates with JD_Mapping status = "NOT STARTED"
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingPending ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : pendingCandidates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No candidates pending CV mapping
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={allPendingSelected}
                            onCheckedChange={handleSelectAllPending}
                          />
                        </TableHead>
                        <TableHead>Application ID</TableHead>
                        <TableHead>Candidate Name</TableHead>
                        <TableHead>Role Code</TableHead>
                        <TableHead>Job Applied</TableHead>
                        <TableHead>Email</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingCandidates.map((candidate) => (
                        <TableRow key={candidate.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedPendingIds.includes(candidate.id)}
                              onCheckedChange={(checked) =>
                                handleSelectOnePending(candidate.id, checked as boolean)
                              }
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            {candidate["Application ID"] || "-"}
                          </TableCell>
                          <TableCell>{candidate["Candidate Name"] || "-"}</TableCell>
                          <TableCell>{candidate["Role Code"] || "-"}</TableCell>
                          <TableCell>{candidate["Job Applied"] || "-"}</TableCell>
                          <TableCell>{candidate["Candidate Email ID"] || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="screening" className="space-y-4">
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Filters</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Role Code</Label>
                    <Select value={selectedRoleCode} onValueChange={setSelectedRoleCode}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Role Code" />
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
                    <Label>Score Min (0-100)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={scoreMin}
                      onChange={(e) => setScoreMin(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Score Max (0-100)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={scoreMax}
                      onChange={(e) => setScoreMax(e.target.value)}
                      placeholder="100"
                    />
                  </div>
                  <div className="space-y-2 flex items-end">
                    <Button
                      onClick={handleResetFilters}
                      variant="outline"
                      className="w-full"
                    >
                      Reset Filters
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center justify-between">
              <Card>
                <CardContent className="px-4 py-2">
                  <div className="text-sm text-muted-foreground">Total: <span className="font-semibold text-foreground">{filteredScreeningCandidates.length}</span></div>
                </CardContent>
              </Card>
              <div className="flex gap-2">
                <Button
                  onClick={fetchScreeningCandidates}
                  disabled={loadingScreening}
                  variant="outline"
                >
                  {loadingScreening ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Refresh
                </Button>
              <Button
                onClick={handleStartScreening}
                disabled={selectedScreeningIds.length === 0 || startingScreening}
              >
                {startingScreening && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Play className="mr-2 h-4 w-4" />
                Start Screening ({selectedScreeningIds.length})
              </Button>
              </div>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Candidates Pending Screening</CardTitle>
              <CardDescription>
                Showing candidates with JD_Mapping status = "DONE"
                {filteredScreeningCandidates.length !== allScreeningCandidates.length && (
                  <span className="ml-2">
                    (Filtered: {filteredScreeningCandidates.length} of {allScreeningCandidates.length})
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingScreening ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredScreeningCandidates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No candidates found matching the filter criteria
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={allScreeningSelected}
                            onCheckedChange={handleSelectAllScreening}
                          />
                        </TableHead>
                        <TableHead>Application ID</TableHead>
                        <TableHead>Candidate Name</TableHead>
                        <TableHead>Role Code</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Job Applied</TableHead>
                        <TableHead>Email</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredScreeningCandidates.map((candidate) => (
                        <TableRow key={candidate.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedScreeningIds.includes(candidate.id)}
                              onCheckedChange={(checked) =>
                                handleSelectOneScreening(candidate.id, checked as boolean)
                              }
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            {candidate["Application ID"] || "-"}
                          </TableCell>
                          <TableCell>{candidate["Candidate Name"] || "-"}</TableCell>
                          <TableCell>{candidate["Role Code"] || "-"}</TableCell>
                          <TableCell>
                            {candidate.Score ? (
                              <span className="font-semibold">{candidate.Score}</span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>{candidate["Job Applied"] || "-"}</TableCell>
                          <TableCell>{candidate["Candidate Email ID"] || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CVMapping;
