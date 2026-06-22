import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setBaseUrl } from "@workspace/api-client-react";

// Configure API base URL from env or default to relative (same-origin proxy)
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "";
setBaseUrl(apiBaseUrl || null);

createRoot(document.getElementById("root")!).render(<App />);
