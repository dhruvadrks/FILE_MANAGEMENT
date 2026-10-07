import { Routes } from '@angular/router';
import {Login} from './auth/login/login'
import { ForgotPassword } from './auth/forgot-password/forgot-password';
import { Register } from './auth/register/register';
import { ResetPassword } from './auth/reset-password/reset-password';
import { Dashboard } from './dashboard/dashboard';
import { MyFiles } from './dashboard/my-files/my-files';
import { ErrorPage } from './error-page/error-page';
import { Share } from './share/share';
import { ShareLinks } from './dashboard/share-links/share-links';
import { Profile } from './dashboard/profile/profile';
import { authGuard } from './auth/auth-guard';
import { share } from 'rxjs';

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
        canActivate : [authGuard],
        children: [
            {
                path: '',
                redirectTo: 'files',
                pathMatch: 'full'
            },
            {
                path: 'files',
                component: MyFiles
            },
            {
                path: 'files/favorites',
                component: MyFiles
            },
            {
                path: 'sharelinks',
                component: ShareLinks
            }
        ]
    },
    {
        path: 'error',
        component: ErrorPage
    },
    {
        path: 'share',
        component: Share
    },
    {
        path: 'share/:token',
        component: Share
    },
    {
        path: 'profile',
        component: Profile,
        canActivate: [authGuard]
    },
    {
        path: '**',
        component: ErrorPage
    }
];
