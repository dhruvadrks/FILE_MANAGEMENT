import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

interface PasswordResetResponse {
  message: string;
}

@Component({
  selector: 'app-reset-password',
  imports: [FormsModule, RouterLink],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css',
})

export class ResetPassword {

  new_password = '';
  confirm_password = '';

  token = '';
  message = ''
  messageType: 'success' | 'error' = 'error'
  loading = false

  showPassword = false
  showConfirmPassword = false

  showSuccessPopup = false


  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {

      this.token = params['token'];

      if (!this.token) {
        this.router.navigate(['/error'], {
          queryParams: {
            title: 'Invalid Reset Link',
            message: 'The reset link is invalid.'
          }
        });

        return;
      }
      this.validateToken();
    });
  }

  validateToken() {
    this.http.get<PasswordResetResponse>(
      'http://127.0.0.1:8000/auth/reset-password/validate',
      {
        params: {
          token: this.token
        }
      }
    ).subscribe({
      next: response => {
      },
      error: error => {
        this.router.navigate(['/error'], {
          queryParams: {
            title: 'Invalid Reset Link',
            message: error.error?.detail || 'The Reset link is invalid or expired'
          }
        })
      }
    })
  }

  private showError(text: string) {
    this.message = text
    this.messageType = 'error'
    this.loading = false
    this.cdr.detectChanges()
  }

  reset_password() {

    if (this.loading) {
      return
    }

    if (this.new_password.length < 8) {
      this.showError("Password must be at least 8 characters long")
      return
    }
    if (this.confirm_password.length < 8) {
      this.showError('Confirm password must be at least 8 characters long')
      return
    }
    if (this.new_password !== this.confirm_password) {
      this.showError("Passwords do not match")
      return
    }

    this.message = ''
    this.loading = true
    this.cdr.detectChanges()

    this.http.post<PasswordResetResponse>(
      'http://127.0.0.1:8000/auth/reset-password',
      {
        token: this.token,
        new_password: this.new_password,
        confirm_password: this.confirm_password
      }
    ).subscribe({
      next: response => {
        this.message = response.message
        this.messageType = 'success'
        this.loading = false
        this.showSuccessPopup = true
        this.cdr.detectChanges()

        setTimeout(() => {
          this.router.navigate(['/login'])
        }, 2500)
      },
      error: error => {
        this.showError(error.error?.detail || 'Password reset failed. Please try again.')
      }
    })
  }
}