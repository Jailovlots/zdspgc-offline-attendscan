import NetInfo from "@react-native-community/netinfo";
import { syncAttendance } from "./offlineAttendance";

NetInfo.addEventListener(state => {
  if (state.isConnected) {
    syncAttendance();
  }
});
