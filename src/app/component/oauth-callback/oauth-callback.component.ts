import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-oauth-callback',
  standalone: true,
   imports: [CommonModule],
  template: `
    <div class="container mt-5">
      <div class="row justify-content-center">
        <div class="col-md-6 text-center">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
          <p class="mt-3">Completing authentication...</p>
          <div *ngIf="errorMessage" class="alert alert-danger mt-3">
            {{ errorMessage }}
          </div>
        </div>
      </div>
    </div>
  `
})
export class OAuthCallbackComponent implements OnInit {
  errorMessage: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const token = params['token'];
      const refreshToken = params['refreshToken'];
      const user = params['user'];
      const error = params['error'];

      if (error) {
        this.handleError(error);
        return;
      }

      if (token && refreshToken && user) {
        try {
          const userData = JSON.parse(decodeURIComponent(user));
          this.authService.handleOAuthCallback(token, refreshToken, userData).subscribe({
            next: () => {
              this.router.navigate(['/']);
            },
            error: (err) => {
              console.error('OAuth callback error:', err);
              this.errorMessage = 'Authentication failed. Please try again.';
              setTimeout(() => this.router.navigate(['/login']), 3000);
            }
          });
        } catch (parseError) {
          console.error('Error parsing user data:', parseError);
          this.errorMessage = 'Invalid authentication data.';
          setTimeout(() => this.router.navigate(['/login']), 3000);
        }
      } else {
        this.errorMessage = 'Missing authentication data.';
        setTimeout(() => this.router.navigate(['/login']), 3000);
      }
    });
  }

  private handleError(error: string) {
    switch (error) {
      case 'auth_failed':
        this.errorMessage = 'Authentication failed. Please try again.';
        break;
      case 'user_not_found':
        this.errorMessage = 'User not found. Please sign up first.';
        break;
      case 'token_error':
        this.errorMessage = 'Token error. Please try again.';
        break;
      default:
        this.errorMessage = 'An unknown error occurred.';
    }
    
    setTimeout(() => this.router.navigate(['/login']), 3000);
  }
}