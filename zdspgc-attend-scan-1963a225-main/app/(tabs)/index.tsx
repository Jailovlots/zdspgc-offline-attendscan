import { useCameraPermissions } from 'expo-camera';
import React from 'react';
import { Platform, SafeAreaView, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

export default function HomeScreen() {
  const [permission, requestPermission] = useCameraPermissions();

  React.useEffect(() => {
    // Request permission if it hasn't been granted yet and we can ask for it.
    // This covers the initial load and cases where permission might have been denied but can be re-requested.
    if (permission === null || (!permission.granted && permission.canAskAgain)) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  if (!permission?.granted) {
    return null; // Don't load the WebView until native permission is granted!
  }

  const targetUri = Platform.OS === 'web'
    ? 'http://localhost:3005'
    : 'http://172.21.255.139:3005';

  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <iframe
          src={targetUri}
          style={{ width: '100%', height: '100%', border: 'none' }}
          title="WebView Content"
          allow="camera; microphone; display-capture"
        />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <WebView
        source={{ uri: targetUri }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        originWhitelist={['*']}
        onPermissionRequest={(event: any) => {
          event.grant();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: Platform.OS === 'android' ? 30 : 0, // Compensate for status bar if not handled by standard layout
  },
  webview: {
    flex: 1,
  },
});
