import React from "react";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface OfflineStatusIndicatorProps {
  isOnline: boolean;
  lastSyncTime?: string | null;
  onManualSync?: () => void;
  isSyncing?: boolean;
}

export const OfflineStatusIndicator: React.FC<OfflineStatusIndicatorProps> = ({
  isOnline,
  lastSyncTime,
  onManualSync,
  isSyncing = false,
}) => {
  const formattedSyncTime = lastSyncTime
    ? new Date(lastSyncTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <div className="w-full">
      {isOnline ? (
        <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 px-4 py-2.5 rounded-xl text-xs font-medium transition-all shadow-sm">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <Wifi className="h-4 w-4 shrink-0" />
            <span className="font-semibold">Connected</span>
            {formattedSyncTime && (
              <span className="text-[11px] opacity-80 hidden sm:inline">
                • Synced at {formattedSyncTime}
              </span>
            )}
          </div>

          {onManualSync && (
            <button
              onClick={onManualSync}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 active:scale-95 transition-all text-emerald-800 dark:text-emerald-300 font-semibold text-[11px] disabled:opacity-50"
              title="Re-synchronize assigned events"
            >
              <RefreshCw className={`h-3 w-3 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Syncing..." : "Sync Now"}
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between bg-amber-500/15 border border-amber-500/40 text-amber-900 dark:text-amber-300 px-4 py-2.5 rounded-xl text-xs font-medium transition-all shadow-sm">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            </span>
            <WifiOff className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span className="font-bold">Offline Mode - Showing Saved QR Codes</span>
          </div>

          {formattedSyncTime && (
            <Badge variant="outline" className="bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300 text-[10px]">
              Saved {formattedSyncTime}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};

export default OfflineStatusIndicator;
