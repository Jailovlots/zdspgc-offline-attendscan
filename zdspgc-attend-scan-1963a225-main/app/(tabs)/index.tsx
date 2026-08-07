import { useCameraPermissions, CameraView, BarcodeScanningResult } from 'expo-camera';
<<<<<<< HEAD
import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  Platform, SafeAreaView, StyleSheet, View, Text, TouchableOpacity,
  ActivityIndicator, StatusBar,
} from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import Constants from 'expo-constants';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Render deploy URL — the hosted web app & API backend.
 * Change this whenever the deployment URL changes.
 */
const DEPLOY_URL = 'https://attendwise-offline.onrender.com';

/**
 * Resolve the web server URI.
 * - Production (EAS build / standalone): always uses the Render deploy URL.
 * - Dev mode (__DEV__): uses the local machine's LAN IP so hot-reload still works.
 */
const getTargetUri = (): string => {
  if (Platform.OS === 'web') {
    // Running inside a browser — use the current origin
    if (typeof window !== 'undefined') {
      const { protocol, hostname, port } = window.location;
      return `${protocol}//${hostname}:${port || '3005'}`;
    }
    return DEPLOY_URL;
  }

  // In a production / EAS build always point to the deployed server
  if (!__DEV__) {
    return DEPLOY_URL;
  }

  // ── Dev mode only: try to resolve the local Metro host ──────────────────
  const hostUri = Constants.expoConfig?.hostUri ?? '';
  const hostIp = hostUri.split(':')[0];

  if (hostIp && hostIp !== 'localhost' && hostIp !== '127.0.0.1') {
    return `http://${hostIp}:3005`;
  }

  // Android emulator loopback alias
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:3005';
  }

  return 'http://localhost:3005';
};

// Escape a string for safe use inside a JS template literal injected via injectJavaScript
const escapeForJs = (str: string): string =>
  str.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');

