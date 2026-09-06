import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/login";
import Dashboard from "./pages/Dashboard";
import UploadExcel from "./pages/UploadExcel";
import Predictions from "./pages/Predictions";
import Clients from "./pages/Clients";
import Reports from "./pages/Reports";
import Users from "./pages/Users";
import Promotions from "./pages/Promotions";

import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* =========================
            RUTA PÚBLICA
        ========================== */}
        <Route path="/" element={<Login />} />

        {/* =========================
            RUTAS PROTEGIDAS
        ========================== */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/upload" element={<UploadExcel />} />
          <Route path="/predictions" element={<Predictions />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/users" element={<Users />} />
          <Route path="/promotions" element={<Promotions />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
