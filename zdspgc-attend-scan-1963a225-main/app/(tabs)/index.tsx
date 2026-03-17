import { useCameraPermissions, CameraView, BarcodeScanningResult } from 'expo-camera';
import React, { useRef, useState } from 'react';
import { Platform, SafeAreaView, StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';

export default function HomeScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [useNativeScanner, setUseNativeScanner] = useState(false);
  const [bridgeReady, setBridgeReady] = useState(false);
  const webViewRef = useRef<WebView>(null);

  React.useEffect(() => {
    const checkPermissions = async () => {
      if (permission === null || (!permission.granted && permission.canAskAgain)) {
        await requestPermission();
      }
    };
    checkPermissions();
  }, [permission, requestPermission]);

  const targetUri = 'https://zspgc-attend-scan-1963a225-main-6.onrender.com';

  const onBarcodeScanned = (result: BarcodeScanningResult) => {
    if (useNativeScanner && webViewRef.current) {
      console.log("Barcode scanned natively:", result.data);
      // Inject the scan result into the web app
      const script = `window.dispatchEvent(new CustomEvent('nativeScan', { detail: '${result.data}' }));`;
      webViewRef.current.injectJavaScript(script);
      setUseNativeScanner(false); // Switch back to WebView after successful scan
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
      {/* Bridge Status Indicator */}
      <View style={[styles.statusDot, { backgroundColor: bridgeReady ? '#22C55E' : '#EF4444' }]} />

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