// ─── Component ────────────────────────────────────────────────────────────────
=======
import React, { useRef, useState } from 'react';
import { Platform, SafeAreaView, StyleSheet, View, Text, TouchableOpacity, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import { syncAttendance, saveOfflineAttendance } from '../../utils/offlineAttendance';
import { loadFromStorage, saveStudentInfo, saveSession, syncDataFromServer } from '../../utils/dataStorage';
>>>>>>> 0e7c3ed7e94d9204619678e7e811ed7ed5db56aa

export default function HomeScreen() {
  const TARGET_URI = getTargetUri();

  const [permission, requestPermission] = useCameraPermissions();
  const [useNativeScanner, setUseNativeScanner] = useState(false);
  // Keep a ref in sync with state to avoid stale closures in callbacks
  const useNativeScannerRef = useRef(false);
  const [bridgeReady, setBridgeReady] = useState(false);
<<<<<<< HEAD
  const [webViewError, setWebViewError] = useState<string | null>(null);
  const [webViewLoading, setWebViewLoading] = useState(true);

=======
  const [isOffline, setIsOffline] = useState(false);
  const [studentInfo, setStudentInfo] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
>>>>>>> 0e7c3ed7e94d9204619678e7e811ed7ed5db56aa
  const webViewRef = useRef<WebView>(null);
  // Cooldown ref – prevents the same QR being sent multiple times in quick succession
  const scanCooldownRef = useRef(false);

<<<<<<< HEAD
  // Helper that updates both state and the ref together
  const setNativeScanner = (active: boolean) => {
    useNativeScannerRef.current = active;
    setUseNativeScanner(active);
=======
  const targetUri = 'https://zdspgc-offline-attendscan.onrender.com';

  React.useEffect(() => {
    const checkPermissions = async () => {
      if (permission === null || (!permission.granted && permission.canAskAgain)) {
        await requestPermission();
      }
    };
    checkPermissions();
    
    // Step 1: load from phone (fast) - "Instant opening"
    const initStorage = async () => {
      const data = await loadFromStorage();
      if (data.info) setStudentInfo(data.info);
      if (data.session) setSession(data.session);
    };
    initStorage();
  }, [permission, requestPermission]);

  // Step 2: update from server (background)
  const fetchFromAPI = async () => {
    if (isOffline) return;
    const data = await syncDataFromServer(session?.studentId, session?.role || 'student', targetUri);
    if (data?.profile) setStudentInfo(data.profile);
    if (data) console.log("✅ Data synced from server (Batched)");
  };

  React.useEffect(() => {
    const checkServer = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(`${targetUri}/api/health`, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          if (isOffline) setIsOffline(false);
          // Sync any offline attendance
          try {
            await syncAttendance(targetUri);
          } catch (e) {
            console.log("Error syncing offline records:", e);
          }
        }
      } catch (error) {
        console.log("Network error checking server:", error);
        setIsOffline(true);
      }
    };
    checkServer();
    const interval = setInterval(checkServer, 1000 * 30); // Check every 30 seconds
    
    // Background sync when status changes to online
    if (!isOffline) {
        fetchFromAPI();
    }
    
    return () => clearInterval(interval);
  }, [isOffline, session]);

  const onBarcodeScanned = async (result: BarcodeScanningResult) => {
    if (useNativeScanner) {
      console.log("Barcode scanned natively:", result.data);
      setUseNativeScanner(false); // Switch back after successful scan
      
      try {
        const now = Date.now();
        const timeStr = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
        
        const record = {
          id: result.data,
          studentId: result.data,
          name: "Native Scan",
          course: "N/A",
          section: "N/A",
          gender: "N/A",
          time: timeStr,
          status: "Present",
          eventId: "EVT-GENERAL",
          eventName: "Native Event",
          timestamp: now,
        };

        const isOnline = !isOffline && bridgeReady;

        if (isOnline) {
          // normal API
          try {
            const res = await fetch(`${targetUri}/api/attendance`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(record)
            });
            
            if (res.ok) {
              Alert.alert("Success", "Scan recorded online");
              return;
            }
          } catch (e) {
            console.warn("Online save failed, falling back to offline", e);
          }
        }
        
        // offline save (fallback or explicit offline)
        await saveOfflineAttendance(record);
        Alert.alert("Offline Scan", "Saved locally. Will sync when online.");
        
      } catch (err) {
        console.error("Failed to process scan: ", err);
      }
    }
>>>>>>> 0e7c3ed7e94d9204619678e7e811ed7ed5db56aa
  };

  // ── Request camera permissions on first render ──────────────────────────
  useEffect(() => {
    (async () => {
      if (!permission?.granted && permission?.canAskAgain !== false) {
        await requestPermission();
      }
    })();
  }, []); // intentionally run only once

  // ── Handle a barcode detected by the native camera ──────────────────────
  const onBarcodeScanned = useCallback((result: BarcodeScanningResult) => {
    // Use the ref (not state) to avoid stale closure — this value is always current
    if (!useNativeScannerRef.current || !webViewRef.current) return;
    if (scanCooldownRef.current) return; // ignore repeated frames

    const data = result.data;
    if (!data) return;

    // Activate cooldown — reset after 3 s so the admin can scan the next student
    scanCooldownRef.current = true;
    setTimeout(() => {
      scanCooldownRef.current = false;
    }, 3000);

    // Close the native scanner overlay
    setNativeScanner(false);

    // Safely inject the scan result into the web app's window event system
    const safeData = escapeForJs(data);
    const script = `
      (function() {
        try {
          window.dispatchEvent(new CustomEvent('nativeScan', { detail: \`${safeData}\` }));
        } catch(e) {
          console.error('nativeScan dispatch error:', e);
        }
      })();
      true; // required for Android injectJavaScript
    `;
    webViewRef.current.injectJavaScript(script);
  }, []); // No state deps needed — we use refs for current values

  // ── Handle messages from the WebView (React app → native) ───────────────
  const onWebViewMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      switch (data.type) {
        case 'START_NATIVE_SCAN':
          // Only open the native scanner if we have permission
          if (permission?.granted) {
            scanCooldownRef.current = false; // reset cooldown for new scan session
            setNativeScanner(true);
          } else {
            requestPermission();
          }
          break;

        case 'PING':
          setBridgeReady(true);
          // Acknowledge the ping so the web app knows native bridge is live
          webViewRef.current?.injectJavaScript(`
            (function() {
              if (window.ReactNativeWebView) {
                // signal bridge is confirmed
                window.__nativeBridgeReady = true;
              }
            })(); true;
          `);
          break;

        default:
          console.log('[Bridge] Unknown message type:', data.type);
      }
    } catch (e) {
      console.error('[Bridge] Failed to parse WebView message:', e);
    }
  }, [permission?.granted, requestPermission]);

  // ── Permission not yet determined ───────────────────────────────────────
  if (permission === null) {
    return (
      <SafeAreaView style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#EAB308" />
        <Text style={styles.infoText}>Checking camera permissions…</Text>
      </SafeAreaView>
    );
  }

  // ── Camera permanently denied ────────────────────────────────────────────
  if (!permission.granted && !permission.canAskAgain) {
    return (
      <SafeAreaView style={styles.centeredContainer}>
        <Text style={styles.errorTitle}>📷 Camera Access Denied</Text>
        <Text style={styles.infoText}>
          Camera permission was denied permanently. Please enable it in your device Settings → Apps → AttendWise → Permissions.
        </Text>
      </SafeAreaView>
    );
  }

  // ── Web platform — just render an iframe ────────────────────────────────
  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <iframe
          src={TARGET_URI}
          style={{ width: '100%', height: '100%', border: 'none' }}
          title="AttendWise"
          allow="camera; microphone"
        />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
