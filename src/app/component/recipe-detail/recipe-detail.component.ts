import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { RecipeService } from '../../services/recipe.service';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Recipe, Review, User } from '../../models/recipe.model';
import { Observable } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-recipe-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './recipe-detail.component.html',
  styleUrls: ['./recipe-detail.component.css']
})
export class RecipeDetailComponent implements OnInit {
  recipe: Recipe | null = null;
  author: User | null = null;
  reviews: Review[] = [];
  similarRecipes: Recipe[] = [];
  isLoggedIn$: Observable<boolean>;
  isFavorite = false;
  isSaved = false;
  isFollowingAuthor = false;
  isLoading = true;
  showReviewForm = false;
  reviewForm: FormGroup;
  activeTab = 'ingredients';
  servingSize = 1;
  currentUser: any = null;
  showFollowButton = false;
  checkedIngredients: boolean[] = [];
  currentUserIdFromAuth: string = '';

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private location: Location,
    private recipeService: RecipeService,
    public authService: AuthService,
    private userService: UserService,
    private fb: FormBuilder
  ) {
    this.isLoggedIn$ = this.authService.isLoggedIn();
    this.reviewForm = this.fb.group({
      rating: [5, [Validators.required, Validators.min(1), Validators.max(5)]],
      comment: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]]
    });
  }

  ngOnInit(): void {
    // Get user ID from AuthService
    this.currentUserIdFromAuth = this.getCurrentUserIdFromAuthService();
    
    // Subscribe to current user
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      
      // Then get recipe ID and load recipe
      this.route.params.subscribe(params => {
        const recipeId = params['id'];
        if (recipeId) {
          this.loadRecipe(recipeId);
        }
      });
    });
  }

  private getCurrentUserIdFromAuthService(): string {
    try {
      // Check localStorage for user data
      const currentUserStr = localStorage.getItem('currentUser');
      if (currentUserStr) {
        const user = JSON.parse(currentUserStr);
        return user?._id || user?.id || '';
      }
      
      // Also check the AuthService currentUser value
      if (this.authService.currentUserValue) {
        const user = this.authService.currentUserValue;
        return user._id || user.id || '';
      }
      
      return '';
    } catch (error) {
      return '';
    }
  }

  private isSameUser(): boolean {
    if (!this.currentUser || !this.author) return false;
    
    // First try to compare by ID
    const currentUserId = this.currentUser._id || this.currentUser.id || this.currentUserIdFromAuth;
    const authorId = this.author._id;
    
    // If we have IDs and they match, it's definitely the same user
    if (currentUserId && authorId && currentUserId === authorId) {
      return true;
    }
    
    // If IDs don't match or one is missing, compare usernames
    if (this.currentUser.username && this.author.username) {
      const isSameUsername = this.currentUser.username.toLowerCase() === this.author.username.toLowerCase();
      
      if (isSameUsername) {
        return true;
      }
    }
    
    return false;
  }

  goBack(): void {
    this.location.back();
  }

  getSafeImageUrl(url: string | undefined): string {
    if (!url) return 'assets/recipe-placeholder.jpg';
    return this.recipeService.getFullImageUrl(url);
  }

  isOwnReview(review: Review): boolean {
    if (!this.currentUser || !review.author) return false;
    
    // Get current user ID from multiple sources
    const currentUserId = this.currentUser._id || this.currentUser.id || this.currentUserIdFromAuth;
    
    // Get review author ID - check both _id and id fields
    const reviewAuthorId = review.author._id || review.author.id;
    
    // Debug information
    console.log('=== Review Ownership Check ===');
    console.log('Current User:', this.currentUser);
    console.log('Current User ID:', currentUserId);
    console.log('Review Author:', review.author);
    console.log('Review Author ID:', reviewAuthorId);
    console.log('Review ID:', review._id);
    console.log('Is Own Review?', currentUserId && reviewAuthorId && currentUserId === reviewAuthorId);
    console.log('=======================');
    
    // Check if IDs match
    if (currentUserId && reviewAuthorId && currentUserId === reviewAuthorId) {
      return true;
    }
    
    // Also check by username as fallback
    if (this.currentUser.username && review.author.username) {
      return this.currentUser.username.toLowerCase() === review.author.username.toLowerCase();
    }
    
    return false;
  }

  handleImageError(event: Event): void {
    const imgElement = event.target as HTMLImageElement;
    imgElement.src = 'assets/recipe-placeholder.jpg';
  }

  handleUserImageError(event: Event): void {
    const imgElement = event.target as HTMLImageElement;
    imgElement.src = 'assets/user.png';
  }

  navigateToAuthorProfile(): void {
    if (!this.author) return;
    this.router.navigate(['/author', this.author._id]);
  }

  onIngredientToggle(index: number): void {
    this.checkedIngredients[index] = !this.checkedIngredients[index];
  }

  loadRecipe(recipeId: string): void {
    this.isLoading = true;
    this.recipeService.getRecipe(recipeId).subscribe({
      next: (recipe: Recipe) => {
        this.recipe = recipe;
        this.servingSize = recipe.servings || 1;
        this.checkedIngredients = new Array(recipe.ingredients?.length || 0).fill(false);
        
        // Handle author loading
        if (recipe.author) {
          this.author = this.createCompleteUserObject(recipe.author);
          // Update follow button immediately after setting author
          this.updateFollowButtonVisibility();
        } else if (recipe.userId) {
          this.loadAuthor(recipe.userId);
        } else {
          this.setDefaultAuthor();
          // Update follow button immediately after setting default author
          this.updateFollowButtonVisibility();
        }
        
        // Load other data
        this.loadReviews(recipeId);
        this.loadSimilarRecipes(recipeId, recipe.category);
        this.checkFavoriteStatus(recipeId);
        this.checkSavedStatus(recipeId);
        
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Error loading recipe:', error);
        this.router.navigate(['/not-found']);
      }
    });
  }

  private updateFollowButtonVisibility(): void {
    // Reset to false initially
    this.showFollowButton = false;
    this.isFollowingAuthor = false;
    
    // Basic checks
    if (!this.authService.isAuthenticated()) {
      return;
    }
    
    if (!this.author) {
      return;
    }
    
    // Check if it's the same user (using both ID and username)
    if (this.isSameUser()) {
      this.showFollowButton = false;
      this.isFollowingAuthor = false;
      return;
    }
    
    // All checks passed - show follow button
    this.showFollowButton = true;
    
    // Check following status
    this.checkFollowingStatus();
  }

  private createCompleteUserObject(userData: any): User {
    const userId = userData?._id || userData?.id || 'unknown';
    
    return {
      id: userId,
      _id: userId,
      username: userData?.username || 'Unknown Chef',
      email: userData?.email || '',
      name: userData?.name || userData?.username || '',
      savedRecipesCount: userData?.savedRecipesCount || 0,
      profilePicture: this.authService.getFullProfileImageUrl(userData?.profilePicture),
      coverPicture: userData?.coverPicture || '',
      tagline: userData?.tagline || '',
      bio: userData?.bio || '',
      location: userData?.location || '',
      website: userData?.website || '',
      cookingStyle: userData?.cookingStyle || '',
      socialMedia: userData?.socialMedia || {},
      interests: userData?.interests || [],
      specialties: userData?.specialties || [],
      recipesCount: userData?.recipesCount || 0,
      favoritesCount: userData?.favoritesCount || 0,
      reviewsCount: userData?.reviewsCount || 0,
      followersCount: userData?.followersCount || 0,
      followingCount: userData?.followingCount || 0,
      totalLikes: userData?.totalLikes || 0,
      totalViews: userData?.totalViews || 0,
      totalInteractions: userData?.totalInteractions || 0,
      engagementRate: userData?.engagementRate || 0,
      memberSince: userData?.memberSince || userData?.createdAt || new Date().toISOString(),
      lastActive: userData?.lastActive || new Date().toISOString(),
      isVerified: userData?.isVerified || false,
      isProChef: userData?.isProChef || false,
      proChefInfo: userData?.proChefInfo || {},
      privacySettings: userData?.privacySettings || {},
      notificationSettings: userData?.notificationSettings || {},
      favorites: userData?.favorites || [],
      savedRecipes: userData?.savedRecipes || [],
      followers: userData?.followers || [],
      following: userData?.following || [],
      badges: userData?.badges || [],
      recentRecipes: userData?.recentRecipes || [],
      recentReviews: userData?.recentReviews || [],
      createdAt: userData?.createdAt || new Date().toISOString(),
      updatedAt: userData?.updatedAt || new Date().toISOString()
    };
  }

  loadAuthor(userId: string): void {
    this.userService.getAuthorProfile(userId).subscribe({
      next: (authorData: any) => {
        this.author = this.createCompleteUserObject(authorData);
        
        // Update follow button visibility after loading author
        this.updateFollowButtonVisibility();
      },
      error: (error: any) => {
        console.error('Error loading author:', error);
        this.setDefaultAuthor(userId);
        this.updateFollowButtonVisibility();
      }
    });
  }

  private setDefaultAuthor(userId?: string): void {
    this.author = {
      id: userId || 'unknown',
      _id: userId || 'unknown',
      username: 'Unknown Chef',
      email: '',
      name: 'Unknown Chef',
      savedRecipesCount: 0,
      profilePicture: 'assets/user.png',
      coverPicture: '',
      tagline: '',
      bio: '',
      location: '',
      website: '',
      cookingStyle: '',
      socialMedia: {},
      interests: [],
      specialties: [],
      recipesCount: 0,
      favoritesCount: 0,
      reviewsCount: 0,
      followersCount: 0,
      followingCount: 0,
      totalLikes: 0,
      totalViews: 0,
      totalInteractions: 0,
      engagementRate: 0,
      memberSince: new Date().toISOString(),
      lastActive: new Date().toISOString(),
      isVerified: false,
      isProChef: false,
      proChefInfo: {},
      privacySettings: {},
      notificationSettings: {},
      favorites: [],
      savedRecipes: [],
      followers: [],
      following: [],
      badges: [],
      recentRecipes: [],
      recentReviews: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  loadReviews(recipeId: string): void {
    this.recipeService.getReviews(recipeId).subscribe({
      next: (reviews: Review[]) => {
        this.reviews = reviews.map((review: Review) => ({
          ...review,
          author: {
            ...review.author,
            profilePicture: this.authService.getFullProfileImageUrl(review.author.profilePicture)
          }
        }));
        
        // Debug: Check all reviews after loading
        console.log('=== Loaded Reviews ===');
        this.reviews.forEach((review, index) => {
          console.log(`Review ${index}:`, {
            id: review._id,
            author: review.author,
            isOwn: this.isOwnReview(review)
          });
        });
      },
      error: (error: any) => {
        console.error('Error loading reviews:', error);
      }
    });
  }

  loadSimilarRecipes(recipeId: string, category?: string): void {
    if (!category) return;
    
    this.recipeService.getRecipesByCategory(category).subscribe({
      next: (recipes: Recipe[]) => {
        this.similarRecipes = recipes
          .filter((r: Recipe) => r._id !== recipeId)
          .slice(0, 3)
          .map(recipe => ({
            ...recipe,
            imageUrl: this.recipeService.getFullImageUrl(recipe.imageUrl)
          }));
      },
      error: (error: any) => {
        console.error('Error loading similar recipes:', error);
        this.similarRecipes = [];
      }
  });
  }

  checkFavoriteStatus(recipeId: string): void {
    if (!this.authService.isAuthenticated()) return;
    
    this.recipeService.getFavoriteRecipes().subscribe({
      next: (recipes: Recipe[]) => {
        this.isFavorite = recipes.some((r: Recipe) => r._id === recipeId);
      },
      error: (error: any) => {
        console.error('Error checking favorite status:', error);
        this.isFavorite = false;
      }
    });
  }

  checkSavedStatus(recipeId: string): void {
    if (!this.authService.isAuthenticated()) return;
    
    this.recipeService.getSavedRecipes().subscribe({
      next: (recipes: Recipe[]) => {
        this.isSaved = recipes.some((r: Recipe) => r._id === recipeId);
      },
      error: (error: any) => {
        console.error('Error checking saved status:', error);
        this.isSaved = false;
      }
    });
  }

  checkFollowingStatus(): void {
    if (!this.showFollowButton || !this.author || !this.authService.isAuthenticated()) {
      this.isFollowingAuthor = false;
      return;
    }
    
    const authorId = this.author._id;
    
    this.userService.getFollowing().subscribe({
      next: (response: any) => {
        let followingUsers: any[] = [];
        
        if (Array.isArray(response)) {
          followingUsers = response;
        } else if (response && Array.isArray(response.following)) {
          followingUsers = response.following;
        } else if (response && response.data && Array.isArray(response.data)) {
          followingUsers = response.data;
        }
        
        // Check if author is in following list
        this.isFollowingAuthor = followingUsers.some((user: any) => {
          const userId = user._id || user.id;
          return userId === authorId;
        });
      },
      error: (error: any) => {
        console.error('Error checking following status:', error);
        this.isFollowingAuthor = false;
      }
    });
  }

  toggleFavorite(): void {
    if (!this.recipe) return;
    
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }
    
    const recipeId = this.recipe._id;
    const action = this.isFavorite 
      ? this.recipeService.removeFavorite(recipeId)
      : this.recipeService.addToFavorites(recipeId);
    
    action.subscribe({
      next: () => {
        this.isFavorite = !this.isFavorite;
      },
      error: (error: any) => {
        console.error('Error toggling favorite:', error);
        alert('Failed to update favorites. Please try again.');
      }
    });
  }

  toggleSave(): void {
    if (!this.recipe) return;
    
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }
    
    const recipeId = this.recipe._id;
    const action = this.isSaved 
      ? this.recipeService.removeSavedRecipe(recipeId)
      : this.recipeService.saveRecipe(recipeId);
    
    action.subscribe({
      next: () => {
        this.isSaved = !this.isSaved;
      },
      error: (error: any) => {
        console.error('Error toggling save:', error);
        alert('Failed to update saved recipes. Please try again.');
      }
    });
  }

  toggleFollow(): void {
    if (!this.showFollowButton || !this.author || !this.authService.isAuthenticated()) {
      return;
    }
    
    const authorId = this.author._id;
    
    this.userService.toggleFollow(authorId).subscribe({
      next: (response: any) => {
        this.isFollowingAuthor = !this.isFollowingAuthor;
        
        if (this.author && response) {
          this.author.followersCount = response.followersCount || 
            (this.isFollowingAuthor 
              ? (this.author.followersCount || 0) + 1 
              : Math.max((this.author.followersCount || 1) - 1, 0));
        }
      },
      error: (error: any) => {
        console.error('Error toggling follow:', error);
        alert(error.message || 'Failed to update follow status. Please try again.');
      }
    });
  }

  submitReview(): void {
    if (!this.recipe || this.reviewForm.invalid) return;

    if (!this.currentUser) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }

    const userId = this.currentUser._id || this.currentUser.id || this.currentUserIdFromAuth;
    if (this.reviews.some(review => this.isOwnReview(review))) {
      alert('You have already reviewed this recipe.');
      return;
    }

    const reviewData = this.reviewForm.value;
    this.recipeService.addReview(this.recipe._id, reviewData).subscribe({
      next: (review: Review) => {
        const processedReview = {
          ...review,
          author: {
            ...review.author,
            profilePicture: this.authService.getFullProfileImageUrl(review.author.profilePicture)
          }
        };
        
        this.reviews.push(processedReview);
        this.reviewForm.reset({ rating: 5, comment: '' });
        this.showReviewForm = false;
        
        if (this.recipe) {
          this.loadRecipe(this.recipe._id);
        }
      },
      error: (error: any) => {
        console.error('Error submitting review:', error);
        alert(error.message || 'Failed to submit review. Please try again.');
      }
    });
  }

  deleteReview(reviewId: string): void {
    if (!this.recipe) return;
    if (confirm('Are you sure you want to delete this review?')) {
      this.recipeService.deleteReview(this.recipe._id, reviewId).subscribe({
        next: () => {
          this.reviews = this.reviews.filter(r => r._id !== reviewId);
          if (this.recipe) {
            this.loadRecipe(this.recipe._id);
          }
        },
        error: (error: any) => {
          console.error('Error deleting review:', error);
          alert('Failed to delete review. Please try again.');
        }
      });
    }
  }

  adjustServings(factor: number): void {
    if (!this.recipe) return;
    this.servingSize = Math.max(1, this.servingSize + factor);
    this.checkedIngredients = new Array(this.recipe.ingredients?.length || 0).fill(false);
  }

  printRecipe(): void {
    window.print();
  }

  shareRecipe(platform: string): void {
    if (!this.recipe) return;
    
    const recipeUrl = window.location.href;
    const title = encodeURIComponent(this.recipe.title);
    const description = encodeURIComponent(this.recipe.description || 'Check out this amazing recipe!');
    
    let shareUrl = '';
    
    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${title}&url=${encodeURIComponent(recipeUrl)}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(recipeUrl)}&quote=${description}`;
        break;
      case 'copy':
        navigator.clipboard.writeText(recipeUrl).then(() => {
          alert('Recipe link copied to clipboard!');
        }).catch(() => {
          const textArea = document.createElement('textarea');
          textArea.value = recipeUrl;
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
          alert('Recipe link copied to clipboard!');
        });
        return;
    }
    
    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400');
    }
  }

  reportRecipe(): void {
    if (!this.recipe) return;
    const reason = prompt('Please specify the reason for reporting this recipe:');
    if (reason) {
      this.recipeService.reportRecipe(this.recipe._id, reason).subscribe({
        next: () => {
          alert('Thank you for your report. We will review this recipe shortly.');
        },
        error: (error: any) => {
          console.error('Error reporting recipe:', error);
          alert('Failed to report recipe. Please try again.');
        }
      });
    }
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

  getAdjustedIngredients(): any[] {
    if (!this.recipe || !this.recipe.ingredients) return [];
    
    return this.recipe.ingredients.map((ingredient: any) => {
      const originalAmount = this.parseIngredientAmount(ingredient.amount);
      const originalServings = this.recipe?.servings || 1;
      
      if (originalAmount === 0) {
        return {
          ...ingredient,
          adjustedAmount: ingredient.amount
        };
      }
      
      const adjustedAmount = (originalAmount / originalServings) * this.servingSize;
      return {
        ...ingredient,
        adjustedAmount: this.formatAmount(adjustedAmount)
      };
    });
  }

  calculateAdjustedAmount(amount: string): string {
    if (!amount || !this.recipe) return '';
    const numericAmount = this.parseIngredientAmount(amount);
    if (numericAmount === 0) return amount;
    const adjustedAmount = (numericAmount / (this.recipe.servings || 1)) * this.servingSize;
    return this.formatAmount(adjustedAmount);
  }

  getCookingTime(): number {
    if (!this.recipe) return 0;
    return (this.recipe.prepTime || 0) + (this.recipe.cookTime || 0);
  }

  private formatAmount(amount: number): string {
    if (amount % 1 === 0) {
      return amount.toString();
    }
    
    const tolerance = 0.01;
    const fractions = [
      { value: 0.125, text: '1/8' },
      { value: 0.25, text: '1/4' },
      { value: 0.333, text: '1/3' },
      { value: 0.5, text: '1/2' },
      { value: 0.666, text: '2/3' },
      { value: 0.75, text: '3/4' }
    ];
    
    for (const fraction of fractions) {
      if (Math.abs(amount - fraction.value) < tolerance) {
        return fraction.text;
      }
    }
    
    return Math.round(amount * 100) / 100 === Math.round(amount) 
      ? Math.round(amount).toString()
      : (Math.round(amount * 100) / 100).toString();
  }

  private parseIngredientAmount(amount: string): number {
    if (!amount) return 0;
    
    if (amount.includes('/')) {
      const parts = amount.split('/');
      if (parts.length === 2) {
        const numerator = parseFloat(parts[0]);
        const denominator = parseFloat(parts[1]);
        if (!isNaN(numerator) && !isNaN(denominator) && denominator !== 0) {
          return numerator / denominator;
        }
      }
    }
    
    const numericValue = parseFloat(amount);
    return isNaN(numericValue) ? 0 : numericValue;
  }
}