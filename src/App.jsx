import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";

import Dashboard from "./pages/Dashboard";
import Jobs from "./pages/Jobs";
import CreateJob from "./pages/CreateJob";
import JobDetail from "./pages/JobDetail";
import AdminUsers from "./pages/AdminUsers";
import AdminSettings from "./pages/AdminSettings";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="jobs" element={<Jobs />} />
          <Route path="jobs/:id" element={<JobDetail />} />
          <Route path="create" element={<CreateJob />} />
          <Route path="admin/users" element={<AdminUsers />} />
          <Route path="admin/settings" element={<AdminSettings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}