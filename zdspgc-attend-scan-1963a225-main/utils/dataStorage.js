import AsyncStorage from "@react-native-async-storage/async-storage";

const KEYS = {
  STUDENT_INFO: "student_info",
  SESSION: "user_session",
  LAST_SYNC: "last_data_sync"
};

/**
 * Save student information to local storage
 * @param {Object} info 
 */
export const saveStudentInfo = async (info) => {
  try {
    await AsyncStorage.setItem(KEYS.STUDENT_INFO, JSON.stringify(info));
  } catch (e) {
    console.error("Failed to save student info:", e);
  }
};

/**
 * Load student information from local storage
 * @returns {Promise<Object|null>}
 */
export const loadStudentInfo = async () => {
  try {
    const data = await AsyncStorage.getItem(KEYS.STUDENT_INFO);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error("Failed to load student info:", e);
    return null;
  }
};

/**
 * Save user session to local storage
 * @param {Object} session 
 */
export const saveSession = async (session) => {
  try {
    await AsyncStorage.setItem(KEYS.SESSION, JSON.stringify(session));
  } catch (e) {
    console.error("Failed to save session:", e);
  }
};

/**
 * Load user session from local storage
 * @returns {Promise<Object|null>}
 */
export const loadSession = async () => {
  try {
    const data = await AsyncStorage.getItem(KEYS.SESSION);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error("Failed to load session:", e);
    return null;
  }
};

/**
 * Comprehensive load from storage (Fast)
 */
export const loadFromStorage = async () => {
  const [info, session] = await Promise.all([
    loadStudentInfo(),
    loadSession()
  ]);
  return { info, session };
};
/**
 * Update local storage from server using batched API
 * @param {string} studentId 
 * @param {string} role 
 * @param {string} targetUri 
 */
export const syncDataFromServer = async (studentId, role, targetUri) => {
  try {
    const params = new URLSearchParams();
    if (studentId) params.append('studentId', studentId);
    params.append('role', role);

    const res = await fetch(`${targetUri}/api/init-data?${params.toString()}`);
    if (res.ok) {
      const data = await res.json();
      
      // Save everything received in the batch
      if (data.profile) await saveStudentInfo(data.profile);
      if (data.settings) await AsyncStorage.setItem("system_settings", JSON.stringify(data.settings));
      if (data.events) await AsyncStorage.setItem("active_events", JSON.stringify(data.events));
      
      await AsyncStorage.setItem(KEYS.LAST_SYNC, Date.now().toString());
      return data;
    }
  } catch (e) {
    console.error("Failed to sync data from server:", e);
  }
  return null;
};
