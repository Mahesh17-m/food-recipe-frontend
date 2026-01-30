import { Component } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { AuthMethodResponse } from '../../models/recipe.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, CommonModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  isLoginForm = true;
  isLoading = false;
  loginForm: FormGroup;
  signupForm: FormGroup;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  showVerificationNotice = false;
  verificationEmail = '';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    this.signupForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      username: ['', [Validators.required, Validators.minLength(3), Validators.pattern(/^[a-zA-Z0-9_]+$/)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validator: this.passwordMatchValidator });
  }

  private passwordMatchValidator(g: FormGroup): { [key: string]: boolean } | null {
    const password = g.get('password')?.value;
    const confirmPassword = g.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { mismatch: true };
  }

  // Google OAuth Login
  loginWithGoogle(): void {
    console.log('Initiating Google login...');
    this.authService.initiateGoogleLogin();
  }

  // Check auth method before showing password field
  checkAuthMethod(): void {
    const email = this.loginForm.get('email')?.value;
    
    if (!email || !this.loginForm.get('email')?.valid) {
      return;
    }
    
    this.authService.checkAuthMethod(email).subscribe({
      next: (response: AuthMethodResponse) => {
        if (response.exists && response.provider === 'google') {
          this.errorMessage = 'This account uses Google Sign-In. Please use the Google button to login.';
          // Optionally clear password field
          this.loginForm.get('password')?.reset();
        }
      },
      error: (error: any) => {
        console.error('Error checking auth method:', error);
      }
    });
  }

  switchForm(event?: Event): void {
    if (event) event.preventDefault();
    this.isLoginForm = !this.isLoginForm;
    this.errorMessage = null;
    this.successMessage = null;
    this.showVerificationNotice = false;
    this.loginForm.reset();
    this.signupForm.reset();
  }

  onSubmit(): void {
    console.log('Login form submitted');
    if (this.loginForm.invalid) {
      console.log('Login form invalid');
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    const { email, password } = this.loginForm.value;
    console.log('Attempting login with:', { email });

    this.authService.login(email.trim(), password.trim()).subscribe({
      next: () => {
        console.log('Login successful');
        this.isLoading = false;
        this.router.navigate(['/']);
      },
      error: (error: any) => {
        console.log('Login error:', error);
        this.isLoading = false;
        
        // Handle specific error cases
        if (error.code === 'INVALID_CREDENTIALS') {
          this.errorMessage = 'Invalid email or password. Please try again.';
        } else if (error.code === 'USER_NOT_FOUND') {
          this.errorMessage = 'No account found with this email. Please sign up first.';
        } else if (error.code === 'GOOGLE_ACCOUNT') {
          this.errorMessage = 'This account uses Google Sign-In. Please use the Google button to login.';
        } else if (error.status === 0) {
          this.errorMessage = 'Network error. Please check your connection and try again.';
        } else {
          this.errorMessage = error.message || 'Login failed. Please try again.';
        }
      }
    });
  }

  onSignupSubmit(): void {
    console.log('Signup form submitted');
    if (this.signupForm.invalid) {
      console.log('Signup form invalid', this.signupForm.errors);
      this.signupForm.markAllAsTouched();
      return;
    }

    if (this.signupForm.hasError('mismatch')) {
      this.errorMessage = 'Passwords do not match';
      return;
    }

    this.isLoading = true;
    this.errorMessage = null;

    const { confirmPassword, ...userData } = this.signupForm.value;
    
    // Trim all fields before sending
    const trimmedUserData = {
      name: userData.name?.trim(),
      username: userData.username?.trim(),
      email: userData.email?.trim().toLowerCase(),
      password: userData.password?.trim()
    };

    console.log('Attempting registration with:', trimmedUserData);

    this.authService.register(trimmedUserData).subscribe({
      next: (response) => {
        console.log('Registration successful:', response);
        this.isLoading = false;
        this.router.navigate(['/']);
      },
      error: (error: any) => {
        console.log('Registration error:', error);
        this.isLoading = false;
        if (error.code === 'EMAIL_EXISTS') {
          this.errorMessage = 'Email already registered. Please use a different email.';
        } else if (error.code === 'USERNAME_EXISTS') {
          this.errorMessage = 'Username already taken. Please choose a different username.';
        } else {
          this.errorMessage = error.message || 'Registration failed. Please try again.';
        }
      }
    });
  }

  // Helper methods to check form validity for template
  isFieldInvalid(form: FormGroup, fieldName: string): boolean {
    const field = form.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(form: FormGroup, fieldName: string): string {
    const field = form.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return 'This field is required';
      if (field.errors['email']) return 'Please enter a valid email';
      if (field.errors['minlength']) return `Minimum length is ${field.errors['minlength'].requiredLength} characters`;
      if (field.errors['pattern']) return 'Username can only contain letters, numbers, and underscores';
    }
    return '';
  }
}