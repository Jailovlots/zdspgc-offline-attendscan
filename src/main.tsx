import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

console.log("AttendWise application initializing...");
try {
    const rootElement = document.getElementById("root");
    if (!rootElement) throw new Error("Root element not found!");
    createRoot(rootElement).render(<App />);
    console.log("AttendWise application rendered successfully.");
} catch (error) {
    console.error("AttendWise initialization error:", error);
}
