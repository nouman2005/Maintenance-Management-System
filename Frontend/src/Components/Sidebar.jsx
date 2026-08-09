import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  CheckCheck,
  ChevronDown,
  ClipboardList,
  Home,
  LayoutDashboard,
  LogOut,
  Mail,
  Phone,
  Settings,
  ShieldCheck,
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

function NavButton({ active, icon: Icon, label, onClick }) {
  const activeClasses = "bg-sky-50 text-sky-700 shadow-sm ring-1 ring-sky-100";
  const idleClasses = "text-slate-600 hover:bg-slate-100 hover:text-slate-950";

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
        <Icon size={18} className='shrink-0' />
      </span>
      <span className='min-w-0 truncate'>{label}</span>
    </button>
  );
}

function AdminProfileCard({ profile, fallbackUser }) {
  const admin = profile?.admin || fallbackUser || {};
  const society = profile?.society;
  const initials = useMemo(
    () =>
      (admin.name || "Admin")
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
    [admin.name]
  );

  return (
    <section className='mx-3 mt-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm'>
      <div className='flex items-start gap-3'>
        <div className='inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sky-600 text-sm font-semibold text-white shadow-sm shadow-sky-200'>
          {initials}
        </div>
        <div className='min-w-0 flex-1'>
          <div className='truncate text-sm font-semibold text-slate-950'>
            {admin.name || "Administrator"}
          </div>
          <div className='mt-1 inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold capitalize text-emerald-700'>
            {admin.status || "active"}
          </div>
        </div>
      </div>

      <div className='mt-3 space-y-2 text-xs text-slate-600'>
        <div className='flex min-w-0 items-center gap-2'>
          <Mail size={14} className='shrink-0 text-slate-400' />
          <span className='truncate'>{admin.email || "-"}</span>
        </div>
        <div className='flex min-w-0 items-center gap-2'>
          <Phone size={14} className='shrink-0 text-slate-400' />
          <span className='truncate'>{admin.phone || "-"}</span>
        </div>
        <div className='flex min-w-0 items-center gap-2'>
          <ShieldCheck size={14} className='shrink-0 text-slate-400' />
          <span className='truncate capitalize'>{admin.role || "admin"}</span>
        </div>
      </div>

      <div className='mt-3 rounded-md bg-slate-50 p-3'>
        <div className='text-[11px] font-semibold uppercase tracking-wide text-slate-500'>
          Last Login
        </div>
        <div className='mt-1 text-xs font-medium text-slate-800'>
          {formatDateTime(admin.last_login_at)}
        </div>
      </div>

      {society && (
        <div className='mt-3 border-t border-slate-200 pt-3'>
          <div className='flex items-start gap-2'>
            <Building2 size={16} className='mt-0.5 shrink-0 text-sky-700' />
            <div className='min-w-0'>
              <div className='truncate text-sm font-semibold text-slate-950'>
                {society.society_name}
              </div>
              <div className='mt-1 line-clamp-2 text-xs leading-5 text-slate-500'>
                {[society.address, society.city, society.state, society.pincode]
                  .filter(Boolean)
                  .join(", ") || "Society address unavailable"}
              </div>
              <div className='mt-2 flex flex-wrap gap-1.5'>
                <span className='rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700'>
                  {society.total_flats || 0} flats
                </span>
                <span className='rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold capitalize text-emerald-700'>
                  {society.status || "active"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
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

    if (user) loadProfile();
    return () => {
      active = false;
    };
  }, [user]);

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex h-[100dvh] w-[272px] shrink-0 flex-col overflow-hidden transition-[transform,width,border-color] duration-300 ease-out md:relative md:z-10 md:translate-x-0 ${shellClasses} ${
        showSidebar
          ? `translate-x-0 border-r md:w-[272px]`
          : `-translate-x-full border-r border-transparent md:w-0 md:translate-x-0`
      }`}>
      <div
        className='flex h-20 w-[272px] shrink-0 items-center justify-between border-b border-slate-200 bg-slate-50/70 px-5'>
        <div className='flex min-w-0 items-center gap-3'>
          <span
            className='inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-sky-600 text-white shadow-sm shadow-sky-200'>
            <LayoutDashboard size={21} />
          </span>
          <div className='min-w-0'>
            <div
              className='truncate text-sm font-semibold text-slate-950'>
              Society Admin
            </div>
            <div className='truncate text-xs text-slate-500'>
              {user?.name || "Administrator"}
            </div>
          </div>
        </div>
        <button
          type='button'
          onClick={() => setShowSidebar(false)}
          className='inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 active:scale-95'
          aria-label='Close navigation'>
          <X size={19} />
        </button>
      </div>

      {!isSuperAdmin && <AdminProfileCard profile={profile} fallbackUser={user} />}

      <nav className='flex min-h-0 w-[272px] flex-1 flex-col gap-2 overflow-y-auto overflow-x-hidden bg-white px-3 py-4'>
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

      <div
        className='w-[272px] shrink-0 border-t border-slate-200 bg-slate-50/80 p-3'>
        <button
          type='button'
          onClick={handleLogout}
          className='flex h-11 w-full items-center gap-3 rounded-md px-3 text-sm font-medium text-slate-600 transition hover:bg-rose-50 hover:text-rose-700'>
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
