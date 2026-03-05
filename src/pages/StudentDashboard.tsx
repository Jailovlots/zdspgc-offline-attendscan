import { QRCodeSVG } from "qrcode.react";
import { CheckCircle2, Clock, XCircle, CalendarDays, RefreshCw, Calendar, MapPin, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import DashboardLayout from "@/components/DashboardLayout";
import { getSession, getAttendanceRecords, type AttendanceRecord } from "@/lib/auth";
import { getEvents, type SchoolEvent } from "@/data/events";
import { useMemo, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const MONTHS = ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"];

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(getSession());

  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<SchoolEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const session = getSession();
    if (!session || session.role !== "student") {
      navigate("/login");
      return;
    }
    setUser(session);

    const loadData = async () => {
      setIsLoading(true);
      try {
        const [records, eventsData] = await Promise.all([
          getAttendanceRecords(),
          getEvents()
        ]);
        
        // Filter personal history
        const personalHistory = records
          .filter(r => r.id === session.studentId)
          .sort((a, b) => b.timestamp - a.timestamp);
        setHistory(personalHistory);

        // Filter relevant upcoming events
        const relevantEvents = eventsData
          .filter(e => e.status !== "completed")
          .filter(e => e.category === "general" || e.targetCourses.includes(session.course))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .slice(0, 3);
        setUpcomingEvents(relevantEvents);
      } catch (err) {
        console.error("Failed to load student dashboard data:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [navigate]);

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


  if (!user || isLoading) {
    return (
      <DashboardLayout role="student">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gold border-t-transparent"></div>
        </div>
      </DashboardLayout>
    );
  }

  const studentToken = `ZDSPGC-STU-${user.studentId}-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

  return (
    <DashboardLayout role="student">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">Student Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Welcome back, {user.firstName} {user.lastName}</p>
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

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Upcoming Events */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Calendar className="h-5 w-5 text-gold" />
              Upcoming Events
            </h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {upcomingEvents.map((event) => (
                <Card key={event.id} className="shadow-card overflow-hidden group hover:border-gold/50 transition-colors">
                  <CardContent className="p-0">
                    <div className="p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${event.category === 'course-specific' ? 'bg-blue-100 text-blue-700' : 'bg-gold/10 text-gold'
                          }`}>
                          {event.category === 'course-specific' ? `${event.targetCourses[0]} Special` : 'Open to All'}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${event.status === 'ongoing' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                          }`}>
                          {event.status}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground group-hover:text-gold transition-colors">{event.name}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{event.description}</p>
                      </div>
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center text-xs text-muted-foreground gap-2">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{new Date(event.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                        <div className="flex items-center text-xs text-muted-foreground gap-2">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{event.time}</span>
                        </div>
                        <div className="flex items-center text-xs text-muted-foreground gap-2">
                          <MapPin className="h-3.5 w-3.5" />
                          <span className="truncate">{event.location}</span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="w-full bg-gold/10 text-gold hover:bg-gold hover:text-white border-0 mt-2"
                        onClick={() => navigate(`/student/qr?event=${event.id}`)}
                      >
                        Generate QR <ArrowRight className="ml-2 h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {upcomingEvents.length === 0 && (
                <div className="col-span-full py-8 text-center border-2 border-dashed rounded-xl border-muted">
                  <p className="text-muted-foreground text-sm">No upcoming events scheduled</p>
                </div>
              )}
            </div>
          </div>

          {/* QR Code */}
          <Card className="shadow-card h-full">
            <CardHeader className="pb-3 px-6 pt-6">
              <CardTitle className="text-base font-sans">Quick Scanner Access</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4 px-6 pb-6">
              <div className="bg-card p-4 rounded-xl border-2 border-gold/30">
                <QRCodeSVG
                  value={studentToken}
                  size={160}
                  bgColor="transparent"
                  fgColor="hsl(220, 70%, 18%)"
                  level="H"
                />
              </div>
              <p className="text-[10px] text-muted-foreground text-center font-mono break-all opacity-70">ID: {user.studentId}</p>
              <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => navigate("/student/qr")}>
                Personal QR Code
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Chart */}
        <Card className="shadow-card">
          <CardHeader className="pb-3 px-6 pt-6">
            <CardTitle className="text-base font-sans">Attendance Analytics</CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6 pt-2">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthlyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 88%)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(220, 10%, 45%)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'hsl(220, 10%, 45%)' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  cursor={{ fill: 'rgba(184, 146, 64, 0.05)' }}
                />
                <Bar dataKey="present" fill="hsl(142, 72%, 40%)" radius={[6, 6, 0, 0]} name="Present" barSize={20} />
                <Bar dataKey="late" fill="hsl(38, 92%, 50%)" radius={[6, 6, 0, 0]} name="Late" barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* History Table */}
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-sans">Recent Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Day</TableHead>
                  <TableHead>Time In</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.slice(0, 10).map((row, i) => (
                  <TableRow key={row.timestamp + i}>
                    <TableCell className="font-medium">
                      {new Date(row.timestamp).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {new Date(row.timestamp).toLocaleDateString('en-US', { weekday: 'long' })}
                    </TableCell>
                    <TableCell>{row.time}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${row.status === "Present"
                          ? "bg-success/10 text-success"
                          : row.status === "Late"
                            ? "bg-warning/10 text-warning"
                            : "bg-destructive/10 text-destructive"
                          }`}
                      >
                        {row.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
                {history.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No recent activity found.
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

export default StudentDashboard;
