import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./Components/Login";
import MaintenanceDashboard from "./Components/MaintenanceDashboard";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Login Page */}
        <Route path='/login' element={<Login />} />

        {/* Dashboard Page */}
        <Route path='/dashboard' element={<MaintenanceDashboard />} />

        {/* Default Route */}
        <Route path='/' element={<Login />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
