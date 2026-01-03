import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./Components/Login";
import MaintenanceDashboard from "./Components/MaintenanceDashboard";
import TenantsDetails from "./Components/Pages/Tenants/TenantsDetails";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Login Page */}
        <Route path='/login' element={<Login />} />

        {/* Dashboard Page */}
        <Route path='/dashboard' element={<MaintenanceDashboard />} />

        <Route path='/tenants/:id' element={<TenantsDetails />} />

        {/* Default Route */}
        <Route path='/' element={<Login />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
