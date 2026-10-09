import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

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
  code = ''
  icon = ''
  primaryLabel = ''
  primaryRoute = '/login'

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(
      params => {
        this.title = params['title'] || 'Page Not Found'
        this.message = params['message'] || 'The page you are looking for does not exist'
        this.returnUrl = params['returnUrl'] || ''
        this.code = params['code'] || ''
        this.icon = params['icon'] || ''
        this.primaryLabel = params['primaryLabel'] || ''
        this.primaryRoute = params['primaryRoute'] || '/login'
      }
    )
  }

  goPrimary() {
    this.router.navigate([this.primaryRoute], {
      queryParams: this.returnUrl ? { returnUrl: this.returnUrl } : {}
    })
  }
}