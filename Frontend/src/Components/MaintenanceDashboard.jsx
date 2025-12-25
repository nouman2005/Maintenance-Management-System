import React, { useState } from "react";
import Sidebar from "./Sidebar";
import DashboardHome from "../Components/Pages/DashBoardHome";
import AddFlats from "../Components/Pages/Flats/AddFlats";
import FlatsDetails from "./Pages/Flats/FlatsDetails";
function MaintenanceDashboard() {
  const [showSidebar, setShowSidebar] = useState(false);
  const [showComponent, setShowComponent] = useState("Home"); // Default to Home

  const componentMap = {
    Home: <DashboardHome />,
    AddFlats: <AddFlats />,
    FlatsDetails: <FlatsDetails />,
  };

  return (
    <>
      <>
        {/* Hamburger toggle on mobile */}
        <button
          className='md:hidden fixed top-4 left-4 z-50 bg-blue-600 text-white p-2 rounded shadow'
          onClick={() => setShowSidebar((prev) => !prev)}>
          ☰
        </button>

        {/* Backdrop for mobile */}
        {showSidebar && (
          <div
            className='fixed inset-0 bg-black bg-opacity-30 z-40 md:hidden'
            onClick={() => setShowSidebar(false)}></div>
        )}

        <div className='flex w-full'>
          {/* Sidebar */}
          <Sidebar
            setShowComponent={setShowComponent}
            showSidebar={showSidebar}
            setShowSidebar={setShowSidebar}
          />

          {/* Main Content */}
          <div className='flex-1 p-4 overflow-auto'>
            {componentMap[showComponent] || componentMap["Home"]}
          </div>
        </div>
      </>
    </>
  );
}

export default MaintenanceDashboard;
