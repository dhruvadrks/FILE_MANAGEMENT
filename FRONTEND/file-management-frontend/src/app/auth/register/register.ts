import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from "@angular/forms";
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';

interface RegisterResponse {
    user_id: number;
    first_name: string;
    last_name: string;
    email: string;
    message: string
}

@Component({
  selector: 'app-register',
  imports: [FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  first_name = ''
  last_name = ''
  email = ''
  password = ''
  confirm_password = ''

  message = ''
  messageType: 'success' | 'error' = 'error'

  showPassword = false
  showConfirmPassword = false
  loading = false

  showSuccessPopup = false

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  formatName(field: 'first_name' | 'last_name') {

      if (field === 'first_name') {

          this.first_name =
              this.first_name
                  .split(' ')
                  .map(word =>
                      word.charAt(0).toUpperCase() +
                      word.slice(1).toLowerCase()
                  )
                  .join(' ')

      }

      if (field === 'last_name') {

          this.last_name =
              this.last_name
                  .split(' ')
                  .map(word =>
                      word.charAt(0).toUpperCase() +
                      word.slice(1).toLowerCase()
                  )
                  .join(' ')

      }
  }

  private showError(text: string) {
    this.message = text
    this.messageType = 'error'
    this.loading = false
    this.cdr.detectChanges()
  }

  private emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  register() {

    if (this.loading) {
      return
    }

    if (this.first_name.trim() === '') {
      this.showError('First name is required')
      return
    }
    if (this.last_name.trim() === '') {
      this.showError('Last name is required')
      return
    }
    if (!this.emailPattern.test(this.email)){
      this.showError('Please enter a valid email address')
      return
    }
    if (this.password.length < 8) {
      this.showError("Password must be at least 8 characters long")
      return
    }
    if (this.confirm_password.length < 8) {
      this.showError('Confirm password must be at least 8 characters long')
      return
    }
    if (this.password !== this.confirm_password) {
      this.showError("Passwords dont match")
      return
    }

    this.message = ''
    this.loading = true
    this.cdr.detectChanges()

    this.http.post<RegisterResponse>(
      'http://127.0.0.1:8000/auth/register',
      {
        first_name: this.first_name,
        last_name: this.last_name,
        email: this.email.toLowerCase(),
        password: this.password,
        confirm_password: this.confirm_password
      }
    ).subscribe({
      next: response => {
        this.loading = false
        this.showSuccessPopup = true
        this.cdr.detectChanges()
      },
      error: error => {
        if (error.status === 422) {
          this.showError("Please enter a valid email address")
          return
        }
        if (error.status === 409) {
          this.showError("Email already registered")
          return
        }
        this.showError("Registration failed. Please try again.")
      }
    })
  }

  closeSuccessPopup() {

    this.showSuccessPopup = false

    setTimeout(() => {
      this.router.navigate(['/login'])
    }, 2000)
  }

  cancelSuccessPopup() {
    this.showSuccessPopup = false

    this.first_name = ''
    this.last_name = ''
    this.email = ''
    this.password = ''
    this.confirm_password = ''

    this.cdr.detectChanges()
  }

}