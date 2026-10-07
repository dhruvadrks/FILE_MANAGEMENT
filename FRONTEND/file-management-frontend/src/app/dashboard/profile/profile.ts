import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
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

    ngOnInit() {
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

        this.http.get<any>(
            'http://localhost:8000/auth/profile'
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

        const request = {
            first_name: this.firstName,
            last_name: this.lastName,
            email: this.email.toLowerCase()
        }

        this.http.patch(
            'http://localhost:8000/auth/profile',
            request
        ).subscribe({

            next: response => {

                console.log(response)

                this.isEditing = false

                localStorage.setItem(
                    'first_name',
                    this.firstName
                )

                localStorage.setItem(
                    'email',
                    this.email.toLowerCase()
                )

                this.showMessagePopup(
                    'Profile updated successfully'
                )

                this.cdr.detectChanges()

            },

            error: error => {

                console.log(error)

                if (error.status === 409) {

                    this.showMessagePopup(
                        'Email already registered'
                    )

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
