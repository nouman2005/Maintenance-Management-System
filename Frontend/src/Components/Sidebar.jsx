import React, { useState } from "react";
import { MdAddHomeWork, MdDashboard } from "react-icons/md";
import { IoHomeOutline, IoSettingsOutline } from "react-icons/io5";
import { FaChevronDown, FaChevronUp, FaUsers } from "react-icons/fa";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logout } from "../redux/slices/authSlice";

const SidebarItem = ({ icon, label, onClick }) => {
  return (
    <div
      onClick={onClick}
      className='flex items-center gap-4 px-5 py-3 rounded-xl backdrop-blur-sm bg-white/5 hover:bg-white/10 hover:scale-[1.02] transition-all duration-300 cursor-pointer shadow hover:shadow-lg'>
      <span className='text-xl'>{icon}</span>
      <span className='text-base font-medium tracking-wide'>{label}</span>
    </div>
  );
};

function Sidebar({ setShowComponent, showSidebar, setShowSidebar }) {
  const [flatDropdownOpen, setFlatDropdownOpen] = useState(false);
  const [tenantDropdownOpen, setTenantDropdownOpen] = useState(false);
  const [maintenanceSettingDropdownOpen, setMaintenanceSettingDropdownOpen] =
    useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login"); // redirect to login page
  };

  return (
    <div
      className={`fixed md:static top-0 left-0 z-50 w-72 h-screen p-6
      bg-gradient-to-b from-blue-600 via-purple-600 to-pink-500
      text-white shadow-2xl transition-transform duration-300
      ${showSidebar ? "translate-x-0" : "-translate-x-full"}
      md:translate-x-0 overflow-y-auto`}>
      <div className='flex items-center gap-3 mb-10'>
        <MdDashboard className='text-4xl text-white drop-shadow-lg' />
        <h1 className='text-2xl font-extrabold uppercase tracking-wider'>
          Dashboard
        </h1>
      </div>

      <nav className='flex flex-col gap-4'>
        <SidebarItem
          onClick={() => {
            setShowComponent("Home");
            setShowSidebar(false);
          }}
          icon={<IoHomeOutline className='text-2xl' />}
          label='Home'
        />

        {/* Flats */}
        <div>
          <div
            onClick={() => setFlatDropdownOpen(!flatDropdownOpen)}
            className='flex items-center justify-between px-5 py-3 rounded-xl backdrop-blur-sm bg-white/5 hover:bg-white/10 hover:scale-[1.02] transition-all duration-300 cursor-pointer shadow hover:shadow-lg'>
            <div className='flex items-center gap-4'>
              <MdAddHomeWork className='text-xl' />
              <span className='text-base font-medium tracking-wide'>Flats</span>
            </div>
            {flatDropdownOpen ? <FaChevronUp /> : <FaChevronDown />}
          </div>

          {flatDropdownOpen && (
            <div className='ml-10 mt-2 flex flex-col gap-2'>
              <div
                onClick={() => setShowComponent("AddFlats")}
                className='px-4 py-2 rounded-md bg-gradient-to-r from-indigo-500 to-purple-500 cursor-pointer hover:scale-105 transition'>
                Add Flats
              </div>
              <div
                onClick={() => setShowComponent("FlatsDetails")}
                className='px-4 py-2 rounded-md bg-gradient-to-r from-indigo-500 to-purple-500 cursor-pointer hover:scale-105 transition'>
                Flats Details
              </div>
            </div>
          )}
        </div>

        {/* Tenants */}
        <div>
          <div
            onClick={() => setTenantDropdownOpen(!tenantDropdownOpen)}
            className='flex items-center justify-between px-5 py-3 rounded-xl backdrop-blur-sm bg-white/5 hover:bg-white/10 hover:scale-[1.02] transition-all duration-300 cursor-pointer shadow hover:shadow-lg'>
            <div className='flex items-center gap-4'>
              <FaUsers className='text-xl' />
              <span className='text-base font-medium tracking-wide'>
                Tenants
              </span>
            </div>
            {tenantDropdownOpen ? <FaChevronUp /> : <FaChevronDown />}
          </div>

          {tenantDropdownOpen && (
            <div className='ml-10 mt-2 flex flex-col gap-2'>
              <div
                onClick={() => setShowComponent("AddTenants")}
                className='px-4 py-2 rounded-md bg-gradient-to-r from-indigo-500 to-purple-500 cursor-pointer hover:scale-105 transition'>
                Add Tenants
              </div>
              <div
                onClick={() => setShowComponent("TenantsList")}
                className='px-4 py-2 rounded-md bg-gradient-to-r from-indigo-500 to-purple-500 cursor-pointer hover:scale-105 transition'>
                Tenants Details
              </div>
            </div>
          )}
        </div>

        {/* Maintenance Settings */}
        <div>
          <div
            onClick={() =>
              setMaintenanceSettingDropdownOpen(!maintenanceSettingDropdownOpen)
            }
            className='flex items-center justify-between px-5 py-3 rounded-xl backdrop-blur-sm bg-white/5 hover:bg-white/10 hover:scale-[1.02] transition-all duration-300 cursor-pointer shadow hover:shadow-lg'>
            <div className='flex items-center gap-4'>
              <IoSettingsOutline className='text-xl' />
              <span className='text-base font-medium tracking-wide'>
                Maintenance Settings
              </span>
            </div>
            {maintenanceSettingDropdownOpen ? (
              <FaChevronUp />
            ) : (
              <FaChevronDown />
            )}
          </div>

          {maintenanceSettingDropdownOpen && (
            <div className='ml-10 mt-2 flex flex-col gap-2'>
              <div
                onClick={() => setShowComponent("AddMaintenanceSetting")}
                className='px-4 py-2 rounded-md bg-gradient-to-r from-indigo-500 to-purple-500 cursor-pointer hover:scale-105 transition'>
                Add Maintenance Settings
              </div>
              <div
                onClick={() => setShowComponent("MaintenanceSettingList")}
                className='px-4 py-2 rounded-md bg-gradient-to-r from-indigo-500 to-purple-500 cursor-pointer hover:scale-105 transition'>
                Maintenance Settings Lists
              </div>
            </div>
          )}
        </div>

        {/* 🔴 Logout */}
        <div
          onClick={handleLogout}
          className='mt-6 px-4 py-2 rounded-md bg-gradient-to-r from-red-500 to-pink-600 cursor-pointer hover:scale-105 transition-all shadow text-center font-semibold'>
          Logout
        </div>
      </nav>
    </div>
  );
}

export default Sidebar;
