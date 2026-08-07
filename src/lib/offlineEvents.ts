import { getEvents, generateEventQrToken, type SchoolEvent } from "@/data/events";
import { API_URL } from "@/lib/config";
import { type StudentUser } from "@/lib/auth";
import { useState, useEffect } from "react";

export interface OfflineEventData {
  id: string; // Event ID
  name: string; // Event Name
  date: string; // Event Date
  time: string; // Time string e.g. "1:00 PM – 5:00 PM"
  startTime: string; // Extracted Start Time
  endTime: string; // Extracted End Time
  location: string;
  description: string;
  category: "general" | "course-specific";
  targetCourses: string[];
  status: "upcoming" | "ongoing" | "completed";
  qrToken: string; // Downloaded/Generated QR Token
  dateDownloaded: string; // ISO String / formatted timestamp
}

const OFFLINE_EVENTS_KEY_PREFIX = "attendwise_offline_events_";
const LAST_SYNC_KEY_PREFIX = "attendwise_last_sync_";

/**
 * Parses a time string like "1:00 PM – 5:00 PM" into startTime and endTime.
 */
export const parseTimeRange = (timeStr: string): { startTime: string; endTime: string } => {
  if (!timeStr) return { startTime: "N/A", endTime: "N/A" };
  const parts = timeStr.split("–").map((s) => s.trim());
  if (parts.length >= 2) {
    return { startTime: parts[0], endTime: parts[1] };
  }
  return { startTime: timeStr, endTime: timeStr };
};

/**
 * Get storage key for student's offline events
 */
const getStorageKey = (studentId: string) => `${OFFLINE_EVENTS_KEY_PREFIX}${studentId.trim().toUpperCase()}`;
const getLastSyncKey = (studentId: string) => `${LAST_SYNC_KEY_PREFIX}${studentId.trim().toUpperCase()}`;

/**
 * Read saved offline events from persistent local storage
 */
export const getOfflineEvents = (studentId: string): OfflineEventData[] => {
  if (!studentId) return [];
  try {
    const raw = localStorage.getItem(getStorageKey(studentId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("[OfflineStorage] Failed to read offline events:", err);
    return [];
  }
};

/**
 * Save offline events to persistent local storage
 */
export const saveOfflineEvents = (studentId: string, events: OfflineEventData[]): boolean => {
  if (!studentId) return false;
  try {
    localStorage.setItem(getStorageKey(studentId), JSON.stringify(events));
    localStorage.setItem(getLastSyncKey(studentId), new Date().toISOString());
    return true;
  } catch (err) {
    console.error("[OfflineStorage] Failed to save offline events:", err);
    return false;
  }
};

/**
 * Get last sync timestamp string for student
 */
export const getLastSyncTime = (studentId: string): string | null => {
  if (!studentId) return null;
  return localStorage.getItem(getLastSyncKey(studentId));
};

/**
 * Download assigned active events and QR tokens for student, saving to local storage.
 * Must be called when online.
 */
export const syncOfflineEvents = async (student: StudentUser): Promise<OfflineEventData[]> => {
  if (!student || !student.studentId) return [];

  try {
    const allEvents = await getEvents();

    // Filter active events assigned to student's course or open-to-all
    const studentCourse = (student.course || "").trim().toUpperCase();
    const activeAssignedEvents = allEvents
      .filter((e) => e.status !== "completed")
      .filter((e) => {
        if (!e.targetCourses || e.targetCourses.length === 0) return true;
        return e.targetCourses.some((c) => c.trim().toUpperCase() === studentCourse);
      });

    const nowIso = new Date().toISOString();

    const offlineRecords: OfflineEventData[] = activeAssignedEvents.map((event) => {
      const { startTime, endTime } = parseTimeRange(event.time);
      const tokenResult = generateEventQrToken(
        student.studentId,
        `${student.firstName} ${student.lastName}`,
        event.id,
        event.name
      );

      return {
        id: event.id,
        name: event.name,
        date: event.date,
        time: event.time,
        startTime,
        endTime,
        location: event.location,
        description: event.description,
        category: event.category,
        targetCourses: event.targetCourses,
        status: event.status,
        qrToken: tokenResult.token,
        dateDownloaded: nowIso,
      };
    });

    saveOfflineEvents(student.studentId, offlineRecords);
    return offlineRecords;
  } catch (err) {
    console.error("[OfflineSync] Error syncing offline events:", err);
    // Fall back to existing cached events if network fails mid-sync
    return getOfflineEvents(student.studentId);
  }
};

/**
 * Check whether backend server is reachable
 */
export const checkServerReachability = async (): Promise<boolean> => {
  if (!navigator.onLine) return false;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`${API_URL}/api/health`, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeoutId);
    return res.ok;
  } catch {
    return false;
  }
};

/**
 * Custom React Hook for monitoring device & server connection status
 */
export const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isChecking, setIsChecking] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    const verifyConnection = async () => {
      if (!navigator.onLine) {
        if (isMounted) setIsOnline(false);
        return;
      }
      setIsChecking(true);
      const reachable = await checkServerReachability();
      if (isMounted) {
        setIsOnline(reachable);
        setIsChecking(false);
      }
    };

    verifyConnection();

    const handleOnline = () => verifyConnection();
    const handleOffline = () => {
      if (isMounted) setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Periodic check every 20s
    const interval = setInterval(verifyConnection, 20000);

    return () => {
      isMounted = false;
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, []);

  return { isOnline, isChecking };
};
