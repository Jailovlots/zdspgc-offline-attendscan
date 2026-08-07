import AsyncStorage from "@react-native-async-storage/async-storage";

export const saveOfflineAttendance = async (record) => {
  const existing = await AsyncStorage.getItem("attendance");
  const data = existing ? JSON.parse(existing) : [];

  data.push({
    ...record,
    status: "pending"
  });

  await AsyncStorage.setItem("attendance", JSON.stringify(data));
};
export const syncAttendance = async (targetUri) => {
  const data = await AsyncStorage.getItem("attendance");
  if (!data) return;

  const records = JSON.parse(data);

  try {
    const apiUrl = targetUri ? `${targetUri}/api/attendance/bulk` : "https://your-api.com/attendance/bulk";
    await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(records)
    });

    // clear after success
    await AsyncStorage.removeItem("attendance");

    console.log("✅ Synced successfully");
  } catch (err) {
    console.log("❌ Sync failed, will retry later");
  }
};
