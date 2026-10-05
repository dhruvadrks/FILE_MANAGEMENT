import { Component, OnInit, ChangeDetectorRef} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
    selector: 'app-profile',
    imports: [FormsModule],
    templateUrl: './profile.html',
    styleUrl: './profile.css',
})
export class Profile implements OnInit {

    firstName = ''
    lastName = ''
    email = ''

    isEditing = false

    showMessage = false
    message = ''

    constructor(
        private http: HttpClient,
        private cdr: ChangeDetectorRef
    ) {}

    ngOnInit(){
        this.getProfile()
    }

    formatName(field: 'firstName' | 'lastName') {

        if (field === 'firstName') {

            this.firstName =
                this.firstName
                    .split(' ')
                    .map(word =>
                        word.charAt(0).toUpperCase() +
                        word.slice(1).toLowerCase()
                    )
                    .join(' ')
        }

        if (field === 'lastName') {

            this.lastName =
                this.lastName
                    .split(' ')
                    .map(word =>
                        word.charAt(0).toUpperCase() +
                        word.slice(1).toLowerCase()
                    )
                    .join(' ')
        }
    }

    getProfile() {

        const token = localStorage.getItem('access_token')

        this.http.get<any>(
            'http://127.0.0.1:8000/auth/profile',
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        ).subscribe({
            next: response => {

                this.firstName = response.first_name
                this.lastName = response.last_name
                this.email = response.email.toLowerCase()

                this.cdr.detectChanges()

            },
            error: error => {
                console.log(error)
            }
        })
    }

    enableEditing() {
        this.isEditing = true
    }

    updateProfile() {

        const token = localStorage.getItem('access_token')

        const request = {
            first_name: this.firstName,
            last_name: this.lastName,
            email: this.email.toLowerCase()
        }

        this.http.patch(
            'http://127.0.0.1:8000/auth/profile',
            request,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        ).subscribe({
            next: response => {

                console.log(response)

                this.isEditing = false
                localStorage.setItem('first_name', this.firstName)
                localStorage.setItem('email', this.email)
                this.showMessagePopup('Profile updated successfully')
                this.cdr.detectChanges()

            },
            error: error => {
                console.log(error)
                if (error.status === 409) {
                    this.showMessagePopup('Email already registered')
                }
                this.cdr.detectChanges()
            }
        })
    }

  showMessagePopup(text: string) {

    this.message = text

    this.showMessage = true

    this.cdr.detectChanges()

    setTimeout(() => {

      this.showMessage = false

      this.cdr.detectChanges()

    }, 3000)
  }
}