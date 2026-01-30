import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit {
  passwordForm: FormGroup;
  isUpdatingPassword = false;
  isDeleting = false;
  showDeleteModal = false;

  constructor(
    private authService: AuthService,
    private fb: FormBuilder,
    private router: Router
  ) {
    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validator: this.passwordMatchValidator });
  }

  ngOnInit(): void {}

  passwordMatchValidator(form: FormGroup) {
    return form.get('newPassword')?.value === form.get('confirmPassword')?.value 
      ? null : { passwordMismatch: true };
  }

  changePassword(): void {
    if (this.passwordForm.invalid) return;
    this.isUpdatingPassword = true;
    
    const { currentPassword, newPassword } = this.passwordForm.value;
    this.authService.changePassword(currentPassword, newPassword)
      .subscribe({
        next: () => {
          this.isUpdatingPassword = false;
          this.passwordForm.reset();
          alert('Password changed successfully');
        },
        error: () => {
          this.isUpdatingPassword = false;
          alert('Failed to change password. Please try again.');
        }
      });
  }

  confirmDeleteAccount(): void {
    this.showDeleteModal = true;
  }

  deleteAccount(): void {
    this.isDeleting = true;
    this.authService.deleteAccount()
      .subscribe({
        next: () => {
          this.isDeleting = false;
          this.authService.logout();
          this.router.navigate(['/']);
        },
        error: () => {
          this.isDeleting = false;
          alert('Failed to delete account. Please try again.');
        }
      });
  }
}