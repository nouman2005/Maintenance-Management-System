import React from "react";
import { MdAddHomeWork, MdDashboard } from "react-icons/md";
import { IoHomeOutline } from "react-icons/io5";
import { useState } from "react";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";

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

  const toggleFlatDropdown = () => {
    setFlatDropdownOpen(!flatDropdownOpen);
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
            setShowSidebar(false); // Close sidebar on mobile after click
          }}
          icon={<IoHomeOutline className='text-2xl' />}
          label='Home'
        />

        {/* Flat Dropdown*/}
        <div>
          <div
            onClick={toggleFlatDropdown}
            className='flex items-center justify-between px-5 py-3 rounded-xl backdrop-blur-sm bg-white/5 hover:bg-white/10 hover:scale-[1.02] transition-all duration-300 cursor-pointer shadow hover:shadow-lg'>
            <div className='flex items-center gap-4'>
              <span className='text-xl'>
                <MdAddHomeWork />
              </span>
              <span className='text-base font-medium tracking-wide'>Flats</span>
            </div>
            {flatDropdownOpen ? <FaChevronUp /> : <FaChevronDown />}
          </div>
          {flatDropdownOpen && (
            <div className='ml-10 mt-2 flex flex-col gap-2 text-sm text-white'>
              <div
                onClick={() => {
                  setShowComponent("AddFlats");
                }}
                className='px-4 py-2 rounded-md bg-gradient-to-r from-indigo-500 to-purple-500 text-white cursor-pointer hover:scale-105 transition-all duration-300 shadow'>
                Add Flats
              </div>
              <div
                onClick={() => {
                  setShowComponent("FlatsDetails");
                }}
                className='px-4 py-2 rounded-md bg-gradient-to-r from-indigo-500 to-purple-500 text-white cursor-pointer hover:scale-105 transition-all duration-300 shadow'>
                Flats Details
              </div>
            </div>
          )}
        </div>
      </nav>
    </div>
  );
}

export default Sidebar;
