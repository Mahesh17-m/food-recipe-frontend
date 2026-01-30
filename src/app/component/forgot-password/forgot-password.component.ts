import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterLink],
  templateUrl: './forgot-password.component.html'
})
export class ForgotPasswordComponent {
  forgotForm: FormGroup;
  resetForm: FormGroup;
  isLoading = false;
  emailSent = false;
  tokenVerified = false;
  resetComplete = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  email: string = '';
  token: string = '';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) {
    this.forgotForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });

    this.resetForm = this.fb.group({
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]]
    }, { validator: this.passwordMatchValidator });

    // Check for token in URL
    const urlToken = this.router.url.split('/').pop();
    if (urlToken && urlToken.length > 20) {
      this.token = urlToken;
      this.verifyToken();
    }
  }

  private passwordMatchValidator(g: FormGroup): { [key: string]: boolean } | null {
    const password = g.get('password')?.value;
    const confirmPassword = g.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { mismatch: true };
  }

  onForgotSubmit(): void {
    if (this.forgotForm.invalid) {
      this.forgotForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;
    this.email = this.forgotForm.value.email.trim().toLowerCase();

    this.authService.forgotPassword(this.email).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.emailSent = true;
        this.successMessage = response.message;
        
        // Show dev token in development
        if (response.code === 'RESET_EMAIL_SENT' && this.email.includes('@example.com')) {
          console.log('🔧 DEV: Check server logs for reset token');
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.message || 'Failed to send reset email. Please try again.';
      }
    });
  }

  verifyToken(): void {
    if (!this.token) return;

    this.isLoading = true;
    this.authService.verifyResetToken(this.token).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.valid) {
          this.tokenVerified = true;
          this.email = response.email || '';
          this.successMessage = response.message;
        } else {
          this.errorMessage = response.message || 'Invalid or expired reset link.';
          setTimeout(() => this.router.navigate(['/forgot-password']), 3000);
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.message || 'Failed to verify reset link.';
        setTimeout(() => this.router.navigate(['/forgot-password']), 3000);
      }
    });
  }

  onResetSubmit(): void {
    if (this.resetForm.invalid) {
      this.resetForm.markAllAsTouched();
      return;
    }

    if (this.resetForm.hasError('mismatch')) {
      this.errorMessage = 'Passwords do not match';
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    const { password } = this.resetForm.value;

    this.authService.resetPassword(this.token, password).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.resetComplete = true;
        this.successMessage = response.message;
        
        // Auto redirect to login after 3 seconds
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 3000);
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.message || 'Failed to reset password. Please try again.';
        
        // Handle specific error codes
        if (error.code === 'INVALID_TOKEN') {
          setTimeout(() => this.router.navigate(['/forgot-password']), 3000);
        } else if (error.code === 'SAME_PASSWORD') {
          this.errorMessage = 'New password must be different from your old password.';
        } else if (error.code === 'TOO_MANY_ATTEMPTS') {
          this.errorMessage = 'Too many attempts. Please request a new reset link.';
          setTimeout(() => this.router.navigate(['/forgot-password']), 3000);
        }
      }
    });
  }

  resendEmail(): void {
    if (!this.email) return;
    
    this.isLoading = true;
    this.authService.forgotPassword(this.email).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.successMessage = 'Reset email has been resent. Please check your inbox.';
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.message || 'Failed to resend email.';
      }
    });
  }

  isFieldInvalid(form: FormGroup, fieldName: string): boolean {
    const field = form.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }
}