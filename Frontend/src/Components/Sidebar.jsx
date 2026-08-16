import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  CheckCheck,
  ChevronDown,
  ClipboardList,
  Home,
  LogOut,
  Settings,
  UserRound,
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";
import { logout } from "../redux/slices/authSlice";
import { getProfile } from "../api/auth.api";

const adminGroups = [
  {
    id: "flats",
    label: "Flats",
    icon: Building2,
    items: [
      { target: "AddFlats", label: "Add Flat" },
      { target: "FlatsDetails", label: "Flat Directory" },
    ],
  },
  {
    id: "tenants",
    label: "Tenants",
    icon: UsersRound,
    items: [
      { target: "AddTenants", label: "Add Tenant" },
      { target: "TenantsList", label: "Tenant Directory" },
    ],
  },
  {
    id: "settings",
    label: "Maintenance Settings",
    icon: Settings,
    items: [
      { target: "AddMaintenanceSetting", label: "Add Setting" },
      { target: "MaintenanceSettingList", label: "Settings List" },
    ],
  },
  {
    id: "maintenance",
    label: "Maintenance",
    icon: WalletCards,
    items: [
      { target: "PayMaintenance", label: "Pay Maintenance" },
      { target: "AddBalanceMaintenance", label: "Add Balance" },
      {
        target: "MonthlyMaintenanceCollectionReport",
        label: "Collection Report",
      },
    ],
  },
];

const superAdminItems = [
  { target: "RequestSociety", label: "Society Requests", icon: ClipboardList },
  { target: "SocietyLists", label: "Society Directory", icon: Building2 },
  { target: "CompleteRejectList", label: "Completed Requests", icon: CheckCheck },
];

