import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DatePipe,CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
  file_type: string
}

@Component({
  selector: 'app-share-links',
  imports: [DatePipe, FormsModule,CommonModule],
  templateUrl: './share-links.html',
  styleUrl: './share-links.css',
})
export class ShareLinks implements OnInit {

  sharelinks: ShareLink[] = [];

  SelectedShareLink: ShareLink | null = null;

  showSettingsPopup = false;

  showRevokePopup = false;

  ownerEmailError = false;

  showMessage = false;
  message = '';
  messageType: 'success' | 'error' = 'success';

  minExpiryDate = '';
  changeExpiryTime = '';

  newPermissionEmail = '';

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {

    this.setMinExpiryDate();

    this.get_all_shares();

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

  get_all_shares() {

    this.http.get<ShareLink[]>(
      'http://localhost:8000/share'
    ).subscribe({

      next: response => {

        console.log(response)

        this.sharelinks = response;

        this.cdr.detectChanges();

      },

      error: error => {

        console.log(error);

      }

    });
  }

  ViewFile(share: ShareLink) {

    this.http.get(
      `http://localhost:8000/files/${share.file_id}/view`,
      {
        responseType: 'blob'
      }
    ).subscribe({

      next: response => {

        const fileurl =
          URL.createObjectURL(response);

        window.open(fileurl);

      },

      error: error => {

        console.log(error);

      }

    });
  }

  openRevokePopup(share: ShareLink) {

    this.showRevokePopup = true;

    this.SelectedShareLink = share;

  }

  closeRevokePopup() {

    this.showRevokePopup = false;

    this.SelectedShareLink = null;

  }

  revokeShareLink() {

    if (!this.SelectedShareLink) {

      return;

    }

    const sharelinkid =
      this.SelectedShareLink.share_id;

    const filename =
      this.SelectedShareLink.file_name;

    this.http.delete(
      `http://localhost:8000/share/${sharelinkid}/revoke`
    ).subscribe({

      next: response => {

        this.sharelinks =
          this.sharelinks.filter(
            sharelink =>
              sharelink.share_id !== sharelinkid
          );

        this.closeRevokePopup();

        this.showMessagePopup(
          `Share Link successfully revoked for ${filename}`,
          'success'
        );

        this.cdr.detectChanges();

      },

      error: error => {

        console.log(error);

        this.closeRevokePopup();

        this.showMessagePopup(
          `Failed to revoke Share Link for ${filename}`,
          'error'
        );

      }

    });
  }

  setMinExpiryDate() {

    const today = new Date();

    const year = today.getFullYear();

    const month =
      String(today.getMonth() + 1)
        .padStart(2, '0');

    const day =
      String(today.getDate())
        .padStart(2, '0');

    this.minExpiryDate =
      `${year}-${month}-${day}`;

  }

  buildExpiry(dateValue: string): string {

    const [year, month, day] =
      dateValue.split('-').map(Number);

    const later = new Date(Date.now() + 60000);

    return new Date(
      year,
      month - 1,
      day,
      later.getHours(),
      later.getMinutes(),
      later.getSeconds()
    ).toISOString();

  }

  openSettingPopup(share: ShareLink) {

    this.showSettingsPopup = true;

    this.SelectedShareLink = share;

    this.changeExpiryTime = '';

  }

  closeSettingPopup() {

    this.showSettingsPopup = false;

    this.SelectedShareLink = null;

  }

  addPermission() {

      if (!this.SelectedShareLink) {

          return;

      }

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

      if (
          this.SelectedShareLink.emails.includes(email)
      ) {

          this.newPermissionEmail = '';

          return;

      }

      if (
          email ===
          this.SelectedShareLink.owner_email.toLowerCase()
      ) {

          this.ownerEmailError = true;

          this.newPermissionEmail = '';

          setTimeout(() => {

              this.ownerEmailError = false;

              this.cdr.detectChanges();

          }, 5000);

          return;

      }

      this.SelectedShareLink.emails.push(email);

      this.newPermissionEmail = '';

      this.cdr.detectChanges();

  }

  removePermission(email: string) {

    if (!this.SelectedShareLink) {

      return;

    }

    for (
      let i = 0;
      i < this.SelectedShareLink.emails.length;
      i++
    ) {

      if (
        this.SelectedShareLink.emails[i] === email
      ) {

        this.SelectedShareLink.emails.splice(i, 1);

        break;

      }

    }

    this.cdr.detectChanges();

  }

  copyShareLink(share: ShareLink) {

    const sharelink =
      `http://localhost:4200/share/${share.share_token}`;

    navigator.clipboard.writeText(sharelink);

    this.showMessagePopup(
      'Share link copied to clipboard',
      'success'
    );

  }

  shareSettings() {

    if (!this.SelectedShareLink) {

      return;

    }

    const request: any = {

      emails: this.SelectedShareLink.emails

    };

    if (this.changeExpiryTime) {

      request.expires_at =
        this.buildExpiry(this.changeExpiryTime);

    }

    const filename =
      this.SelectedShareLink.file_name;

    this.http.patch(
      `http://localhost:8000/share/${this.SelectedShareLink.share_id}/change`,
      request
    ).subscribe({

      next: response => {

        this.closeSettingPopup();

        this.showMessagePopup(
          `Share settings Updated successfully for ${filename}`,
          'success'
        );

        this.newPermissionEmail = '';

        this.cdr.detectChanges();

      },

      error: error => {

        this.closeSettingPopup();

        if (error.status === 422) {

          this.showMessagePopup(
            'Invalid email(s) provided. Failed to add permissions',
            'error'
          );

        } else {

          this.showMessagePopup(
            `Failed to change share settings for ${filename}`,
            'error'
          );

        }

        this.cdr.detectChanges();

      }

    });

  }

  showMessagePopup(text: string, type: 'success' | 'error' = 'success') {

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