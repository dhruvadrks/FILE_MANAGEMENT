import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute,Router } from '@angular/router';

interface PasswordResetResponse {
  message: string;
}

@Component({
  selector: 'app-reset-password',
  imports: [FormsModule],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.css',
})

export class ResetPassword {

  new_password = '';
  confirm_password = '';

  token = '';
  message=''

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

  validateToken(){
    this.http.get<PasswordResetResponse>(
      'http://127.0.0.1:8000/auth/reset-password/validate',
      {
        params: {
          token: this.token
        }
      }
    ).subscribe({
      next:response =>{
      },
      error:error => {
        this.router.navigate(['/error'],{
          queryParams: {
            title: 'Invalid Reset Link',
            message: error.error?.detail || 'The Reset link is invalid or expired'
          }
        })
      }
    })
  }

  reset_password() {

    if(this.new_password.length < 8){
      this.message = "Password must be at least 8 characters long"
      
      return
    }
    if(this.confirm_password.length < 8){
      this.message = 'Confirm password must be at least 8 characters long'
      return
    }
    if(this.new_password !== this.confirm_password){
      this.message = "Passwords dont match"
      return
    }

    this.http.post<PasswordResetResponse>(
      'http://127.0.0.1:8000/auth/reset-password',
      {
        token:this.token,
        new_password:this.new_password,
        confirm_password:this.confirm_password
      }
    ).subscribe({next:response=>{
      this.message = response.message
      this.showSuccessPopup = true
      this.cdr.detectChanges()

      setTimeout(() => {
        this.router.navigate(['/login'])
      },1500)
    },
    error:error =>{
      this.message = error.error.detail
      this.cdr.detectChanges()
    }
  })
  }
}