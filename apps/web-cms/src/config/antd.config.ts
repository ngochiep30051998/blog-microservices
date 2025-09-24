// Ant Design configuration to suppress compatibility warnings
import { message } from 'antd';

// Configure Ant Design globally
message.config({
  duration: 3,
  maxCount: 3,
  rtl: false,
});

// Suppress React version compatibility warning for Ant Design v5
if (typeof window !== 'undefined') {
  // Disable the compatibility warning in development
  const originalWarn = console.warn;
  console.warn = function(...args) {
    if (
      args[0] && 
      typeof args[0] === 'string' && 
      args[0].includes('[antd: compatible]')
    ) {
      return;
    }
    originalWarn.apply(console, args);
  };
}

export {};