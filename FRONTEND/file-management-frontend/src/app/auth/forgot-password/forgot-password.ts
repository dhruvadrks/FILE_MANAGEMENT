import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface forgot_password_response{
  message:string
}

@Component({
  selector: 'app-forgot-password',
  imports: [FormsModule],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css',
})
export class ForgotPassword {
  email=''
  message=''

  constructor(
    private http:HttpClient,
    private cdr:ChangeDetectorRef
  ){}

  forgot_password(){
    this.http.post<forgot_password_response>(
      'http://127.0.0.1:8000/auth/forgot-password',
      {
        email:this.email
      }
    ).subscribe({next:response=>{
      this.message = response.message
      this.email = ''
      this.cdr.detectChanges()
  },
  error:error => {
    if(error.status === 422){
      this.message = 'Enter valid email address'
      this.cdr.detectChanges()
      return
    }
    
    if(error.status === 404){
      this.message = 'User not registered'
      this.cdr.detectChanges()
    }
  }
  })
  }
}
