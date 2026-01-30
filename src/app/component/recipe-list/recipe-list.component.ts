import { Component, OnInit, OnDestroy } from '@angular/core';
import { RecipeService } from '../../services/recipe.service';
import { AuthService } from '../../services/auth.service';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { Observable, Subject } from 'rxjs';
import { Recipe } from '../../models/recipe.model';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { TruncatePipe } from '../../../truncate.pipe';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-recipe-list',
  standalone: true,
  imports: [FormsModule, RouterModule, CommonModule, TruncatePipe],
  templateUrl: './recipe-list.component.html',
  styleUrls: ['./recipe-list.component.css']
})
export class RecipeListComponent implements OnInit, OnDestroy {
  allRecipes: Recipe[] = [];
  filteredRecipes: Recipe[] = [];
  isLoading = true;

  // filters
  searchQuery = '';
  selectedCategory = '';
  maxTime = '';
  difficulty = '';
  categories: string[] = [];
  showFilters = false;

  // pagination
  recipesPerPage = 12; // 4 rows * 3 columns
  currentPage = 1;

  isLoggedIn$: Observable<boolean>;
  savedRecipeIds: Set<string> = new Set();
  favoriteRecipeIds: Set<string> = new Set();

  private destroy$ = new Subject<void>();

  constructor(
    private recipeService: RecipeService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.isLoggedIn$ = this.authService.isLoggedIn();
  }

  ngOnInit(): void {
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        this.searchQuery = params['search'] || '';
        this.selectedCategory = params['category'] || '';
        this.loadRecipes();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // === LOAD RECIPES ===
  loadRecipes(): void {
    this.isLoading = true;
    this.recipeService.getRecipes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (recipes) => {
          this.allRecipes = recipes.recipes;
          this.extractCategories();
          this.applyFilters();
          this.loadUserData();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading recipes:', error);
          this.isLoading = false;
        }
      });
  }

  loadUserData(): void {
    if (!this.authService.isAuthenticated()) return;

    this.recipeService.getSavedRecipes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (savedRecipes) => {
          this.savedRecipeIds = new Set(savedRecipes.map(r => r._id));
        },
        error: (error) => {
          console.error('Error loading saved recipes:', error);
        }
      });

    this.recipeService.getFavoriteRecipes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (favoriteRecipes) => {
          this.favoriteRecipeIds = new Set(favoriteRecipes.map(r => r._id));
        },
        error: (error) => {
          console.error('Error loading favorite recipes:', error);
        }
      });
  }
 toggleFilterPanel(): void {
    this.showFilters = !this.showFilters;
  }
  // === CATEGORY EXTRACTION ===
  extractCategories(): void {
    const categorySet = new Set<string>();
    this.allRecipes.forEach(recipe => {
      if (recipe.category) categorySet.add(recipe.category);
    });
    this.categories = Array.from(categorySet).sort();
  }

  // === IMAGE HANDLER ===
  getSafeImageUrl(url: string): string {
    return this.recipeService.getFullImageUrl(url);
  }

  handleImageError(event: Event): void {
    const imgElement = event.target as HTMLImageElement;
    imgElement.src = 'assets/recipe-placeholder.jpg';
  }

  // === FILTER LOGIC ===
  applyFilters(): void {
    this.filteredRecipes = this.allRecipes.filter(recipe => {
      const matchesSearch = !this.searchQuery ||
        recipe.title.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        recipe.description?.toLowerCase().includes(this.searchQuery.toLowerCase());

      const matchesCategory = !this.selectedCategory || recipe.category === this.selectedCategory;

      const matchesTime = !this.maxTime ||
        (recipe.prepTime + recipe.cookTime) <= parseInt(this.maxTime);

      const matchesDifficulty = !this.difficulty || recipe.difficulty === this.difficulty;

      return matchesSearch && matchesCategory && matchesTime && matchesDifficulty;
    });

    this.currentPage = 1; // reset page when filters applied

    const queryParams: any = {};
    if (this.searchQuery) queryParams.search = this.searchQuery;
    if (this.selectedCategory) queryParams.category = this.selectedCategory;

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge'
    });
  }

  selectCategory(category: string): void {
    this.selectedCategory = this.selectedCategory === category ? '' : category;
    this.applyFilters();
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.selectedCategory = '';
    this.maxTime = '';
    this.difficulty = '';
    this.applyFilters();
  }

  // === FAVORITE & SAVE ===
  toggleFavorite(recipeId: string): void {
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
        if (isFavorited) this.favoriteRecipeIds.delete(recipeId);
        else this.favoriteRecipeIds.add(recipeId);
      },
      error: (error) => console.error('Error toggling favorite:', error)
    });
  }

  toggleSave(recipeId: string): void {
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
        if (isSaved) this.savedRecipeIds.delete(recipeId);
        else this.savedRecipeIds.add(recipeId);
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

  // === PAGINATION ===
  get totalPages(): number {
    return Math.ceil(this.filteredRecipes.length / this.recipesPerPage);
  }

  get paginatedRecipes(): Recipe[] {
    const startIndex = (this.currentPage - 1) * this.recipesPerPage;
    return this.filteredRecipes.slice(startIndex, startIndex + this.recipesPerPage);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) this.currentPage++;
  }

  prevPage(): void {
    if (this.currentPage > 1) this.currentPage--;
  }
}