const formatDateTime = (value) => {
  if (!value) return "First login";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatRole = (value) =>
  (value || "admin")
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const getInitials = (value, fallback = "AD") =>
  (value || fallback)
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const buildAddress = (society = {}) =>
  [society.address, society.city, society.state, society.pincode]
    .filter(Boolean)
    .join(", ");

function NavButton({ active, icon: Icon, label, onClick }) {
  const activeClasses = "bg-sky-50 text-sky-700 shadow-sm ring-1 ring-sky-100";
  const idleClasses = "text-slate-600 hover:bg-slate-100 hover:text-slate-950";
  const icon = React.createElement(Icon, {
    size: 18,
    className: "shrink-0",
  });

  return (
    <button
      type='button'
      onClick={onClick}
      className={`flex h-11 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-medium transition ${
        active ? activeClasses : idleClasses
      }`}>
      <span
        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition ${
          active ? "bg-sky-600 text-white" : "text-slate-500"
        }`}>
        {icon}
      </span>
      <span className='min-w-0 truncate'>{label}</span>
    </button>
  );
}

function ProfileField({ label, value, capitalize = false }) {
  return (
    <div className='min-w-0 rounded-md border border-slate-200 bg-white px-3 py-2.5'>
      <div className='text-[11px] font-semibold uppercase tracking-wide text-slate-500'>
        {label}
      </div>
      <div
        className={`mt-1 break-words text-sm font-medium text-slate-900 ${
          capitalize ? "capitalize" : ""
        }`}>
        {value ?? "-"}
      </div>
    </div>
  );
}

function AdminProfileButton({ profile, fallbackUser, onOpen }) {
  const admin = profile?.admin || fallbackUser || {};
  const initials = useMemo(() => getInitials(admin.name, "AD"), [admin.name]);

  return (
    <button
      type='button'
      onClick={onOpen}
      className='flex h-12 w-full items-center gap-3 rounded-md border border-transparent px-3 text-left transition hover:border-sky-100 hover:bg-white hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2'
      aria-label='Open admin profile'>
      <span className='inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-600 text-xs font-semibold text-white shadow-sm shadow-sky-200'>
        {admin.profile_photo ? (
          <img
            src={admin.profile_photo}
            alt=''
            className='h-full w-full rounded-full object-cover'
          />
        ) : (
          initials
        )}
      </span>
      <span className='min-w-0 flex-1'>
        <span className='block truncate text-sm font-semibold text-slate-950'>
          {admin.name || "Administrator"}
        </span>
        <span className='block truncate text-xs text-slate-500'>View profile</span>
      </span>
      <UserRound size={17} className='shrink-0 text-slate-400' />
    </button>
  );
}

function AdminProfileModal({ profile, fallbackUser, onClose }) {
  const admin = profile?.admin || fallbackUser || {};
  const society = profile?.society || {};
  const adminInitials = getInitials(admin.name, "AD");
  const societyInitials = getInitials(society.society_name, "SO");
  const address = buildAddress(society);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return createPortal(
    <div className='fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:p-5'>
      <button
        type='button'
        aria-label='Close admin profile'
        className='absolute inset-0 cursor-default'
        onClick={onClose}
      />
      <section
        role='dialog'
        aria-modal='true'
        aria-labelledby='admin-profile-title'
        className='relative flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-slate-50 shadow-2xl ring-1 ring-slate-950/10'>
        <header className='flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-4 sm:px-6'>
          <div className='min-w-0'>
            <div id='admin-profile-title' className='truncate text-lg font-semibold text-slate-950'>
              Admin Profile
            </div>
            <div className='mt-1 truncate text-sm text-slate-500'>
              Account and society information
            </div>
          </div>
          <button
            type='button'
            onClick={onClose}
            className='inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-900'
            aria-label='Close admin profile'>
            <X size={19} />
          </button>
        </header>

        <div className='min-h-0 overflow-y-auto px-4 py-5 sm:px-6'>
          <div className='grid gap-5 lg:grid-cols-2'>
            <section className='rounded-lg border border-slate-200 bg-white p-4 shadow-sm'>
              <div className='flex items-start gap-4'>
                <div className='inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-sky-600 text-lg font-semibold text-white shadow-sm shadow-sky-200'>
                  {admin.profile_photo ? (
                    <img
                      src={admin.profile_photo}
                      alt=''
                      className='h-full w-full rounded-full object-cover'
                    />
                  ) : (
                    adminInitials
                  )}
                </div>
                <div className='min-w-0 flex-1'>
                  <div className='text-[11px] font-semibold uppercase tracking-wide text-sky-700'>
                    Admin Information
                  </div>
                  <div className='mt-1 truncate text-xl font-semibold text-slate-950'>
                    {admin.name || "Administrator"}
                  </div>
                  <div className='mt-2 inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold capitalize text-emerald-700'>
                    {admin.status || "active"}
                  </div>
                </div>
              </div>

              <div className='mt-5 grid gap-3 sm:grid-cols-2'>
                <ProfileField label='Admin Name' value={admin.name || "Administrator"} />
                <ProfileField label='Role' value={formatRole(admin.role)} />
                <ProfileField label='Email' value={admin.email} />
                <ProfileField label='Phone' value={admin.phone} />
                <ProfileField label='Account Status' value={admin.status || "active"} capitalize />
                <ProfileField label='Last Login' value={formatDateTime(admin.last_login_at)} />
              </div>
            </section>

            <section className='rounded-lg border border-slate-200 bg-white p-4 shadow-sm'>
              <div className='flex items-start gap-4'>
                <div className='inline-flex h-16 w-16 shrink-0 items-center justify-center rounded-md bg-slate-900 text-lg font-semibold text-white shadow-sm'>
                  {society.society_logo ? (
                    <img
                      src={society.society_logo}
                      alt=''
                      className='h-full w-full rounded-md object-cover'
                    />
                  ) : (
                    societyInitials
                  )}
                </div>
                <div className='min-w-0 flex-1'>
                  <div className='text-[11px] font-semibold uppercase tracking-wide text-sky-700'>
                    Society Information
                  </div>
                  <div className='mt-1 truncate text-xl font-semibold text-slate-950'>
                    {society.society_name || "Society details unavailable"}
                  </div>
                  <div className='mt-2 inline-flex items-center rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold capitalize text-sky-700'>
                    {society.status || "active"}
                  </div>
                </div>
              </div>

              <div className='mt-5 grid gap-3 sm:grid-cols-2'>
                <ProfileField label='Society Name' value={society.society_name} />
                <ProfileField label='Society Status' value={society.status || "active"} capitalize />
                <ProfileField label='Contact Number' value={society.society_phone} />
                <ProfileField label='Society Email' value={society.society_email} />
                <div className='sm:col-span-2'>
                  <ProfileField label='Society Address' value={address || "Society address unavailable"} />
                </div>
              </div>
            </section>
          </div>
        </div>
      </section>
    </div>,
    document.body
  );
}

function Sidebar({
  activeComponent,
  setShowComponent,
  showSidebar,
  setShowSidebar,
  setSelectedSocietyId,
  isDesktop,
}) {
  const [openGroup, setOpenGroup] = useState(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const isSuperAdmin = user?.role === "super_admin";
  const [profile, setProfile] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const shellClasses =
    "border-slate-200 bg-white text-slate-950 shadow-2xl md:shadow-none";

  const navigateTo = (target) => {
    if (target === "SocietyLists") setSelectedSocietyId(null);
    setShowComponent(target);
    if (!isDesktop) setShowSidebar(false);
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  useEffect(() => {
    let active = true;
    const loadProfile = async () => {
      try {
        const res = await getProfile();
        if (active) setProfile(res.data.data || null);
      } catch {
        if (active) setProfile(null);
      }
    };

    if (!isSuperAdmin && user) loadProfile();
    return () => {
      active = false;
    };
  }, [isSuperAdmin, user]);

  return (
    <>
      <aside
        id='dashboard-sidebar'
        className={`fixed inset-y-0 left-0 z-50 flex h-[100dvh] w-[min(86vw,18rem)] shrink-0 flex-col overflow-hidden transition-[transform,width,flex-basis,border-color] duration-300 ease-out lg:relative lg:z-10 lg:translate-x-0 ${shellClasses} ${
          showSidebar
            ? `translate-x-0 border-r lg:w-72 lg:basis-72`
            : `-translate-x-full border-r border-transparent lg:w-0 lg:basis-0 lg:translate-x-0`
        }`}>
        <div className='flex h-14 w-full shrink-0 items-center justify-end border-b border-slate-200 bg-white px-3 lg:hidden'>
          <button
            type='button'
            onClick={() => setShowSidebar(false)}
            className='inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 active:scale-95'
            aria-label='Close navigation'>
            <X size={19} />
          </button>
        </div>

        {!isSuperAdmin && (
          <div className='w-full shrink-0 border-b border-slate-200 bg-slate-50/80 p-3'>
            <AdminProfileButton
              profile={profile}
              fallbackUser={user}
              onOpen={() => setShowProfileModal(true)}
            />
          </div>
        )}

        <nav className='flex min-h-0 w-full flex-1 flex-col gap-2 overflow-y-auto overflow-x-hidden bg-white px-3 py-4 lg:pt-3'>
          <NavButton
            active={activeComponent === "Home"}
            icon={Home}
            label='Home'
            onClick={() => navigateTo("Home")}
          />

          {isSuperAdmin
            ? superAdminItems.map((item) => (
                <NavButton
                  key={item.target}
                  active={activeComponent === item.target}
                  icon={item.icon}
                  label={item.label}
                  onClick={() => navigateTo(item.target)}
                />
              ))
            : adminGroups.map((group) => {
                const GroupIcon = group.icon;
                const groupActive = group.items.some((item) => item.target === activeComponent);
                const expanded = openGroup === group.id;

                return (
                  <div key={group.id}>
                    <button
                      type='button'
                      onClick={() => setOpenGroup(expanded ? null : group.id)}
                      className={`flex h-11 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-medium transition ${
                        groupActive
                          ? "bg-sky-50 text-sky-700 shadow-sm ring-1 ring-sky-100"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                      }`}>
                      <span
                        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition ${
                          groupActive ? "bg-sky-600 text-white" : "text-slate-500"
                        }`}>
                        <GroupIcon size={18} />
                      </span>
                      <span className='min-w-0 flex-1 truncate'>{group.label}</span>
                      <ChevronDown
                        size={16}
                        className={`shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
                      />
                    </button>

                    {expanded && (
                      <div className='ml-6 mt-1 space-y-1 border-l border-slate-200 pl-3'>
                        {group.items.map((item) => (
                          <button
                            key={item.target}
                            type='button'
                            onClick={() => navigateTo(item.target)}
                            className={`flex min-h-9 w-full items-center rounded-md px-3 py-2 text-left text-xs font-medium transition ${
                              activeComponent === item.target
                                ? "bg-sky-600 text-white"
                                : "text-slate-500 hover:bg-slate-100 hover:text-slate-950"
                            }`}>
                            {item.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
        </nav>

        <div className='w-full shrink-0 border-t border-slate-200 bg-slate-50/80 p-3'>
          <button
            type='button'
            onClick={handleLogout}
            className='flex h-11 w-full items-center gap-3 rounded-md px-3 text-sm font-medium text-slate-600 transition hover:bg-rose-50 hover:text-rose-700'>
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {showProfileModal && (
        <AdminProfileModal
          profile={profile}
          fallbackUser={user}
          onClose={() => setShowProfileModal(false)}
        />
      )}
    </>
  );
}

export default Sidebar;
