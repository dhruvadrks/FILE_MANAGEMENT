import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';

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

  email = '';
  new_password = '';
  confirm_password = '';

  token = '';
  message=''

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.token = params['token'];
    });
  }

  reset_password() {
    this.http.post<PasswordResetResponse>(
      'http://127.0.0.1:8000/auth/reset-password',
      {
        token:this.token,
        email:this.email,
        new_password:this.new_password,
        confirm_password:this.confirm_password
      }
    ).subscribe({next:response=>{
      this.message = response.message
      this.cdr.detectChanges()
    },
    error:error =>{
      this.message = error.error.detail
      this.cdr.detectChanges()
    }
  })
  }
}