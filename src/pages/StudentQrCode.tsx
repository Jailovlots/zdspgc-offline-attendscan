import { useState, useMemo, useEffect, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import { QrCode, Calendar, MapPin, Clock, ChevronRight, Sparkles, Download, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import DashboardLayout from "@/components/DashboardLayout";
import OfflineStatusIndicator from "@/components/OfflineStatusIndicator";
import { toast } from "sonner";
import { getSession, setSession, getStudentProfile, type StudentUser } from "@/lib/auth";
import { useNavigate, useSearchParams } from "react-router-dom";
import { syncTimeWithServer } from "@/lib/timeSync";
import {
  useOnlineStatus,
  syncOfflineEvents,
  getOfflineEvents,
  getLastSyncTime,
  parseTimeRange,
  type OfflineEventData,
} from "@/lib/offlineEvents";

const StudentQrCode = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isOnline } = useOnlineStatus();
  const [student, setStudent] = useState<StudentUser | null>(getSession());
  const [offlineEvents, setOfflineEvents] = useState<OfflineEventData[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  useEffect(() => {
    if (!student || student.role !== "student") {
      toast.error("Please log in as a student to access this page");
      navigate("/login");
    }
  }, [student, navigate]);

  // Handler for syncing event data when online
  const handleSyncData = useCallback(async (currentStudent: StudentUser) => {
    setIsSyncing(true);
    try {
      if (navigator.onLine) {
        await syncTimeWithServer().catch(() => {});
        const freshProfile = await getStudentProfile(currentStudent.studentId).catch(() => null);
        if (freshProfile) {
          setSession(freshProfile);
          setStudent(freshProfile);
        }
      }
      const synced = await syncOfflineEvents(currentStudent);
      setOfflineEvents(synced);
      setLastSyncTime(getLastSyncTime(currentStudent.studentId));
    } catch (err) {
      console.error("[StudentQrCode] Sync error:", err);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Main data initialization effect
  useEffect(() => {
    const initData = async () => {
      const session = getSession();
      if (!session || session.role !== "student") return;

      setIsLoading(true);

      if (isOnline) {
        await handleSyncData(session);
      } else {
        // Offline: Load strictly from local storage
        const saved = getOfflineEvents(session.studentId);
        setOfflineEvents(saved);
        setLastSyncTime(getLastSyncTime(session.studentId));
      }

      setIsLoading(false);
    };

    initData();
  }, [isOnline, handleSyncData]);

  // Handle URL query parameter ?event=EVT-ID
  useEffect(() => {
    const eventParam = searchParams.get("event");
    if (eventParam && offlineEvents.length > 0) {
      const match = offlineEvents.find((e) => e.id === eventParam);
      if (match) {
        setSelectedEventId(match.id);
      }
    } else if (!selectedEventId && offlineEvents.length > 0) {
      // Default to first event
      setSelectedEventId(offlineEvents[0].id);
    }
  }, [searchParams, offlineEvents, selectedEventId]);

  const selectedEvent = useMemo(
    () => offlineEvents.find((e) => e.id === selectedEventId) || null,
    [offlineEvents, selectedEventId]
  );

  const statusColor = (status: OfflineEventData["status"]) => {
    switch (status) {
      case "upcoming":
        return "bg-accent/10 text-accent border-accent/30";
      case "ongoing":
        return "bg-success/10 text-success border-success/30";
      case "completed":
        return "bg-muted text-muted-foreground border-border";
    }
  };

  if (!student || isLoading) {
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
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground flex items-center gap-3">
              <QrCode className="h-7 w-7 text-gold" />
              Event QR Codes
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Display your saved event QR code even without an internet connection
            </p>
          </div>
        </div>

        {/* Online / Offline Status Indicator */}
        <OfflineStatusIndicator
          isOnline={isOnline}
          lastSyncTime={lastSyncTime}
          isSyncing={isSyncing}
          onManualSync={isOnline ? () => handleSyncData(student) : undefined}
        />

        {/* Main Content Area */}
        {offlineEvents.length === 0 ? (
          <Card className="shadow-card border-2 border-dashed border-amber-500/40 bg-amber-500/5">
            <CardContent className="p-8 text-center space-y-3">
              <div className="h-14 w-14 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
                <QrCode className="h-8 w-8" />
              </div>
              <h2 className="text-base font-bold text-foreground">No Saved QR Codes Found</h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                No saved event QR codes available.
                <br />
                Please connect to the internet at least once.
              </p>
              {isOnline && (
                <button
                  onClick={() => handleSyncData(student)}
                  disabled={isSyncing}
                  className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gold text-white font-semibold text-xs shadow-md hover:bg-gold/90 transition-all"
                >
                  <Download className="h-4 w-4" /> Download QR Codes Now
                </button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid lg:grid-cols-5 gap-6">
            {/* Event List */}
            <div className="lg:col-span-3 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-foreground">
                  Saved Events ({offlineEvents.length})
                </h2>
                {!isOnline && (
                  <span className="text-[11px] text-muted-foreground italic">
                    Loaded from device storage
                  </span>
                )}
              </div>

              {offlineEvents.map((event) => {
                const isSelected = selectedEvent?.id === event.id;
                const { startTime, endTime } = parseTimeRange(event.time);

                return (
                  <Card
                    key={event.id}
                    className={`shadow-card cursor-pointer transition-all hover:shadow-elevated ${
                      isSelected ? "ring-2 ring-gold border-gold/50" : ""
                    }`}
                    onClick={() => setSelectedEventId(event.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-foreground text-sm">{event.name}</h3>
                            <Badge variant="outline" className={statusColor(event.status)}>
                              {event.status}
                            </Badge>
                            <Badge className="bg-success/10 text-success border-success/30 text-[10px]">
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Saved
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">{event.description}</p>
                          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground pt-1">
                            <span className="flex items-center gap-1 font-medium text-foreground">
                              <Calendar className="h-3.5 w-3.5 text-gold" />
                              {event.date}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {startTime !== "N/A" ? `${startTime} – ${endTime}` : event.time}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" />
                              {event.location}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 mt-1" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* QR Code Display Card */}
            <div className="lg:col-span-2">
              <div className="sticky top-6">
                <Card className="shadow-card overflow-hidden">
                  <CardHeader className="pb-3 text-center bg-muted/30 border-b border-border/50">
                    <CardTitle className="text-base font-sans">
                      {selectedEvent ? selectedEvent.name : "Select an Event"}
                    </CardTitle>
                    {selectedEvent && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {student.firstName} {student.lastName} — {student.section}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent className="flex flex-col items-center gap-4 pt-5">
                    {selectedEvent ? (
                      <>
                        <div className="bg-white p-5 rounded-2xl border-2 border-gold/30 shadow-md relative">
                          <QRCodeSVG
                            value={selectedEvent.qrToken}
                            size={250}
                            bgColor="#FFFFFF"
                            fgColor="#000000"
                            level="H"
                            includeMargin={true}
                          />
                        </div>

                        {/* Read-Only Details */}
                        <div className="w-full space-y-2 text-xs">
                          <Separator />
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Student Name</span>
                            <span className="font-semibold text-foreground select-none">
                              {student.firstName} {student.lastName}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Student ID</span>
                            <span className="font-mono font-semibold text-foreground select-none">
                              {student.studentId}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Event ID</span>
                            <span className="font-mono text-foreground select-none">{selectedEvent.id}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Event Name</span>
                            <span className="font-medium text-foreground select-none">{selectedEvent.name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Event Date</span>
                            <span className="font-medium text-foreground">{selectedEvent.date}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Event Schedule</span>
                            <span className="font-medium text-foreground">
                              {selectedEvent.startTime !== "N/A"
                                ? `${selectedEvent.startTime} – ${selectedEvent.endTime}`
                                : selectedEvent.time}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Downloaded</span>
                            <span className="text-muted-foreground">
                              {new Date(selectedEvent.dateDownloaded).toLocaleDateString()}{" "}
                              {new Date(selectedEvent.dateDownloaded).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <Separator />
                          <div>
                            <span className="text-[10px] text-muted-foreground block mb-0.5">QR Token (Read-Only)</span>
                            <p className="text-[10px] text-muted-foreground font-mono break-all bg-muted p-2 rounded-lg border select-all">
                              {selectedEvent.qrToken}
                            </p>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-10 text-muted-foreground">
                        <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-20" />
                        <p className="text-sm font-medium">No event selected</p>
                        <p className="text-xs mt-1">Tap an event on the left to view its QR code</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Instructions */}
                <Card className="shadow-card mt-4">
                  <CardContent className="p-4">
                    <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                      💡 Offline Instructions
                    </h3>
                    <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
                      <li>You can open this app and view QR codes anytime without internet</li>
                      <li>Select your event to show the saved QR code</li>
                      <li>Present the QR code to the officer's scanner</li>
                      <li>When online, your events &amp; QR tokens automatically sync</li>
                    </ol>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default StudentQrCode;
