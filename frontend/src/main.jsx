import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import AppDialog from "./components/common/AppDialog";
import "./style.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
    <AppDialog />
  </React.StrictMode>
);
