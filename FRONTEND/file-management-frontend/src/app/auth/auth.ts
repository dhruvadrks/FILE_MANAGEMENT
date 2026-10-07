import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private http = inject(HttpClient);

  private accessToken: string | null = null;

  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  clearAccessToken(): void {
    this.accessToken = null;
  }

  isLoggedIn(): boolean {
    return this.accessToken !== null;
  }

  refreshAccessToken(): Observable<{ access_token: string }> {

    return this.http.post<{ access_token: string }>(
      'http://localhost:8000/auth/refresh',
      {},
      {
        withCredentials: true
      }
    ).pipe(
      tap(response => {
        this.setAccessToken(response.access_token);
      })
    );
  }
}