import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Target, RefreshCw, ExternalLink } from "lucide-react";
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
}

const Screening = () => {
  const [screenings, setScreenings] = useState<ScreeningRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<ScreeningRecord | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  useEffect(() => {
    fetchScreenings();
  }, []);

  const fetchScreenings = async () => {
    try {
      const { data, error } = await supabase
        .from("AEX_Screening_Tracker")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setScreenings(data || []);
    } catch (error: any) {
      console.error("Error fetching screenings:", error);
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Screening Tracker</h2>
          <p className="text-muted-foreground mt-1">Monitor and review candidate screening results</p>
        </div>
        <div className="flex items-center gap-2">
          <Card className="px-4 py-2">
            <div className="text-sm text-muted-foreground">Total: <span className="font-semibold text-foreground">{screenings.length}</span></div>
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

      {screenings.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Application ID</TableHead>
                    <TableHead>Candidate Name</TableHead>
                    <TableHead>Job Title</TableHead>
                    <TableHead>Role Code</TableHead>
                    <TableHead>Call Status</TableHead>
                    <TableHead>Call Score</TableHead>
                    <TableHead>Similarity Score</TableHead>
                    <TableHead>Final Score</TableHead>
                    <TableHead>Screening Outcome</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {screenings.map((screening, index) => (
                    <TableRow 
                      key={screening["Application ID"] || index}
                      className="cursor-pointer hover:bg-muted/50"
                    >
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
            <h3 className="text-lg font-semibold text-foreground mb-2">No screening data yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Screening results will appear here once candidates are processed
            </p>
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
