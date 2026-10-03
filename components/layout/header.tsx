"use client";

import React, { useEffect, useState } from "react";
import { Volume2, VolumeX, Store, Clock, Menu } from "lucide-react";
import { audioEngine } from "@/lib/audio-alert";
import { apiFetch } from "@/lib/api-client";
import { RestaurantSettings } from "@/types";
import { useNav } from "./nav-context";

export function Header({ unreadCount = 0 }: { unreadCount?: number }) {
  const [isMuted, setIsMuted] = useState(false);
  const [settings, setSettings] = useState<RestaurantSettings | null>(null);
  const { toggleMobileDrawer } = useNav();

  useEffect(() => {
    apiFetch<RestaurantSettings>("/settings/public")
      .then(setSettings)
      .catch(() => {});
  }, []);

  const toggleMute = () => {
    if (audioEngine) {
      const nextMuted = !isMuted;
      audioEngine.setMuted(nextMuted);
      setIsMuted(nextMuted);
    }
  };

  return (
    <header className="h-16 bg-neutral-900/90 backdrop-blur border-b border-neutral-800 px-3 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left: Mobile Menu Toggle + Store Status Indicator */}
      <div className="flex items-center space-x-2 sm:space-x-3">
        <button
          onClick={toggleMobileDrawer}
          className="lg:hidden p-2 -ml-1 rounded-xl text-neutral-300 hover:text-white hover:bg-neutral-800 active:scale-95 transition-all"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div
          className={`flex items-center space-x-1.5 sm:space-x-2 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-bold border ${
            settings?.is_open
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
              : "bg-red-500/10 text-red-400 border-red-500/30"
          }`}
        >
          <Store className="w-3.5 h-3.5" />
          <span>{settings?.is_open ? "OPEN" : "CLOSED"}</span>
          <span className="hidden sm:inline">{settings?.is_open ? "STORE" : ""}</span>
        </div>

        {settings && (
          <div className="hidden md:flex items-center space-x-1.5 text-xs text-neutral-400">
            <Clock className="w-3.5 h-3.5 text-neutral-400" />
            <span>
              {settings.opening_time} - {settings.closing_time}
            </span>
          </div>
        )}
      </div>

      {/* Action Controls */}
      <div className="flex items-center space-x-4">
        {/* Unread Alert Indicator */}
        {unreadCount > 0 && (
          <div className="flex items-center space-x-2 bg-red-600 text-white px-3 py-1.5 rounded-full text-xs font-extrabold animate-pulse shadow-lg shadow-red-600/30">
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            <span>{unreadCount} NEW ORDER{unreadCount > 1 ? "S" : ""}</span>
          </div>
        )}

        {/* Audio Alert Toggle */}
        <button
          onClick={toggleMute}
          className={`p-2.5 rounded-xl border flex items-center space-x-2 text-xs font-semibold transition-all ${
            isMuted
              ? "bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-white"
              : "bg-amber-500/15 border-amber-500/30 text-amber-400 hover:bg-amber-500/25"
          }`}
          title={isMuted ? "Audio muted" : "Audio chime enabled"}
        >
          {isMuted ? (
            <>
              <VolumeX className="w-4 h-4 text-neutral-400" />
              <span className="hidden sm:inline">Muted</span>
            </>
          ) : (
            <>
              <Volume2 className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Chime Active</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
}
