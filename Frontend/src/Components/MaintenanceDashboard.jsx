import React, { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import Sidebar from "./Sidebar";
import DashboardHome from "../Components/Pages/DashBoardHome";
import AddFlats from "../Components/Pages/Flats/AddFlats";
import FlatsDetails from "./Pages/Flats/FlatsDetails";
import AddTenants from "./Pages/Tenants/AddTenants";
import TenantsList from "./Pages/Tenants/TenantsList";
import TenantsDetails from "./Pages/Tenants/TenantsDetails";
import AddMaintenanceSetting from "./Pages//MaintenanceSettings/AddMaintenanceSetting";
import MaintenanceSettingList from "./Pages/MaintenanceSettings/MaintenanceSettingList";
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
import ChangeTemporaryPassword from "./ChangeTemporaryPassword";

function MaintenanceDashboard() {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window === "undefined" ? true : window.matchMedia("(min-width: 768px)").matches
  );
  const [showSidebar, setShowSidebar] = useState(() =>
    typeof window === "undefined" ? true : window.matchMedia("(min-width: 768px)").matches
  );
  const [showComponent, setShowComponent] = useState("Home"); // Default to Home
  const [selectedSocietyId, setSelectedSocietyId] = useState(null);
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 768px)");
    const handleViewportChange = (event) => {
      setIsDesktop(event.matches);
      setShowSidebar(event.matches);
    };

    setIsDesktop(mediaQuery.matches);
    setShowSidebar(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleViewportChange);
    return () => mediaQuery.removeEventListener("change", handleViewportChange);
  }, []);

  const showSocietyDetails = (id) => {
    setSelectedSocietyId(id);
    setShowComponent("SocietyDetails");
  };

  const adminComponentMap = {
    Home: <DashboardHome onNavigate={setShowComponent} />,
    AddFlats: <AddFlats />,
    FlatsDetails: <FlatsDetails />,
    AddTenants: <AddTenants />,
    TenantsList: <TenantsList />,
    TenantsDetails: <TenantsDetails />,
    AddMaintenanceSetting: <AddMaintenanceSetting />,
    MaintenanceSettingList: <MaintenanceSettingList />,
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

  if (user?.role === "admin" && user?.must_change_password) {
    return <ChangeTemporaryPassword />;
  }

  return (
    <div className='flex h-[100dvh] w-full overflow-hidden bg-slate-100'>
      {showSidebar && !isDesktop && (
        <button
          type='button'
          aria-label='Close navigation'
          className='fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-[1px] md:hidden'
          onClick={() => setShowSidebar(false)}
        />
      )}

      <Sidebar
        activeComponent={showComponent}
        setShowComponent={setShowComponent}
        showSidebar={showSidebar}
        setShowSidebar={setShowSidebar}
        setSelectedSocietyId={setSelectedSocietyId}
        isDesktop={isDesktop}
      />

      <main className='h-[100dvh] min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain scroll-smooth'>
        <header className='sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/95 px-3 backdrop-blur sm:px-5 md:px-6 lg:px-8'>
          <button
            type='button'
            onClick={() => setShowSidebar((current) => !current)}
            className='inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-95'
            aria-label={showSidebar ? "Close navigation" : "Open navigation"}
            aria-expanded={showSidebar}>
            <Menu size={20} />
          </button>
          <div className='min-w-0'>
            <div className='truncate text-sm font-semibold text-slate-950'>Society Management</div>
            <div className='truncate text-xs text-slate-500'>
              {showSidebar ? "Navigation open" : "Navigation collapsed"}
            </div>
          </div>
        </header>

        <div className='mx-auto w-full max-w-[1600px] px-3 pb-8 pt-5 sm:px-5 md:px-6 lg:px-8'>
          {componentMap[showComponent] || componentMap["Home"]}
        </div>
      </main>
    </div>
  );
}

export default MaintenanceDashboard;
