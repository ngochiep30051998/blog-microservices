import { Outlet, RouterProvider, createBrowserRouter } from 'react-router-dom';
import * as Home from '../modules/home';
import * as Auth from '../modules/auth';
import PrivateGuard from '../guards/PrivateGuard';
import MasterLayout from '../layouts/master-layout';
import PublicGuard from '../guards/PublicGuard';
import { AuthLayout } from '../layouts/auth-layout';
import { IMenuItem } from '../interfaces/common.interface';
import { RootBoundary } from '../components/RootBoundary';
import { Loading } from '../components/loading/Loading';



const modules = [
    Home
]

const router = createBrowserRouter([
    {
        path: '/',
        errorElement: <RootBoundary />,
        children: [
            {
                path: '/',
                element: <PrivateGuard children={<MasterLayout />} />,
                children: []
            },
            {
                element: <PublicGuard children={<AuthLayout />} />,
                children: [
                    Auth.Router
                ]
            },
            {
                element: <PrivateGuard children={<MasterLayout />} />,
                children: [
                    ...modules.map(x => x.Router),
                ]
            },
        ]
    }
], {
    basename: import.meta.env.PUBLIC_URL
})

const Router = () => (
    <RouterProvider
        router={router}
        fallbackElement={<Loading />}
    />
)
export const MenuItems: IMenuItem[] = [
    ...modules.map(x => x.MenuItems).reduce((prev, curr) => prev.concat(curr), [])
];

export default Router;