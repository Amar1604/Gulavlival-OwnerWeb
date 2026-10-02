"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Inbox,
  ClipboardPenLine,
  UtensilsCrossed,
  SlidersHorizontal,
  Users,
  Banknote,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout, hasRole } = useAuth();

  const navItems = [
    {
      label: "Take Order (POS)",
      href: "/take-order",
      icon: ClipboardPenLine,
      roles: ["STAFF", "MANAGER", "OWNER"],
    },
    {
      label: "Order Inbox",
      href: "/orders",
      icon: Inbox,
      roles: ["STAFF", "MANAGER", "OWNER"],
    },
    {
      label: "Menu Manager",
      href: "/menu",
      icon: UtensilsCrossed,
      roles: ["MANAGER", "OWNER"],
    },
    {
      label: "Cash Received",
      href: "/cash",
      icon: Banknote,
      roles: ["MANAGER", "OWNER"],
    },
    {
      label: "Store Settings",
      href: "/settings",
      icon: SlidersHorizontal,
      roles: ["OWNER"],
    },
    {
      label: "Team Security",
      href: "/team",
      icon: Users,
      roles: ["OWNER"],
    },
  ];

  const visibleItems = navItems.filter((item) => hasRole(item.roles));

  return (
    <aside className="w-64 bg-neutral-950 text-neutral-200 border-r border-neutral-800 flex flex-col justify-between shrink-0 h-screen sticky top-0 select-none">
      <div>
        {/* Brand Header */}
        <div className="p-5 border-b border-neutral-800/80">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center font-bold text-black text-sm">
              GG
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-wide text-white">
                GULAVLIVAL GRAND
              </h1>
              <p className="text-[10px] text-amber-500 font-semibold tracking-wider uppercase">
                Operations Portal
              </p>
            </div>
          </div>
        </div>

        {/* User Role Badge */}
        {user && (
          <div className="mx-4 mt-4 p-3 bg-neutral-900 border border-neutral-800 rounded-xl flex items-center justify-between">
            <div className="overflow-hidden pr-2">
              <p className="text-xs font-bold text-white truncate">
                {user.full_name}
              </p>
              <p className="text-[11px] text-neutral-400">{user.phone}</p>
            </div>
            <span
              className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                user.role === "OWNER"
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                  : user.role === "MANAGER"
                  ? "bg-purple-500/20 text-purple-400 border border-purple-500/40"
                  : "bg-blue-500/20 text-blue-400 border border-blue-500/40"
              }`}
            >
              {user.role}
            </span>
          </div>
        )}

        {/* Nav Links */}
        <nav className="p-3 space-y-1.5 mt-2">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-3 px-3.5 py-3 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20 font-bold"
                    : "text-neutral-400 hover:text-white hover:bg-neutral-900"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-black" : "text-neutral-400"}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Logout */}
      <div className="p-4 border-t border-neutral-800/80">
        <div className="flex items-center space-x-2 text-[11px] text-neutral-400 mb-3 px-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Encrypted Session</span>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center justify-center space-x-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-neutral-400 hover:text-red-400 hover:bg-red-950/30 transition-all border border-neutral-800"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
