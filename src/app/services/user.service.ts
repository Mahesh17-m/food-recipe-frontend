import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, switchMap, tap, map } from 'rxjs/operators';
import { environment } from '../../environments/environment.prod';
import { AuthService } from './auth.service';
import { Badge, Chef, Recipe, User } from '../models/recipe.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  // Get all chefs
  getChefs(): Observable<{users: Chef[]}> {
    return this.http.get<{users: Chef[]}>(`${this.apiUrl}/profile/chefs`).pipe(
      catchError(this.handleError)
    );
  }

  getUserProfile(): Observable<User> {
    return this.authService.getValidToken().pipe(
      switchMap(token => {
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${token}`
        });
        return this.http.get<User>(`${this.apiUrl}/profile/`, { headers }).pipe(
          catchError(this.handleError)
        );
      })
    );
  }

  getUserById(userId: string): Observable<User> {
    return this.authService.getValidToken().pipe(
      switchMap(token => {
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${token}`
        });
        return this.http.get<User>(`${this.apiUrl}/profile/${userId}`, { headers }).pipe(
          catchError(this.handleError)
        );
      })
    );
  }

  // FIXED: Get author profile with proper recipe image handling
 // In user.service.ts - getAuthorProfile method
getAuthorProfile(userId: string): Observable<any> {
  return this.authService.getValidToken().pipe(
    switchMap(token => {
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });
      return this.http.get<any>(`${this.apiUrl}/profile/author/${userId}`, { headers }).pipe(
        map(response => {
          console.log('Raw backend response for author:', {
            author: response.username,
            recipeCount: response.recipes?.length,
            firstRecipe: response.recipes?.[0]
          });
          return response;
        }),
        catchError(this.handleError)
      );
    })
  );
}
  // Toggle follow with proper stats update
  toggleFollow(userId: string): Observable<any> {
    return this.authService.getValidToken().pipe(
      switchMap(token => {
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        });
        return this.http.post<any>(
          `${this.apiUrl}/profile/follow/${userId}`,
          {},
          { headers }
        ).pipe(
          tap(response => {
            console.log('Follow toggle response:', response);
            // Update current user's following count
            const currentUser = this.authService.currentUserValue;
            if (currentUser) {
              const updatedUser: User = {
                ...currentUser,
                followingCount: response.followingCount || currentUser.followingCount,
                followersCount: currentUser.followersCount // Keep existing
              };
              this.authService.updateUserState(updatedUser);
            }
          }),
          catchError(this.handleError)
        );
      })
    );
  }

  getFollowing(userId?: string): Observable<User[]> {
    const url = userId 
      ? `${this.apiUrl}/profile/following/${userId}`
      : `${this.apiUrl}/profile/following`;
    
    return this.authService.getValidToken().pipe(
      switchMap(token => {
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${token}`
        });
        return this.http.get<{ following: User[] }>(url, { headers }).pipe(
          map(response => response.following || []),
          tap(following => {
            // Update local user state with accurate following count
            if (!userId) {
              const currentUser = this.authService.currentUserValue;
              if (currentUser) {
                const updatedUser: User = {
                  ...currentUser,
                  followingCount: following.length
                };
                this.authService.updateUserState(updatedUser);
              }
            }
          }),
          catchError(this.handleError)
        );
      })
    );
  }

  getFollowers(userId?: string): Observable<User[]> {
    const url = userId 
      ? `${this.apiUrl}/profile/followers/${userId}`
      : `${this.apiUrl}/profile/followers`;
    
    return this.authService.getValidToken().pipe(
      switchMap(token => {
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${token}`
        });
        return this.http.get<{ followers: User[] }>(url, { headers }).pipe(
          map(response => response.followers || []),
          tap(followers => {
            // Update local user state with accurate followers count
            if (!userId) {
              const currentUser = this.authService.currentUserValue;
              if (currentUser) {
                const updatedUser: User = {
                  ...currentUser,
                  followersCount: followers.length
                };
                this.authService.updateUserState(updatedUser);
              }
            }
          }),
          catchError(this.handleError)
        );
      })
    );
  }

  getSavedRecipes(userId?: any): Observable<Recipe[]> {
    return this.authService.getValidToken().pipe(
      switchMap(token => {
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${token}`
        });
        return this.http.get<Recipe[]>(`${this.apiUrl}/profile/saved-recipes`, { headers }).pipe(
          tap(recipes => {
            // Update saved recipes count
            const currentUser = this.authService.currentUserValue;
            if (currentUser) {
              const updatedUser: User = {
                ...currentUser,
                savedRecipes: recipes
              };
              this.authService.updateUserState(updatedUser);
            }
          }),
          catchError(this.handleError)
        );
      })
    );
  }

  getFavoriteRecipes(userId?: any): Observable<Recipe[]> {
    return this.authService.getValidToken().pipe(
      switchMap(token => {
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${token}`
        });
        return this.http.get<Recipe[]>(`${this.apiUrl}/profile/favorite-recipes`, { headers }).pipe(
          tap(recipes => {
            // Update favorites count
            const currentUser = this.authService.currentUserValue;
            if (currentUser) {
              const updatedUser: User = {
                ...currentUser,
                favorites: recipes,
                favoritesCount: recipes.length
              };
              this.authService.updateUserState(updatedUser);
            }
          }),
          catchError(this.handleError)
        );
      })
    );
  }

  addFavoriteRecipe(userId: any, recipeId: string): Observable<void> {
    return this.authService.getValidToken().pipe(
      switchMap(token => {
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${token}`
        });
        return this.http.post<void>(
          `${this.apiUrl}/recipes/${recipeId}/favorite`,
          {},
          { headers }
        ).pipe(
          tap(() => {
            // Update local favorites count
            const currentUser = this.authService.currentUserValue;
            if (currentUser) {
              const updatedUser: User = {
                ...currentUser,
                favoritesCount: (currentUser.favoritesCount || 0) + 1
              };
              this.authService.updateUserState(updatedUser);
            }
          }),
          catchError(this.handleError)
        );
      })
    );
  }

  removeFavoriteRecipe(userId: any, recipeId: string): Observable<void> {
    return this.authService.getValidToken().pipe(
      switchMap(token => {
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${token}`
        });
        return this.http.delete<void>(
          `${this.apiUrl}/recipes/${recipeId}/favorite`,
          { headers }
        ).pipe(
          tap(() => {
            // Update local favorites count
            const currentUser = this.authService.currentUserValue;
            if (currentUser) {
              const updatedUser: User = {
                ...currentUser,
                favoritesCount: Math.max(0, (currentUser.favoritesCount || 0) - 1)
              };
              this.authService.updateUserState(updatedUser);
            }
          }),
          catchError(this.handleError)
        );
      })
    );
  }

  // FIXED: Get user stats with all data
  getUserStats(userId?: string): Observable<any> {
    const url = userId 
      ? `${this.apiUrl}/profile/stats/${userId}`
      : `${this.apiUrl}/profile/stats`;
    
    return this.authService.getValidToken().pipe(
      switchMap(token => {
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${token}`
        });
        return this.http.get<any>(url, { headers }).pipe(
          map(stats => {
            // Ensure all required fields exist with defaults
            return {
              recipesCount: stats.recipesCount || 0,
              favoritesCount: stats.favoritesCount || 0,
              reviewsCount: stats.reviewsCount || 0,
              savedRecipesCount: stats.savedRecipesCount || 0,
              followersCount: stats.followersCount || 0,
              followingCount: stats.followingCount || 0,
              totalLikes: stats.totalLikes || 0,
              totalViews: stats.totalViews || 0,
              totalInteractions: stats.totalInteractions || 0,
              engagementRate: stats.engagementRate || 0,
              userLevel: stats.userLevel || 'New Cook',
              recentRecipes: stats.recentRecipes || [],
              recentReviews: stats.recentReviews || [],
              username: stats.username || '',
              profilePicture: stats.profilePicture || '',
              coverPicture: stats.coverPicture || ''
            };
          }),
          catchError(error => {
            console.error('Error getting user stats:', error);
            // Return default stats if error occurs
            return of(this.getDefaultStats());
          })
        );
      })
    );
  }

  getDefaultStats(): any {
    return {
      recipesCount: 0,
      favoritesCount: 0,
      reviewsCount: 0,
      savedRecipesCount: 0,
      followersCount: 0,
      followingCount: 0,
      totalLikes: 0,
      totalViews: 0,
      totalInteractions: 0,
      engagementRate: 0,
      userLevel: 'New Cook',
      recentRecipes: [],
      recentReviews: [],
      username: '',
      profilePicture: '',
      coverPicture: ''
    };
  }

  getUserBadges(userId?: string): Observable<{badges: Badge[]}> {
    const url = userId 
      ? `${this.apiUrl}/profile/badges/${userId}`
      : `${this.apiUrl}/profile/badges`;
    
    return this.authService.getValidToken().pipe(
      switchMap(token => {
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${token}`
        });
        return this.http.get<{badges: Badge[]}>(url, { headers }).pipe(
          catchError(this.handleError)
        );
      })
    );
  }

  addBadge(badgeData: { name: string; icon?: string; description?: string }): Observable<any> {
    return this.authService.getValidToken().pipe(
      switchMap(token => {
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        });
        return this.http.post<any>(`${this.apiUrl}/profile/badges`, badgeData, { headers }).pipe(
          catchError(this.handleError)
        );
      })
    );
  }

  // FIXED: Upload cover picture with proper response handling
  uploadCoverPicture(file: File): Observable<any> {
    return this.authService.getValidToken().pipe(
      switchMap(token => {
        const formData = new FormData();
        formData.append('coverPicture', file);

        const headers = new HttpHeaders({
          'Authorization': `Bearer ${token}`
        });

        return this.http.post<any>(`${this.apiUrl}/profile/upload-cover`, formData, { headers }).pipe(
          map(response => response), // Just return response, don't tap
          catchError(this.handleError)
        );
      })
    );
  }

  updateProfileSettings(settings: any): Observable<User> {
    return this.authService.getValidToken().pipe(
      switchMap(token => {
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        });
        return this.http.put<User>(`${this.apiUrl}/profile`, settings, { headers }).pipe(
          tap(user => {
            this.authService.updateUserState(user);
          }),
          catchError(this.handleError)
        );
      })
    );
  }

  addSavedRecipe(userId: any, recipeId: string): Observable<void> {
    return this.authService.getValidToken().pipe(
      switchMap(token => {
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${token}`
        });
        return this.http.post<void>(
          `${this.apiUrl}/recipes/${recipeId}/save`,
          {},
          { headers }
        ).pipe(
          tap(() => {
            // Update local saved recipes count
            const currentUser = this.authService.currentUserValue;
            if (currentUser) {
              const updatedUser: User = {
                ...currentUser,
                savedRecipes: [...(currentUser.savedRecipes || []), recipeId]
              };
              this.authService.updateUserState(updatedUser);
            }
          }),
          catchError(this.handleError)
        );
      })
    );
  }

  removeSavedRecipe(userId: any, recipeId: string): Observable<void> {
    return this.authService.getValidToken().pipe(
      switchMap(token => {
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${token}`
        });
        return this.http.delete<void>(
          `${this.apiUrl}/recipes/${recipeId}/save`,
          { headers }
        ).pipe(
          tap(() => {
            // Update local saved recipes
            const currentUser = this.authService.currentUserValue;
            if (currentUser && currentUser.savedRecipes) {
              const updatedUser: User = {
                ...currentUser,
                savedRecipes: currentUser.savedRecipes.filter(id => id !== recipeId)
              };
              this.authService.updateUserState(updatedUser);
            }
          }),
          catchError(this.handleError)
        );
      })
    );
  }

  getUserRecipes(userId: string): Observable<Recipe[]> {
    return this.http.get<Recipe[]>(`${this.apiUrl}/profile/${userId}/recipes`).pipe(
      catchError(this.handleError)
    );
  }

  getUserActivity(): Observable<any[]> {
    return this.authService.getValidToken().pipe(
      switchMap(token => {
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${token}`
        });
        return this.http.get<any[]>(`${this.apiUrl}/profile/activity`, { headers }).pipe(
          catchError(this.handleError)
        );
      })
    );
  }

  private handleError(error: any): Observable<never> {
    console.error('User service error:', error);
    
    let errorMessage = 'An error occurred';
    let errorCode = 'UNKNOWN_ERROR';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = error.error.message;
    } else if (error.status === 404) {
      errorMessage = 'API endpoint not found';
      errorCode = 'ENDPOINT_NOT_FOUND';
    } else if (error.status === 500) {
      errorMessage = 'Server error. Please try again later.';
      errorCode = 'SERVER_ERROR';
    } else if (error.status === 401) {
      errorMessage = 'Unauthorized access. Please log in again.';
      errorCode = 'UNAUTHORIZED';
    } else if (error.error?.message) {
      errorMessage = error.error.message;
      errorCode = error.error.code || errorCode;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    const customError = {
      message: errorMessage,
      code: errorCode,
      status: error.status || 0
    };
    
    console.error('Error details:', customError);
    
    return throwError(() => customError);
  }
}