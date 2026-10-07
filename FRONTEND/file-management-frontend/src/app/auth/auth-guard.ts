import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './auth';
import { catchError, map, of } from 'rxjs';

export const authGuard: CanActivateFn = (route, state) => {

    const router = inject(Router);
    const authService = inject(AuthService);

    if (authService.isLoggedIn()) {
        return true;
    }

    return authService.refreshAccessToken().pipe(

        map(() => true),

        catchError(() => {
            authService.clearAccessToken();

            return of(
                router.createUrlTree(
                    ['/login'],
                    {
                        queryParams: {
                            returnUrl: state.url
                        }
                    }
                )
            );
        })
    );
};