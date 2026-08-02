import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Verify from "./pages/Verify";
import ConnectMeta from "./pages/ConnectMeta";
import Automation from "./pages/Automation"; // ✅ ADD THIS

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />

        {/* Optional verification */}
        <Route path="/verify" element={<Verify />} />

        {/* Onboarding */}
        <Route path="/connect-meta" element={<ConnectMeta />} />

        {/* App */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/automation" element={<Automation />} /> {/* ✅ */}

        {/* Fallback */}
        <Route path="*" element={<Home />} />
      </Routes>
    </BrowserRouter>
  );
}
