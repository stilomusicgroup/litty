import React from 'react';

/**
 * GlobalBackground — pure black background for all pages.
 */
const GlobalBackground: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  if (!isDark) return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0, backgroundColor: '#000000' }}
    />
  );
};

export default GlobalBackground;
