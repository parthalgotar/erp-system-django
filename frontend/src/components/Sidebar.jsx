import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", eyebrow: "01" },
  { to: "/orders", label: "Orders", eyebrow: "02" },
  { to: "/vendors", label: "Vendors", eyebrow: "03" },
  { to: "/fleet", label: "Fleet", eyebrow: "04" },
  { to: "/track", label: "Track Shipment", eyebrow: "05" },
];

export default function Sidebar() {
  const { email, logout } = useAuth();

  return (
    <aside className="w-60 shrink-0 bg-console-bg text-white flex flex-col h-screen sticky top-0">
      <div className="px-6 py-6 border-b border-console-line">
        <p className="font-mono text-[11px] tracking-[0.2em] text-freight uppercase">
          Manifest
        </p>
        <h1 className="font-display font-semibold text-lg leading-tight mt-1">
          ERP Console
        </h1>
      </div>

      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              [
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
                isActive
                  ? "bg-console-bgSoft text-white"
                  : "text-white/60 hover:bg-console-bgSoft hover:text-white",
              ].join(" ")
            }
          >
            <span className="font-mono text-[10px] text-freight">{item.eyebrow}</span>
            <span className="font-display">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="px-6 py-4 border-t border-console-line">
        <p className="text-xs text-white/50 truncate">{email}</p>
        <button
          onClick={logout}
          className="mt-2 text-xs font-mono uppercase tracking-wide text-white/70 hover:text-white transition-colors"
        >
          Sign out →
        </button>
      </div>
    </aside>
  );
}
