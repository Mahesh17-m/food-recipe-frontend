import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, map, tap, switchMap, distinctUntilChanged } from 'rxjs/operators';
import { Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';
import { environment } from '../../environments/environment.prod';
import { 
  User, 
  AuthResponse, 
  PasswordResetResponse, 
  TokenVerificationResponse,
  AuthMethodResponse,
  OAuthCallbackData 
} from '../models/recipe.model';

interface DecodedToken {
  exp: number;
  iat: number;
  userId: string;
  email: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable().pipe(
    distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr))
  );
  private tokenRefreshInProgress = false;
  private refreshTokenSubject = new BehaviorSubject<string | null>(null);

  constructor(private http: HttpClient, private router: Router) {
    this.loadStoredUser();
  }

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  private loadStoredUser(): void {
    const storedUser = localStorage.getItem('currentUser');
    const token = localStorage.getItem('token');
    
    if (storedUser && token) {
      try {
        const parsedUser = JSON.parse(storedUser);
        
        if (this.isTokenExpired(token)) {
          console.log('Token expired, clearing storage');
          this.clearStorage();
          return;
        }
        
        const user: User = {
          _id: parsedUser._id || parsedUser.id || '',
          username: parsedUser.username || '',
          email: parsedUser.email || '',
          name: parsedUser.name || parsedUser.username || '',
          profilePicture: this.getFullProfileImageUrl(parsedUser.profilePicture),
          coverPicture: this.getFullCoverImageUrl(parsedUser.coverPicture),
          bio: parsedUser.bio,
          location: parsedUser.location,
          website: parsedUser.website,
          cookingStyle: parsedUser.cookingStyle,
          socialMedia: parsedUser.socialMedia || {},
          interests: parsedUser.interests || [],
          specialties: parsedUser.specialties || [],
          savedRecipesCount: parsedUser.savedRecipesCount || 0,
          recipesCount: parsedUser.recipesCount || 0,
          favoritesCount: parsedUser.favoritesCount || 0,
          reviewsCount: parsedUser.reviewsCount || 0,
          followersCount: parsedUser.followersCount || 0,
          followingCount: parsedUser.followingCount || 0,
          totalLikes: parsedUser.totalLikes || 0,
          totalViews: parsedUser.totalViews || 0,
          totalInteractions: parsedUser.totalInteractions || 0,
          engagementRate: parsedUser.engagementRate || 0,
          memberSince: parsedUser.memberSince,
          lastActive: parsedUser.lastActive,
          isVerified: parsedUser.isVerified || false,
          isProChef: parsedUser.isProChef || false,
          proChefInfo: parsedUser.proChefInfo,
          privacySettings: parsedUser.privacySettings || {},
          notificationSettings: parsedUser.notificationSettings || {},
          favorites: parsedUser.favorites || [],
          savedRecipes: parsedUser.savedRecipes || [],
          followers: parsedUser.followers || [],
          following: parsedUser.following || [],
          badges: parsedUser.badges || [],
          recentRecipes: parsedUser.recentRecipes || [],
          recentReviews: parsedUser.recentReviews || [],
          createdAt: parsedUser.createdAt,
          updatedAt: parsedUser.updatedAt,
          tagline: parsedUser.tagline,
          provider: parsedUser.provider || 'local',
          googleId: parsedUser.googleId,
          emailVerified: parsedUser.emailVerified || false
        };
        
        this.currentUserSubject.next(user);
      } catch (error) {
        console.error('Error parsing stored user:', error);
        this.clearStorage();
      }
    } else {
      this.clearStorage();
    }
  }

  private storeTokens(token: string, refreshToken: string): void {
    localStorage.setItem('token', token);
    localStorage.setItem('refreshToken', refreshToken);
  }

  private clearStorage(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
  }

  private decodeToken(token: string): DecodedToken | null {
    try {
      return jwtDecode<DecodedToken>(token);
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  }

  isTokenExpired(token: string): boolean {
    const decoded = this.decodeToken(token);
    if (!decoded) return true;
    return decoded.exp * 1000 < Date.now();
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }

  private refreshToken(): Observable<string> {
    if (this.tokenRefreshInProgress) {
      return this.refreshTokenSubject.pipe(
        switchMap(token => token ? of(token) : throwError(() => new Error('Refresh failed')))
      );
    }

    this.tokenRefreshInProgress = true;
    this.refreshTokenSubject.next(null);

    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      this.logout();
      return throwError(() => new Error('No refresh token available'));
    }

    return this.http.post<{ token: string; refreshToken: string }>(
      `${this.apiUrl}/auth/refresh-token`,
      { refreshToken }
    ).pipe(
      tap(response => {
        this.storeTokens(response.token, response.refreshToken);
        this.tokenRefreshInProgress = false;
        this.refreshTokenSubject.next(response.token);
      }),
      map(response => response.token),
      catchError(error => {
        this.tokenRefreshInProgress = false;
        this.logout();
        return throwError(() => error);
      })
    );
  }

  getValidToken(): Observable<string> {
    const token = this.getToken();
    if (!token) {
      return throwError(() => new Error('No token available'));
    }
    if (!this.isTokenExpired(token)) {
      return of(token);
    }
    return this.refreshToken();
  }

  // ============ LOGIN METHOD ============
  login(email: string, password: string): Observable<User> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, { 
      email: email.toLowerCase().trim(), 
      password: password.trim() 
    }).pipe(
      tap(response => {
        this.storeTokens(response.token, response.refreshToken);
        
        const completeUser: User = {
          _id: response.user._id,
          username: response.user.username || '',
          email: response.user.email || '',
          name: response.user.name || response.user.username || '',
          profilePicture: this.getFullProfileImageUrl(response.user.profilePicture),
          coverPicture: this.getFullCoverImageUrl(response.user.coverPicture),
          bio: response.user.bio,
          location: response.user.location,
          website: response.user.website,
          cookingStyle: response.user.cookingStyle,
          socialMedia: response.user.socialMedia || {},
          interests: response.user.interests || [],
          specialties: response.user.specialties || [],
          savedRecipesCount: response.user.savedRecipesCount || 0,
          recipesCount: response.user.recipesCount || 0,
          favoritesCount: response.user.favoritesCount || 0,
          reviewsCount: response.user.reviewsCount || 0,
          followersCount: response.user.followersCount || 0,
          followingCount: response.user.followingCount || 0,
          totalLikes: response.user.totalLikes || 0,
          totalViews: response.user.totalViews || 0,
          totalInteractions: response.user.totalInteractions || 0,
          engagementRate: response.user.engagementRate || 0,
          memberSince: response.user.memberSince,
          lastActive: response.user.lastActive,
          isVerified: response.user.isVerified || false,
          isProChef: response.user.isProChef || false,
          proChefInfo: response.user.proChefInfo,
          privacySettings: response.user.privacySettings || {},
          notificationSettings: response.user.notificationSettings || {},
          favorites: response.user.favorites || [],
          savedRecipes: response.user.savedRecipes || [],
          followers: response.user.followers || [],
          following: response.user.following || [],
          badges: response.user.badges || [],
          recentRecipes: response.user.recentRecipes || [],
          recentReviews: response.user.recentReviews || [],
          createdAt: response.user.createdAt,
          updatedAt: response.user.updatedAt,
          tagline: response.user.tagline,
          provider: response.user.provider || 'local',
          googleId: response.user.googleId,
          emailVerified: response.user.emailVerified || false
        };
        
        localStorage.setItem('currentUser', JSON.stringify(completeUser));
        this.currentUserSubject.next(completeUser);
      }),
      map(response => response.user),
      catchError(this.handleError)
    );
  }

  // ============ REGISTER METHOD ============
  register(userData: { name: string; username: string; email: string; password: string }): Observable<User> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/register`, {
      name: userData.name.trim(),
      username: userData.username.trim(),
      email: userData.email.toLowerCase().trim(),
      password: userData.password.trim()
    }).pipe(
      tap(response => {
        this.storeTokens(response.token, response.refreshToken);
        // Ensure profile picture is properly formatted
        const userWithFormattedImage = {
          ...response.user,
          profilePicture: this.getFullProfileImageUrl(response.user.profilePicture),
          coverPicture: this.getFullCoverImageUrl(response.user.coverPicture)
        };
        localStorage.setItem('currentUser', JSON.stringify(userWithFormattedImage));
        this.currentUserSubject.next(userWithFormattedImage);
      }),
      map(response => response.user),
      catchError(this.handleError)
    );
  }

  // ============ GOOGLE OAUTH METHODS ============
  initiateGoogleLogin(): void {
    const redirectUri = encodeURIComponent(environment.redirectUri);
    window.location.href = `${this.apiUrl}/auth/google?redirect_uri=${redirectUri}`;
  }

  handleOAuthCallback(token: string, refreshToken: string, userData: any): Observable<User> {
    // Store tokens
    this.storeTokens(token, refreshToken);
    
    // Parse and store user
    const user: User = {
      _id: userData._id || userData.id || '',
      username: userData.username || '',
      email: userData.email || '',
      name: userData.name || userData.username || '',
      profilePicture: this.getFullProfileImageUrl(userData.profilePicture),
      coverPicture: this.getFullCoverImageUrl(userData.coverPicture),
      bio: userData.bio,
      location: userData.location,
      website: userData.website,
      cookingStyle: userData.cookingStyle,
      socialMedia: userData.socialMedia || {},
      interests: userData.interests || [],
      specialties: userData.specialties || [],
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
      memberSince: userData.memberSince,
      lastActive: userData.lastActive,
      isVerified: userData.isVerified || false,
      isProChef: userData.isProChef || false,
      proChefInfo: userData.proChefInfo,
      privacySettings: userData.privacySettings || {},
      notificationSettings: userData.notificationSettings || {},
      favorites: userData.favorites || [],
      savedRecipes: userData.savedRecipes || [],
      followers: userData.followers || [],
      following: userData.following || [],
      badges: userData.badges || [],
      recentRecipes: userData.recentRecipes || [],
      recentReviews: userData.recentReviews || [],
      createdAt: userData.createdAt,
      updatedAt: userData.updatedAt,
      tagline: userData.tagline,
      provider: userData.provider || 'local',
      googleId: userData.googleId,
      emailVerified: userData.emailVerified || false
    };
    
    localStorage.setItem('currentUser', JSON.stringify(user));
    this.currentUserSubject.next(user);
    
    return of(user);
  }

  // ============ PASSWORD RESET METHODS ============
  forgotPassword(email: string): Observable<PasswordResetResponse> {
    return this.http.post<PasswordResetResponse>(
      `${this.apiUrl}/auth/forgot-password`,
      { email: email.toLowerCase().trim() }
    ).pipe(
      catchError(this.handleError)
    );
  }

  verifyResetToken(token: string): Observable<TokenVerificationResponse> {
    return this.http.get<TokenVerificationResponse>(
      `${this.apiUrl}/auth/verify-reset-token/${token}`
    ).pipe(
      catchError(this.handleError)
    );
  }

  resetPassword(token: string, newPassword: string): Observable<PasswordResetResponse> {
    return this.http.post<PasswordResetResponse>(
      `${this.apiUrl}/auth/reset-password`,
      { token, newPassword: newPassword.trim() }
    ).pipe(
      catchError(this.handleError)
    );
  }

  // ============ AUTH METHOD CHECK ============
  checkAuthMethod(email: string): Observable<AuthMethodResponse> {
    return this.http.post<AuthMethodResponse>(
      `${this.apiUrl}/auth/check-auth-method`,
      { email: email.toLowerCase().trim() }
    ).pipe(
      catchError(this.handleError)
    );
  }

  // ============ ACCOUNT LINKING ============
  linkGoogleAccount(googleToken: string): Observable<User> {
    return this.getValidToken().pipe(
      switchMap(token => {
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${token}`
        });
        
        return this.http.post<User>(
          `${this.apiUrl}/auth/link-google`,
          { googleToken },
          { headers }
        ).pipe(
          tap(user => {
            this.updateUserState(user);
          }),
          catchError(this.handleError)
        );
      })
    );
  }

  // ============ PROFILE METHODS ============
  updateProfile(profileData: Partial<User>): Observable<User> {
    return this.getValidToken().pipe(
      switchMap(token => {
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        });
        
        return this.http.put<User>(`${this.apiUrl}/auth/profile`, profileData, { headers }).pipe(
          tap(user => {
            localStorage.setItem('currentUser', JSON.stringify(user));
            this.currentUserSubject.next(user);
          }),
          catchError(this.handleError)
        );
      })
    );
  }

  // Upload Profile Picture - FIXED
  uploadProfilePicture(file: File): Observable<User> {
    return this.getValidToken().pipe(
      switchMap(token => {
        const formData = new FormData();
        // Use 'profilePicture' as field name to match backend middleware
        formData.append('profilePicture', file, file.name);

        const headers = new HttpHeaders({
          'Authorization': `Bearer ${token}`
          // DO NOT set Content-Type - let browser set it
        });

        console.log('📤 Uploading profile picture to:', `${this.apiUrl}/auth/profile/picture`);
        console.log('📄 File details:', {
          name: file.name,
          size: file.size,
          type: file.type
        });

        return this.http.post<User>(`${this.apiUrl}/auth/profile/picture`, formData, { 
          headers,
          reportProgress: true
        }).pipe(
          tap(user => {
            console.log('✅ Profile picture upload successful:', user.profilePicture);
            this.updateUserState(user, true);
          }),
          catchError(this.handleError)
        );
      })
    );
  }

  // ============ IMAGE URL HANDLING FOR CLOUDINARY ============
  getFullProfileImageUrl(relativePath: string | undefined | null): string {
    return this.getImageUrl(relativePath, 'assets/images/default-avatar.png');
  }

  getFullCoverImageUrl(relativePath: string | undefined | null): string {
    return this.getImageUrl(relativePath, 'assets/images/default-cover.jpg');
  }

  getRecipeImageUrl(relativePath: string | undefined | null): string {
    return this.getImageUrl(relativePath, 'assets/images/recipe-placeholder.jpg');
  }

  private getImageUrl(relativePath: string | undefined | null, defaultImage: string): string {
    // Handle null, undefined, or empty string
    if (!relativePath || relativePath.trim() === '' || relativePath === 'null' || relativePath === 'undefined') {
      return defaultImage;
    }
    
    const cleanPath = relativePath.split('?')[0].trim();
    
    // If it's already a full URL (Cloudinary or any http URL), return as-is
    if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) {
      return cleanPath;
    }
    
    // If it's a Cloudinary URL without protocol (shouldn't happen but just in case)
    if (cleanPath.includes('cloudinary.com')) {
      return `https://${cleanPath}`;
    }
    
    // If it's a local path (legacy), construct URL with backend
    if (cleanPath.startsWith('/uploads')) {
      const backendUrl = environment.apiUrl.replace('/api', '');
      return `${backendUrl}${cleanPath}`;
    }
    
    // If it's just a filename without path
    if (!cleanPath.includes('/')) {
      const backendUrl = environment.apiUrl.replace('/api', '');
      return `${backendUrl}/uploads/${cleanPath}`;
    }
    
    // Default fallback
    return defaultImage;
  }

  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    return this.getValidToken().pipe(
      switchMap(token => {
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${token}`
        });
        return this.http.post<void>(
          `${this.apiUrl}/auth/change-password`,
          { currentPassword: currentPassword.trim(), newPassword: newPassword.trim() },
          { headers }
        );
      }),
      catchError(this.handleError)
    );
  }

  deleteAccount(): Observable<void> {
    return this.getValidToken().pipe(
      switchMap(token => {
        const headers = new HttpHeaders({
          'Authorization': `Bearer ${token}`
        });
        return this.http.delete<void>(`${this.apiUrl}/auth/account`, { headers }).pipe(
          tap(() => {
            this.clearStorage();
          })
        );
      }),
      catchError(this.handleError)
    );
  }

  // ============ USER STATE MANAGEMENT ============
  updateUserState(updatedUser: User, skipUpdate: boolean = false): void {
    const currentUser = this.currentUserValue;
    
    // Check if we actually need to update
    if (skipUpdate && JSON.stringify(currentUser) === JSON.stringify(updatedUser)) {
      return;
    }
    
    const mergedUser: User = {
      _id: updatedUser._id || currentUser?._id || '',
      username: updatedUser.username || currentUser?.username || '',
      email: updatedUser.email || currentUser?.email || '',
      profilePicture: this.getFullProfileImageUrl(
        updatedUser.profilePicture !== undefined ? updatedUser.profilePicture : currentUser?.profilePicture
      ),
      coverPicture: this.getFullCoverImageUrl(
        updatedUser.coverPicture !== undefined ? updatedUser.coverPicture : currentUser?.coverPicture
      ),
      bio: updatedUser.bio !== undefined ? updatedUser.bio : currentUser?.bio,
      location: updatedUser.location !== undefined ? updatedUser.location : currentUser?.location,
      website: updatedUser.website !== undefined ? updatedUser.website : currentUser?.website,
      cookingStyle: updatedUser.cookingStyle !== undefined ? updatedUser.cookingStyle : currentUser?.cookingStyle,
      socialMedia: updatedUser.socialMedia || currentUser?.socialMedia || {},
      interests: updatedUser.interests || currentUser?.interests || [],
      specialties: updatedUser.specialties || currentUser?.specialties || [],
      savedRecipesCount: updatedUser.savedRecipesCount !== undefined ? updatedUser.savedRecipesCount : currentUser?.savedRecipesCount || 0,
      recipesCount: updatedUser.recipesCount !== undefined ? updatedUser.recipesCount : currentUser?.recipesCount || 0,
      favoritesCount: updatedUser.favoritesCount !== undefined ? updatedUser.favoritesCount : currentUser?.favoritesCount || 0,
      reviewsCount: updatedUser.reviewsCount !== undefined ? updatedUser.reviewsCount : currentUser?.reviewsCount || 0,
      followersCount: updatedUser.followersCount !== undefined ? updatedUser.followersCount : currentUser?.followersCount || 0,
      followingCount: updatedUser.followingCount !== undefined ? updatedUser.followingCount : currentUser?.followingCount || 0,
      totalLikes: updatedUser.totalLikes !== undefined ? updatedUser.totalLikes : currentUser?.totalLikes || 0,
      totalViews: updatedUser.totalViews !== undefined ? updatedUser.totalViews : currentUser?.totalViews || 0,
      totalInteractions: updatedUser.totalInteractions !== undefined ? updatedUser.totalInteractions : currentUser?.totalInteractions || 0,
      engagementRate: updatedUser.engagementRate !== undefined ? updatedUser.engagementRate : currentUser?.engagementRate || 0,
      memberSince: updatedUser.memberSince || currentUser?.memberSince,
      lastActive: updatedUser.lastActive || currentUser?.lastActive,
      isVerified: updatedUser.isVerified !== undefined ? updatedUser.isVerified : currentUser?.isVerified || false,
      isProChef: updatedUser.isProChef !== undefined ? updatedUser.isProChef : currentUser?.isProChef || false,
      proChefInfo: updatedUser.proChefInfo || currentUser?.proChefInfo,
      privacySettings: updatedUser.privacySettings || currentUser?.privacySettings || {},
      notificationSettings: updatedUser.notificationSettings || currentUser?.notificationSettings || {},
      favorites: updatedUser.favorites || currentUser?.favorites || [],
      savedRecipes: updatedUser.savedRecipes || currentUser?.savedRecipes || [],
      followers: updatedUser.followers || currentUser?.followers || [],
      following: updatedUser.following || currentUser?.following || [],
      badges: updatedUser.badges || currentUser?.badges || [],
      recentRecipes: updatedUser.recentRecipes || currentUser?.recentRecipes || [],
      recentReviews: updatedUser.recentReviews || currentUser?.recentReviews || [],
      createdAt: updatedUser.createdAt || currentUser?.createdAt,
      updatedAt: updatedUser.updatedAt || currentUser?.updatedAt,
      tagline: updatedUser.tagline !== undefined ? updatedUser.tagline : currentUser?.tagline,
      provider: updatedUser.provider || currentUser?.provider || 'local',
      googleId: updatedUser.googleId || currentUser?.googleId,
      emailVerified: updatedUser.emailVerified !== undefined ? updatedUser.emailVerified : currentUser?.emailVerified || false
    };
    
    localStorage.setItem('currentUser', JSON.stringify(mergedUser));
    this.currentUserSubject.next(mergedUser);
  }

  // ============ AUTH STATUS METHODS ============
  logout(): void {
    this.clearStorage();
    this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    return !!token && !this.isTokenExpired(token);
  }

  isLoggedIn(): Observable<boolean> {
    return this.currentUser$.pipe(
      map(user => !!user && this.isAuthenticated())
    );
  }

  // ============ ERROR HANDLING ============
  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('Auth error:', error);
    
    let errorMessage = 'An error occurred';
    let errorCode = 'UNKNOWN_ERROR';
    let statusCode = error.status;
    
    if (error.error instanceof ErrorEvent) {
      errorMessage = error.error.message;
    } else if (error.error) {
      errorMessage = error.error.message || errorMessage;
      errorCode = error.error.code || errorCode;
      statusCode = error.error.status || error.status;
      
      if (error.status === 401) {
        if (error.error.code === 'INVALID_CREDENTIALS') {
          errorMessage = 'Invalid email or password';
          errorCode = 'INVALID_CREDENTIALS';
        } else {
          errorMessage = 'Unauthorized access';
          errorCode = 'UNAUTHORIZED';
        }
      } else if (error.status === 404) {
        errorMessage = 'User not found';
        errorCode = 'USER_NOT_FOUND';
      } else if (error.status === 400) {
        errorMessage = error.error.message || 'Bad request';
        errorCode = error.error.code || 'BAD_REQUEST';
      } else if (error.status === 0) {
        errorMessage = 'Network error. Please check your connection.';
        errorCode = 'NETWORK_ERROR';
      }
    } else {
      if (error.status === 401) {
        errorMessage = 'Invalid email or password';
        errorCode = 'INVALID_CREDENTIALS';
      } else if (error.status === 0) {
        errorMessage = 'Network error. Please check your connection.';
        errorCode = 'NETWORK_ERROR';
      }
    }

    const customError = {
      message: errorMessage,
      code: errorCode,
      status: statusCode
    };

    return throwError(() => customError);
  }
}