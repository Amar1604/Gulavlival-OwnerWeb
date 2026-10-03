"use client";

import React, { createContext, useContext, useState } from "react";

interface NavContextType {
  isMobileDrawerOpen: boolean;
  setIsMobileDrawerOpen: (open: boolean) => void;
  toggleMobileDrawer: () => void;
}

const NavContext = createContext<NavContextType>({
  isMobileDrawerOpen: false,
  setIsMobileDrawerOpen: () => {},
  toggleMobileDrawer: () => {},
});

export function NavProvider({ children }: { children: React.ReactNode }) {
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const toggleMobileDrawer = () => setIsMobileDrawerOpen((prev) => !prev);

  return (
    <NavContext.Provider
      value={{
        isMobileDrawerOpen,
        setIsMobileDrawerOpen,
        toggleMobileDrawer,
      }}
    >
      {children}
    </NavContext.Provider>
  );
}

export function useNav() {
  return useContext(NavContext);
}