<<<<<<< HEAD
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
=======
      {/* Bridge/Network Status Indicator */}
      <View style={[styles.statusDot, { backgroundColor: isOffline ? '#EF4444' : (bridgeReady ? '#22C55E' : '#EAB308') }]} />
      {isOffline && (
        <View style={styles.offlineBanner}>
          <View>
            <Text style={styles.offlineText}>Server Unreachable - Operating Offline</Text>
            {studentInfo && (
              <Text style={styles.cachedInfoText}>
                Logged in as: {studentInfo.name || "Student"}
              </Text>
            )}
          </View>
          <TouchableOpacity onPress={() => setUseNativeScanner(true)} style={styles.offlineScanBtn}>
            <Text style={styles.offlineScanBtnText}>Open Native Scanner</Text>
          </TouchableOpacity>
        </View>
      )}
>>>>>>> 0e7c3ed7e94d9204619678e7e811ed7ed5db56aa

      {/* ── Bridge status indicator (small dot, top-right) ─────────────── */}
      <View
        style={[
          styles.statusDot,
          { backgroundColor: bridgeReady ? '#22C55E' : '#94A3B8' },
        ]}
      />

      {/* ── Native camera overlay (shown when scanning) ─────────────────── */}
      {useNativeScanner && (
        <View style={StyleSheet.absoluteFillObject}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            onBarcodeScanned={onBarcodeScanned}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          />

          {/* Viewfinder guide */}
          <View style={styles.scannerOverlay}>
            <Text style={styles.scannerHint}>Align the student's QR code within the frame</Text>
            <View style={styles.viewfinderBox} />
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => {
                scanCooldownRef.current = false;
                setNativeScanner(false);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelBtnText}>✕  Cancel Scan</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── WebView (the React web app) ──────────────────────────────────── */}
      <WebView
        ref={webViewRef}
        source={{ uri: TARGET_URI }}
        style={[
          styles.webview,
          // Hide (but keep alive) while native scanner is open
          useNativeScanner ? { height: 0, width: 0, opacity: 0 } : {},
        ]}
        // ── Core settings ──────────────────────────────────
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        originWhitelist={['*']}
<<<<<<< HEAD
        mixedContentMode="always"
        // ── Lifecycle ──────────────────────────────────────
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#EAB308" />
            <Text style={styles.infoText}>Loading AttendWise…</Text>
            <Text style={styles.uriText}>{TARGET_URI}</Text>
          </View>
        )}
        onLoadEnd={() => setWebViewLoading(false)}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('[WebView] Error:', nativeEvent);
          setWebViewError(
            `Could not reach the web server.\n\nURL: ${TARGET_URI}\n\nMake sure the web server (npm run dev) is running on your computer and that your phone is on the same Wi-Fi network.`
          );
        }}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          if (nativeEvent.statusCode >= 500) {
            console.error('[WebView] HTTP error:', nativeEvent.statusCode);
=======
        onMessage={(event) => {
          console.log("Message from WebView:", event.nativeEvent.data);
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'START_NATIVE_SCAN') {
              setUseNativeScanner(true);
            } else if (data.type === 'PING') {
              setBridgeReady(true);
            } else if (data.type === 'AUTH_SUCCESS') {
              // Save session and student info when login is successful in WebView
              if (data.session) {
                setSession(data.session);
                saveSession(data.session);
              }
              if (data.student) {
                setStudentInfo(data.student);
                saveStudentInfo(data.student);
              }
              console.log("✅ Session saved from WebView");
            }
          } catch (e) {
            console.error("WebView message error:", e);
>>>>>>> 0e7c3ed7e94d9204619678e7e811ed7ed5db56aa
          }
        }}
        // ── Message bridge ─────────────────────────────────
        onMessage={onWebViewMessage}
        // ── Android camera permission passthrough ──────────
        // @ts-expect-error onPermissionRequest is valid on Android
        onPermissionRequest={(event: any) => event.grant()}
      />

