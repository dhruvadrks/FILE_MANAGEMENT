import { Component, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router,ActivatedRoute } from '@angular/router';
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
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService
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

        if(returnUrl){
          this.router.navigateByUrl(returnUrl)
          return
        }
        setTimeout(() => {
          this.router.navigate(['/dashboard/files'])
        },2000)
        
        this.email = ''
        this.password = ''
      },

      error: error => {

        if(error.error.detail === "User not found Register before Login"){
          this.password = ''
        }
        
        if(error.error.detail === "Incorrect Password"){
          this.password = ''
        }

        if(error.status === 422){
          this.message = "Please enter valid Email Address"
          this.cdr.detectChanges()
          return
        }

        this.message = error.error.detail

        this.cdr.detectChanges();
      }
    });
  }
}

