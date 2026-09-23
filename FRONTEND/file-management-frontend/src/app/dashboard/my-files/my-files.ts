import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface File {
  file_id: number;
  file_name: string;
  file_size: number;
  updated_at: string;
  is_favorite: boolean;
  is_indexed: boolean;
}

interface FavoriteResponse {
  file_id: number;
  file_name: string;
  is_favorite: boolean;
}

@Component({
  selector: 'app-my-files',
  imports: [DatePipe, FormsModule],
  templateUrl: './my-files.html',
  styleUrl: './my-files.css'
})
export class MyFiles implements OnInit {

  files: File[] = []

  searchText = ''
  searchType = 'filename'

  showSharePopup = false
  selectedFile: File | null = null
  shareEmails = ''
  expiresIn: number | null = null
  expiresUnit = ''

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.getFiles()
  }

  getFiles() {

    const token = localStorage.getItem('access_token')

    this.http.get<File[]>(
      'http://127.0.0.1:8000/files',
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    ).subscribe({
      next: response => {
        this.files = response
        this.cdr.detectChanges()
      },
      error: error => {
        console.log(error)
      }
    })
  }

  searchTextChanged() {

    if (this.searchText.trim() === '') {
      this.getFiles()
    }

  }

  searchFiles() {

    const token = localStorage.getItem('access_token')

    if (this.searchText.trim() === '') {
      this.getFiles()
      return
    }

    if (this.searchType === 'filename') {

      this.http.get<File>(
        'http://127.0.0.1:8000/search/name',
        {
          params: {
            file_name: this.searchText
          },
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      ).subscribe({
        next: response => {
          this.files = [response]
          this.cdr.detectChanges()
        },
        error: error => {

          if (error.status === 404) {
            alert(`"${this.searchText}" No such file found`)
            this.getFiles()
            return
          }

          console.log(error)
        }
      })

    }

    if (this.searchType === 'content') {

      this.http.get<File[]>(
        'http://127.0.0.1:8000/search/query',
        {
          params: {
            query: this.searchText
          },
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      ).subscribe({
        next: response => {
          this.files = response
          this.cdr.detectChanges()
        },
        error: error => {
          console.log(error)
        }
      })

    }

  }

  formatFileSize(size: number): string {

    if (size < 1024) {
      return size + ' B'
    }

    if (size < 1024 * 1024) {
      return (size / 1024).toFixed(2) + ' KB'
    }

    if (size < 1024 * 1024 * 1024) {
      return (size / (1024 * 1024)).toFixed(2) + ' MB'
    }

    return (size / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
  }

  toggleFavorite(file: File) {

    const token = localStorage.getItem('access_token')

    this.http.patch<FavoriteResponse>(
      `http://127.0.0.1:8000/files/${file.file_id}/favorite`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    ).subscribe({
      next: response => {
        file.is_favorite = response.is_favorite
        this.cdr.detectChanges()
      },
      error: error => {
        console.log(error)
      }
    })
  }

  ViewFile(file: File) {

    const token = localStorage.getItem('access_token')

    this.http.get(
      `http://127.0.0.1:8000/files/${file.file_id}/view`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        },
        responseType: 'blob'
      }
    ).subscribe({
      next: response => {

        const fileurl = URL.createObjectURL(response)

        window.open(fileurl)

      },
      error: error => {
        console.log(error)
      }
    })
  }

  handleAction(event: Event, file: File) {

    const select = event.target as HTMLSelectElement
    const action = select.value

    if (action === 'download') {
      this.download(file)
    }

    if (action === 'rename') {
      this.renameFile(file)
    }

    if (action === 'delete') {
      this.deleteFile(file)
    }

    if (action === 'share') {
      this.openSharePopup(file)
    }

    select.value = ''
  }

  download(file: File) {

    const token = localStorage.getItem('access_token')

    this.http.get(
      `http://127.0.0.1:8000/files/${file.file_id}/view`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        },
        responseType: 'blob'
      }
    ).subscribe({
      next: response => {

        const fileurl = URL.createObjectURL(response)

        const link = document.createElement('a')

        link.href = fileurl
        link.download = file.file_name

        document.body.appendChild(link)

        link.click()

        document.body.removeChild(link)

        URL.revokeObjectURL(fileurl)

      },
      error: error => {
        console.log(error)
      }
    })
  }

  renameFile(file: File) {

    const newFileName = prompt(
      'Enter new file name',
      file.file_name
    )

    if (!newFileName) {
      return
    }

    const token = localStorage.getItem('access_token')

    this.http.patch(
      `http://127.0.0.1:8000/files/${file.file_id}/rename`,
      {
        new_file_name: newFileName
      },
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    ).subscribe({
      next: () => {
        file.file_name = newFileName
        this.cdr.detectChanges()
      },
      error: error => {
        console.log(error)
      }
    })
  }

  deleteFile(file: File) {

    const confirmdelete = confirm(
      `Are you sure you want to delete "${file.file_name}"`
    )

    if (!confirmdelete) {
      return
    }

    const token = localStorage.getItem('access_token')

    this.http.delete(
      `http://127.0.0.1:8000/files/${file.file_id}/delete`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    ).subscribe({
      next: () => {

        this.files = this.files.filter(
          currentFile => currentFile.file_id !== file.file_id
        )

        this.cdr.detectChanges()

      },
      error: error => {
        console.log(error)
      }
    })
  }

  openSharePopup(file: File) {

    this.selectedFile = file
    this.showSharePopup = true

  }

  closeSharePopup() {

    this.showSharePopup = false
    this.selectedFile = null
    this.cdr.detectChanges()

  }

  createShareLink() {

    if (!this.selectedFile) {
      return
    }

    const token = localStorage.getItem('access_token')

    const emails = this.shareEmails
      .split(',')
      .map(email => email.trim())
      .filter(email => email !== '')

    const request: {
      emails: string[]
      expires_in?: number
      expires_unit?: string
    } = {
      emails: emails
    }

    if (this.expiresIn !== null) {
      request.expires_in = this.expiresIn
      request.expires_unit = this.expiresUnit
    }

    this.http.post<{ share_link: string }>(
      `http://127.0.0.1:8000/share/${this.selectedFile.file_id}`,
      request,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    ).subscribe({
      next: response => {

        navigator.clipboard.writeText(response.share_link)

        this.closeSharePopup()

      },
      error: error => {
        console.log(error)
      }
    })
  }

}