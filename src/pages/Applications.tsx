import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Loader2, FileText, RefreshCw, Download, ExternalLink } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

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
}

const Applications = () => {
  const [applications, setApplications] = useState<AEXCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("AEX_Candidate_Data")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setApplications((data as AEXCandidate[]) || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResumeClick = (url: string | null) => {
    if (!url) {
      toast({
        title: "No Resume",
        description: "Resume URL not available",
        variant: "destructive",
      });
      return;
    }

    // Open in new tab
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground mb-2">Applications</h1>
          <p className="text-muted-foreground text-base">View all candidate applications</p>
        </div>
        <div className="flex items-center gap-2">
          <Card className="border-blue-200/60 bg-blue-50/30">
            <CardContent className="px-4 py-2.5">
              <div className="text-sm text-muted-foreground">
                Total: <span className="font-semibold text-blue-700">{applications.length}</span>
              </div>
            </CardContent>
          </Card>
          <Button onClick={fetchApplications} variant="outline" size="sm" disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {applications.length > 0 ? (
        <Card className="border-blue-200/60 shadow-lg">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b-2 border-blue-300/60 bg-blue-50/30">
                    <TableHead className="font-bold text-foreground">Date</TableHead>
                    <TableHead className="font-bold text-foreground">Application ID</TableHead>
                    <TableHead className="font-bold text-foreground">Name</TableHead>
                    <TableHead className="font-bold text-foreground">Role Code</TableHead>
                    <TableHead className="font-bold text-foreground">Contact</TableHead>
                    <TableHead className="font-bold text-foreground">Experience</TableHead>
                    <TableHead className="font-bold text-foreground">Location</TableHead>
                    <TableHead className="font-bold text-foreground">Notice Period</TableHead>
                    <TableHead className="font-bold text-foreground">Current CTC</TableHead>
                    <TableHead className="font-bold text-foreground">Skills</TableHead>
                    <TableHead className="font-bold text-foreground">CV/Resume</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications.map((app) => (
                    <TableRow key={app.id} className="hover:bg-blue-50 transition-colors border-b border-blue-200/40">
                      <TableCell className="text-sm">
                        {new Date(app.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {app["Application ID"] || "—"}
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        {app["Candidate Name"] || "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {app["Role Code"] || "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {app["Candidate Contact Number"] || "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {app["Candidate years of experience"] || "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {app["Current Location"] || "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {app["Notice Period"] || "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {app["Current CTC"] || "—"}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs">
                          {app["Skills"] ? (
                            <span className="text-sm text-muted-foreground break-words">
                              {app["Skills"]}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {app["Candidate Resume"] ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResumeClick(app["Candidate Resume"])}
                            className="text-primary hover:text-primary/80 h-8"
                          >
                            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                            View
                          </Button>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-blue-200/60 shadow-lg bg-gradient-to-br from-card to-blue-50/30">
          <CardContent className="flex flex-col items-center justify-center py-20">
            <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-100 to-blue-50 mb-6 shadow-lg shadow-blue-500/10 border border-blue-200/50">
              <FileText className="h-10 w-10 text-blue-700" />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-2">No applications yet</h3>
            <p className="text-base text-muted-foreground text-center max-w-md">
              Applications will appear here once candidates are added to the system
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Applications;


