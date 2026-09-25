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

  showDeletePopup = false
  selectedDeleteFile: File | null = null

  showRenamePopup = false
  selectedRenameFile: File | null = null
  newFileName = ''

  showMessage = false
  message = ''

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
            this.showMessagePopup(`No matching files found for "${this.searchText}"`)
            this.cdr.detectChanges()
            this.getFiles()
            return
          }
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
            this.showMessagePopup(`No matching files found for "${this.searchText}"`)
            this.cdr.detectChanges()
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
        if(response.is_favorite === true){
          this.showMessagePopup(`${file.file_name} Marked as Favorite`)
          this.cdr.detectChanges()
          return
        }

        if(response.is_favorite === false){
          this.showMessagePopup(`${file.file_name} Unmarked as Favorite`)
          this.cdr.detectChanges()
          return
        }

      },
      error: error => {
        this.showMessagePopup(`Failed to mark ${file.file_name} as Favorite`)
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
      this.openRenamePopup(file)
    }

    if (action === 'delete') {
      this.openDeletePopup(file)
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

        this.showMessagePopup(`${file.file_name} downloaded successfully`)

      },
      error: error => {
        this.showMessagePopup(`Failed to download ${file.file_name} Please try again`)
      }
    })
  }

  openRenamePopup(file: File) {

    this.selectedRenameFile = file
    this.newFileName = file.file_name
    this.showRenamePopup = true

  }

  closeRenamePopup() {

    this.showRenamePopup = false
    this.selectedRenameFile = null
    this.newFileName = ''

  }

  renameFile() {

    if (!this.selectedRenameFile) {
      return
    }

    const token = localStorage.getItem('access_token')

    const request = {
      new_file_name: this.newFileName
    }

    this.http.patch(
      `http://127.0.0.1:8000/files/${this.selectedRenameFile.file_id}/rename`,
      request,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    ).subscribe({

      next: response => {

        this.files = this.files.map(file => {

          if (file.file_id === this.selectedRenameFile?.file_id) {
            file.file_name = this.newFileName
          }

          return file

        })

        this.closeRenamePopup()

        this.showMessagePopup('File renamed successfully')

      },

      error: error => {

        this.closeRenamePopup()

        this.showMessagePopup(
          error.error?.detail || 'Failed to rename file'
        )

      }

    })
  }

  openDeletePopup(file: File) {

    this.selectedDeleteFile = file
    this.showDeletePopup = true

  }

  closeDeletePopup() {

    this.showDeletePopup = false
    this.selectedDeleteFile = null

  }

  deleteFile() {

    if (!this.selectedDeleteFile) {
      return
    }

    const token = localStorage.getItem('access_token')

    const fileId = this.selectedDeleteFile.file_id

    this.http.delete(
      `http://127.0.0.1:8000/files/${fileId}/delete`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    ).subscribe({

      next: response => {

        this.files = this.files.filter(
          file => file.file_id !== fileId
        )

        this.closeDeletePopup()

        this.showMessagePopup('File deleted successfully')

      },

      error: error => {

        this.closeDeletePopup()

        this.showMessagePopup('Failed to delete file')

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
    this.shareEmails = ''
    this.expiresIn = null
    this.expiresUnit = ''
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

    const fileId = this.selectedFile.file_id

    this.http.post<{ share_link: string }>(
      `http://127.0.0.1:8000/share/${fileId}`,
      request,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    ).subscribe({

      next: response => {

        navigator.clipboard
          .writeText(response.share_link)
          .catch(error => console.log(error))
        this.closeSharePopup()
        this.showMessagePopup('Share link created successfully')
      },

      error: error => {

        this.closeSharePopup()

        this.showMessagePopup('Failed to create share link')

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