import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from "@angular/forms";
import { HttpClient } from '@angular/common/http';

interface RegisterResponse {
    user_id: number;
    first_name: string;
    last_name: string;
    email: string;
    message:string
}

@Component({
  selector: 'app-register',
  imports: [FormsModule],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  first_name = ''
  last_name = ''
  email = ''
  password = ''
  confirm_password = ''
  message=''

  constructor(
    private http:HttpClient,
    private cdr:ChangeDetectorRef
  ){}

  register(){
    this.http.post<RegisterResponse>(
      'http://127.0.0.1:8000/auth/register',
      {
        first_name:this.first_name,
        last_name:this.last_name,
        email:this.email,
        password:this.password,
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
