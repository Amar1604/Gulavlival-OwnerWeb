"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardPenLine,
  Inbox,
  UtensilsCrossed,
  Banknote,
  Menu,
} from "lucide-react";
import { useNav } from "./nav-context";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api-client";
import { Order } from "@/types";

export function BottomNav() {
  const pathname = usePathname();
  const { toggleMobileDrawer } = useNav();
  const { user } = useAuth();
  const [unreadOrders, setUnreadOrders] = useState<number>(0);

  // Poll for new pending orders every 20 seconds on mobile
  useEffect(() => {
    if (!user) return;

    let isMounted = true;
    const fetchUnread = async () => {
      try {
        const orders = await apiFetch<Order[]>("/staff/orders?limit=30");
        if (isMounted) {
          const received = orders.filter((o) => o.status === "RECEIVED").length;
          setUnreadOrders(received);
        }
      } catch {
        // Silently ignore network blips
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 20000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user]);

  // Don't display on login page
  if (pathname === "/login") return null;

  const navItems = [
    {
      label: "Take Order",
      href: "/take-order",
      icon: ClipboardPenLine,
      badge: null,
    },
    {
      label: "Orders",
      href: "/orders",
      icon: Inbox,
      badge: unreadOrders > 0 ? unreadOrders : null,
    },
    {
      label: "Menu",
      href: "/menu",
      icon: UtensilsCrossed,
      badge: null,
    },
    {
      label: "Cash",
      href: "/cash",
      icon: Banknote,
      badge: null,
    },
  ];

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-neutral-950/95 backdrop-blur-md border-t border-neutral-800/90 px-2 py-1 flex items-center justify-around shadow-2xl safe-area-pb"
      aria-label="Staff mobile bottom navigation"
    >
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 flex flex-col items-center justify-center py-2 px-1 relative rounded-xl transition-all ${
              isActive
                ? "text-amber-400 font-bold"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <div className="relative">
              <Icon
                className={`w-5 h-5 transition-transform ${
                  isActive ? "scale-110 text-amber-400" : ""
                }`}
              />
              {item.badge !== null && (
                <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-black flex items-center justify-center animate-pulse">
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              )}
            </div>
            <span
              className={`text-[10px] mt-1 tracking-tight truncate max-w-[64px] ${
                isActive ? "font-extrabold text-amber-400" : "font-medium"
              }`}
            >
              {item.label}
            </span>
            {isActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-0.5" />
            )}
          </Link>
        );
      })}

      {/* More / All Actions Drawer Trigger */}
      <button
        type="button"
        onClick={toggleMobileDrawer}
        className="flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl text-neutral-400 hover:text-neutral-200 transition-all active:scale-95"
        aria-label="Open full staff menu"
      >
        <Menu className="w-5 h-5" />
        <span className="text-[10px] mt-1 font-medium tracking-tight">More</span>
      </button>
    </nav>
  );
}
