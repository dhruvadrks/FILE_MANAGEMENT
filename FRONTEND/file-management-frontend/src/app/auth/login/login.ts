import { Component, ChangeDetectorRef, ElementRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../auth';

interface LoginResponse {
  user_id: number;
  first_name: string;
  last_name: string;
  email: string;
  access_token: string;
}

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {

  @ViewChild('passwordInput') passwordInput!: ElementRef<HTMLInputElement>;

  email = '';
  password = '';
  message = '';
  messageType: 'success' | 'error' = 'error';
  loading = false;
  showPassword = false

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService
  ) {}

  private showError(text: string) {
    this.message = text;
    this.messageType = 'error';
    this.loading = false;
    this.cdr.detectChanges();
  }

  login() {

    if (this.loading) {
      return
    }

    if (this.email === '') {
      this.showError("Please enter a valid email address")
      return
    }

    if (this.password === '') {
      this.showError("Password is required")
      return
    }

    this.message = ''
    this.loading = true
    this.cdr.detectChanges()

    this.http.post<LoginResponse>(
      'http://localhost:8000/auth/login',
      {
        email: this.email,
        password: this.password
      },
      {
        withCredentials: true
      }
    ).subscribe({
      next: response => {
        this.authService.setAccessToken(response.access_token)
        localStorage.setItem('first_name', response.first_name)
        localStorage.setItem('email', response.email.toLowerCase())
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl')

        if (returnUrl) {
          this.router.navigateByUrl(returnUrl)
          return
        }

        this.message = 'Login successful. Opening your files...'
        this.messageType = 'success'
        this.email = ''
        this.password = ''
        this.cdr.detectChanges()

        setTimeout(() => {
          this.router.navigate(['/dashboard/files'])
        }, 600)
      },

      error: error => {
        const detail = error?.error?.detail

        if (error.status === 0) {
          this.showError("Could not reach the server. Please try again.")
          return
        }

        if (error.status === 422) {
          this.showError("Please enter valid Email Address")
          return
        }

        if (detail === "User not found Register before Login") {
          this.password = ''
        }

        if (detail === "Incorrect Password") {
          this.password = ''
          this.cdr.detectChanges()
          this.passwordInput?.nativeElement.focus()
        }

        this.showError(typeof detail === 'string' ? detail : "Login failed. Please try again.")
      }
    });
  }
}