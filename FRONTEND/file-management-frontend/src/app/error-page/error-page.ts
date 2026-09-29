import { Component } from '@angular/core';
import { ActivatedRoute, Router} from '@angular/router';

@Component({
  selector: 'app-error-page',
  imports: [],
  templateUrl: './error-page.html',
  styleUrl: './error-page.css',
})
export class ErrorPage {

  title = ''
  message = ''
  returnUrl = ''

  constructor(
    private route: ActivatedRoute,
    private router:Router
  ){}

  ngOnInit(){
    this.route.queryParams.subscribe(
      params => {
        this.title = params['title'] || 'something went wrong'
        this.message = params['message'] || 'An unexpected error occured'
        this.returnUrl = params['returnUrl'] || ''
      }
    )
  }
  goToLogin(){
    this.router.navigate(['/login'],{
      queryParams: {
        returnUrl: this.returnUrl
      }
    })
  }
}
