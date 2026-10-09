import { Component, ViewChild, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MyFiles } from './my-files/my-files';
import { AuthService } from '../auth/auth';

@Component({
  selector: 'app-dashboard',
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard {

  @ViewChild(RouterOutlet)
  routerOutlet!: RouterOutlet;

  constructor(
    private http: HttpClient,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private authservice: AuthService
  ) {}

  showMessage = false;
  message = '';
  messageType: 'success' | 'error' = 'success';

  firstName =
    localStorage.getItem('first_name') || '';

  UploadFile(event: Event) {

    const input =
      event.target as HTMLInputElement;

    if (
      !input.files ||
      input.files.length === 0
    ) {

      return;

    }

    const file = input.files[0];

    const formData = new FormData();

    formData.append('file', file);

    this.http.post(
      'http://localhost:8000/files/upload',
      formData
    ).subscribe({

      next: response => {

        input.value = '';

        this.showMessagePopup(
          `${file.name} uploaded successfully`
        );

        const outletComponent =
          this.routerOutlet.component;

        if (outletComponent instanceof MyFiles) {

          outletComponent.getFiles();

        }

      },

      error: error => {

        input.value = '';

        this.showMessagePopup(
          'File Upload Failed. Try again',
          'error'
        );

      }

    });
  }

  logout() {

    this.http.post(
      'http://localhost:8000/auth/logout',
      {},
      {
        withCredentials: true
      }
    ).subscribe({

      next: () => {

        this.authservice.clearAccessToken();

        localStorage.removeItem(
          'first_name'
        );

        localStorage.removeItem(
          'email'
        );

        this.router.navigate([
          '/login'
        ]);

      }

    });
  }

  showMessagePopup(
    text: string,
    type: 'success' | 'error' = 'success'
  ) {

    this.message = text;

    this.messageType = type;

    this.showMessage = true;

    this.cdr.detectChanges();

    setTimeout(() => {

      this.showMessage = false;

      this.cdr.detectChanges();

    }, 3000);
  }

}