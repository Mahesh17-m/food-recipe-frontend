import { Component, ElementRef, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { RecipeService } from '../../services/recipe.service';
import { AuthService } from '../../services/auth.service';
import { Recipe } from '../../models/recipe.model';
import { UserService } from '../../services/user.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject, Subscription, takeUntil } from 'rxjs';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, OnDestroy {
  heroHover = false;
  latestRecipes: Recipe[] = [];
  allRecipes: Recipe[] = [];
  activeRecipes: Recipe[] = [];
  newRecipes: Recipe[] = [];
  recipeOfTheDay: Recipe | null = null;
  searchQuery = '';
  currentSlideIndex = 0;
  autoSlideInterval: any;
  isLoading = false;
  isLoggedIn = false;
  activeTab = 'latest';
  
  favoriteRecipeIds: Set<string> = new Set();
  savedRecipeIds: Set<string> = new Set();
  currentUser: any = null;

  private authSubscription!: Subscription;
  private destroy$ = new Subject<void>();

  // Updated tabs without icons for cleaner look
  recipeTabs = [
    { id: 'latest', label: 'Latest Recipes' },
    { id: 'popular', label: 'Most Popular Recipes' },
    { id: 'fastest', label: 'Fastest Recipes' },
    { id: 'editors', label: "Editor's Choice" }
  ];

  // Templates for hero section
  templates = [
    { id: 'nonveg', name: 'Non-Veg' },
    { id: 'pancakes', name: 'Pancakes' },
    { id: 'fastfood', name: 'Fast Food' },
    { id: 'eggs', name: 'Eggs' }
  ];

  categories = [
    { name: 'Breakfast', image: 'breakfast.jpg' },
    { name: 'Lunch', image: 'lunch.jpg' },
    { name: 'Dinner', image: 'dinner.jpg' },
    { name: 'Desserts', image: 'desserts.jpg' },
    { name: 'Vegetarian', image: 'vegetarian.jpg' },
    { name: 'Non-Vegetarian', image: 'Non-vegetarian.jpg' },
    { name: 'Salads', image: 'salad.jpg' },
    { name: 'Soups', image: 'soup.jpg' },
    { name: 'Juices', image: 'juice.jpg' },
    { name: 'Snacks', image: 'snack.jpg' },
    { name: 'Vegan', image: 'vegan.jpg' }
  ];

  @ViewChild('carousel') carousel!: ElementRef;

  constructor(
    private recipeService: RecipeService,
    private authService: AuthService,
    private userService: UserService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.checkAuthStatus();
    this.loadAllRecipes();
    this.startAutoSlide();
  }

  checkAuthStatus(): void {
    this.authSubscription = this.authService.currentUser$.subscribe(user => {
      this.isLoggedIn = !!user && this.authService.isAuthenticated();
      this.currentUser = user;
      
      if (this.isLoggedIn && user) {
        this.loadUserPreferences();
      } else {
        this.savedRecipeIds.clear();
        this.favoriteRecipeIds.clear();
      }
    });
  }

  loadUserPreferences(): void {
    if (this.currentUser) {
      // Load saved recipes
      this.userService.getSavedRecipes(this.currentUser.id).subscribe({
        next: (savedRecipes: Recipe[]) => {
          this.savedRecipeIds = new Set(savedRecipes.map(recipe => recipe._id));
        },
        error: (error: any) => {
          console.error('Error loading saved recipes:', error);
        }
      });

      // Load favorite recipes
      this.userService.getFavoriteRecipes(this.currentUser.id).subscribe({
        next: (favoriteRecipes: Recipe[]) => {
          this.favoriteRecipeIds = new Set(favoriteRecipes.map(recipe => recipe._id));
        },
        error: (error: any) => {
          console.error('Error loading favorite recipes:', error);
        }
      });
    }
  }

  truncateDescription(description: string | undefined, limit: number = 80): string {
    if (!description) return '';
    
    if (description.length <= limit) {
      return description;
    }
    
    return description.substr(0, limit) + '...';
  }

  getRecipeCategory(recipe: Recipe): string {
    // Use actual category from recipe data first
    if (recipe.category) {
      return recipe.category;
    }
    
    // Fallback to tag-based detection
    if (recipe.tags?.includes('pasta') || recipe.title?.toLowerCase().includes('pasta')) {
      return 'Pasta';
    } else if (recipe.tags?.includes('salad') || recipe.title?.toLowerCase().includes('salad')) {
      return 'Salad';
    } else if (recipe.tags?.includes('dessert') || recipe.title?.toLowerCase().includes('dessert')) {
      return 'Dessert';
    } else if (recipe.tags?.includes('breakfast') || recipe.title?.toLowerCase().includes('breakfast')) {
      return 'Breakfast';
    } else if (recipe.tags?.includes('drink') || recipe.title?.toLowerCase().includes('juice') || recipe.title?.toLowerCase().includes('smoothie')) {
      return 'Drink';
    } else if (recipe.tags?.includes('main') || recipe.title?.toLowerCase().includes('main')) {
      return 'Main';
    } else {
      return 'Recipe';
    }
  }

  // === FAVORITE & SAVE FUNCTIONS ===
  toggleFavorite(recipeId: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    const isFavorited = this.favoriteRecipeIds.has(recipeId);
    const action = isFavorited
      ? this.recipeService.removeFavorite(recipeId)
      : this.recipeService.addToFavorites(recipeId);

    action.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        if (isFavorited) {
          this.favoriteRecipeIds.delete(recipeId);
        } else {
          this.favoriteRecipeIds.add(recipeId);
        }
        this.forceUpdate();
      },
      error: (error) => console.error('Error toggling favorite:', error)
    });
  }

  toggleSave(recipeId: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    const isSaved = this.savedRecipeIds.has(recipeId);
    const action = isSaved
      ? this.recipeService.removeSavedRecipe(recipeId)
      : this.recipeService.saveRecipe(recipeId);

    action.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        if (isSaved) {
          this.savedRecipeIds.delete(recipeId);
        } else {
          this.savedRecipeIds.add(recipeId);
        }
        this.forceUpdate();
      },
      error: (error) => console.error('Error toggling save:', error)
    });
  }

  isRecipeSaved(recipeId: string): boolean {
    return this.savedRecipeIds.has(recipeId);
  }

  isRecipeFavorited(recipeId: string): boolean {
    return this.favoriteRecipeIds.has(recipeId);
  }

  forceUpdate(): void {
    // Force change detection to update the UI
    this.activeRecipes = [...this.activeRecipes];
    this.newRecipes = [...this.newRecipes];
  }

  getRecipeRating(recipe: Recipe): number | null {
    // Only show rating if recipe has actual ratings or reviews
    if (recipe.rating && recipe.rating > 0) {
      return recipe.rating;
    }
    
    // If no rating, calculate based on reviews
    if (recipe.reviews && recipe.reviews.length > 0) {
      const totalRating = recipe.reviews.reduce((sum: number, review: any) => sum + (review.rating || 0), 0);
      const averageRating = totalRating / recipe.reviews.length;
      return Math.round(averageRating * 10) / 10; // Round to 1 decimal place
    }
    
    // Return null if no rating data available
    return null;
  }

  // Helper method to check if recipe has rating
  hasRating(recipe: Recipe): boolean {
    return this.getRecipeRating(recipe) !== null;
  }

  startAutoSlide(): void {
    this.autoSlideInterval = setInterval(() => {
      this.nextSlide();
    }, 5000);
  }

  pauseAutoSlide(): void {
    if (this.autoSlideInterval) {
      clearInterval(this.autoSlideInterval);
    }
  }

  resumeAutoSlide(): void {
    this.pauseAutoSlide();
    this.startAutoSlide();
  }

  nextSlide(): void {
    this.currentSlideIndex = (this.currentSlideIndex + 1) % this.templates.length;
  }

  prevSlide(): void {
    this.currentSlideIndex = (this.currentSlideIndex - 1 + this.templates.length) % this.templates.length;
  }

  setActiveSlide(index: number): void {
    this.currentSlideIndex = index;
    this.resumeAutoSlide();
  }

  navigateToChefs(): void {
    this.router.navigate(['/chefs']);
  }

  loadAllRecipes(): void {
    this.isLoading = true;
    this.recipeService.getRecipes(1, 50).subscribe({
      next: (response: any) => {
        // Extract recipes from response
        this.allRecipes = response.recipes || [];
        
        console.log('Loaded recipes:', this.allRecipes.length);
        
        // Ensure all recipes have proper image URLs
        this.allRecipes.forEach(recipe => {
          if (recipe.imageUrl && !recipe.imageUrl.startsWith('http')) {
            recipe.imageUrl = this.recipeService.getFullImageUrl(recipe.imageUrl);
          }
        });
        
        // Latest recipes (most recent 10)
        this.latestRecipes = [...this.allRecipes]
          .sort((a: Recipe, b: Recipe) => 
            new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
          )
          .slice(0, 10);
        
        // New Recipes for 2x4 grid (8 recipes)
        this.newRecipes = [...this.allRecipes]
          .sort((a: Recipe, b: Recipe) => 
            new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
          )
          .slice(0, 8);
        
        // Recipe of the Day - Get first recipe added today or latest
        this.setRecipeOfTheDay();
        
        this.switchTab('latest');
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('Error loading recipes:', error);
        this.isLoading = false;
        // Fallback to empty arrays
        this.allRecipes = [];
        this.latestRecipes = [];
        this.newRecipes = [];
        this.activeRecipes = [];
      }
    });
  }

  setRecipeOfTheDay(): void {
    if (this.allRecipes.length === 0) {
      this.recipeOfTheDay = null;
      return;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Try to find a recipe created today
    const todaysRecipe = this.allRecipes.find(recipe => {
      if (!recipe.createdAt) return false;
      const recipeDate = new Date(recipe.createdAt);
      recipeDate.setHours(0, 0, 0, 0);
      return recipeDate.getTime() === today.getTime();
    });
    
    if (todaysRecipe) {
      this.recipeOfTheDay = todaysRecipe;
      return;
    }
    
    // If no recipe from today, get the most recent recipe
    const mostRecent = [...this.allRecipes].sort((a, b) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    )[0];
    
    this.recipeOfTheDay = mostRecent;
  }

  switchTab(tabId: string): void {
    this.activeTab = tabId;
    
    if (this.allRecipes.length === 0) {
      this.activeRecipes = [];
      return;
    }
    
    switch(tabId) {
      case 'latest':
        this.activeRecipes = [...this.allRecipes]
          .sort((a, b) => 
            new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
          )
          .slice(0, 5);
        break;
        
      case 'popular':
        // Only include recipes that have actual ratings
        this.activeRecipes = [...this.allRecipes]
          .filter(recipe => this.hasRating(recipe))
          .sort((a, b) => {
            const ratingA = this.getRecipeRating(a) || 0;
            const ratingB = this.getRecipeRating(b) || 0;
            return ratingB - ratingA;
          })
          .slice(0, 5);
        break;
        
      case 'fastest':
        this.activeRecipes = [...this.allRecipes]
          .filter(recipe => {
            const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0);
            return totalTime > 0 && totalTime <= 30;
          })
          .sort((a, b) => {
            const aTime = (a.prepTime || 0) + (a.cookTime || 0);
            const bTime = (b.prepTime || 0) + (b.cookTime || 0);
            return aTime - bTime;
          })
          .slice(0, 5);
        break;
        
      case 'editors':
        // Only include recipes with high ratings
        this.activeRecipes = [...this.allRecipes]
          .filter(recipe => {
            const rating = this.getRecipeRating(recipe);
            return rating !== null && rating >= 4.5;
          })
          .slice(0, 5);
        break;
    }
  }

  scrollCarousel(direction: number): void {
    if (this.carousel) {
      const carousel = this.carousel.nativeElement;
      const scrollAmount = carousel.offsetWidth * 0.8 * direction;
      carousel.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  }

  viewRecipe(recipeId: string): void {
    this.router.navigate(['/recipes', recipeId]);
  }

  navigateToRecipes(): void {
    if (this.searchQuery.trim()) {
      this.router.navigate(['/recipes'], { queryParams: { search: this.searchQuery } });
    } else {
      this.router.navigate(['/recipes']);
    }
  }

  filterByCategory(category: string): void {
    this.router.navigate(['/recipes'], { queryParams: { category } });
  }

  handleImageError(event: Event): void {
    const imgElement = event.target as HTMLImageElement;
    imgElement.src = 'assets/recipe-placeholder.jpg';
  }

  ngOnDestroy(): void {
    this.pauseAutoSlide();
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
    this.destroy$.next();
    this.destroy$.complete();
  }
}