import { useState } from "react";
import { ClipboardList, CheckCircle2, Clock, XCircle, CalendarDays, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/DashboardLayout";
import { getSession, getAttendanceRecords } from "@/lib/auth";
import { useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const MONTHS = ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"];

const StudentAttendance = () => {
  const navigate = useNavigate();
  const session = getSession();
  const [search, setSearch] = useState("");
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!session || session.role !== "student") {
      navigate("/login");
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      try {
        const records = await getAttendanceRecords();
        const personal = records
          .filter(r => (r.studentId || r.id) === session.studentId)
          .map(r => ({
            ...r,
            formattedDate: new Date(r.timestamp).toLocaleDateString(),
            day: new Date(r.timestamp).toLocaleDateString('en-US', { weekday: 'long' })
          }))
          .sort((a, b) => b.timestamp - a.timestamp);
        setHistory(personal);
      } catch (err) {
        console.error("Failed to load attendance history:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [navigate, session?.studentId]);

  const stats = useMemo(() => {
    const present = history.filter(r => r.status === "Present").length;
    const late = history.filter(r => r.status === "Late").length;
    const total = history.length;
    return [
      { label: "Total Days", value: total.toString(), icon: CalendarDays, color: "text-foreground" },
      { label: "Present", value: present.toString(), icon: CheckCircle2, color: "text-success" },
      { label: "Late", value: late.toString(), icon: Clock, color: "text-warning" },
      { label: "Absent", value: "0", icon: XCircle, color: "text-destructive" },
    ];
  }, [history]);

  const monthlyData = useMemo(() => {
    const counts: Record<string, { month: string, present: number, late: number, absent: number }> = {};
    MONTHS.forEach(m => counts[m] = { month: m, present: 0, late: 0, absent: 0 });

    history.forEach(r => {
      const date = new Date(r.timestamp);
      const month = date.toLocaleString('en-US', { month: 'short' });
      if (counts[month]) {
        if (r.status === "Present") counts[month].present++;
        else if (r.status === "Late") counts[month].late++;
      }
    });

    return Object.values(counts);
  }, [history]);

  const filtered = history.filter(
    (r) =>
      r.formattedDate.includes(search) ||
      r.day.toLowerCase().includes(search.toLowerCase()) ||
      r.status.toLowerCase().includes(search.toLowerCase())
  );

  if (!session || isLoading) {
    return (
      <DashboardLayout role="student">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gold border-t-transparent"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="student">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground flex items-center gap-3">
            <ClipboardList className="h-7 w-7 text-gold" />
            My Attendance
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Track your attendance history and statistics</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s) => (
            <Card key={s.label} className="shadow-card">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                  <s.icon className={`h-5 w-5 ${s.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Monthly Chart */}
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-sans">Monthly Attendance Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 88%)" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="present" fill="hsl(142, 72%, 40%)" radius={[4, 4, 0, 0]} name="Present" />
                <Bar dataKey="late" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} name="Late" />
                <Bar dataKey="absent" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} name="Absent" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Attendance Records */}
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="text-base font-sans">Attendance Records</CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by date, day, status..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                  <TableRow>
                    <TableHead>Date & Day</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Time In</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row, i) => (
                  <TableRow key={row.timestamp + i}>
                    <TableCell>
                      <div className="font-medium text-sm">{row.formattedDate}</div>
                      <div className="text-[10px] text-muted-foreground uppercase">{row.day}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] bg-background">
                        {row.eventName || "General Attendance"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{row.time}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${row.status === "Present"
                          ? "bg-success/10 text-success"
                          : row.status === "Late"
                            ? "bg-warning/10 text-warning"
                            : "bg-destructive/10 text-destructive"
                          }`}
                      >
                        {row.status === "Present" && <CheckCircle2 className="h-3 w-3" />}
                        {row.status === "Late" && <Clock className="h-3 w-3" />}
                        {row.status.toString() === "Absent" && <XCircle className="h-3 w-3" />}
                        {row.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No records found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default StudentAttendance;
