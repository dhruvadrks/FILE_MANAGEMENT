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

    private originalFirstName = ''
    private originalLastName = ''
    private originalEmail = ''

    isEditing = false
    saving = false

    showMessage = false
    message = ''
    messageType: 'success' | 'error' = 'success'

    private emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

                this.originalFirstName = this.firstName
                this.originalLastName = this.lastName
                this.originalEmail = this.email

                this.cdr.detectChanges()

            },

            error: error => {

                this.showMessagePopup(
                    'Failed to load profile. Please try again.',
                    'error'
                )

            }

        })
    }

    enableEditing() {

        this.isEditing = true
    }

    cancelEditing() {

        this.firstName = this.originalFirstName
        this.lastName = this.originalLastName
        this.email = this.originalEmail

        this.isEditing = false

        this.cdr.detectChanges()
    }

    updateProfile() {

        if (this.saving) {
            return
        }

        if (!this.emailPattern.test(this.email)) {

            this.showMessagePopup(
                'Please enter a valid email address',
                'error'
            )

            return
        }

        this.saving = true
        this.cdr.detectChanges()

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

                this.isEditing = false
                this.saving = false

                this.originalFirstName = this.firstName
                this.originalLastName = this.lastName
                this.originalEmail = this.email

                localStorage.setItem(
                    'first_name',
                    this.firstName
                )

                localStorage.setItem(
                    'email',
                    this.email.toLowerCase()
                )

                this.showMessagePopup(
                    'Profile updated successfully',
                    'success'
                )

                this.cdr.detectChanges()

            },

            error: error => {

                this.saving = false

                if (error.status === 409) {

                    this.showMessagePopup(
                        'Email already registered',
                        'error'
                    )

                } else {

                    this.showMessagePopup(
                        'Failed to update profile. Please try again.',
                        'error'
                    )

                }

                this.cdr.detectChanges()

            }

        })
    }

    showMessagePopup(text: string, type: 'success' | 'error' = 'success') {

        this.message = text
        this.messageType = type

        this.showMessage = true

        this.cdr.detectChanges()

        setTimeout(() => {

            this.showMessage = false

            this.cdr.detectChanges()

        }, 3000)
    }
}