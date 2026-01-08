import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./Components/Login";
import MaintenanceDashboard from "./Components/MaintenanceDashboard";
import TenantsDetails from "./Components/Pages/Tenants/TenantsDetails";
import ProtectedRoute from "./Routes/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path='/login' element={<Login />} />
        <Route path='/' element={<Login />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path='/dashboard' element={<MaintenanceDashboard />} />
          <Route path='/tenants/:id' element={<TenantsDetails />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
