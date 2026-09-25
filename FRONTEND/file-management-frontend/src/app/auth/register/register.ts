import { ChangeDetectorRef, Component } from '@angular/core';
import { FormsModule } from "@angular/forms";
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

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
  
  showSuccessPopup = false

  constructor(
    private http:HttpClient,
    private cdr:ChangeDetectorRef,
    private router: Router
  ){}

  register(){

    if(this.first_name.trim() === ''){
      this.message = 'First name is required'
      this.cdr.detectChanges()
      return
    }
    if(this.last_name.trim() === ''){
      this.message = 'Last name is required'
      this.cdr.detectChanges()
      return
    }
    if(this.password.length < 8){
      this.message = "Password must be at least 8 characters long"
      
      return
    }
    if(this.confirm_password.length < 8){
      this.message = 'Confirm password must be at least 8 characters long'
      return
    }
    if(this.password !== this.confirm_password){
      this.message = "Passwords dont match"
      return
    }

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
      this.showSuccessPopup = true
      this.cdr.detectChanges()
    },
    error:error =>{
      if(error.status === 422){
        this.message = "Please enter a valid email address"
      }
      if(error.status === 409){
        this.message = "Email already registered"
      }
      this.cdr.detectChanges()
    }
  })
  }

  closeSuccessPopup() {

  this.showSuccessPopup = false

  this.router.navigate(['/login'])

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
