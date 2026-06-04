import React, { createContext, useContext, useState, useCallback } from 'react';

interface NavMenuContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const NavMenuContext = createContext<NavMenuContextValue>({
  isOpen: false,
  open: () => {},
  close: () => {},
  toggle: () => {},
});

export function NavMenuProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen(prev => !prev), []);

  return (
    <NavMenuContext.Provider value={{ isOpen, open, close, toggle }}>
      {children}
    </NavMenuContext.Provider>
  );
}

export function useNavMenu() {
  return useContext(NavMenuContext);
}
