import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import AppShell from "@/components/AppShell";
import Landing from "@/pages/Landing";
import Assessment from "@/pages/Assessment";
import Dashboard from "@/pages/Dashboard";
import Analytics from "@/pages/Analytics";
import Patients from "@/pages/Patients";
import Assessments from "@/pages/Assessments";
import AssessmentReport from "@/pages/AssessmentReport";
import HumanReview from "@/pages/HumanReview";
import Departments from "@/pages/Departments";
import Settings from "@/pages/Settings";

// One <Route> per page in src/pages; BrowserRouter already wraps this in main.tsx.
// Landing renders standalone; every app screen lives inside the AppShell layout.
export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route element={<AppShell />}>
          <Route path="/assessment" element={<Assessment />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/patients" element={<Patients />} />
          <Route path="/assessments" element={<Assessments />} />
          <Route path="/assessments/:id" element={<AssessmentReport />} />
          <Route path="/human-review" element={<HumanReview />} />
          <Route path="/departments" element={<Departments />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </>
  );
}
