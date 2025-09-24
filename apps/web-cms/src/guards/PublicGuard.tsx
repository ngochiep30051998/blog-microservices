import React from 'react';

export default function PublicGuard({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}