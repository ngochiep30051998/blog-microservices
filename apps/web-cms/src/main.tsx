import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';
import { ConfigProvider } from 'antd';
import './config/antd.config';
import App from './app/app';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <StrictMode>
    <ConfigProvider
      theme={{
        token: {
          // Customize Ant Design theme if needed
          borderRadius: 8,
        },
      }}
      // Disable compatibility warnings
      componentSize="middle"
    >
      <App />
    </ConfigProvider>
  </StrictMode>
);
