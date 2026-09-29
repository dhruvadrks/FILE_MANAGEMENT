import { Routes } from '@angular/router';
import {Login} from './auth/login/login'
import { ForgotPassword } from './auth/forgot-password/forgot-password';
import { Register } from './auth/register/register';
import { ResetPassword } from './auth/reset-password/reset-password';
import { Dashboard } from './dashboard/dashboard';
import { MyFiles } from './dashboard/my-files/my-files';
import { ErrorPage } from './error-page/error-page';
import { Share } from './share/share';

export const routes: Routes = [
    {
        path : '',
        redirectTo : 'login',
        pathMatch : 'full'
    },
    {
        path : 'login',
        component : Login
    },
    {
        path : 'forgot-password',
        component : ForgotPassword
    },
    {
        path : 'register',
        component : Register
    },
    {
        path : 'reset-password',
        component : ResetPassword
    },
    {
        path : 'dashboard',
        component : Dashboard,
        children: [
            {
                path: 'files',
                component: MyFiles
            },
            {
                path: 'files/favorites',
                component: MyFiles
            }
        ]
    },
    {
        path: 'error',
        component: ErrorPage
    },
    {
        path: 'share/:token',
        component: Share
    }
];
