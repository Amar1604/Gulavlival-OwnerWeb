"use client";

import React, { useEffect } from "react";
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
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useNav } from "./nav-context";
import { BottomNav } from "./bottom-nav";

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout, hasRole } = useAuth();
  const { isMobileDrawerOpen, setIsMobileDrawerOpen } = useNav();

  // Close drawer automatically whenever pathname changes
  useEffect(() => {
    setIsMobileDrawerOpen(false);
  }, [pathname, setIsMobileDrawerOpen]);

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

  const renderContent = (isMobile = false) => (
    <>
      <div>
        {/* Brand Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-800/80 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center font-bold text-black text-sm shadow-md shadow-amber-500/20">
              GG
            </div>
            <div>
              <h1 className="font-extrabold text-sm tracking-wide text-white">
                GULAVLIVAL GRAND
              </h1>
              <p className="text-[10px] text-amber-500 font-semibold tracking-wider uppercase">
                Operations Portal
              </p>
            </div>
          </div>

          {/* Close button on mobile drawer */}
          {isMobile && (
            <button
              onClick={() => setIsMobileDrawerOpen(false)}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition lg:hidden"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* User Role Badge */}
        {user && (
          <div className="mx-3.5 mt-3.5 p-3 bg-neutral-900 border border-neutral-800 rounded-xl flex items-center justify-between">
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
        <nav className="p-3 space-y-1 mt-2">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileDrawerOpen(false)}
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
          onClick={() => {
            setIsMobileDrawerOpen(false);
            logout();
          }}
          className="w-full flex items-center justify-center space-x-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-neutral-400 hover:text-red-400 hover:bg-red-950/30 transition-all border border-neutral-800 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* 1. Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex w-64 bg-neutral-950 text-neutral-200 border-r border-neutral-800 flex-col justify-between shrink-0 h-screen sticky top-0 select-none">
        {renderContent(false)}
      </aside>

      {/* 2. Mobile / Tablet Slide-over Drawer Backdrop */}
      {isMobileDrawerOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 lg:hidden transition-opacity"
          onClick={() => setIsMobileDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* 3. Mobile / Tablet Slide-over Drawer Panel */}
      <div
        className={`fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-neutral-950 text-neutral-200 border-r border-neutral-800 z-50 flex flex-col justify-between shadow-2xl transition-transform duration-300 ease-in-out lg:hidden select-none ${
          isMobileDrawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {renderContent(true)}
      </div>

      {/* 4. Mobile / Tablet Bottom Navigation */}
      <BottomNav />
    </>
  );
}
