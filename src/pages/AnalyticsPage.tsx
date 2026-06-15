import { useEffect, useState } from 'react';
import { StudentAPI, InsightsAPI } from '@/services/api';
import type { DashboardResponse, StudyPlan, SimulatorResult } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button }   from '@/components/ui/button';
import { Input }    from '@/components/ui/input';
import { Label }    from '@/components/ui/label';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, LineChart, Line, Cell,
} from 'recharts';
import {
  BarChart2, Brain, BookOpen, Target, Loader2, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const TOOLTIP_STYLE = {
  contentStyle: { background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, color: 'hsl(var(--foreground))' },
};

function MarksSimulator({ subjects }: { subjects: DashboardResponse['subjects'] }) {
  const first = subjects[0];
  const [ia1, setIa1] = useState(String(first?.ia1 ?? 10));
  const [ia2, setIa2] = useState(String(first?.ia2 ?? 10));
  const [ia3, setIa3] = useState('10');
  const [asg, setAsg] = useState(String(first?.assignments ?? 4));
  const [result, setResult] = useState<SimulatorResult | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const res = await InsightsAPI.simulateMarks(+ia1, +ia2, +ia3, +asg);
      setResult(res);
    } catch { toast.error('Simulation failed.'); }
    finally { setLoading(false); }
  };

  return (
    <Card className="palace-card">
      <CardHeader><CardTitle className="font-playfair text-base flex items-center gap-2 text-balance"><Target className="w-4 h-4 text-primary" />Marks Simulator</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground text-pretty">Enter your assessment scores to simulate predicted marks and improvement scenarios.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[['IA1 (out of 20)', ia1, setIa1],['IA2 (out of 20)', ia2, setIa2],['IA3 (out of 20)', ia3, setIa3],['Assignments (max 5)', asg, setAsg]].map(([label, val, setter]) => (
            <div key={String(label)} className="space-y-1">
              <Label className="text-xs font-normal text-muted-foreground">{String(label)}</Label>
              <Input type="number" min="0" max="20" value={String(val)} onChange={(e) => (setter as (v: string) => void)(e.target.value)} className="px-2 text-base h-9" />
            </div>
          ))}
        </div>
        <Button onClick={run} disabled={loading} size="sm" className="w-full md:w-auto h-9">
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Simulating…</> : 'Run Marks Simulation'}
        </Button>
        {result && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Current predicted: <span className="text-foreground font-bold text-lg">{result.current_predicted}/50</span></p>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm whitespace-nowrap">
                <thead className="bg-muted/50">
                  <tr>
                    {['Target', 'IA3 Needed', 'Achievable'].map((h) => (
                      <th key={h} className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.improvement_scenarios.map((s, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-4 py-2 font-medium text-foreground">{s.target}/50</td>
                      <td className="px-4 py-2 text-muted-foreground">{s.lab_marks_required}/20</td>
                      <td className="px-4 py-2">
                        <span className={cn('font-semibold', s.achievable ? 'text-success' : 'text-danger')}>
                          {s.achievable ? 'Yes' : 'No'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function StudyPlannerSection({ plan }: { plan: StudyPlan }) {
  const days = Object.entries(plan.plan);
  return (
    <Card className="palace-card">
      <CardHeader><CardTitle className="font-playfair text-base flex items-center gap-2 text-balance"><Brain className="w-4 h-4 text-primary" />Weekly Study Planner</CardTitle></CardHeader>
      <CardContent>
        {plan.narrative && <p className="text-xs text-muted-foreground mb-4 p-3 rounded-xl border border-primary/20 bg-primary/5 text-pretty">{plan.narrative}</p>}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {days.map(([day, dayPlan]) => (
            <div key={day} className="rounded-xl border border-border bg-secondary/30 p-3">
              <p className="font-semibold text-sm text-foreground mb-2">{day}</p>
              {dayPlan.classes.length > 0 && (
                <div className="mb-2">
                  <p className="text-xs text-muted-foreground mb-1">Classes</p>
                  {dayPlan.classes.map((c, i) => (
                    <p key={i} className="text-xs text-foreground flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-0.5" />{c}
                    </p>
                  ))}
                </div>
              )}
              {dayPlan.study_tasks.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Study Tasks</p>
                  {dayPlan.study_tasks.map((t, i) => (
                    <p key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-info shrink-0 mt-1" />{t}
                    </p>
                  ))}
                </div>
              )}
              {dayPlan.classes.length === 0 && dayPlan.study_tasks.length === 0 && (
                <p className="text-xs text-muted-foreground/60">No schedule</p>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AnalyticsPage() {
  const [data,    setData]    = useState<DashboardResponse | null>(null);
  const [planner, setPlanner] = useState<StudyPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([StudentAPI.getDashboard(), InsightsAPI.getPlanner().catch(() => null)])
      .then(([dash, plan]) => { setData(dash); if (plan) setPlanner(plan); })
      .catch(() => toast.error('Failed to load analytics.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48 bg-muted" />
      {[0,1,2].map((i) => <Skeleton key={i} className="h-56 bg-muted rounded-xl" />)}
    </div>
  );

  if (!data) return (
    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
      <AlertTriangle className="w-10 h-10 mb-3 text-warning" />
      <p className="text-sm">Could not load analytics data.</p>
    </div>
  );

  const { analytics_charts, subjects } = data;

  return (
    <div className="space-y-6 animate-fade-up">
      <div>
        <h1 className="font-playfair text-2xl md:text-3xl font-bold gold-text text-balance">Academic Analytics</h1>
        <p className="text-muted-foreground text-sm mt-1 text-pretty">Deep-dive performance analysis, trend insights, and planning tools.</p>
      </div>

      {/* Internals comparison */}
      <Card className="palace-card">
        <CardHeader>
          <CardTitle className="font-playfair text-base flex items-center gap-2 text-balance">
            <BarChart2 className="w-4 h-4 text-primary" />Internals Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full min-w-0 overflow-hidden h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics_charts.internals_comparison} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <XAxis dataKey="subject" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                <YAxis domain={[0, 20]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ paddingTop: 8 }} />
                <Bar dataKey="ia1"       name="IA 1" fill="hsl(var(--chart-1))" radius={[3,3,0,0]} />
                <Bar dataKey="ia2"       name="IA 2" fill="hsl(var(--chart-2))" radius={[3,3,0,0]} />
                <Bar dataKey="ia3"       name="IA 3" fill="hsl(var(--chart-3))" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Radar + Trend */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="palace-card h-full flex flex-col">
          <CardHeader><CardTitle className="font-playfair text-base text-balance">Risk Radar</CardTitle></CardHeader>
          <CardContent className="flex-1 min-h-0">
            <div className="w-full min-w-0 overflow-hidden h-56">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={analytics_charts.risk_data}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                  <Radar name="Risk" dataKey="risk" stroke="hsl(var(--chart-5))" fill="hsl(var(--chart-5))" fillOpacity={0.25} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="palace-card h-full flex flex-col">
          <CardHeader><CardTitle className="font-playfair text-base text-balance">Attendance Trend</CardTitle></CardHeader>
          <CardContent className="flex-1 min-h-0">
            <div className="w-full min-w-0 overflow-hidden h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics_charts.attendance_trend} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <XAxis dataKey="subject" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                  <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [`${v}%`, 'Attendance']} />
                  <Line dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {planner && <StudyPlannerSection plan={planner} />}
      <MarksSimulator subjects={subjects} />
    </div>
  );
}