<<<<<<< HEAD
      {/* ── WebView error overlay ────────────────────────────────────────── */}
      {webViewError && (
        <View style={styles.errorOverlay}>
          <Text style={styles.errorTitle}>⚠️ Connection Error</Text>
          <Text style={styles.errorMessage}>{webViewError}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => {
              setWebViewError(null);
              setWebViewLoading(true);
              webViewRef.current?.reload();
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
=======
      {/* Instant Data Footer (Always visible if logged in) */}
      {!useNativeScanner && studentInfo && (
        <View style={styles.footerInfo}>
          <View style={styles.footerLeft}>
             <Text style={styles.footerLabel}>STUDENT</Text>
             <Text style={styles.footerName}>{studentInfo.name}</Text>
          </View>
          <View style={styles.footerRight}>
             <Text style={styles.footerLabel}>ID NUMBER</Text>
             <Text style={styles.footerId}>{studentInfo.studentId || studentInfo.id}</Text>
          </View>
>>>>>>> 0e7c3ed7e94d9204619678e7e811ed7ed5db56aa
        </View>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0,
  },
<<<<<<< HEAD
  centeredContainer: {
=======
  statusDot: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 40 : 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    zIndex: 9999,
    elevation: 9999,
  },
  offlineBanner: {
    backgroundColor: '#EF4444',
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 100,
  },
  offlineText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  offlineScanBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
  },
  offlineScanBtnText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: 'bold',
  },
  webview: {
    flex: 1,
  },
  permissionContainer: {
>>>>>>> 0e7c3ed7e94d9204619678e7e811ed7ed5db56aa
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
    backgroundColor: '#fff',
  },
  webview: {
    flex: 1,
    backgroundColor: '#fff',
  },
  statusDot: {
    position: 'absolute',
    top: (Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 10) + 6,
    right: 12,
    width: 9,
    height: 9,
    borderRadius: 5,
    zIndex: 9999,
    elevation: 9999,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },

  // ── Scanner overlay ────────────────────────────────────────────────────
  scannerOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    gap: 24,
    padding: 28,
  },
  scannerHint: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  viewfinderBox: {
    width: 240,
    height: 240,
    borderWidth: 3,
    borderColor: '#EAB308',
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  cancelBtn: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  cancelBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.3,
  },

  // ── Loading / error UI ────────────────────────────────────────────────
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
  },
  uriText: {
    fontSize: 11,
    color: '#94A3B8',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
    gap: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
  },
  retryBtn: {
    backgroundColor: '#EAB308',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 8,
    elevation: 3,
  },
  retryBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  cachedInfoText: {
    color: 'white',
    fontSize: 10,
    opacity: 0.8,
  },
  footerInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingHorizontal: 20,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  footerLabel: {
    fontSize: 8,
    color: '#888',
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  footerName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
  },
  footerId: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  footerLeft: {
    flex: 2,
  },
  footerRight: {
    flex: 1,
    alignItems: 'flex-end',
  }
});
