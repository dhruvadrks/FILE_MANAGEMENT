import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpClient } from '@angular/common/http';
import { catchError, switchMap, throwError, BehaviorSubject, filter, take } from 'rxjs';
import { Router } from '@angular/router';
import { AuthService } from './auth';

let isRefreshing = false;

const refreshTokenSubject = new BehaviorSubject<string | null>(null);

const skipRefresh = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/forgot-password', '/auth/reset-password'];

export const authInterceptor: HttpInterceptorFn = (req, next) => {

    const authService = inject(AuthService);
    const http = inject(HttpClient);
    const router = inject(Router)

    // Skip refresh token request to avoid infinite loop
    if (skipRefresh.some(url => req.url.includes(url))) {
        return next(req);
    }

    // Get current access token

    const token = authService.getAccessToken();

    let authReq = req;


    // Add access token if we have one

    if (token) {

        authReq = req.clone({
            setHeaders: {
                Authorization: `Bearer ${token}`
            }
        });
    }


    return next(authReq).pipe(

        catchError(error => {

            // Only handle 401 errors

            if (error.status !== 401) {
                return throwError(() => error);
            }


            // Another request is already refreshing

            if (isRefreshing) {

                return refreshTokenSubject.pipe(

                    filter(token => token !== null),

                    take(1),

                    switchMap(token => {

                        const retryRequest = req.clone({
                            setHeaders: {
                                Authorization:
                                    `Bearer ${token}`
                            }
                        });

                        return next(retryRequest);
                    })
                );
            }


            // This request becomes the refresh request

            isRefreshing = true;

            // Clear previous value so new requests wait
            // for the new access token

            refreshTokenSubject.next(null);


            return http.post<{ access_token: string }>(

                'http://localhost:8000/auth/refresh',

                {},

                {
                    withCredentials: true
                }

            ).pipe(

                switchMap(response => {

                    const newToken =
                        response.access_token;


                    // Store the new access token

                    authService.setAccessToken(
                        newToken
                    );


                    // Tell waiting requests
                    // that refresh succeeded

                    refreshTokenSubject.next(
                        newToken
                    );


                    // Refresh is finished

                    isRefreshing = false;


                    // Retry the original request

                    const retryRequest = req.clone({
                        setHeaders: {
                            Authorization:
                                `Bearer ${newToken}`
                        }
                    });


                    return next(retryRequest);
                }),


                catchError(refreshError => {

                    // Refresh failed

                    isRefreshing = false;

                    authService.clearAccessToken();

                    refreshTokenSubject.next(null);

                    router.navigate(['/login'],{
                        queryParams: {
                            returnUrl:router.url
                        }
                    })
                    return throwError(
                        () => refreshError
                    );
                })
            );
        })
    );
};