import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Briefcase, Users, Target, CheckCircle, RefreshCw, Loader2, AlertCircle } from "lucide-react";

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalJobs: 0,
    totalCandidates: 0,
    screenedCandidates: 0,
    activeScreenings: 0,
    noResponse: 0,
  });
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    setRefreshing(true);
    try {
      const [jobsData, candidatesData, screenedData, queueData, noResponseData] = await Promise.all([
        supabase.from("AEX_Job_Data").select("id", { count: "exact", head: true }),
        // Get all candidates to calculate distinct contact number count
        supabase
          .from("AEX_Candidate_Data")
          .select("*"),
        supabase
          .from("AEX_Screening_Batch_Queue")
          .select("id", { count: "exact", head: true })
          .eq("Status", "Completed"),
        supabase
          .from("AEX_Screening_Batch_Queue")
          .select("id", { count: "exact", head: true })
          .eq("Status", "Processing"),
        supabase
          .from("AEX_Screening_Batch_Queue")
          .select("id", { count: "exact", head: true })
          .eq("Status", "Waiting"),
      ]);

      // Calculate unique Candidate Contact Number count
      let uniqueCandidatesCount = 0;
      if (candidatesData.error) {
        console.error("Error fetching candidates data:", candidatesData.error);
      } else if (candidatesData.data && Array.isArray(candidatesData.data)) {
        const uniqueContacts = new Set(
          candidatesData.data
            .map((c: any) => c["Candidate Contact Number"])
            .filter((contact): contact is string => contact !== null && contact !== undefined && contact.trim() !== "")
        );
        uniqueCandidatesCount = uniqueContacts.size;
      }

      setStats({
        totalJobs: jobsData.count || 0,
        totalCandidates: uniqueCandidatesCount,
        screenedCandidates: screenedData.count || 0,
        activeScreenings: queueData.count || 0,
        noResponse: noResponseData.count || 0,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      // Set default values on error
      setStats({
        totalJobs: 0,
        totalCandidates: 0,
        screenedCandidates: 0,
        activeScreenings: 0,
        noResponse: 0,
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
    {
      title: "No Response",
      value: stats.noResponse,
      icon: AlertCircle,
      color: "text-status-warning",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground mb-2">Dashboard</h1>
          <p className="text-muted-foreground text-base">
            Overview of your recruitment screening operations
          </p>
        </div>
        <Button onClick={fetchStats} disabled={refreshing} variant="outline" size="default" className="shadow-sm">
          {refreshing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="border-blue-200/60 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 relative z-10">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {stat.title}
                </CardTitle>
                <div className={`p-2.5 rounded-xl bg-gradient-to-br from-blue-100 to-blue-50 ${stat.color} shadow-sm border border-blue-200/50`}>
                  <Icon className="h-5 w-5" />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-4xl font-bold tracking-tight text-blue-700 mb-1">{stat.value}</div>
                <div className="h-1 w-12 bg-gradient-to-r from-blue-600 to-blue-400 rounded-full mt-2" />
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-blue-200/60 shadow-lg bg-gradient-to-br from-card to-blue-50/30">
        <CardHeader className="pb-4 border-b border-blue-200/50">
          <CardTitle className="text-xl font-bold text-foreground">Quick Start Guide</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground text-base">Getting Started</h3>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-3 group/item">
                <div className="mt-1 h-2 w-2 rounded-full bg-muted-foreground/60 group-hover/item:scale-125 transition-transform" />
                <span className="group-hover/item:text-foreground transition-colors">Add jobs to your system via the Jobs page</span>
              </li>
              <li className="flex items-start gap-3 group/item">
                <div className="mt-1 h-2 w-2 rounded-full bg-muted-foreground/60 group-hover/item:scale-125 transition-transform" />
                <span className="group-hover/item:text-foreground transition-colors">Upload candidates (CSV or individual entries) in the Candidates page</span>
              </li>
              <li className="flex items-start gap-3 group/item">
                <div className="mt-1 h-2 w-2 rounded-full bg-muted-foreground/60 group-hover/item:scale-125 transition-transform" />
                <span className="group-hover/item:text-foreground transition-colors">Initiate CV-JD matching to assess candidate fit</span>
              </li>
              <li className="flex items-start gap-3 group/item">
                <div className="mt-1 h-2 w-2 rounded-full bg-muted-foreground/60 group-hover/item:scale-125 transition-transform" />
                <span className="group-hover/item:text-foreground transition-colors">Push candidates to screening queue</span>
              </li>
              <li className="flex items-start gap-3 group/item">
                <div className="mt-1 h-2 w-2 rounded-full bg-muted-foreground/60 group-hover/item:scale-125 transition-transform" />
                <span className="group-hover/item:text-foreground transition-colors">Monitor screening progress in the Screening Tracker</span>
              </li>
              <li className="flex items-start gap-3 group/item">
                <div className="mt-1 h-2 w-2 rounded-full bg-muted-foreground/60 group-hover/item:scale-125 transition-transform" />
                <span className="group-hover/item:text-foreground transition-colors">View analytics and insights in the Analytics dashboard</span>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
