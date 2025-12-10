import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, TrendingUp, Users, Target, Award, RefreshCw } from "lucide-react";
//
const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState({
    totalCandidates: 0,
    totalScreened: 0,
    avgScore: 0,
    passRate: 0,
    byStatus: {
      pending: 0,
      completed: 0,
      rejected: 0,
    },
  });

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      // Fetch candidate counts from AEX_Candidate_Data
      const { count: totalCandidates } = await supabase
        .from("AEX_Candidate_Data")
        .select("*", { count: "exact", head: true });

      // Fetch screening stats from screening_tracker
      const { data: screenings } = await supabase.from("screening_tracker").select("*");

      // Calculate statistics
      const totalScreened = screenings?.length || 0;
      const scores = screenings?.filter((s) => s.final_score).map((s) => s.final_score) || [];
      const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

      const passed =
        screenings?.filter(
          (s) =>
            s.screening_outcome?.toLowerCase() === "pass" ||
            s.screening_outcome?.toLowerCase() === "passed"
        ).length || 0;
      const passRate = totalScreened > 0 ? (passed / totalScreened) * 100 : 0;

      // Count by screening outcome from screening_tracker
      const pending = screenings?.filter(
        (s) => !s.screening_outcome || s.screening_outcome?.toLowerCase() === "pending"
      ).length || 0;

      const completed = screenings?.filter(
        (s) =>
          s.screening_outcome?.toLowerCase() === "pass" ||
          s.screening_outcome?.toLowerCase() === "passed" ||
          s.screening_outcome?.toLowerCase() === "completed"
      ).length || 0;

      const rejected = screenings?.filter(
        (s) =>
          s.screening_outcome?.toLowerCase() === "fail" ||
          s.screening_outcome?.toLowerCase() === "failed" ||
          s.screening_outcome?.toLowerCase() === "rejected"
      ).length || 0;

      setAnalytics({
        totalCandidates: totalCandidates || 0,
        totalScreened,
        avgScore: Math.round(avgScore * 10) / 10,
        passRate: Math.round(passRate * 10) / 10,
        byStatus: {
          pending,
          completed,
          rejected,
        },
      });
    } catch (error: any) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: "Total Candidates",
      value: analytics.totalCandidates,
      icon: Users,
      color: "text-primary",
    },
    {
      title: "Total Screened",
      value: analytics.totalScreened,
      icon: Target,
      color: "text-accent",
    },
    {
      title: "Average Score",
      value: analytics.avgScore ? `${analytics.avgScore}/100` : "—",
      icon: Award,
      color: "text-status-success",
    },
    {
      title: "Pass Rate",
      value: analytics.passRate ? `${analytics.passRate}%` : "—",
      icon: TrendingUp,
      color: "text-status-pending",
    },
  ];

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
          <h2 className="text-3xl font-bold text-foreground">Analytics</h2>
          <p className="text-muted-foreground mt-1">
            Insights and metrics on your screening operations
          </p>
        </div>
        <Button onClick={fetchAnalytics} variant="outline" disabled={loading}>
          {loading ? (
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-status-pending">
              {analytics.byStatus.pending}
            </div>
            <p className="text-sm text-muted-foreground mt-2">Awaiting screening</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-status-success">
              {analytics.byStatus.completed}
            </div>
            <p className="text-sm text-muted-foreground mt-2">Successfully screened</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-status-rejected">
              {analytics.byStatus.rejected}
            </div>
            <p className="text-sm text-muted-foreground mt-2">Not qualified</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Screening Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total Applications</span>
                <span className="font-medium">{analytics.totalCandidates}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary" style={{ width: "100%" }} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Screened</span>
                <span className="font-medium">{analytics.totalScreened}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent"
                  style={{
                    width: `${
                      analytics.totalCandidates > 0
                        ? (analytics.totalScreened / analytics.totalCandidates) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Completed</span>
                <span className="font-medium">{analytics.byStatus.completed}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-status-success"
                  style={{
                    width: `${
                      analytics.totalCandidates > 0
                        ? (analytics.byStatus.completed / analytics.totalCandidates) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Analytics;
