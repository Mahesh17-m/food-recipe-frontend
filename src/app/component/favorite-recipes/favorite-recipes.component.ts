import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { RecipeService } from '../../services/recipe.service';
import { AuthService } from '../../services/auth.service';
import { Recipe } from '../../models/recipe.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-favorite-recipes',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './favorite-recipes.component.html',
  styleUrls: ['./favorite-recipes.component.css']
})
export class FavoriteRecipesComponent implements OnInit, OnDestroy {
  recipes: Recipe[] = [];
  isLoading = true;
  errorMessage: string | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private recipeService: RecipeService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadFavorites();
    
    // Subscribe to favorite updates
    this.recipeService.recipeAddedToFavorites$
      .pipe(takeUntil(this.destroy$))
      .subscribe((recipeId: string) => {
        // Reload favorites when a new recipe is favorited
        this.loadFavorites();
      });

    this.recipeService.recipeRemovedFromFavorites$
      .pipe(takeUntil(this.destroy$))
      .subscribe((recipeId: string) => {
        this.recipes = this.recipes.filter(r => r._id !== recipeId);
      });
  }

  loadFavorites(): void {
    this.isLoading = true;
    this.errorMessage = null;
    
    this.recipeService.getFavoriteRecipes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (recipes) => {
          this.recipes = recipes;
          this.isLoading = false;
        },
        error: (error) => {
          this.errorMessage = error.message || 'Failed to load favorite recipes.';
          this.isLoading = false;
          console.error('Error loading favorites:', error);
        }
      });
  }

  removeFavorite(recipeId: string): void {
    this.recipeService.removeFavorite(recipeId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.recipes = this.recipes.filter(r => r._id !== recipeId);
        },
        error: (error) => {
          this.errorMessage = error.message || 'Failed to remove from favorites.';
          console.error('Error removing favorite:', error);
        }
      });
  }

  trackByRecipeId(index: number, recipe: Recipe): string {
    return recipe._id;
  }

  handleImageError(event: Event): void {
    const imgElement = event.target as HTMLImageElement;
    imgElement.src = 'assets/recipe-placeholder.jpg';
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}