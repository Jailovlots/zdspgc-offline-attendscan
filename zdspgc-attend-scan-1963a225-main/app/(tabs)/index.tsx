import { useCameraPermissions, CameraView, BarcodeScanningResult } from 'expo-camera';
import React, { useRef, useState } from 'react';
import { Platform, SafeAreaView, StyleSheet, View, Text, TouchableOpacity, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import { syncAttendance, saveOfflineAttendance } from '../../utils/offlineAttendance';

export default function HomeScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [useNativeScanner, setUseNativeScanner] = useState(false);
  const [bridgeReady, setBridgeReady] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const webViewRef = useRef<WebView>(null);

  const targetUri = 'https://zdspgc-offline-attendscan.onrender.com';

  React.useEffect(() => {
    const checkPermissions = async () => {
      if (permission === null || (!permission.granted && permission.canAskAgain)) {
        await requestPermission();
      }
    };
    checkPermissions();
  }, [permission, requestPermission]);

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
    return () => clearInterval(interval);
  }, [isOffline]);

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
  };

  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <iframe
          src={targetUri}
          style={{ width: '100%', height: '100%', border: 'none' }}
          title="WebView Content"
          allow="camera; microphone"
        />
      </View>
    );
  }

  // Permission UI
  if (permission && !permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>Camera access is required for scanning.</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Bridge/Network Status Indicator */}
      <View style={[styles.statusDot, { backgroundColor: isOffline ? '#EF4444' : (bridgeReady ? '#22C55E' : '#EAB308') }]} />
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>Server Unreachable - Operating Offline</Text>
          <TouchableOpacity onPress={() => setUseNativeScanner(true)} style={styles.offlineScanBtn}>
            <Text style={styles.offlineScanBtnText}>Open Native Scanner</Text>
          </TouchableOpacity>
        </View>
      )}

      {useNativeScanner ? (
        <View style={styles.cameraContainer}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            onBarcodeScanned={onBarcodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ["qr"],
            }}
          />
          <View style={styles.overlay}>
            <Text style={styles.overlayText}>Align QR Code within the frame</Text>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => setUseNativeScanner(false)}
            >
              <Text style={styles.buttonText}>Cancel Native Scan</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      <WebView
        ref={webViewRef}
        source={{ uri: targetUri }}
        style={[styles.webview, useNativeScanner ? { height: 0, opacity: 0 } : {}]}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        originWhitelist={['*']}
        onMessage={(event) => {
          console.log("Message from WebView:", event.nativeEvent.data);
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'START_NATIVE_SCAN') {
              setUseNativeScanner(true);
            } else if (data.type === 'PING') {
              setBridgeReady(true);
            }
          } catch (e) {
            console.error("WebView message error:", e);
          }
        }}
        // @ts-expect-error onPermissionRequest is missing from WebView types but valid for Android
        onPermissionRequest={(event: any) => {
          event.grant();
        }}
        mixedContentMode="always"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? 30 : 0,
  },
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  permissionText: {
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 16,
    color: '#333',
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 50,
  },
  overlayText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10
  },
  button: {
    backgroundColor: '#EAB308', // Gold color from palette
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 8,
    elevation: 3,
  },
  cancelButton: {
    backgroundColor: '#EF4444', // Destructive red
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
