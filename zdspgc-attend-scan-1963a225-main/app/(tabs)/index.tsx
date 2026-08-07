import { useCameraPermissions, CameraView, BarcodeScanningResult } from 'expo-camera';
import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  Platform, SafeAreaView, StyleSheet, View, Text, TouchableOpacity,
  ActivityIndicator, StatusBar,
} from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import Constants from 'expo-constants';

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/**
 * Render deploy URL â€” the hosted web app & API backend.
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
    // Running inside a browser â€” use the current origin
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

  // â”€â”€ Dev mode only: try to resolve the local Metro host â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function HomeScreen() {
  const TARGET_URI = getTargetUri();

  const [permission, requestPermission] = useCameraPermissions();
  const [useNativeScanner, setUseNativeScanner] = useState(false);
  // Keep a ref in sync with state to avoid stale closures in callbacks
  const useNativeScannerRef = useRef(false);
  const [bridgeReady, setBridgeReady] = useState(false);
  const [webViewError, setWebViewError] = useState<string | null>(null);
  const [webViewLoading, setWebViewLoading] = useState(true);

  const webViewRef = useRef<WebView>(null);
  // Cooldown ref â€“ prevents the same QR being sent multiple times in quick succession
  const scanCooldownRef = useRef(false);

  // Helper that updates both state and the ref together
  const setNativeScanner = (active: boolean) => {
    useNativeScannerRef.current = active;
    setUseNativeScanner(active);
  };

  // â”€â”€ Request camera permissions on first render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    (async () => {
      if (!permission?.granted && permission?.canAskAgain !== false) {
        await requestPermission();
      }
    })();
  }, []); // intentionally run only once

  // â”€â”€ Handle a barcode detected by the native camera â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const onBarcodeScanned = useCallback((result: BarcodeScanningResult) => {
    // Use the ref (not state) to avoid stale closure â€” this value is always current
    if (!useNativeScannerRef.current || !webViewRef.current) return;
    if (scanCooldownRef.current) return; // ignore repeated frames

    const data = result.data;
    if (!data) return;

    // Activate cooldown â€” reset after 3 s so the admin can scan the next student
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
  }, []); // No state deps needed â€” we use refs for current values

  // â”€â”€ Handle messages from the WebView (React app â†’ native) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ Permission not yet determined â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (permission === null) {
    return (
      <SafeAreaView style={styles.centeredContainer}>
        <ActivityIndicator size="large" color="#EAB308" />
        <Text style={styles.infoText}>Checking camera permissionsâ€¦</Text>
      </SafeAreaView>
    );
  }

  // â”€â”€ Camera permanently denied â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (!permission.granted && !permission.canAskAgain) {
    return (
      <SafeAreaView style={styles.centeredContainer}>
        <Text style={styles.errorTitle}>ðŸ“· Camera Access Denied</Text>
        <Text style={styles.infoText}>
          Camera permission was denied permanently. Please enable it in your device Settings â†’ Apps â†’ AttendWise â†’ Permissions.
        </Text>
      </SafeAreaView>
    );
  }

  // â”€â”€ Web platform â€” just render an iframe â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* â”€â”€ Bridge status indicator (small dot, top-right) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <View
        style={[
          styles.statusDot,
          { backgroundColor: bridgeReady ? '#22C55E' : '#94A3B8' },
        ]}
      />

      {/* â”€â”€ Native camera overlay (shown when scanning) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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
              <Text style={styles.cancelBtnText}>âœ•  Cancel Scan</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* â”€â”€ WebView (the React web app) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <WebView
        ref={webViewRef}
        source={{ uri: TARGET_URI }}
        style={[
          styles.webview,
          // Hide (but keep alive) while native scanner is open
          useNativeScanner ? { height: 0, width: 0, opacity: 0 } : {},
        ]}
        // â”€â”€ Core settings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        originWhitelist={['*']}
        mixedContentMode="always"
        // â”€â”€ Lifecycle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#EAB308" />
            <Text style={styles.infoText}>Loading AttendWiseâ€¦</Text>
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
          }
        }}
        // â”€â”€ Message bridge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        onMessage={onWebViewMessage}
        // â”€â”€ Android camera permission passthrough â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        // @ts-expect-error onPermissionRequest is valid on Android
        onPermissionRequest={(event: any) => event.grant()}
      />

      {/* â”€â”€ WebView error overlay â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {webViewError && (
        <View style={styles.errorOverlay}>
          <Text style={styles.errorTitle}>âš ï¸ Connection Error</Text>
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
        </View>
      )}
    </SafeAreaView>
  );
}

// â”€â”€â”€ Styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0,
  },
  centeredContainer: {
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

  // â”€â”€ Scanner overlay â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ Loading / error UI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
