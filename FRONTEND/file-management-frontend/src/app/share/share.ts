import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../auth/auth';


@Component({
  selector: 'app-share',
  imports: [],
  templateUrl: './share.html',
  styleUrl: './share.css'
})
export class Share implements OnInit {

  token = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private authservice: AuthService
  ) {}

  ngOnInit() {

    this.token = this.route.snapshot.paramMap.get('token') || '';

    if (!this.token) {
      this.router.navigate(['/error'], {
        queryParams: {
          title: 'Invalid Share Link',
          message: 'The share link is invalid.'
        }
      });

      return;
    }

    this.validateToken()

  }

  validateToken() {

    this.http.get(
      'http://localhost:8000/share/sharelink/validate',
      {
        params: {
          token: this.token
        }
      }
    ).subscribe({

      next: response => {
        this.openShareLink()
      },

      error: error => {

        let title = 'Invalid Share Link'
        let message = 'The share link is invalid.'

        if (error.status === 400) {

          title = 'Invalid Share Link'
          message = 'The share link is invalid.'

        }

        if (error.status === 410) {

          if (error.error?.detail === 'Sharelink has expired') {

            title = 'Share Link Expired'
            message = 'This share link has expired and can no longer be used.'

          }

          if (error.error?.detail === 'Sharelink is no longer active') {

            title = 'Share Link Revoked'
            message = 'This share link has been revoked and can no longer be used.'

          }

        }

        this.router.navigate(['/error'], {
          queryParams: {
            title: title,
            message: message
          }
        })

      }

    })
  }

  openShareLink() {

    const accessToken = this.authservice.getAccessToken()

    if (!accessToken) {
      this.router.navigate(['/error'], {
        queryParams: {
          title:'Login required',
          message: 'Please log in to access this shared file',
          returnUrl: `/share/${this.token}`
        }
      });

      return;
    }

    this.http.get(
      `http://localhost:8000/share/${this.token}`,
      {
        responseType: 'blob'
      }
    ).subscribe({

      next: response => {
        const fileUrl = URL.createObjectURL(response);
        window.open(fileUrl,'_self');
      },

      error: error => {

        let title = 'Unable to Open Share Link';
        let message = 'The share link could not be opened.';

        if (error.status === 403) {
          title = 'Access Denied';
          message = 'You do not have permission to access this file.';
        }

        if (error.status === 404) {
          title = 'Invalid Share Link';
          message = 'This share link is invalid or no longer available.';
        }

        if (error.status === 410) {

          if (error.error?.detail === 'Share link expired') {
            title = 'Share Link Expired';
            message = 'This share link has expired and can no longer be used.';
          }

          if (error.error?.detail === 'Share link is no longer active') {
            title = 'Share Link Revoked';
            message = 'This share link has been revoked and can no longer be used.';
          }
        }

        this.router.navigate(['/error'], {
          queryParams: {
            title: title,
            message: message
          }
        });

      }

    });
  }
}
