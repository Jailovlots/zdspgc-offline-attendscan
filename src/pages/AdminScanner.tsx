import { useState, useCallback, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, CheckCircle2, XCircle, Clock, Volume2, CalendarDays, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DashboardLayout from "@/components/DashboardLayout";
import QrScannerComponent from "@/components/QrScannerComponent";
import { toast } from "sonner";
import { getEvents, parseEventQrToken, type SchoolEvent } from "@/data/events";
import { getAllStudents, getSession, getAttendanceRecords, saveAttendanceRecord, clearAttendanceRecords, type AttendanceRecord, type StudentUser } from "@/lib/auth";

const LATE_THRESHOLD_HOUR = 8;

const AdminScanner = () => {
  const navigate = useNavigate();
  const session = getSession();
  const [scannedRecords, setScannedRecords] = useState<AttendanceRecord[]>([]);
  const [lastScan, setLastScan] = useState<AttendanceRecord | null>(null);
  const [scanCount, setScanCount] = useState(0);
  const [selectedEventFilter, setSelectedEventFilter] = useState<string>("all");
  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [allStudents, setAllStudents] = useState<StudentUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!session || session.role !== "admin") {
      toast.error("Please log in as an admin to access this page");
      navigate("/login");
      return;
    }

    const init = async () => {
      setIsLoading(true);
      try {
        const [savedRecords, eventsData, studentsData] = await Promise.all([
          getAttendanceRecords(),
          getEvents(),
          getAllStudents()
        ]);
        
        setScannedRecords(savedRecords);
        setScanCount(savedRecords.length);
        if (savedRecords.length > 0) {
          setLastScan(savedRecords[0]);
        }
        setEvents(eventsData);
        setAllStudents(studentsData);
      } catch (err) {
        toast.error("Failed to sync scanner data");
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [session, navigate]);

  const filteredRecords = useMemo(
    () =>
      selectedEventFilter === "all"
        ? scannedRecords
        : scannedRecords.filter((r) => r.eventId === selectedEventFilter),
    [scannedRecords, selectedEventFilter]
  );

  const findStudent = (id: string) => {
    const student = allStudents.find((u) => u.studentId === id);
    if (student) {
      return {
        name: `${student.firstName} ${student.lastName}`,
        course: student.course,
        section: student.section,
        gender: student.gender,
      };
    }
    return null;
  };

  const playBeep = useCallback(() => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 1200;
      gain.gain.value = 0.3;
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch { /* Audio not supported */ }
  }, []);

  const playErrorBeep = useCallback(() => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 400;
      gain.gain.value = 0.3;
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch { /* Audio not supported */ }
  }, []);

  const handleScanSuccess = useCallback(
    async (decodedText: string) => {
      // Try new event-based format first
      const parsed = parseEventQrToken(decodedText);

      // Fallback: old format ZDSPGC-STU-YYYY-NNNNN-XXXXXXXX
      const legacyMatch = !parsed ? decodedText.match(/ZDSPGC-STU-(\d{4}-\d{5})/) : null;
      const studentId = parsed?.studentId ?? (legacyMatch ? legacyMatch[1] : null);
      const eventId = parsed?.eventId ?? "EVT-GENERAL";

      // Security Check: 15 second expiry for new tokens
      if (parsed && parsed.timestamp) {
        const now = Date.now();
        const ageInSeconds = (now - parsed.timestamp) / 1000;

        if (ageInSeconds > 15) {
          playErrorBeep();
          toast.error("QR Code Expired", {
            description: `This code was generated ${Math.round(ageInSeconds)}s ago. Please ask the student to show a new one.`,
          });
          return;
        }
      }

      // Resolve event
      const event = events.find((e) => e.id === eventId);
      const eventName = event?.name ?? "General Attendance";

      // Check duplicate: same student + same event
      if (studentId && scannedRecords.some((r) => r.id === studentId && r.eventId === eventId)) {
        playErrorBeep();
        toast.warning("Already scanned", {
          description: `Student ${studentId} was already recorded for ${eventName}.`,
        });
        return;
      }

      const now = new Date();
      const timeStr = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
      const status: "Present" | "Late" = now.getHours() >= LATE_THRESHOLD_HOUR ? "Late" : "Present";

      const student = studentId ? findStudent(studentId) : null;

      if (studentId && student) {
        const record: AttendanceRecord = {
          id: studentId,
          name: student.name,
          course: student.course,
          section: student.section,
          gender: student.gender,
          time: timeStr,
          status,
          eventId,
          eventName,
          timestamp: now.getTime(),
        };

        const success = await saveAttendanceRecord(record);
        if (success) {
          playBeep();
          setScannedRecords((prev) => [record, ...prev]);
          setLastScan(record);
          setScanCount((c) => c + 1);

          toast.success(`${status === "Present" ? "✅" : "⏰"} ${student.name}`, {
            description: `${eventName} • ${student.section} — ${status} at ${timeStr}`,
          });
        } else {
          toast.error("Database connection error. Try again.");
        }
      } else {
        playErrorBeep();
        toast.error("Unknown QR Code", {
          description: studentId
            ? `Student ID ${studentId} not found in the system.`
            : "Invalid QR code format.",
        });
      }
    },
    [scannedRecords, playBeep, playErrorBeep, events, allStudents]
  );


  // Unique events that have been scanned
  const scannedEventIds = [...new Set(scannedRecords.map((r) => r.eventId))];

  return (
    <DashboardLayout role="admin">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground flex items-center gap-3">
            <Camera className="h-7 w-7 text-gold" />
            Event QR Scanner
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Scan student QR codes to record event attendance in real-time
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Scanner */}
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-sans flex items-center gap-2">
                <Camera className="h-4 w-4 text-gold" />
                Camera Scanner
              </CardTitle>
            </CardHeader>
            <CardContent>
              <QrScannerComponent
                onScanSuccess={handleScanSuccess}
                onScanError={(err) => toast.error("Scanner Error", { description: err })}
              />
            </CardContent>
          </Card>

          {/* Stats & Last Scan */}
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Card className="shadow-card">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-foreground">{scanCount}</p>
                  <p className="text-xs text-muted-foreground">Total Scans</p>
                </CardContent>
              </Card>
              <Card className="shadow-card">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-success">
                    {scannedRecords.filter((r) => r.status === "Present").length}
                  </p>
                  <p className="text-xs text-muted-foreground">Present</p>
                </CardContent>
              </Card>
              <Card className="shadow-card">
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold text-warning">
                    {scannedRecords.filter((r) => r.status === "Late").length}
                  </p>
                  <p className="text-xs text-muted-foreground">Late</p>
                </CardContent>
              </Card>
            </div>

            <Card className="shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-sans">Last Scan Result</CardTitle>
              </CardHeader>
              <CardContent>
                {lastScan ? (
                  <div className="flex items-center gap-4">
                    <div
                      className={`h-14 w-14 rounded-full flex items-center justify-center shrink-0 ${lastScan.status === "Present" ? "bg-success/10" : "bg-warning/10"
                        }`}
                    >
                      {lastScan.status === "Present" ? (
                        <CheckCircle2 className="h-7 w-7 text-success" />
                      ) : (
                        <Clock className="h-7 w-7 text-warning" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-foreground text-lg truncate">{lastScan.name}</p>
                      <p className="text-sm text-muted-foreground">{lastScan.id} • {lastScan.section}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="outline" className="text-[10px]">
                          <CalendarDays className="h-3 w-3 mr-1" />
                          {lastScan.eventName}
                        </Badge>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${lastScan.status === "Present"
                            ? "bg-success/10 text-success"
                            : "bg-warning/10 text-warning"
                            }`}
                        >
                          {lastScan.status}
                        </span>
                        <span className="text-xs text-muted-foreground">{lastScan.time}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Camera className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No scans yet. Start the scanner and scan a student QR code.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
              <Volume2 className="h-3.5 w-3.5" />
              <span>Sound feedback enabled — beep on successful scan</span>
            </div>
          </div>
        </div>

        {/* Scanned Records Table */}
        {scannedRecords.length > 0 && (
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <CardTitle className="text-base font-sans">
                  Scanned Records ({filteredRecords.length})
                </CardTitle>
                <div className="flex items-center gap-2">
                  {scannedEventIds.length > 1 && (
                    <Select value={selectedEventFilter} onValueChange={setSelectedEventFilter}>
                      <SelectTrigger className="w-[180px] h-8 text-xs">
                        <Filter className="h-3 w-3 mr-1" />
                        <SelectValue placeholder="Filter by event" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Events</SelectItem>
                        {scannedEventIds.map((eid) => {
                          const evt = events.find((e) => e.id === eid);
                          return (
                            <SelectItem key={eid} value={eid}>
                              {evt?.name ?? eid}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      if (confirm("Are you sure you want to clear all records?")) {
                        await clearAttendanceRecords();
                        setScannedRecords([]);
                        setLastScan(null);
                        setScanCount(0);
                        toast.success("All attendance records cleared");
                      }
                    }}
                  >
                    Clear All
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Section</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((row, i) => (
                    <TableRow key={`${row.id}-${row.eventId}-${i}`}>
                      <TableCell className="font-mono text-sm">{row.id}</TableCell>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell>{row.course}</TableCell>
                      <TableCell>{row.section}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">{row.eventName}</Badge>
                      </TableCell>
                      <TableCell>{row.time}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${row.status === "Present"
                            ? "bg-success/10 text-success"
                            : "bg-warning/10 text-warning"
                            }`}
                        >
                          {row.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminScanner;
