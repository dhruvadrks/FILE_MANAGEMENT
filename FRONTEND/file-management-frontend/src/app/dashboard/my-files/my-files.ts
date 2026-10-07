import { Component, ChangeDetectorRef, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

interface File {
  file_id: number;
  file_name: string;
  file_size: number;
  updated_at: string;
  is_favorite: boolean;
  is_indexed: boolean;
}

interface ShareLink {
  share_id: number;
  file_id: number;
  file_name: string;
  owner_email: string;
  emails: string[];
  created_at: string;
  share_token: string;
  expires_at: string;
  status: boolean;
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

  files: File[] = [];

  searchText = '';
  searchType = 'filename';

  showSharePopup = false;
  selectedFile: File | null = null;

  shareEmails: string[] = [];
  newPermissionEmail = '';

  selectedShareId: number | null = null;
  selectedShareToken = '';
  selectedShareExpiry = '';
  selectedShareOwnerEmail = '';
  ownerEmailError = false;

  shareExpiryDate = '';
  useDefaultExpiry = true;
  minExpiryDate = '';

  showDeletePopup = false;
  selectedDeleteFile: File | null = null;

  showRenamePopup = false;
  selectedRenameFile: File | null = null;
  newFileName = '';

  showMessage = false;
  message = '';

  showOnlyFavorites = false;

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {

    this.setMinExpiryDate();

    if (this.route.snapshot.routeConfig?.path === 'files/favorites') {
      this.showOnlyFavorites = true;
    }

    this.getFiles();
  }

  setMinExpiryDate() {

    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    this.minExpiryDate =
      `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  getFiles() {

    this.http.get<File[]>(
      'http://localhost:8000/files'
    ).subscribe({

      next: response => {

        this.files = response;

        this.cdr.detectChanges();
      },

      error: error => {

        console.log(error);

      }

    });
  }

  searchTextChanged() {

    if (this.searchText.trim() === '') {

      this.getFiles();

    }

  }

  searchFiles() {

    if (this.searchText.trim() === '') {

      this.getFiles();

      return;
    }

    if (this.searchType === 'filename') {

      this.http.get<File>(
        'http://localhost:8000/search/name',
        {
          params: {
            file_name: this.searchText
          }
        }
      ).subscribe({

        next: response => {

          this.files = [response];

          this.cdr.detectChanges();

        },

        error: error => {

          if (error.status === 404) {

            this.showMessagePopup(
              `No matching files found for "${this.searchText}"`
            );

            this.cdr.detectChanges();

            this.getFiles();

            return;
          }

        }

      });

    }

    if (this.searchType === 'content') {

      this.http.get<File[]>(
        'http://localhost:8000/search/query',
        {
          params: {
            query: this.searchText
          }
        }
      ).subscribe({

        next: response => {

          this.files = response;

          this.cdr.detectChanges();

        },

        error: error => {

          this.showMessagePopup(
            `No matching files found for "${this.searchText}"`
          );

          this.cdr.detectChanges();

        }

      });

    }

  }

  formatFileSize(size: number): string {

    if (size < 1024) {

      return size + ' B';

    }

    if (size < 1024 * 1024) {

      return (size / 1024).toFixed(2) + ' KB';

    }

    if (size < 1024 * 1024 * 1024) {

      return (size / (1024 * 1024)).toFixed(2) + ' MB';

    }

    return (size / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  }

  toggleFavorite(file: File) {

    this.http.patch<FavoriteResponse>(
      `http://localhost:8000/files/${file.file_id}/favorite`,
      {}
    ).subscribe({

      next: response => {

        file.is_favorite = response.is_favorite;

        if (response.is_favorite === true) {

          this.showMessagePopup(
            `${file.file_name} Marked as Favorite`
          );

          this.cdr.detectChanges();

          return;
        }

        if (response.is_favorite === false) {

          this.showMessagePopup(
            `${file.file_name} Unmarked as Favorite`
          );

          this.cdr.detectChanges();

          return;
        }

      },

      error: error => {

        this.showMessagePopup(
          `Failed to mark ${file.file_name} as Favorite`
        );

      }

    });
  }

  ViewFile(file: File) {

    this.http.get(
      `http://localhost:8000/files/${file.file_id}/view`,
      {
        responseType: 'blob'
      }
    ).subscribe({

      next: response => {

        const fileurl = URL.createObjectURL(response);

        window.open(fileurl);

      },

      error: error => {

        console.log(error);

      }

    });
  }

  handleAction(event: Event, file: File) {

    const select = event.target as HTMLSelectElement;

    const action = select.value;

    if (action === 'download') {

      this.download(file);

    }

    if (action === 'rename') {

      this.openRenamePopup(file);

    }

    if (action === 'delete') {

      this.openDeletePopup(file);

    }

    if (action === 'share') {

      this.openSharePopup(file);

    }

    select.value = '';
  }

  download(file: File) {

    this.http.get(
      `http://localhost:8000/files/${file.file_id}/view`,
      {
        responseType: 'blob'
      }
    ).subscribe({

      next: response => {

        const fileurl = URL.createObjectURL(response);

        const link = document.createElement('a');

        link.href = fileurl;

        link.download = file.file_name;

        document.body.appendChild(link);

        link.click();

        document.body.removeChild(link);

        URL.revokeObjectURL(fileurl);

        this.showMessagePopup(
          `${file.file_name} downloaded successfully`
        );

      },

      error: error => {

        this.showMessagePopup(
          `Failed to download ${file.file_name} Please try again`
        );

      }

    });
  }

  openRenamePopup(file: File) {

    this.selectedRenameFile = file;

    this.newFileName = file.file_name;

    this.showRenamePopup = true;
  }

  closeRenamePopup() {

    this.showRenamePopup = false;

    this.selectedRenameFile = null;

    this.newFileName = '';
  }

  renameFile() {

    if (!this.selectedRenameFile) {

      return;
    }

    const request = {
      new_file_name: this.newFileName
    };

    this.http.patch(
      `http://localhost:8000/files/${this.selectedRenameFile.file_id}/rename`,
      request
    ).subscribe({

      next: response => {

        this.files = this.files.map(file => {

          if (
            file.file_id === this.selectedRenameFile?.file_id
          ) {

            file.file_name = this.newFileName;
          }

          return file;
        });

        this.closeRenamePopup();

        this.showMessagePopup(
          'File renamed successfully'
        );

      },

      error: error => {

        this.closeRenamePopup();

        this.showMessagePopup(
          error.error?.detail || 'Failed to rename file'
        );

      }

    });
  }

  openDeletePopup(file: File) {

    this.selectedDeleteFile = file;

    this.showDeletePopup = true;
  }

  closeDeletePopup() {

    this.showDeletePopup = false;

    this.selectedDeleteFile = null;
  }

  deleteFile() {

    if (!this.selectedDeleteFile) {

      return;
    }

    const fileId = this.selectedDeleteFile.file_id;

    const filename = this.selectedDeleteFile.file_name;

    this.http.delete(
      `http://localhost:8000/files/${fileId}/delete`
    ).subscribe({

      next: response => {

        this.files = this.files.filter(
          file => file.file_id !== fileId
        );

        this.closeDeletePopup();

        this.showMessagePopup(
          `Successfully Deleted ${filename}`
        );

      },

      error: error => {

        this.closeDeletePopup();

        this.showMessagePopup(
          `Failed to delete ${filename}`
        );

      }

    });
  }

  openSharePopup(file: File) {

    this.selectedShareOwnerEmail = '';

    this.selectedFile = file;

    this.shareEmails = [];

    this.newPermissionEmail = '';

    this.shareExpiryDate = '';

    this.selectedShareId = null;

    this.selectedShareToken = '';

    this.selectedShareExpiry = '';

    this.selectedShareOwnerEmail =
      localStorage.getItem('email')?.toLowerCase() || '';

    this.http.get<ShareLink[]>(
      'http://localhost:8000/share'
    ).subscribe({

      next: response => {

        let existingShare: ShareLink | null = null;

        for (let i = 0; i < response.length; i++) {

          if (response[i].file_id === file.file_id) {

            existingShare = response[i];

            break;
          }
        }

        if (existingShare) {

          this.selectedShareId =
            existingShare.share_id;

          this.selectedShareToken =
            existingShare.share_token;

          this.selectedShareExpiry =
            existingShare.expires_at;

          this.shareEmails = [
            ...existingShare.emails
          ];
        }

        this.showSharePopup = true;

        this.cdr.detectChanges();
      },

      error: error => {

        console.log(error);

      }

    });
  }

  closeSharePopup() {

    this.showSharePopup = false;

    this.selectedFile = null;

    this.shareEmails = [];

    this.newPermissionEmail = '';

    this.shareExpiryDate = '';

    this.selectedShareId = null;

    this.selectedShareToken = '';

    this.selectedShareExpiry = '';

    this.useDefaultExpiry = false;

    this.selectedShareOwnerEmail = '';

    this.cdr.detectChanges();
  }

  addSharePermission() {

      const email =
          this.newPermissionEmail
              .trim()
              .toLowerCase();

      if (email === '') {

          return;

      }

      const emailPattern =
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailPattern.test(email)) {

          this.showMessagePopup(
              'Please enter a valid email address'
          );

          this.newPermissionEmail = '';

          return;

      }

      if (this.shareEmails.includes(email)) {

          return;

      }

      if (
          email ===
          localStorage.getItem('email')?.toLowerCase()
      ) {

          this.ownerEmailError = true;

          this.newPermissionEmail = '';

          setTimeout(() => {

              this.ownerEmailError = false;

              this.cdr.detectChanges();

          }, 5000);

          return;

      }

      this.shareEmails.push(email);

      this.newPermissionEmail = '';

      this.cdr.detectChanges();

  }

  removeSharePermission(email: string) {

    for (let i = 0; i < this.shareEmails.length; i++) {

      if (this.shareEmails[i] === email) {

        this.shareEmails.splice(i, 1);

        break;
      }

    }

    this.cdr.detectChanges();
  }

  copyShareLink() {

    if (!this.selectedShareToken) {

      return;
    }

    const shareLink =
      `http://localhost:4200/share/${this.selectedShareToken}`;

    navigator.clipboard
      .writeText(shareLink)
      .then(() => {

        this.showMessagePopup(
          'Share link copied to clipboard'
        );

      })
      .catch(error => {

        console.log(error);

      });
  }

  saveShare() {

    if (this.selectedShareId) {

      this.updateExistingShare();

      return;
    }

    this.createShareLink();
  }

  updateExistingShare() {

    if (!this.selectedShareId) {

      return;
    }

    const request: {
      emails: string[];
      expires_at?: string;
    } = {

      emails: this.shareEmails

    };

    if (this.shareExpiryDate !== '') {

      request.expires_at =
        new Date(this.shareExpiryDate).toISOString();
    }

    const shareId = this.selectedShareId;

    const filename = this.selectedFile?.file_name;

    this.http.patch(
      `http://localhost:8000/share/${shareId}/change`,
      request
    ).subscribe({

      next: response => {

        this.closeSharePopup();

        this.showMessagePopup(
          `Share settings updated successfully for ${filename}`
        );

      },

      error: error => {

        this.closeSharePopup();

        this.showMessagePopup(
          error.error?.detail ||
          `Failed to update share settings for ${filename}`
        );

      }

    });
  }

  createShareLink() {

    if (!this.selectedFile) {

      return;
    }

    const request: {
      emails: string[];
      expires_at?: string;
    } = {

      emails: this.shareEmails

    };

    if (this.shareExpiryDate !== '') {

      request.expires_at = new Date(
        this.shareExpiryDate
      ).toISOString();
    }

    const fileId = this.selectedFile.file_id;

    const filename = this.selectedFile.file_name;

    this.http.post<{ share_link: string }>(
      `http://localhost:8000/share/${fileId}`,
      request
    ).subscribe({

      next: response => {

        navigator.clipboard
          .writeText(response.share_link)
          .catch(error => console.log(error));

        this.closeSharePopup();

        this.showMessagePopup(
          `Share link created successfully for ${filename}`
        );

      },

      error: error => {

        this.closeSharePopup();

        if (error.status === 409) {

          this.showMessagePopup(
            `Share link already exists for ${filename}`
          );

        } else {

          this.showMessagePopup(
            `Failed to create share link for ${filename}`
          );

        }

      }

    });
  }

  showMessagePopup(text: string) {

    this.message = text;

    this.showMessage = true;

    this.cdr.detectChanges();

    setTimeout(() => {

      this.showMessage = false;

      this.cdr.detectChanges();

    }, 3000);
  }

}