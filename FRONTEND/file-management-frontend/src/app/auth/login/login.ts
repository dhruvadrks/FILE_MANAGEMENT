
import { Component, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface LoginResponse {
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  access_token: string;
}

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {

  email = '';
  password = '';
  message = '';

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  login() {
    this.http.post<LoginResponse>(
      'http://127.0.0.1:8000/auth/login',
      {
        email: this.email,
        password: this.password
      }
    ).subscribe({
      next: response => {
        localStorage.setItem('access_token', response.access_token);
      },

      error: error => {
        this.message = error.error.detail;
        this.cdr.detectChanges();
      }
    });
  }
}

