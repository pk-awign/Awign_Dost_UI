import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Briefcase, Users, Target, CheckCircle, RefreshCw, Loader2 } from "lucide-react";

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalJobs: 0,
    totalCandidates: 0,
    screenedCandidates: 0,
    activeScreenings: 0,
  });
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    setRefreshing(true);
    try {
      const [jobsData, candidatesData, screenedData, queueData] = await Promise.all([
        supabase.from("AEX_Job_Data").select("id", { count: "exact", head: true }),
        supabase.from("AEX_Candidate_Data").select("id", { count: "exact", head: true }),
        supabase
          .from("AEX_Screening_Batch_Queue")
          .select("id", { count: "exact", head: true })
          .eq("Status", "Completed"),
        supabase
          .from("AEX_Screening_Batch_Queue")
          .select("id", { count: "exact", head: true })
          .eq("Status", "Processing"),
      ]);

      setStats({
        totalJobs: jobsData.count || 0,
        totalCandidates: candidatesData.count || 0,
        screenedCandidates: screenedData.count || 0,
        activeScreenings: queueData.count || 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      // Set default values on error
      setStats({
        totalJobs: 0,
        totalCandidates: 0,
        screenedCandidates: 0,
        activeScreenings: 0,
      });
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const statCards = [
    {
      title: "Total Jobs",
      value: stats.totalJobs,
      icon: Briefcase,
      color: "text-primary",
    },
    {
      title: "Total Candidates",
      value: stats.totalCandidates,
      icon: Users,
      color: "text-accent",
    },
    {
      title: "Screened",
      value: stats.screenedCandidates,
      icon: CheckCircle,
      color: "text-status-success",
    },
    {
      title: "Active Screenings",
      value: stats.activeScreenings,
      icon: Target,
      color: "text-status-pending",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Dashboard</h2>
          <p className="text-muted-foreground mt-1">
            Overview of your recruitment screening operations
          </p>
        </div>
        <Button onClick={fetchStats} disabled={refreshing} variant="outline">
          {refreshing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{stat.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Start</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold text-foreground">Getting Started</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Add jobs to your system via the Jobs page</li>
              <li>Upload candidates (CSV or individual entries) in the Candidates page</li>
              <li>Initiate CV-JD matching to assess candidate fit</li>
              <li>Push candidates to screening queue</li>
              <li>Monitor screening progress in the Screening Tracker</li>
              <li>View analytics and insights in the Analytics dashboard</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
