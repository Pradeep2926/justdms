import { BrowserRouter, Routes, Route } from "react-router-dom";

import Home from "./pages/Home";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Verify from "./pages/Verify";
import ConnectMeta from "./pages/ConnectMeta";
import Automation from "./pages/Automation"; // ✅ ADD THIS
import Settings from "./pages/Settings";
import Billing from "./pages/Billing";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import DataDeletion from "./pages/DataDeletion";
import RefundPolicy from "./pages/RefundPolicy";
import TermsOfService from "./pages/TermsOfService";
import AcceptableUse from "./pages/AcceptableUse";
import DataRetention from "./pages/DataRetention";
import PrivacyRights from "./pages/PrivacyRights";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/data-deletion" element={<DataDeletion />} />
        <Route path="/refund-policy" element={<RefundPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/acceptable-use" element={<AcceptableUse />} />
        <Route path="/data-retention" element={<DataRetention />} />
        <Route path="/privacy-rights" element={<PrivacyRights />} />

        {/* Optional verification */}
        <Route path="/verify" element={<Verify />} />

        {/* Onboarding */}
        <Route path="/connect-meta" element={<ConnectMeta />} />

        {/* App */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/automation" element={<Automation />} /> {/* ✅ */}
        <Route path="/settings" element={<Settings />} />
        <Route path="/billing" element={<Billing />} />

        {/* Fallback */}
        <Route path="*" element={<Home />} />
      </Routes>
    </BrowserRouter>
  );
}
