import { Component, ChangeDetectorRef, OnInit, HostListener } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DatePipe,CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { FilesStore, File } from '../files-store';

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
  imports: [DatePipe, FormsModule,CommonModule],
  templateUrl: './my-files.html',
  styleUrl: './my-files.css'
})
export class MyFiles implements OnInit {

  get files(): File[] {
    return this.store.files;
  }
  set files(value: File[]) {
    this.store.files = value;
  }

  searchText = '';
  searchType = 'filename';
  showingContentResults = false;

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
  messageType: 'success' | 'error' = 'success';

  showOnlyFavorites = false;

  openMenuId: number | null = null;
  menuTop = 0;
  menuLeft = 0;

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private store: FilesStore
  ) {}

  ngOnInit() {

    this.setMinExpiryDate();

    if (this.route.snapshot.routeConfig?.path === 'favorites') {
      this.showOnlyFavorites = true;
    }

    if (this.store.loaded) {
      this.cdr.detectChanges();
      return;
    }

    this.getFiles();
  }

  get visibleFiles(): File[] {

    let result = this.files;

    if (this.showOnlyFavorites) {

      result = result.filter(file => file.is_favorite);

    }

    if (this.searchType === 'filename' && this.searchText.trim() !== '') {

      const terms = this.searchText.trim().toLowerCase().split(/\s+/);

      result = result.filter(file => {

        const name = file.file_name.toLowerCase();

        return terms.every(term => name.includes(term));

      });

    }

    return result;

  }

  onSearchTypeChange(type: string) {

    this.searchType = type;

    if (type === 'filename' && this.showingContentResults) {

      this.showingContentResults = false;

      this.getFiles();

    }

  }

  setMinExpiryDate() {

    // Earliest selectable expiry is today (date only, YYYY-MM-DD)
    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');

    this.minExpiryDate = `${year}-${month}-${day}`;
  }

  buildExpiry(dateValue: string): string {

    // Chosen date + current time plus 1 second, sent as an ISO timestamp
    const [year, month, day] = dateValue.split('-').map(Number);

    const later = new Date(Date.now() + 1000);

    return new Date(
      year,
      month - 1,
      day,
      later.getHours(),
      later.getMinutes(),
      later.getSeconds()
    ).toISOString();
  }

  getFileTypeInfo(fileType: string): { label: string; class: string } {

  const type = fileType.toLowerCase();

  if (type.includes('pdf')) return { label: 'PDF', class: 'type-pdf' };
  if (type.includes('word')) return { label: 'DOC', class: 'type-doc' };
  if (type.includes('excel') || type.includes('spreadsheet') || type === 'text/csv') return { label: 'XLS', class: 'type-sheet' };
  if (type.includes('powerpoint') || type.includes('presentation')) return { label: 'PPT', class: 'type-slide' };
  if (type.includes('zip') || type.includes('rar') || type.includes('7z') || type.includes('tar') || type.includes('compressed')) return { label: 'ZIP', class: 'type-archive' };
  if (type.includes('json')) return { label: 'JSON', class: 'type-code' };
  if (type.includes('python')) return { label: 'PY', class: 'type-code' };
  if (type.includes('javascript') || type.includes('typescript')) return { label: 'JS', class: 'type-code' };
  if (type.includes('html')) return { label: 'HTML', class: 'type-code' };
  if (type.includes('css')) return { label: 'CSS', class: 'type-code' };
  if (type.includes('executable') || type.includes('x-msdownload') || type.includes('x-elf')) return { label: 'EXE', class: 'type-exe' };
  if (type.includes('empty')) return { label: 'EMPTY', class: 'type-txt' };
  if (type === 'text/plain') return { label: 'TXT', class: 'type-txt' };

  if (type.startsWith('image/')) return { label: type.split('/')[1].toUpperCase(), class: 'type-image' };
  if (type.startsWith('video/')) return { label: 'VIDEO', class: 'type-default' };
  if (type.startsWith('audio/')) return { label: 'AUDIO', class: 'type-default' };

  const subtype = (type.split('/')[1] || type).toUpperCase().slice(0, 5);

  return { label: subtype, class: 'type-default' };
 }

  getFiles() {

    this.http.get<File[]>(
      'http://localhost:8000/files'
    ).subscribe({

      next: response => {

        console.log(response)

        this.files = response;
        this.store.loaded = true;

        this.showingContentResults = false;

        this.cdr.detectChanges();
      },

      error: error => {

        console.log(error);

      }

    });
  }


  searchTextChanged() {

    if (this.searchText.trim() === '' && this.showingContentResults) {

      this.showingContentResults = false;

      this.getFiles();

    }

  }

  searchFiles() {

    if (this.searchType === 'filename') {

      return;

    }

    if (this.searchText.trim() === '') {

      this.getFiles();

      return;
    }

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

        this.showingContentResults = true;

        this.cdr.detectChanges();

      },

      error: error => {

        this.showMessagePopup(
          `No matching files found for "${this.searchText}"`,
          'error'
        );

        this.cdr.detectChanges();

      }

    });

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
          `Failed to mark ${file.file_name} as Favorite`,
          'error'
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

  /* =========================
  ACTIONS MENU
  ========================= */

  toggleActionMenu(event: MouseEvent, file: File) {

    event.stopPropagation();

    if (this.openMenuId === file.file_id) {

      this.closeActionMenu();

      return;
    }

    const button = event.currentTarget as HTMLElement;

    const rect = button.getBoundingClientRect();

    const menuHeight = 164;

    const openUp =
      rect.bottom + menuHeight + 8 > window.innerHeight;

    this.menuTop = openUp
      ? rect.top - menuHeight - 6
      : rect.bottom + 6;

    this.menuLeft = Math.max(8, rect.right - 160);

    this.openMenuId = file.file_id;

    this.cdr.detectChanges();
  }

  @HostListener('document:click')
  @HostListener('document:keydown.escape')
  @HostListener('window:resize')
  closeActionMenu() {

    if (this.openMenuId === null) {

      return;
    }

    this.openMenuId = null;

    this.cdr.detectChanges();
  }

  runAction(action: string, file: File) {

    this.closeActionMenu();

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
          `Failed to download ${file.file_name} Please try again`,
          'error'
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
          error.error?.detail || 'Failed to rename file',
          'error'
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
          `Failed to delete ${filename}`,
          'error'
        );

      }

    });
  }

  openSharePopup(file: File) {

    this.setMinExpiryDate();

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
              'Please enter a valid email address',
              'error'
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

    if (
      this.shareExpiryDate !== '' &&
      this.shareExpiryDate < this.minExpiryDate
    ) {

      this.showMessagePopup(
        'Expiry date must be tomorrow or later',
        'error'
      );

      return;
    }

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
        this.buildExpiry(this.shareExpiryDate);
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
          `Failed to update share settings for ${filename}`,
          'error'
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

      request.expires_at =
        this.buildExpiry(this.shareExpiryDate);
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
            `Share link already exists for ${filename}`,
            'error'
          );

        } else {

          this.showMessagePopup(
            `Failed to create share link for ${filename}`,
            'error'
          );

        }

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