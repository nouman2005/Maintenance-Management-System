import React, { useState } from "react";
import Sidebar from "./Sidebar";
import DashboardHome from "../Components/Pages/DashBoardHome";
import AddFlats from "../Components/Pages/Flats/AddFlats";
import FlatsDetails from "./Pages/Flats/FlatsDetails";
import AddTenants from "./Pages/Tenants/AddTenants";
import TenantsList from "./Pages/Tenants/TenantsList";
import TenantsDetails from "./Pages/Tenants/TenantsDetails";
import AddMaintenanceSetting from "./Pages//MaintenanceSettings/AddMaintenanceSetting";
import MaintenanceSettingList from "./Pages/MaintenanceSettings/MaintenanceSettingList";
import MaintenanceManagement from "./Pages/Maintenance/MaintenanceManagement";
import {
  AddBalanceMaintenancePage,
  MonthlyMaintenanceCollectionReportPage,
  PayMaintenancePage,
} from "./Pages/Maintenance/MaintenancePages";
import RequestSociety from "./Pages/RequestSociety";
import CompleteRejectList from "./Pages/CompleteRejectList";
import SocietyLists from "./Pages/SocietyLists";
import SocietyDetails from "./Pages/SocietyDetails";
import SuperAdminHome from "./Pages/SuperAdminHome";
import { useSelector } from "react-redux";

function MaintenanceDashboard() {
  const [showSidebar, setShowSidebar] = useState(false);
  const [showComponent, setShowComponent] = useState("Home"); // Default to Home
  const [selectedSocietyId, setSelectedSocietyId] = useState(null);
  const { user } = useSelector((state) => state.auth);

  const showSocietyDetails = (id) => {
    setSelectedSocietyId(id);
    setShowComponent("SocietyDetails");
  };

  const adminComponentMap = {
    Home: <DashboardHome />,
    AddFlats: <AddFlats />,
    FlatsDetails: <FlatsDetails />,
    AddTenants: <AddTenants />,
    TenantsList: <TenantsList />,
    TenantsDetails: <TenantsDetails />,
    AddMaintenanceSetting: <AddMaintenanceSetting />,
    MaintenanceSettingList: <MaintenanceSettingList />,
    MaintenanceManagement: <MaintenanceManagement />,
    PayMaintenance: <PayMaintenancePage />,
    AddBalanceMaintenance: <AddBalanceMaintenancePage />,
    MonthlyMaintenanceCollectionReport: <MonthlyMaintenanceCollectionReportPage />,
  };

  const superAdminComponentMap = {
    Home: (
      <SuperAdminHome
        onOpenRequests={() => setShowComponent("RequestSociety")}
        onOpenSocieties={() => setShowComponent("SocietyLists")}
      />
    ),
    RequestSociety: <RequestSociety />,
    SocietyLists: <SocietyLists onViewSociety={showSocietyDetails} />,
    CompleteRejectList: <CompleteRejectList />,
    SocietyDetails: (
      <SocietyDetails
        societyId={selectedSocietyId}
        onBack={() => setShowComponent("SocietyLists")}
      />
    ),
  };

  const componentMap =
    user?.role === "super_admin" ? superAdminComponentMap : adminComponentMap;

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
            setSelectedSocietyId={setSelectedSocietyId}
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
