import { RouteObject } from 'react-router';
import loadable from '../../components/Loadable';
import Login from './pages/login/Login';
import ForgotPassword from './pages/forgot-password/ForgotPassword';


export const Router: RouteObject = {
  path: '',
  children: [
    {
      path: 'login',
      element: <Login />
    },
    {
      path: 'forgotPassword',
      element: <ForgotPassword />
    }
  ]
}