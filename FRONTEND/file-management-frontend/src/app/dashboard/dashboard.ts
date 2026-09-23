import { Component, ViewChild } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MyFiles } from './my-files/my-files';


@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard {

  @ViewChild(RouterOutlet) routerOutlet!: RouterOutlet;

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  UploadFile(event: Event) {

    const input = event.target as HTMLInputElement

    if (!input.files || input.files.length === 0) {
      return
    }

    const file = input.files[0]

    const formData = new FormData()

    formData.append('file', file)

    const token = localStorage.getItem('access_token')

    this.http.post(
      'http://127.0.0.1:8000/files/upload',
      formData,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    ).subscribe({

      next: response => {

        alert('File uploaded successfully')

        const myfiles = this.routerOutlet.component as MyFiles

        myfiles.getFiles()
      
      },

      error: error => {

        console.log(error)

      }

    })
  }
}