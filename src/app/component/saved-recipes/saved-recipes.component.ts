import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { RecipeService } from '../../services/recipe.service';
import { AuthService } from '../../services/auth.service';
import { Recipe } from '../../models/recipe.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-saved-recipes',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './saved-recipes.component.html',
  styleUrls: ['./saved-recipes.component.css']
})
export class SavedRecipesComponent implements OnInit, OnDestroy {
  recipes: Recipe[] = [];
  isLoading = true;
  errorMessage: string | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private recipeService: RecipeService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadSavedRecipes();
  }

  loadSavedRecipes(): void {
    this.isLoading = true;
    this.errorMessage = null;
    
    this.recipeService.getSavedRecipes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (recipes) => {
          this.recipes = recipes;
          this.isLoading = false;
        },
        error: (error) => {
          this.errorMessage = error.message || 'Failed to load saved recipes.';
          this.isLoading = false;
          console.error('Error loading saved recipes:', error);
        }
      });
  }

  removeSaved(recipeId: string): void {
    this.recipeService.removeSavedRecipe(recipeId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.recipes = this.recipes.filter(r => r._id !== recipeId);
        },
        error: (error) => {
          this.errorMessage = error.message || 'Failed to remove saved recipe.';
          console.error('Error removing saved recipe:', error);
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