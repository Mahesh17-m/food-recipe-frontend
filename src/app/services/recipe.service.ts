import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, Subject, of } from 'rxjs';
import { catchError, switchMap, tap, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { Router } from '@angular/router';
import { Recipe, Review } from '../models/recipe.model';

@Injectable({
  providedIn: 'root'
})
export class RecipeService {
  private apiUrl = environment.apiUrl;
  private baseUrl = environment.apiUrl.replace('/api', '');
  
  recipeCreated$ = new Subject<void>();
  recipeAdded$ = new Subject<Recipe>();
  recipeUpdated$ = new Subject<string>();
  recipeDeleted$ = new Subject<string>();
  recipeAddedToFavorites$ = new Subject<string>();
  recipeRemovedFromFavorites$ = new Subject<string>();
  
  private userRecipesUpdated = new Subject<void>();
  private userRecipesCache = new Map<string, { recipes: Recipe[], timestamp: number }>();
  private cacheDuration = 90000; // 90 seconds cache
  
  userRecipesUpdated$ = this.userRecipesUpdated.asObservable();
  addToShoppingList: any;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router
  ) {}

  private createAuthHeaders(token: string): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('Recipe Service Error:', error);
    
    let errorMessage = 'An error occurred';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = error.error.message;
    } else {
      // Server-side error
      if (error.status === 401) {
        this.authService.logout();
        this.router.navigate(['/login']);
        errorMessage = 'Session expired. Please log in again.';
      } else if (error.status === 404) {
        errorMessage = 'Resource not found';
      } else if (error.status === 500) {
        errorMessage = 'Server error. Please try again later.';
      } else if (error.status === 0) {
        errorMessage = 'Network error. Please check your connection.';
      } else if (error.error?.message) {
        errorMessage = error.error.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
    }
    
    return throwError(() => new Error(errorMessage));
  }

  // Helper method to safely extract array from response
  private extractRecipesArray(response: any): any[] {
    console.log('Extracting recipes from response:', response);
    
    if (!response) {
      console.warn('Response is null or undefined');
      return [];
    }
    
    if (Array.isArray(response)) {
      return response;
    }
    
    // Check common response structures
    const possibleArrayPaths = [
      'recipes',
      'data',
      'items',
      'results',
      'content'
    ];
    
    for (const path of possibleArrayPaths) {
      if (response[path] && Array.isArray(response[path])) {
        return response[path];
      }
    }
    
    // If no array found but response is an object, wrap it in array
    if (typeof response === 'object' && response !== null) {
      return [response];
    }
    
    console.warn('Could not extract recipes array from response:', response);
    return [];
  }

  // Helper method to safely extract reviews array from response
  private extractReviewsArray(response: any): Review[] {
    console.log('Extracting reviews from response:', response);
    
    if (!response) {
      console.warn('Reviews response is null or undefined');
      return [];
    }
    
    if (Array.isArray(response)) {
      return response;
    }
    
    // Check common response structures
    const possibleArrayPaths = [
      'reviews',
      'data',
      'items',
      'results',
      'content'
    ];
    
    for (const path of possibleArrayPaths) {
      if (response[path] && Array.isArray(response[path])) {
        return response[path];
      }
    }
    
    console.warn('Could not extract reviews array from response:', response);
    return [];
  }

  getFullImageUrl(relativePath: string | undefined): string {
    if (!relativePath) return 'assets/recipe-placeholder.jpg';
    
    // If it's already a full URL, return as is
    if (relativePath.startsWith('http')) return relativePath;
    
    // If it starts with /uploads, construct the full backend URL
    if (relativePath.startsWith('/uploads')) {
      // Use backend URL directly - adjust port if your backend runs on different port
      const backendUrl = 'http://localhost:5000';
      return `${backendUrl}${relativePath}`;
    }
    
    // If it's just a filename, assume it's in the uploads directory
    if (!relativePath.includes('/')) {
      const backendUrl = 'http://localhost:5000';
      return `${backendUrl}/uploads/${relativePath}`;
    }
    
    // For any other case, return the placeholder
    return 'assets/recipe-placeholder.jpg';
  }

  getRecipes(page: number = 1, limit: number = 200): Observable<{ recipes: Recipe[], total: number }> {
    return this.http.get<any>(`${this.apiUrl}/recipes?page=${page}&limit=${limit}`).pipe(
      map(response => {
        console.log('Raw getRecipes response:', response);
        
        const recipes = this.extractRecipesArray(response);
        const total = response.total || response.count || recipes.length;
        
        const processedRecipes = recipes.map(recipe => ({
          ...recipe,
          imageUrl: this.getFullImageUrl(recipe.imageUrl)
        }));
        
        return {
          recipes: processedRecipes,
          total: total
        };
      }),
      catchError(this.handleError.bind(this))
    );
  }

  clearUserRecipesCache(userId?: string): void {
    const cacheKey = userId || 'current-user';
    this.userRecipesCache.delete(cacheKey);
    console.log('🗑️ Cleared user recipes cache for:', cacheKey);
  }

  clearAllCaches(): void {
    this.userRecipesCache.clear();
    console.log('🗑️ Cleared all recipe caches');
  }

  getRecipe(id: string): Observable<Recipe> {
    return this.http.get<any>(`${this.apiUrl}/recipes/${id}`).pipe(
      map(response => {
        console.log('Raw getRecipe response:', response);
        
        // Extract recipe from response
        let recipe: any;
        if (response.recipe) {
          recipe = response.recipe;
        } else if (response.data) {
          recipe = response.data;
        } else {
          recipe = response;
        }
        
        return {
          ...recipe,
          imageUrl: this.getFullImageUrl(recipe.imageUrl)
        };
      }),
      catchError(this.handleError.bind(this))
    );
  }

  createRecipe(data: any): Observable<Recipe> {
    return this.authService.getValidToken().pipe(
      switchMap(token => {
        let headers: HttpHeaders;
        let body: any;
        
        if (data instanceof FormData) {
          headers = new HttpHeaders({
            'Authorization': `Bearer ${token}`
          });
          body = data;
        } else {
          headers = new HttpHeaders({
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          });
          body = JSON.stringify(data);
        }
        
        return this.http.post<any>(`${this.apiUrl}/recipes`, body, { headers }).pipe(
          map(response => {
            let recipe: any;
            if (response.recipe) {
              recipe = response.recipe;
            } else if (response.data) {
              recipe = response.data;
            } else {
              recipe = response;
            }
            
            return {
              ...recipe,
              imageUrl: this.getFullImageUrl(recipe.imageUrl)
            };
          }),
          tap(recipe => {
            this.recipeAdded$.next(recipe);
            this.userRecipesUpdated.next();
            this.clearUserRecipesCache();
          }),
          catchError(error => {
            const errorMsg = error.error?.message || error.message || 'Failed to create recipe';
            return throwError(() => new Error(errorMsg));
          })
        );
      })
    );
  }

  updateRecipe(id: string, formData: FormData): Observable<Recipe> {
    return this.authService.getValidToken().pipe(
      switchMap(token => {
        const headers = this.createAuthHeaders(token);
        return this.http.put<any>(`${this.apiUrl}/recipes/${id}`, formData, { headers }).pipe(
          map(response => {
            let recipe: any;
            if (response.recipe) {
              recipe = response.recipe;
            } else if (response.data) {
              recipe = response.data;
            } else {
              recipe = response;
            }
            
            return {
              ...recipe,
              imageUrl: this.getFullImageUrl(recipe.imageUrl)
            };
          }),
          tap(() => {
            this.recipeUpdated$.next(id);
            this.clearUserRecipesCache();
          }),
          catchError(this.handleError.bind(this))
        );
      })
    );
  }

  deleteRecipe(id: string): Observable<void> {
    return this.authService.getValidToken().pipe(
      switchMap(token => {
        const headers = this.createAuthHeaders(token);
        return this.http.delete<void>(`${this.apiUrl}/recipes/${id}`, { headers }).pipe(
          tap(() => {
            this.recipeDeleted$.next(id);
            this.recipeRemovedFromFavorites$.next(id);
            this.clearUserRecipesCache();
          }),
          catchError(this.handleError.bind(this))
        );
      })
    );
  }

  getUserRecipes(userId?: string): Observable<Recipe[]> {
    return this.authService.getValidToken().pipe(
      switchMap(token => {
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${token}`
        });
        
        const url = userId 
          ? `${this.apiUrl}/recipes/user/${userId}`
          : `${this.apiUrl}/recipes/user/me`;
        
        // Check cache first
        const cacheKey = userId || 'current-user';
        const cached = this.userRecipesCache.get(cacheKey);
        const now = Date.now();
        
        if (cached && (now - cached.timestamp) < this.cacheDuration) {
          console.log('📦 Serving user recipes from cache');
          return of(cached.recipes);
        }
        
        console.log('🌐 Fetching user recipes from API');
        return this.http.get<any>(url, { headers }).pipe(
          map(response => {
            console.log('Raw API response:', response);
            
            const recipes = this.extractRecipesArray(response);
            console.log('Extracted recipes:', recipes);
            
            const processedRecipes = recipes.map((recipe: any) => ({
              ...recipe,
              imageUrl: this.getFullImageUrl(recipe.imageUrl)
            }));
            
            // Update cache
            this.userRecipesCache.set(cacheKey, {
              recipes: processedRecipes,
              timestamp: now
            });
            
            return processedRecipes;
          }),
          catchError(error => {
            console.error('Error fetching user recipes:', error);
            // Clear cache on error to ensure fresh data next time
            this.clearUserRecipesCache(userId);
            return throwError(() => new Error(
              error.error?.message || error.message || 'Failed to fetch user recipes'
            ));
          })
        );
      })
    );
  }

  getMyRecipes(): Observable<Recipe[]> {
    return this.getUserRecipes();
  }

  addToFavorites(recipeId: string): Observable<void> {
    return this.authService.getValidToken().pipe(
      switchMap(token => {
        const headers = this.createAuthHeaders(token);
        return this.http.post<void>(`${this.apiUrl}/recipes/${recipeId}/favorite`, {}, { headers }).pipe(
          tap(() => {
            this.recipeAddedToFavorites$.next(recipeId);
            this.clearUserRecipesCache();
          }),
          catchError(this.handleError.bind(this))
        );
      })
    );
  }

  removeFavorite(recipeId: string): Observable<void> {
    return this.authService.getValidToken().pipe(
      switchMap(token => {
        const headers = this.createAuthHeaders(token);
        return this.http.delete<void>(`${this.apiUrl}/recipes/${recipeId}/favorite`, { headers }).pipe(
          tap(() => {
            this.recipeRemovedFromFavorites$.next(recipeId);
            this.clearUserRecipesCache();
          }),
          catchError(this.handleError.bind(this))
        );
      })
    );
  }

  saveRecipe(recipeId: string): Observable<void> {
    return this.authService.getValidToken().pipe(
      switchMap(token => {
        const headers = this.createAuthHeaders(token);
        return this.http.post<void>(`${this.apiUrl}/recipes/${recipeId}/save`, {}, { headers }).pipe(
          tap(() => {
            this.clearUserRecipesCache();
          }),
          catchError(this.handleError.bind(this))
        );
      })
    );
  }

  removeSavedRecipe(recipeId: string): Observable<void> {
    return this.authService.getValidToken().pipe(
      switchMap(token => {
        const headers = this.createAuthHeaders(token);
        return this.http.delete<void>(`${this.apiUrl}/recipes/${recipeId}/save`, { headers }).pipe(
          tap(() => {
            this.clearUserRecipesCache();
          }),
          catchError(this.handleError.bind(this))
        );
      })
    );
  }

  getFavoriteRecipes(): Observable<Recipe[]> {
    return this.authService.getValidToken().pipe(
      switchMap(token => {
        const headers = this.createAuthHeaders(token);
        return this.http.get<any>(`${this.apiUrl}/recipes/favorites/me`, { headers }).pipe(
          map(response => {
            const recipes = this.extractRecipesArray(response);
            return recipes.map(recipe => ({
              ...recipe,
              imageUrl: this.getFullImageUrl(recipe.imageUrl)
            }));
          }),
          catchError(this.handleError.bind(this))
        );
      })
    );
  }

  getSavedRecipes(): Observable<Recipe[]> {
    return this.authService.getValidToken().pipe(
      switchMap(token => {
        const headers = this.createAuthHeaders(token);
        return this.http.get<any>(`${this.apiUrl}/recipes/saved/me`, { headers }).pipe(
          map(response => {
            const recipes = this.extractRecipesArray(response);
            return recipes.map(recipe => ({
              ...recipe,
              imageUrl: this.getFullImageUrl(recipe.imageUrl)
            }));
          }),
          catchError(this.handleError.bind(this))
        );
      })
    );
  }

  searchRecipes(query: string): Observable<Recipe[]> {
    return this.http.get<any>(`${this.apiUrl}/recipes/search?q=${encodeURIComponent(query)}`).pipe(
      map(response => {
        const recipes = this.extractRecipesArray(response);
        return recipes.map(recipe => ({
          ...recipe,
          imageUrl: this.getFullImageUrl(recipe.imageUrl)
        }));
      }),
      catchError(this.handleError.bind(this))
    );
  }

  getRecipesByCategory(category: string): Observable<Recipe[]> {
    return this.http.get<any>(`${this.apiUrl}/recipes?category=${category}`).pipe(
      map(response => {
        console.log('Raw getRecipesByCategory response:', response);
        const recipes = this.extractRecipesArray(response);
        return recipes.map(recipe => ({
          ...recipe,
          imageUrl: this.getFullImageUrl(recipe.imageUrl)
        }));
      }),
      catchError(this.handleError.bind(this))
    );
  }

  addReview(recipeId: string, review: { rating: number; comment: string }): Observable<Review> {
    return this.authService.getValidToken().pipe(
      switchMap(token => {
        const headers = this.createAuthHeaders(token);
        return this.http.post<Review>(`${this.apiUrl}/recipes/${recipeId}/reviews`, review, { headers }).pipe(
          catchError(this.handleError.bind(this))
        );
      })
    );
  }

  getReviews(recipeId: string): Observable<Review[]> {
    return this.http.get<any>(`${this.apiUrl}/recipes/${recipeId}/reviews`).pipe(
      map(response => this.extractReviewsArray(response)),
      catchError(this.handleError.bind(this))
    );
  }

  deleteReview(recipeId: string, reviewId: string): Observable<void> {
    return this.authService.getValidToken().pipe(
      switchMap(token => {
        const headers = this.createAuthHeaders(token);
        return this.http.delete<void>(`${this.apiUrl}/recipes/${recipeId}/reviews/${reviewId}`, { headers }).pipe(
          catchError(this.handleError.bind(this))
        );
      })
    );
  }

  reportRecipe(recipeId: string, reason: string): Observable<void> {
    return this.authService.getValidToken().pipe(
      switchMap(token => {
        const headers = this.createAuthHeaders(token);
        return this.http.post<void>(`${this.apiUrl}/recipes/${recipeId}/report`, { reason }, { headers }).pipe(
          catchError(this.handleError.bind(this))
        );
      })
    );
  }

  shareRecipe(recipeId: string, platform: string): Observable<{ url: string }> {
    return this.authService.getValidToken().pipe(
      switchMap(token => {
        const headers = this.createAuthHeaders(token);
        return this.http.post<{ url: string }>(`${this.apiUrl}/recipes/${recipeId}/share`, { platform }, { headers }).pipe(
          catchError(this.handleError.bind(this))
        );
      })
    );
  }

  refreshUserRecipes(userId?: string): Observable<Recipe[]> {
    this.clearUserRecipesCache(userId);
    return this.getUserRecipes(userId);
  }

  getCacheInfo(): { size: number; keys: string[] } {
    return {
      size: this.userRecipesCache.size,
      keys: Array.from(this.userRecipesCache.keys())
    };
  }

  // Add image error handler for consistency
  handleImageError(event: Event): void {
    const imgElement = event.target as HTMLImageElement;
    imgElement.src = 'assets/recipe-placeholder.jpg';
  }
}