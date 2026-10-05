import { Component, OnInit,ChangeDetectorRef} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { share } from 'rxjs';

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

@Component({
  selector: 'app-share-links',
  imports: [DatePipe,FormsModule],
  templateUrl: './share-links.html',
  styleUrl: './share-links.css',
})
export class ShareLinks implements OnInit{

  sharelinks:ShareLink[]=[]

  SelectedShareLink:  ShareLink | null=null
  showSettingsPopup = false

  showRevokePopup = false

  ownerEmailError = false

  showMessage = false;
  message = ''

  minExpiryDate = ''
  changeExpiryTime = '' 

  newPermissionEmail = ''

  constructor(
    private http:HttpClient,
    private cdr: ChangeDetectorRef
  ){}

  ngOnInit(): void {
    this.setMinExpiryDate()
    this.get_all_shares()
  }

  get_all_shares(){

    console.log('GETTING SHARE LINKS')

    const token = localStorage.getItem('access_token')

    this.http.get<ShareLink[]>(
      'http://127.0.0.1:8000/share',
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    ).subscribe({
      next:response => {
        console.log(response)
        this.sharelinks = response
        this.cdr.detectChanges()
      },
      error:error => {
        console.log(error)
      }
    })
  }

  ViewFile(share: ShareLink) {

    const token = localStorage.getItem('access_token')

    this.http.get(
      `http://127.0.0.1:8000/files/${share.file_id}/view`,
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

  openRevokePopup(share:ShareLink){
    this.showRevokePopup = true
    this.SelectedShareLink = share
  }

  closeRevokePopup(){
    this.showRevokePopup = false
    this.SelectedShareLink = null
  }

  revokeShareLink(){
    if(!this.SelectedShareLink){
      return
    }
    const token = localStorage.getItem('access_token')
    const sharelinkid = this.SelectedShareLink?.share_id
    const filename =this.SelectedShareLink?.file_name

    this.http.delete(
      `http://127.0.0.1:8000/share/${sharelinkid}/revoke`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    ).subscribe({
      next:response => {
        console.log(response)

        this.sharelinks = this.sharelinks.filter(
          sharelink => 
            sharelink.share_id !== sharelinkid  
        )
        this.closeRevokePopup()
        this.showMessagePopup(`Share Link successfully revoked for ${filename}`)
        this.cdr.detectChanges()
      },
      error:error => {
        console.log(error)
        this.closeRevokePopup()
        this.showMessagePopup(`Failed to revoke Share Link for ${filename}`)
      }
    })
  }

    setMinExpiryDate(){
    const now = new Date()

    const year = now.getFullYear()
    const month = String(now.getMonth()+1).padStart(2,'0')
    const day = String(now.getDate()).padStart(2,'0')
    const hours = String(now.getHours()).padStart(2,'0')
    const minutes = String(now.getMinutes()).padStart(2,'0')

    this.minExpiryDate = `${year}-${month}-${day}T${hours}:${minutes}`
  }

  openSettingPopup(share:ShareLink){
    this.showSettingsPopup = true
    this.SelectedShareLink = share
  }

  closeSettingPopup(){
    this.showSettingsPopup = false
    this.SelectedShareLink = null
  }

  addPermission(){

    if(!this.SelectedShareLink){
      return
    }

    const email = this.newPermissionEmail.trim().toLowerCase()

    if(email === ''){
      return
    }

    if(this.SelectedShareLink.emails.includes(email)){
      this.newPermissionEmail = ''
      return
    }

      if(email === this.SelectedShareLink.owner_email.toLowerCase()){
      this.ownerEmailError = true
      this.newPermissionEmail = ''
      setTimeout(() => {
        this.ownerEmailError = false
        this.cdr.detectChanges()
      },5000
    )
    return
  }

    this.SelectedShareLink.emails.push(this.newPermissionEmail)
    this.newPermissionEmail = ''
    this.cdr.detectChanges()
  }

  removePermission(email:string){

    if(!this.SelectedShareLink){
      return
    }

    for(let i=0;i<this.SelectedShareLink.emails.length;i++){
      if(this.SelectedShareLink.emails[i]===email){
        this.SelectedShareLink.emails.splice(i,1)
        break
      }
    }
    this.cdr.detectChanges()
  }

  copyShareLink(share:ShareLink){
    const sharelink = `http://localhost:4200/share/${share.share_token}`

    navigator.clipboard.writeText(sharelink)

    this.showMessagePopup("Share link copied to clipboard")
  }

  shareSettings(){

    if(!this.SelectedShareLink){
      return
    }

    const token = localStorage.getItem('access_token')

    const request : any = {
      emails : this.SelectedShareLink.emails
    }

    if(this.changeExpiryTime){
      request.expires_at = new Date(this.changeExpiryTime).toISOString()
    }

    const filename = this.SelectedShareLink.file_name

    this.http.patch(
      `http://127.0.0.1:8000/share/${this.SelectedShareLink.share_id}/change`,
      request,
      {headers: {
        Authorization: `Bearer ${token}`
      }}
    ).subscribe({
      next:response => {
        this.closeSettingPopup()
        this.showMessagePopup(`Share settings Updated successfully for ${filename}`)
        this.newPermissionEmail = ''
        this.cdr.detectChanges()
      },
      error:error => {
        this.closeSettingPopup()
        this.showMessagePopup(`Failed to change share settings for ${filename}`)
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
