import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { RecipeService } from '../../services/recipe.service';
import { AuthService } from '../../services/auth.service';
import { Recipe } from '../../models/recipe.model';
import { Subscription, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-my-recipes',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './my-recipes.component.html',
  styleUrls: ['./my-recipes.component.css']
})
export class MyRecipesComponent implements OnInit, OnDestroy {
  recipes: Recipe[] = [];
  isLoading = true;
  errorMessage: string | null = null;
  private destroy$ = new Subject<void>();

  constructor(
    private recipeService: RecipeService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadRecipes();
    
    // Subscribe to recipe updates
    this.recipeService.recipeAdded$
      .pipe(takeUntil(this.destroy$))
      .subscribe((newRecipe: Recipe) => {
        this.recipes.unshift(newRecipe);
      });

    this.recipeService.userRecipesUpdated$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadRecipes();
      });

    this.recipeService.recipeDeleted$
      .pipe(takeUntil(this.destroy$))
      .subscribe((deletedRecipeId: string) => {
        this.recipes = this.recipes.filter(r => r._id !== deletedRecipeId);
      });
  }

  loadRecipes(): void {
    this.isLoading = true;
    this.errorMessage = null;
    
    this.recipeService.getMyRecipes()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (recipes) => {
          this.recipes = recipes;
          this.isLoading = false;
        },
        error: (error) => {
          this.errorMessage = error.message || 'Failed to load recipes.';
          this.isLoading = false;
          console.error('Error loading recipes:', error);
        }
      });
  }

  deleteRecipe(recipeId: string): void {
    if (confirm('Are you sure you want to delete this recipe?')) {
      this.recipeService.deleteRecipe(recipeId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.recipes = this.recipes.filter(r => r._id !== recipeId);
            this.errorMessage = null;
          },
          error: (error) => {
            this.errorMessage = error.message || 'Failed to delete recipe.';
            console.error('Error deleting recipe:', error);
          }
        });
    }
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