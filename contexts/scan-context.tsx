"use client"

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ScanContextType {
  multipleMode: boolean;
  setMultipleMode: (mode: boolean) => void;
}

const ScanContext = createContext<ScanContextType | undefined>(undefined);

export function ScanProvider({ children }: { children: ReactNode }) {
  const [multipleMode, setMultipleMode] = useState(false);

  return (
    <ScanContext.Provider value={{ multipleMode, setMultipleMode }}>
      {children}
    </ScanContext.Provider>
  );
}

export function useScanContext() {
  const context = useContext(ScanContext);
  if (context === undefined) {
    throw new Error('useScanContext must be used within a ScanProvider');
  }
  return context;
}