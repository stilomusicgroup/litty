import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export type TimeTab = '1H' | '1D' | '1W' | '1M' | '1Y' | 'ALL';

interface TimeTabContextValue {
  activeTab: TimeTab;
  setActiveTab: (tab: TimeTab) => void;
}

const TimeTabContext = createContext<TimeTabContextValue | null>(null);

export function TimeTabProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTab] = useState<TimeTab>('1D');
  const setActiveTabCb = useCallback((tab: TimeTab) => setActiveTab(tab), []);

  return (
    <TimeTabContext.Provider value={{ activeTab, setActiveTab: setActiveTabCb }}>
      {children}
    </TimeTabContext.Provider>
  );
}

export function useTimeTab(): TimeTabContextValue {
  const ctx = useContext(TimeTabContext);
  if (!ctx) throw new Error('useTimeTab must be used within a TimeTabProvider');
  return ctx;
}
