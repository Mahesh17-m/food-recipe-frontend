import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { environment } from '../../../environments/environment';
import { UserService } from '../../services/user.service';
import { Chef } from '../../models/recipe.model';

@Component({
  selector: 'app-chefs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './chefs.component.html',
  styleUrls: ['./chefs.component.css']
})
export class ChefsComponent implements OnInit {
  chefs: Chef[] = [];
  isLoading = false;
  error: string | null = null;

  constructor(
    private router: Router,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.loadChefs();
  }

  loadChefs(): void {
    this.isLoading = true;
    this.error = null;
    
    this.userService.getChefs().subscribe({
      next: (response) => {
        this.chefs = response.users || response || [];
        this.isLoading = false;
        console.log('Loaded chefs:', this.chefs);
      },
      error: (error) => {
        console.error('Error loading chefs:', error);
        this.isLoading = false;
        this.error = error.message || 'Failed to load chefs';
        this.chefs = [];
      }
    });
  }

  retryLoadChefs(): void {
    this.loadChefs();
  }
viewChefProfile(chefId: string): void {
  console.log('Navigating to author profile with ID:', chefId);
  this.router.navigate(['/author', chefId]);
}

  getChefImage(profilePicture: string | undefined): string {
    if (!profilePicture) {
      return 'assets/user.png';
    }
    
    // If it's already a full URL
    if (profilePicture.startsWith('http')) {
      return profilePicture;
    }
    
    // If it starts with /uploads, construct the full backend URL
    if (profilePicture.startsWith('/uploads')) {
      const backendUrl = environment.apiUrl.replace('/api', '');
      return `${backendUrl}${profilePicture}`;
    }
    
    // If it's just a filename, assume it's in the uploads directory
    if (!profilePicture.includes('/')) {
      const backendUrl = environment.apiUrl.replace('/api', '');
      return `${backendUrl}/uploads/${profilePicture}`;
    }
    
    return 'assets/user.png';
  }

  handleImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'assets/user.png';
  }

  getUserSpecialty(chef: Chef): string {
    if (chef.specialty) {
      return chef.specialty;
    }
    
    // Generate specialty based on recipe count
    const recipeCount = chef.recipesCount || 0;
    if (recipeCount === 0) return 'New Chef';
    if (recipeCount < 5) return 'Home Cook';
    if (recipeCount < 15) return 'Recipe Enthusiast';
    if (recipeCount < 30) return 'Experienced Cook';
    return 'Master Chef';
  }

  truncateBio(bio: string = '', maxLength: number = 120): string {
    if (!bio) return 'Passionate about creating delicious recipes!';
    if (bio.length <= maxLength) return bio;
    return bio.substring(0, maxLength) + '...';
  }

  getJoinDate(createdAt: string): string {
    if (!createdAt) return 'recently';
    
    try {
      const joinDate = new Date(createdAt);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - joinDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 1) return 'today';
      if (diffDays === 1) return 'yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
      if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
      return `${Math.floor(diffDays / 365)} years ago`;
    } catch (error) {
      return 'recently';
    }
  }
}