import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/login";
import Dashboard from "./pages/Dashboard";
import UploadExcel from "./pages/UploadExcel";
import Predictions from "./pages/Predictions";
import Clients from "./pages/Clients";
import Reports from "./pages/Reports";
import Users from "./pages/Users";
import Promotions from "./pages/Promotions";
import SalesMap from "./pages/SalesMap";
import OlapCube from "./pages/OlapCube";
import Profile from "./pages/Profile";
import ModelInfo from "./pages/ModelInfo";
import ForgotPassword from "./pages/ForgotPassword";

import ProtectedRoute from "./components/ProtectedRoute";
import { TextSizeProvider } from "./context/TextSizeContext";
import { AuthProvider } from "./context/AuthContext";

export default function App() {
  return (
    <TextSizeProvider>
      <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* =========================
              RUTA PÚBLICA
          ========================== */}
          <Route path="/" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* =========================
              RUTAS PROTEGIDAS
          ========================== */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/upload" element={<UploadExcel />} />
            <Route path="/predictions" element={<Predictions />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/model" element={<ModelInfo />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/promotions" element={<Promotions />} />
            <Route path="/sales-map" element={<SalesMap />} />
            <Route path="/olap-cube" element={<OlapCube />} />
          </Route>

          {/* =========================
              SOLO ADMINISTRADOR
          ========================== */}
          <Route element={<ProtectedRoute roles={["Administrador"]} />}>
            <Route path="/users" element={<Users />} />
          </Route>
        </Routes>
      </BrowserRouter>
      </AuthProvider>
    </TextSizeProvider>
  );
}