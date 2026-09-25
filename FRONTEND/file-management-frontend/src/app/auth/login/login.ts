
import { Component, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

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
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {}

  login() {

    if(this.email === ''){
      this.message = "Please enter a valid email address"
      this.cdr.detectChanges()
      return
    }

    if(this.password === ''){
      this.message = "Password is required"
      this.cdr.detectChanges()
      return
    }

    this.http.post<LoginResponse>(
      'http://127.0.0.1:8000/auth/login',
      {
        email: this.email,
        password: this.password
      }
    ).subscribe({
      next: response => {
        localStorage.setItem('access_token', response.access_token)
        this.router.navigate(['/dashboard/files'])
      },

      error: error => {

        if(error.error.detail === "User not found Register before Login"){
          this.password = ''
        }
        
        if(error.error.detail === "Incorrect Password"){
          this.password = ''
        }

        if(error.status === 422){
          this.message = "Please enter valid login details"
          this.cdr.detectChanges()
          return
        }

        this.message = error.error.detail

        this.cdr.detectChanges();
      }
    });
  }
}

