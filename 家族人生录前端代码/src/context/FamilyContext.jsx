// ===== FamilyContext：全局家族空间状态 =====
import React, { createContext, useContext, useState, useCallback } from 'react';

const FamilyContext = createContext(null);

export function FamilyProvider({ children, currentSpaceId }) {
  const [currentSpaceIdState, setCurrentSpaceIdState] = useState(currentSpaceId || null);

  const switchSpace = useCallback((spaceId) => {
    setCurrentSpaceIdState(spaceId);
  }, []);

  return (
    <FamilyContext.Provider value={{
      currentSpaceId: currentSpaceIdState,
      switchSpace,
    }}>
      {children}
    </FamilyContext.Provider>
  );
}

export function useFamily() {
  const ctx = useContext(FamilyContext);
  if (!ctx) throw new Error('useFamily must be used within FamilyProvider');
  return ctx;
}
