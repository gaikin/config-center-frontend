import { Spin } from "antd";
import { Suspense, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";

const PageManagementPage = lazy(() =>
  import("./pages/PageManagementPage/PageManagementPage").then((m) => ({ default: m.PageManagementPage }))
);
const PromptsPage = lazy(() =>
  import("./pages/PromptsPage/PromptsPage").then((m) => ({ default: m.PromptsPage }))
);
const JobScenesPage = lazy(() =>
  import("./pages/JobScenesPage/JobScenesPage").then((m) => ({ default: m.JobScenesPage }))
);
const InterfacesPage = lazy(() =>
  import("./pages/InterfacesPage/InterfacesPage").then((m) => ({ default: m.InterfacesPage }))
);
const RunRecordsPage = lazy(() =>
  import("./pages/RunRecordsPage/RunRecordsPage").then((m) => ({ default: m.RunRecordsPage }))
);
const RolesPage = lazy(() =>
  import("./pages/RolesPage/RolesPage").then((m) => ({ default: m.RolesPage }))
);
const PublicFieldsPage = lazy(() =>
  import("./pages/PublicFieldsPage/PublicFieldsPage").then((m) => ({ default: m.PublicFieldsPage }))
);
const AdvancedConfigPage = lazy(() =>
  import("./pages/AdvancedConfigPage/AdvancedConfigPage").then((m) => ({ default: m.AdvancedConfigPage }))
);
export default function App() {
  return (
    <AppShell>
      <Suspense fallback={<Spin style={{ margin: "24px 0" }} />}>
        <Routes>
          <Route path="/" element={<Navigate to="/page-management" replace />} />
          <Route path="/page-management" element={<PageManagementPage />} />
          <Route path="/prompts" element={<PromptsPage />} />
          <Route path="/jobs" element={<JobScenesPage />} />
          <Route path="/interfaces" element={<InterfacesPage />} />
          <Route path="/run-records" element={<RunRecordsPage />} />
          <Route path="/roles" element={<RolesPage />} />
          <Route path="/public-fields" element={<PublicFieldsPage />} />
          <Route path="/advanced" element={<AdvancedConfigPage />} />
          <Route path="*" element={<Navigate to="/page-management" replace />} />
        </Routes>
      </Suspense>
    </AppShell>
  );
}
