import { Injectable } from '@angular/core';
import { HttpClient, HttpEventType, HttpHeaders, HttpResponse } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, switchMap, tap, map, filter } from 'rxjs/operators';
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
      map(response => {
        // Ensure profile pictures have full URLs
        if (response.users) {
          response.users = response.users.map(chef => ({
            ...chef,
            profilePicture: this.authService.getFullProfileImageUrl(chef.profilePicture)
          }));
        }
        return response;
      }),
      catchError(this.handleError)
    );
  }

  getUserProfile(): Observable<User> {
    return this.authService.getValidToken().pipe(
      switchMap(token => {
        if (!token) {
          return throwError(() => ({ message: 'No token available', code: 'NO_TOKEN' }));
        }
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${token}`
        });
        return this.http.get<User>(`${this.apiUrl}/profile/`, { headers }).pipe(
          map(user => this.formatUserImageUrls(user)),
          catchError(this.handleError)
        );
      })
    );
  }

  getUserById(userId: string): Observable<User> {
    return this.authService.getValidToken().pipe(
      switchMap(token => {
        if (!token) {
          return throwError(() => ({ message: 'No token available', code: 'NO_TOKEN' }));
        }
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${token}`
        });
        return this.http.get<User>(`${this.apiUrl}/profile/${userId}`, { headers }).pipe(
          map(user => this.formatUserImageUrls(user)),
          catchError(this.handleError)
        );
      })
    );
  }

  // Get author profile with proper image URL handling
  getAuthorProfile(userId: string): Observable<any> {
    return this.authService.getValidToken().pipe(
      switchMap(token => {
        if (!token) {
          return throwError(() => ({ message: 'No token available', code: 'NO_TOKEN' }));
        }
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${token}`
        });
        return this.http.get<any>(`${this.apiUrl}/profile/author/${userId}`, { headers }).pipe(
          map(response => {
            // Format user images
            const formattedResponse = {
              ...response,
              profilePicture: this.authService.getFullProfileImageUrl(response.profilePicture),
              coverPicture: this.authService.getFullCoverImageUrl(response.coverPicture)
            };
            
            // Format recipe images
            if (formattedResponse.recipes && Array.isArray(formattedResponse.recipes)) {
              formattedResponse.recipes = formattedResponse.recipes.map((recipe: { imageUrl: any; image: any; }) => ({
                ...recipe,
                imageUrl: this.authService.getRecipeImageUrl(recipe.imageUrl || recipe.image),
                image: this.authService.getRecipeImageUrl(recipe.image || recipe.imageUrl)
              }));
            }
            
            console.log('Formatted author profile:', {
              author: formattedResponse.username,
              recipeCount: formattedResponse.recipes?.length,
              profilePicture: formattedResponse.profilePicture,
              coverPicture: formattedResponse.coverPicture
            });
            
            return formattedResponse;
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
        if (!token) {
          return throwError(() => ({ message: 'No token available', code: 'NO_TOKEN' }));
        }
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
        if (!token) {
          return throwError(() => ({ message: 'No token available', code: 'NO_TOKEN' }));
        }
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${token}`
        });
        return this.http.get<{ following: User[] }>(url, { headers }).pipe(
          map(response => {
            const following = response.following || [];
            return following.map(user => this.formatUserImageUrls(user));
          }),
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
        if (!token) {
          return throwError(() => ({ message: 'No token available', code: 'NO_TOKEN' }));
        }
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${token}`
        });
        return this.http.get<{ followers: User[] }>(url, { headers }).pipe(
          map(response => {
            const followers = response.followers || [];
            return followers.map(user => this.formatUserImageUrls(user));
          }),
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
        if (!token) {
          return throwError(() => ({ message: 'No token available', code: 'NO_TOKEN' }));
        }
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${token}`
        });
        return this.http.get<Recipe[]>(`${this.apiUrl}/profile/saved-recipes`, { headers }).pipe(
          map(recipes => {
            return recipes.map(recipe => this.formatRecipeImageUrl(recipe));
          }),
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
        if (!token) {
          return throwError(() => ({ message: 'No token available', code: 'NO_TOKEN' }));
        }
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${token}`
        });
        return this.http.get<Recipe[]>(`${this.apiUrl}/profile/favorite-recipes`, { headers }).pipe(
          map(recipes => {
            return recipes.map(recipe => this.formatRecipeImageUrl(recipe));
          }),
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
        if (!token) {
          return throwError(() => ({ message: 'No token available', code: 'NO_TOKEN' }));
        }
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
        if (!token) {
          return throwError(() => ({ message: 'No token available', code: 'NO_TOKEN' }));
        }
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

  // Get user stats with proper image URL formatting
  getUserStats(userId?: string): Observable<any> {
    const url = userId 
      ? `${this.apiUrl}/profile/stats/${userId}`
      : `${this.apiUrl}/profile/stats`;
    
    return this.authService.getValidToken().pipe(
      switchMap(token => {
        if (!token) {
          console.warn('No token available for stats, returning default');
          return of(this.getDefaultStats());
        }
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${token}`
        });
        return this.http.get<any>(url, { headers }).pipe(
          map(stats => {
            // Format image URLs
            const formattedStats = {
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
              recentRecipes: (stats.recentRecipes || []).map((recipe: Recipe) => 
                this.formatRecipeImageUrl(recipe)
              ),
              recentReviews: stats.recentReviews || [],
              username: stats.username || '',
              profilePicture: this.authService.getFullProfileImageUrl(stats.profilePicture),
              coverPicture: this.authService.getFullCoverImageUrl(stats.coverPicture)
            };
            
            return formattedStats;
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
      profilePicture: this.authService.getFullProfileImageUrl(''),
      coverPicture: this.authService.getFullCoverImageUrl('')
    };
  }

  getUserBadges(userId?: string): Observable<{badges: Badge[]}> {
    const url = userId 
      ? `${this.apiUrl}/profile/badges/${userId}`
      : `${this.apiUrl}/profile/badges`;
    
    return this.authService.getValidToken().pipe(
      switchMap(token => {
        if (!token) {
          return throwError(() => ({ message: 'No token available', code: 'NO_TOKEN' }));
        }
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
        if (!token) {
          return throwError(() => ({ message: 'No token available', code: 'NO_TOKEN' }));
        }
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

  // Upload cover picture - FIXED field name to match middleware
  uploadCoverPicture(file: File): Observable<any> {
    return this.authService.getValidToken().pipe(
      switchMap(token => {
        if (!token) {
          return throwError(() => ({ message: 'No token available, please login again', code: 'NO_TOKEN' }));
        }
        const formData = new FormData();
        // The middleware expects 'coverPicture' as field name
        formData.append('coverPicture', file, file.name);

        const headers = new HttpHeaders({
          'Authorization': `Bearer ${token}`
          // Don't set Content-Type - let browser set it with boundary
        });

        console.log('📤 Uploading cover picture to:', `${this.apiUrl}/profile/cover`);
        console.log('📄 File details:', {
          name: file.name,
          size: file.size,
          type: file.type,
          fieldName: 'coverPicture'
        });

        return this.http.post<any>(`${this.apiUrl}/profile/cover`, formData, { 
          headers,
          reportProgress: true,
          observe: 'events'
        }).pipe(
          tap(event => {
            if (event.type === HttpEventType.UploadProgress) {
              const progress = Math.round(100 * event.loaded / (event.total || 1));
              console.log(`📊 Upload progress: ${progress}%`);
            }
          }),
          filter(event => event.type === HttpEventType.Response),
          map(event => (event as HttpResponse<any>).body),
          tap(response => {
            console.log('✅ Cover upload response:', response);
            if (response?.success && response.coverPicture) {
              // Update user in local storage
              const currentUser = this.authService.currentUserValue;
              if (currentUser) {
                const updatedUser = {
                  ...currentUser,
                  coverPicture: response.coverPicture
                };
                localStorage.setItem('currentUser', JSON.stringify(updatedUser));
                this.authService.updateUserState(updatedUser);
              }
            }
          }),
          catchError(error => {
            console.error('❌ Cover upload failed:', error);
            let errorMessage = 'Upload failed';
            if (error.error?.message) {
              errorMessage = error.error.message;
            } else if (error.status === 401) {
              errorMessage = 'Authentication failed. Please login again.';
            } else if (error.status === 413) {
              errorMessage = 'File too large. Maximum size is 10MB';
            } else if (error.status === 415) {
              errorMessage = 'Unsupported file type';
            }
            return throwError(() => ({
              message: errorMessage,
              code: error.error?.code || 'UPLOAD_ERROR'
            }));
          })
        );
      })
    );
  }

  // Upload profile picture - FIXED field name to match middleware
  uploadProfilePicture(file: File): Observable<any> {
    return this.authService.getValidToken().pipe(
      switchMap(token => {
        if (!token) {
          return throwError(() => ({ message: 'No token available, please login again', code: 'NO_TOKEN' }));
        }
        const formData = new FormData();
        // The middleware expects 'profilePicture' as field name
        formData.append('profilePicture', file, file.name);

        const headers = new HttpHeaders({
          'Authorization': `Bearer ${token}`
        });

        console.log('📤 Uploading profile picture to:', `${this.apiUrl}/profile/profile-picture`);
        console.log('📄 File details:', {
          name: file.name,
          size: file.size,
          type: file.type,
          fieldName: 'profilePicture'
        });

        return this.http.post<any>(`${this.apiUrl}/profile/profile-picture`, formData, { 
          headers,
          reportProgress: true,
          observe: 'events'
        }).pipe(
          tap(event => {
            if (event.type === HttpEventType.UploadProgress) {
              const progress = Math.round(100 * event.loaded / (event.total || 1));
              console.log(`📊 Upload progress: ${progress}%`);
            }
          }),
          filter(event => event.type === HttpEventType.Response),
          map(event => (event as HttpResponse<any>).body),
          tap(response => {
            console.log('✅ Profile picture upload response:', response);
            if (response?.success && response.profilePicture) {
              // Update user in local storage
              const currentUser = this.authService.currentUserValue;
              if (currentUser) {
                const updatedUser = {
                  ...currentUser,
                  profilePicture: response.profilePicture
                };
                localStorage.setItem('currentUser', JSON.stringify(updatedUser));
                this.authService.updateUserState(updatedUser);
              }
            }
          }),
          catchError(error => {
            console.error('❌ Profile picture upload failed:', error);
            let errorMessage = 'Upload failed';
            if (error.error?.message) {
              errorMessage = error.error.message;
            } else if (error.status === 401) {
              errorMessage = 'Authentication failed. Please login again.';
            } else if (error.status === 413) {
              errorMessage = 'File too large. Maximum size is 5MB';
            } else if (error.status === 415) {
              errorMessage = 'Unsupported file type';
            }
            return throwError(() => ({
              message: errorMessage,
              code: error.error?.code || 'UPLOAD_ERROR'
            }));
          })
        );
      })
    );
  }

  updateProfileSettings(settings: any): Observable<User> {
    return this.authService.getValidToken().pipe(
      switchMap(token => {
        if (!token) {
          return throwError(() => ({ message: 'No token available', code: 'NO_TOKEN' }));
        }
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        });
        return this.http.put<User>(`${this.apiUrl}/profile`, settings, { headers }).pipe(
          map(user => this.formatUserImageUrls(user)),
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
        if (!token) {
          return throwError(() => ({ message: 'No token available', code: 'NO_TOKEN' }));
        }
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
        if (!token) {
          return throwError(() => ({ message: 'No token available', code: 'NO_TOKEN' }));
        }
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
    return this.authService.getValidToken().pipe(
      switchMap(token => {
        if (!token) {
          return throwError(() => ({ message: 'No token available', code: 'NO_TOKEN' }));
        }
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${token}`
        });
        return this.http.get<Recipe[]>(`${this.apiUrl}/profile/${userId}/recipes`, { headers }).pipe(
          map(recipes => recipes.map(recipe => this.formatRecipeImageUrl(recipe))),
          catchError(this.handleError)
        );
      })
    );
  }

  getUserActivity(): Observable<any[]> {
    return this.authService.getValidToken().pipe(
      switchMap(token => {
        if (!token) {
          return throwError(() => ({ message: 'No token available', code: 'NO_TOKEN' }));
        }
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${token}`
        });
        return this.http.get<any[]>(`${this.apiUrl}/profile/activity`, { headers }).pipe(
          map(activities => {
            return activities.map(activity => {
              if (activity.recipe) {
                activity.recipe = this.formatRecipeImageUrl(activity.recipe);
              }
              if (activity.user) {
                activity.user = this.formatUserImageUrls(activity.user);
              }
              return activity;
            });
          }),
          catchError(this.handleError)
        );
      })
    );
  }
  getValidToken(): Observable<string> {
  return this.authService.getValidToken().pipe(
    catchError(error => {
      console.error('Token error:', error);
      return throwError(() => error);
    })
  );
}

  // ============ HELPER METHODS ============
  private formatUserImageUrls(user: User): User {
    return {
      ...user,
      profilePicture: this.authService.getFullProfileImageUrl(user.profilePicture),
      coverPicture: this.authService.getFullCoverImageUrl(user.coverPicture)
    };
  }

  private formatRecipeImageUrl(recipe: Recipe): Recipe {
    return {
      ...recipe,
      imageUrl: this.authService.getRecipeImageUrl(recipe.imageUrl || recipe.image),
      image: this.authService.getRecipeImageUrl(recipe.image || recipe.imageUrl)
    };
  }

  private handleError(error: any): Observable<never> {
    console.error('User service error:', error);
    
    // Check if this is an extension context invalidated error
    if (error.message && error.message.includes('Extension context invalidated')) {
      console.warn('Extension context invalidated - this is normal during development with hot reload');
      // Return a more graceful error
      return throwError(() => ({
        message: 'Development environment reload detected',
        code: 'DEV_RELOAD',
        status: 0
      }));
    }
    
    let errorMessage = 'An error occurred';
    let errorCode = 'UNKNOWN_ERROR';
    
    if (error.error instanceof ErrorEvent) {
      // Client-side error
      errorMessage = error.error.message;
    } else if (error.status === 0) {
      errorMessage = 'Network error. Please check your connection.';
      errorCode = 'NETWORK_ERROR';
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