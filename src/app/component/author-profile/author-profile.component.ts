import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { UserService } from '../../services/user.service';
import { RecipeService } from '../../services/recipe.service';
import { AuthService } from '../../services/auth.service';
import { User, Recipe } from '../../models/recipe.model';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

interface ExtendedUser extends User {
  userLevel?: string;
}

type LocalRecipe = Recipe & {
  image?: string;
  imageUrl?: string;
  mainImage?: string;
  images?: string[];
  prepTime?: number;
  difficulty?: string;
  category?: string;
  isNew?: boolean;
  description?: string;
};

@Component({
  selector: 'app-author-profile',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './author-profile.component.html',
  styleUrls: ['./author-profile.component.css']
})
export class AuthorProfileComponent implements OnInit, OnDestroy {
  author: ExtendedUser | null = null;
  recipes: LocalRecipe[] = [];
  isLoading = true;
  isFollowing = false;
  currentUser: User | null = null;
  isOwnProfile = false;
  
  // Track saved and favorite recipes for current user
  savedRecipes: Set<string> = new Set();
  favoriteRecipes: Set<string> = new Set();
  
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private location: Location,
    private userService: UserService,
    public recipeService: RecipeService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.currentUser = user;
        if (user) {
          this.loadUserSavedAndFavoriteRecipes();
        }
      });
   
    this.loadAuthorProfile();
  }

  loadAuthorProfile(): void {
  const authorId = this.route.snapshot.paramMap.get('userId');
  if (!authorId) {
    this.router.navigate(['/recipes']);
    return;
  }

  this.isLoading = true;
  this.userService.getAuthorProfile(authorId).subscribe({
    next: (authorData: any) => {
      console.log('📋 FULL Author data received:', {
        authorName: authorData.username,
        recipeCount: authorData.recipes?.length,
        allRecipes: authorData.recipes?.map((r: any) => ({
          title: r.title,
          imageUrl: r.imageUrl,
          image: r.image,
          mainImage: r.mainImage,
          images: r.images
        }))
      });
      
      // Create a safe user object with all required properties
      this.author = this.createSafeUserObject(authorData);
     
      // Process recipes and check if they're saved/favorited by current user
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      this.recipes = (authorData.recipes || []).map((recipe: any) => {
        // Get image URL properly
        const imageUrl = this.getRecipeImage(recipe);
        console.log(`📸 Recipe "${recipe.title}" image details:`, {
          imageUrl: recipe.imageUrl,
          image: recipe.image,
          mainImage: recipe.mainImage,
          images: recipe.images,
          finalUrl: imageUrl
        });
        
        return {
          ...recipe,
          // Store both image and imageUrl for compatibility
          image: imageUrl,
          imageUrl: imageUrl,
          isSaved: this.savedRecipes.has(recipe._id!),
          isFavorite: this.favoriteRecipes.has(recipe._id!),
          likesCount: recipe.likesCount || 0,
          prepTime: recipe.prepTime ? `${recipe.prepTime} min` : '',
          difficulty: recipe.difficulty || 'Easy',
          category: recipe.category || recipe.tags?.[0] || '',
          description: recipe.description || '',
          isNew: recipe.createdAt ? new Date(recipe.createdAt) > thirtyDaysAgo : false
        } as LocalRecipe;
      });
     
      this.isFollowing = authorData.isFollowing || false;
      this.isOwnProfile = authorData.isOwnProfile || false;
      this.isLoading = false;
    },
    error: (error) => {
      console.error('Error loading author profile:', error);
      this.isLoading = false;
      this.router.navigate(['/not-found']);
    }
  });
}
 getRecipeImage(recipe: any): string {
  // Check all possible image fields - priority: imageUrl -> image -> mainImage -> images[0]
  const imagePath = recipe.imageUrl || recipe.image || recipe.mainImage || 
                   (recipe.images && recipe.images[0]);
  
  console.log('Getting recipe image for:', recipe.title, 
              'Image path found:', imagePath,
              'Recipe ID:', recipe._id);
  
  if (imagePath && imagePath !== '/uploads/recipes/default.jpg') {
    return this.getRecipeImageUrl(imagePath);
  }
  
  // Return a unique placeholder based on recipe title or ID
  return this.getRecipePlaceholder(recipe);
}
getRecipePlaceholder(recipe: any): string {
  // Generate a unique placeholder or use a generic one
  const placeholders = [
    'assets/recipe-placeholder.jpg'
  ];
  
  // Use recipe ID or title to pick a consistent placeholder
  if (recipe._id) {
    const index = recipe._id.charCodeAt(0) % placeholders.length;
    return placeholders[index];
  }
  
  return 'assets/recipe-placeholder.jpg';
}

  isRecipeNew(createdAt: string | Date): boolean {
    if (!createdAt) return false;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const createdDate = new Date(createdAt);
    return createdDate > thirtyDaysAgo;
  }

  // Create a safe user object with all required properties
  createSafeUserObject(userData: any): ExtendedUser {
    return {
      _id: userData._id || '',
      username: userData.username || 'Unknown User',
      email: userData.email || '',
      name: userData.name || userData.username || '',
      profilePicture: this.authService.getFullProfileImageUrl(userData.profilePicture),
      coverPicture: userData.coverPicture ? this.authService.getFullProfileImageUrl(userData.coverPicture) : undefined,
      tagline: userData.tagline || '',
      bio: userData.bio || '',
      savedRecipesCount: userData.savedRecipesCount || 0,
      recipesCount: userData.recipesCount || 0,
      favoritesCount: userData.favoritesCount || 0,
      reviewsCount: userData.reviewsCount || 0,
      followersCount: userData.followersCount || 0,
      followingCount: userData.followingCount || 0,
      totalLikes: userData.totalLikes || 0,
      totalViews: userData.totalViews || 0,
      totalInteractions: userData.totalInteractions || 0,
      engagementRate: userData.engagementRate || 0,
      memberSince: userData.memberSince || userData.createdAt || '',
      isVerified: userData.isVerified || false,
      isProChef: userData.isProChef || false,
      userLevel: userData.userLevel || userData.stats?.userLevel || 'New Cook',
      favorites: userData.favorites || [],
      savedRecipes: userData.savedRecipes || [],
      followers: userData.followers || [],
      following: userData.following || [],
      badges: userData.badges || [],
      recentRecipes: userData.recentRecipes || [],
      recentReviews: userData.recentReviews || [],
      createdAt: userData.createdAt || ''
    };
  }

  // Load user's saved and favorite recipes
  loadUserSavedAndFavoriteRecipes(): void {
    if (!this.currentUser) return;

    // Load saved recipes
    this.userService.getSavedRecipes().subscribe({
      next: (savedRecipes: Recipe[]) => {
        this.savedRecipes = new Set(savedRecipes.map(recipe => recipe._id!));
        this.updateRecipesStatus();
      },
      error: (error) => {
        console.error('Error loading saved recipes:', error);
      }
    });

    // Load favorite recipes
    this.userService.getFavoriteRecipes().subscribe({
      next: (favoriteRecipes: Recipe[]) => {
        this.favoriteRecipes = new Set(favoriteRecipes.map(recipe => recipe._id!));
        this.updateRecipesStatus();
      },
      error: (error) => {
        console.error('Error loading favorite recipes:', error);
      }
    });
  }

  // Update recipes status (saved/favorite)
  updateRecipesStatus(): void {
    this.recipes = this.recipes.map(recipe => ({
      ...recipe,
      isSaved: this.savedRecipes.has(recipe._id!),
      isFavorite: this.favoriteRecipes.has(recipe._id!)
    } as LocalRecipe));
  }

  onBack(): void {
    this.location.back();
  }

  navigateToProfileEdit(): void {
    this.router.navigate(['/profile/edit']);
  }

  toggleFollow(): void {
    if (!this.author || !this.currentUser) {
      this.router.navigate(['/login']);
      return;
    }

    this.userService.toggleFollow(this.author._id).subscribe({
      next: (response: any) => {
        this.isFollowing = !this.isFollowing;
        if (this.author && response) {
          this.author.followersCount = response.followersCount ||
            (this.isFollowing
              ? (this.author.followersCount || 0) + 1
              : Math.max((this.author.followersCount || 1) - 1, 0));
        }
      },
      error: (error) => {
        console.error('Error toggling follow:', error);
        alert('Failed to update follow status. Please try again.');
      }
    });
  }

  // Save Recipe Functionality
  saveRecipe(recipe: LocalRecipe, event: Event): void {
    event.stopPropagation();
   
    if (!this.currentUser) {
      this.router.navigate(['/login']);
      return;
    }

    const recipeId = recipe._id!;
    const isCurrentlySaved = recipe.isSaved;

    if (isCurrentlySaved) {
      // Remove from saved
      this.userService.removeSavedRecipe(this.currentUser._id, recipeId).subscribe({
        next: () => {
          this.savedRecipes.delete(recipeId);
          recipe.isSaved = false;
         
          // Update current user's saved recipes count
          if (this.currentUser) {
            const updatedUser: User = {
              ...this.currentUser,
              savedRecipesCount: Math.max(0, (this.currentUser.savedRecipesCount || 0) - 1)
            };
            this.authService.updateUserState(updatedUser);
          }
        },
        error: (error) => {
          console.error('Error removing saved recipe:', error);
          alert('Failed to remove from saved recipes. Please try again.');
        }
      });
    } else {
      // Add to saved
      this.userService.addSavedRecipe(this.currentUser._id, recipeId).subscribe({
        next: () => {
          this.savedRecipes.add(recipeId);
          recipe.isSaved = true;
         
          // Update current user's saved recipes count
          if (this.currentUser) {
            const updatedUser: User = {
              ...this.currentUser,
              savedRecipesCount: (this.currentUser.savedRecipesCount || 0) + 1
            };
            this.authService.updateUserState(updatedUser);
          }
        },
        error: (error) => {
          console.error('Error saving recipe:', error);
          alert('Failed to save recipe. Please try again.');
        }
      });
    }
  }

  // Favorite Recipe Functionality
  toggleFavorite(recipe: LocalRecipe, event: Event): void {
    event.stopPropagation();
   
    if (!this.currentUser) {
      this.router.navigate(['/login']);
      return;
    }

    const recipeId = recipe._id!;
    const isCurrentlyFavorite = recipe.isFavorite;

    if (isCurrentlyFavorite) {
      // Remove from favorites
      this.userService.removeFavoriteRecipe(this.currentUser._id, recipeId).subscribe({
        next: () => {
          this.favoriteRecipes.delete(recipeId);
          recipe.isFavorite = false;
          recipe.likesCount = Math.max(0, (recipe.likesCount || 1) - 1);
         
          // Update author's total likes
          if (this.author) {
            this.author.totalLikes = Math.max(0, (this.author.totalLikes || 1) - 1);
          }
         
          // Update current user's favorites count
          if (this.currentUser) {
            const updatedUser: User = {
              ...this.currentUser,
              favoritesCount: Math.max(0, (this.currentUser.favoritesCount || 0) - 1)
            };
            this.authService.updateUserState(updatedUser);
          }
        },
        error: (error) => {
          console.error('Error removing favorite recipe:', error);
          alert('Failed to remove from favorites. Please try again.');
        }
      });
    } else {
      // Add to favorites
      this.userService.addFavoriteRecipe(this.currentUser._id, recipeId).subscribe({
        next: () => {
          this.favoriteRecipes.add(recipeId);
          recipe.isFavorite = true;
          recipe.likesCount = (recipe.likesCount || 0) + 1;
         
          // Update author's total likes
          if (this.author) {
            this.author.totalLikes = (this.author.totalLikes || 0) + 1;
          }
         
          // Update current user's favorites count
          if (this.currentUser) {
            const updatedUser: User = {
              ...this.currentUser,
              favoritesCount: (this.currentUser.favoritesCount || 0) + 1
            };
            this.authService.updateUserState(updatedUser);
          }
        },
        error: (error) => {
          console.error('Error adding favorite recipe:', error);
          alert('Failed to add to favorites. Please try again.');
        }
      });
    }
  }

  navigateToRecipe(recipeId: string): void {
    this.router.navigate(['/recipes', recipeId]);
  }

  navigateToProfile(): void {
    if (this.isOwnProfile && this.currentUser) {
      this.router.navigate(['/profile']);
    }
  }

  getProfileImageUrl(): string {
    return this.authService.getFullProfileImageUrl(this.author?.profilePicture);
  }

  getCoverImageUrl(relativePath: string | undefined): string {
    if (!relativePath) return 'assets/user.png';
    return this.authService.getFullProfileImageUrl(relativePath);
  }

  handleImageError(event: Event): void {
    const imgElement = event.target as HTMLImageElement;
    imgElement.src = 'assets/recipe-placeholder.jpg';
  }

  onRecipeImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    console.error('Image failed to load:', img.src);
    img.src = 'assets/recipe-placeholder.jpg';
    img.onerror = null; // Prevent infinite loop
  }

  // FIXED: Simplified getRecipeImageUrl method
 getRecipeImageUrl(imagePath: string | undefined): string {
  console.log('Processing image path:', imagePath);
  
  if (!imagePath || imagePath.trim() === '' || imagePath === '/uploads/recipes/default.jpg') {
    console.log('Invalid or default image path, returning placeholder');
    return this.getRecipePlaceholder({}); // Pass empty object for generic placeholder
  }
  
  // Handle absolute URLs (already complete)
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://') || imagePath.startsWith('data:')) {
    console.log('Absolute URL, returning as-is:', imagePath);
    return imagePath;
  }
  
  // Handle local assets (Angular assets)
  if (imagePath.startsWith('assets/')) {
    console.log('Local asset, returning as-is:', imagePath);
    return imagePath;
  }
  
  // Handle server uploads - construct full URL
  const baseUrl = environment.imageBaseUrl || 'http://localhost:5000';
  
  // Ensure proper formatting
  let cleanPath = imagePath;
  
  // Remove leading slash if baseUrl already ends with one
  if (cleanPath.startsWith('/') && baseUrl.endsWith('/')) {
    cleanPath = cleanPath.substring(1);
  } else if (!cleanPath.startsWith('/') && !baseUrl.endsWith('/')) {
    cleanPath = '/' + cleanPath;
  }
  
  const fullUrl = `${baseUrl}${cleanPath}`;
  console.log('Constructed full URL:', fullUrl);
  
  return fullUrl;
}

  formatDate(date: Date): string {
    if (!date) return '';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  // Simplified stats: recipes, followers, following, likes, views
  getAuthorStats(): any[] {
    return [
      {
        iconPath: 'M20 2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-5 9h-4v4h-2v-4H7V9h4V5h2v4h4v2z',
        label: 'Recipes',
        value: this.author?.recipesCount || this.recipes.length,
        iconColor: '#f66d3b'
      },
      {
        iconPath: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5z',
        label: 'Followers',
        value: this.author?.followersCount || 0,
        iconColor: '#3b82f6'
      },
      {
        iconPath: 'M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
        label: 'Following',
        value: this.author?.followingCount || 0,
        iconColor: '#10b981'
      },
      {
        iconPath: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
        label: 'Likes',
        value: this.author?.totalLikes || 0,
        iconColor: '#ef4444'
      },
      {
        iconPath: 'M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z',
        label: 'Views',
        value: this.author?.totalViews || 0,
        iconColor: '#06b6d4'
      }
    ];
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}