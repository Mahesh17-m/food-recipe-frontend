import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { Subject } from 'rxjs';
import { takeUntil, take } from 'rxjs/operators';
import { FavoriteRecipesComponent } from '../favorite-recipes/favorite-recipes.component';
import { MyRecipesComponent } from '../my-recipes/my-recipes.component';
import { SavedRecipesComponent } from '../saved-recipes/saved-recipes.component';
import { SettingsComponent } from '../settings/settings.component';
import { User, Badge } from '../../models/recipe.model';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    RouterModule,
    MyRecipesComponent,
    FavoriteRecipesComponent,
    SavedRecipesComponent,
    SettingsComponent
  ],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit, OnDestroy {
  user: User | null = null;
  isLoading = true;
  isEditing = false;
  isUpdating = false;
  activeTab = 'profile';
  
  // Stats
  recipesCount = 0;
  favoritesCount = 0;
  reviewsCount = 0;
  savedRecipesCount = 0;
  followersCount = 0;
  followingCount = 0;
  totalLikes = 0;
  totalViews = 0;
  engagementRate = 0;
  userLevel: string = 'New Cook';

  // Additional data
  badges: Badge[] = [];
  recentRecipes: any[] = [];
  recentReviews: any[] = [];
  
  profileForm!: FormGroup;
  private destroy$ = new Subject<void>();
  private hasLoadedStats = false;

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private fb: FormBuilder,
    private router: Router
  ) {
    this.initializeForm();
  }

  private initializeForm(): void {
    const socialMediaGroup = this.fb.group({
      twitter: [''],
      instagram: ['']
    });

    this.profileForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      tagline: ['', [Validators.maxLength(100)]],
      bio: ['', [Validators.maxLength(500)]],
      location: [''],
      website: [''],
      cookingStyle: [''],
      interests: this.fb.array([]),
      specialties: this.fb.array([]),
      socialMedia: socialMediaGroup
    });
  }

  ngOnInit(): void {
    this.loadUserProfile();
  }

  loadUserProfile(): void {
    this.isLoading = true;
    
    // Use take(1) to only get the initial user, not subsequent updates
    this.authService.currentUser$.pipe(
      take(1),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (user) => {
        if (user) {
          this.user = user;
          console.log('👤 Initial user loaded:', {
            id: user._id,
            username: user.username,
            coverPicture: user.coverPicture,
            profilePicture: user.profilePicture
          });
          
          // Update stats from user object
          this.updateStatsFromUser();
          
          // Load form data
          this.loadFormData();
          
          // Load stats from backend (only once)
          if (!this.hasLoadedStats) {
            this.loadUserStats();
          }
          
          // Load badges
          this.loadUserBadges();
        } else {
          this.isLoading = false;
          this.router.navigate(['/login']);
        }
      },
      error: (error) => {
        console.error('Error loading user profile:', error);
        this.isLoading = false;
      }
    });
  }

  private updateStatsFromUser(): void {
    if (!this.user) return;
    
    this.recipesCount = this.user.recipesCount || 0;
    this.favoritesCount = this.user.favoritesCount || 0;
    this.reviewsCount = this.user.reviewsCount || 0;
    this.savedRecipesCount = this.user.savedRecipes?.length || 0;
    this.followersCount = this.user.followersCount || 0;
    this.followingCount = this.user.followingCount || 0;
    this.totalLikes = this.user.totalLikes || 0;
    this.totalViews = this.user.totalViews || 0;
    this.engagementRate = this.user.engagementRate || 0;
    this.userLevel = this.userLevel || 'New Cook';
  }

  loadFormData(): void {
    if (!this.user) return;

    const socialMedia = this.user.socialMedia || {};
    
    this.profileForm.patchValue({
      username: this.user.username,
      email: this.user.email,
      tagline: this.user.tagline || '',
      bio: this.user.bio || '',
      location: this.user.location || '',
      website: this.user.website || '',
      cookingStyle: this.user.cookingStyle || '',
      socialMedia: {
        twitter: socialMedia.twitter || '',
        instagram: socialMedia.instagram || ''
      }
    });

    this.updateFormArray('interests', this.user.interests || []);
    this.updateFormArray('specialties', this.user.specialties || []);
  }

  loadUserStats(): void {
    if (!this.user || this.hasLoadedStats) return;
    
    this.userService.getUserStats().pipe(
      take(1),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (stats: any) => {
        console.log('📈 User stats loaded from backend:', stats);
        
        // Update all stats from backend response
        this.recipesCount = stats.recipesCount || this.recipesCount;
        this.favoritesCount = stats.favoritesCount || this.favoritesCount;
        this.reviewsCount = stats.reviewsCount || this.reviewsCount;
        this.savedRecipesCount = stats.savedRecipesCount || this.savedRecipesCount;
        this.followersCount = stats.followersCount || this.followersCount;
        this.followingCount = stats.followingCount || this.followingCount;
        this.totalLikes = stats.totalLikes || this.totalLikes;
        this.totalViews = stats.totalViews || this.totalViews;
        this.engagementRate = stats.engagementRate || this.engagementRate;
        this.userLevel = stats.userLevel || 'New Cook';
        this.recentRecipes = stats.recentRecipes || [];
        this.recentReviews = stats.recentReviews || [];
        
        // Update user object with backend stats but don't trigger auth service update
        // to prevent loops
        if (this.user) {
          const updatedUser = {
            ...this.user,
            recipesCount: this.recipesCount,
            favoritesCount: this.favoritesCount,
            reviewsCount: this.reviewsCount,
            followersCount: this.followersCount,
            followingCount: this.followingCount,
            totalLikes: this.totalLikes,
            totalViews: this.totalViews,
            engagementRate: this.engagementRate,
            // Only update coverPicture if it's different
            coverPicture: stats.coverPicture && stats.coverPicture !== this.user.coverPicture 
              ? stats.coverPicture 
              : this.user.coverPicture,
            profilePicture: stats.profilePicture && stats.profilePicture !== this.user.profilePicture
              ? stats.profilePicture
              : this.user.profilePicture
          };
          
          // Update local user reference
          this.user = updatedUser;
          
          // Update localStorage but skip the auth service observable update
          localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        }
        
        console.log('✅ Final stats (loaded once):', {
          recipes: this.recipesCount,
          favorites: this.favoritesCount,
          saved: this.savedRecipesCount,
          followers: this.followersCount,
          following: this.followingCount,
          likes: this.totalLikes,
          views: this.totalViews,
          engagement: this.engagementRate,
          userLevel: this.userLevel,
          coverPicture: this.user?.coverPicture
        });
        
        this.hasLoadedStats = true;
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Error loading user stats:', error);
        this.hasLoadedStats = true;
        this.isLoading = false;
      }
    });
  }

  loadUserBadges(): void {
    this.userService.getUserBadges().pipe(
      take(1),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response: any) => {
        this.badges = response.badges || [];
      },
      error: (error: any) => {
        console.error('Error loading badges:', error);
        this.badges = [];
      }
    });
  }

  updateFormArray(controlName: string, items: string[]): void {
    const control = this.profileForm.get(controlName);
    if (!control) return;

    const formArray = control as FormArray;
    
    while (formArray.length > 0) {
      formArray.removeAt(0);
    }
    
    items.forEach(item => {
      if (item && item.trim()) {
        formArray.push(this.fb.control(item.trim()));
      }
    });
  }

  getStats(): any[] {
    return [
      { iconPath: 'M20 2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-5 9h-4v4h-2v-4H7V9h4V5h2v4h4v2z', label: 'Recipes', value: this.recipesCount, iconColor: '#f66d3b' },
      { iconPath: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z', label: 'Favorites', value: this.favoritesCount, iconColor: '#ef4444' },
      { iconPath: 'M16.53 11.06L15.47 10l-4.88 4.88-2.12-2.12-1.06 1.06L10.59 17l5.94-5.94zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z', label: 'Saved', value: this.savedRecipesCount, iconColor: '#10b981' },
      { iconPath: 'M12 17.27L18.88 21l-1.5-6.55L22 9.39l-6.51-.62L12 2 8.51 8.77 2 9.39l5.38 5.06L5.12 21z', label: 'Reviews', value: this.reviewsCount, iconColor: '#fbbf24' },
      { iconPath: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5z', label: 'Followers', value: this.followersCount, iconColor: '#3b82f6' },
      { iconPath: 'M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z', label: 'Following', value: this.followingCount, iconColor: '#8b5cf6' },
      { iconPath: 'M1 21h4V9H1v12zm22-11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 4.08c-.27.27-.44.65-.44 1.06l.04.32.95 4.57H2c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h20c1.1 0 2-.9 2-2V10z', label: 'Likes', value: this.totalLikes, iconColor: '#ec4899' },
      { iconPath: 'M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z', label: 'Views', value: this.totalViews, iconColor: '#06b6d4' },
      { iconPath: 'M22 6.92l-1.41-1.41-2.85 2.85C16.21 7.18 14.32 7 12 7s-4.21.18-6.14 1.36L2 6.92 3.41 5.51l4.48 4.48a17.1 17.1 0 0 0-2.4 2.36l1.94 1.94C8.79 13.18 10.68 13 12 13s3.21-.18 4.67-1.24l1.94 1.94c.23-.23.45-.48.66-.74l4.96-4.56L22 6.92z', label: 'Engagement', value: this.engagementRate + '%', iconColor: '#f59e0b' }
    ];
  }

  get interestsArray(): FormArray {
    return this.profileForm.get('interests') as FormArray;
  }

  get specialtiesArray(): FormArray {
    return this.profileForm.get('specialties') as FormArray;
  }

  get socialMediaGroup(): FormGroup {
    return this.profileForm.get('socialMedia') as FormGroup;
  }

  addArrayItem(arrayName: string, value: string = ''): void {
    const control = this.profileForm.get(arrayName);
    if (!control) return;
    
    const array = control as FormArray;
    if (value && value.trim()) {
      array.push(this.fb.control(value.trim()));
    }
  }

  removeArrayItem(arrayName: string, index: number): void {
    const control = this.profileForm.get(arrayName);
    if (!control) return;
    
    const array = control as FormArray;
    if (index >= 0 && index < array.length) {
      array.removeAt(index);
    }
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

  toggleEdit(): void {
    this.isEditing = !this.isEditing;
    if (!this.isEditing) {
      this.loadFormData();
    }
  }

  triggerFileInput(type: 'avatar' | 'cover'): void {
    const fileInput = document.getElementById(`${type}Input`) as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  handleAvatarChange(event: Event): void {
    this.handleFileUpload(event, 'avatar');
  }

  handleCoverChange(event: Event): void {
    this.handleFileUpload(event, 'cover');
  }

  private handleFileUpload(event: Event, type: 'avatar' | 'cover'): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        alert('Only JPEG, PNG, GIF or WEBP images are allowed');
        return;
      }
      
      const maxSize = type === 'avatar' ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
      if (file.size > maxSize) {
        alert(`Image must be less than ${maxSize / (1024 * 1024)}MB`);
        return;
      }
      
      this.isUpdating = true;
      
      if (type === 'avatar') {
        this.authService.uploadProfilePicture(file)
          .pipe(take(1), takeUntil(this.destroy$))
          .subscribe({
            next: (response: any) => {
              console.log('✅ Profile picture updated');
              this.isUpdating = false;
              alert('Profile picture updated successfully!');
              input.value = '';
              // Manually update local user without triggering stats reload
              if (this.user && response.profilePicture) {
                this.user.profilePicture = response.profilePicture;
                localStorage.setItem('currentUser', JSON.stringify(this.user));
              }
            },
            error: (error: any) => {
              this.isUpdating = false;
              console.error('Upload error:', error);
              alert('Failed to upload profile picture. Please try again.');
              input.value = '';
            }
          });
      } else {
        this.userService.uploadCoverPicture(file)
          .pipe(take(1), takeUntil(this.destroy$))
          .subscribe({
            next: (response: any) => {
              console.log('✅ Cover picture updated');
              this.isUpdating = false;
              alert('Cover picture updated successfully!');
              input.value = '';
              // Manually update local user without triggering stats reload
              if (this.user && response.coverPicture) {
                this.user.coverPicture = response.coverPicture;
                localStorage.setItem('currentUser', JSON.stringify(this.user));
              }
            },
            error: (error: any) => {
              this.isUpdating = false;
              console.error('Cover upload error:', error);
              alert('Failed to upload cover picture. Please try again.');
              input.value = '';
            }
          });
      }
    }
  }

  updateProfile(): void {
    if (this.profileForm.invalid) {
      this.markFormGroupTouched(this.profileForm);
      return;
    }
    
    this.isUpdating = true;
    
    const formValue = this.profileForm.value;
    
    formValue.interests = (formValue.interests || []).filter((item: string) => item && item.trim());
    formValue.specialties = (formValue.specialties || []).filter((item: string) => item && item.trim());
    
    if (formValue.socialMedia) {
      Object.keys(formValue.socialMedia).forEach(key => {
        if (!formValue.socialMedia[key] || formValue.socialMedia[key].trim() === '') {
          delete formValue.socialMedia[key];
        }
      });
    }
    
    this.userService.updateProfileSettings(formValue)
      .pipe(take(1), takeUntil(this.destroy$))
      .subscribe({
        next: (updatedUser: User) => {
          this.user = updatedUser;
          this.isEditing = false;
          this.isUpdating = false;
          alert('Profile updated successfully!');
        },
        error: (error: any) => {
          console.error('Error updating profile:', error);
          this.isUpdating = false;
          alert('Failed to update profile. Please try again.');
        }
      });
  }

  private markFormGroupTouched(formGroup: FormGroup | FormArray) {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      
      if (control instanceof FormGroup || control instanceof FormArray) {
        this.markFormGroupTouched(control);
      }
    });
  }

  getProfileImageUrl(relativePath: string | undefined): string {
    return this.authService.getFullProfileImageUrl(relativePath);
  }

  getCoverImageUrl(relativePath: string | undefined): string {
    return this.authService.getFullProfileImageUrl(relativePath);
  }

  formatDate(dateString?: string): string {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return '';
    }
  }

  getStars(rating: number): string {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  }

  hasSocialMedia(socialMedia: any): boolean {
    if (!socialMedia) return false;
    return Object.values(socialMedia).some((value: any) => value && value.trim() !== '');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}