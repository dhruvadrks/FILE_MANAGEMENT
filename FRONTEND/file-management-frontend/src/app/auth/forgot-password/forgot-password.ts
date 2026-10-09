import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { RouterLink } from '@angular/router';

interface forgot_password_response {
  message: string
}

@Component({
  selector: 'app-forgot-password',
  imports: [FormsModule, RouterLink],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css',
})
export class ForgotPassword {
  email = ''
  message = ''
  messageType: 'success' | 'error' = 'error'
  loading = false

  private emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  private showError(text: string) {
    this.message = text
    this.messageType = 'error'
    this.loading = false
    this.cdr.detectChanges()
  }

  forgot_password() {

    if (this.loading) {
      return
    }

    if (!this.emailPattern.test(this.email)) {
      this.showError('Enter valid email address')
      return
    }

    this.message = ''
    this.loading = true
    this.cdr.detectChanges()

    this.http.post<forgot_password_response>(
      'http://127.0.0.1:8000/auth/forgot-password',
      {
        email: this.email
      }
    ).subscribe({
      next: response => {
        this.message = 'Password Reset Link Sent to Registered Email'
        this.messageType = 'success'
        this.loading = false
        this.email = ''
        this.cdr.detectChanges()
      },
      error: error => {
        if (error.status === 422) {
          this.showError('Enter valid email address')
          return
        }

        if (error.status === 404) {
          this.showError('User not registered')
          return
        }

        this.showError('Something went wrong. Please try again.')
      }
    })
  }
}