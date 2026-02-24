import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, map, tap, switchMap, distinctUntilChanged, filter } from 'rxjs/operators';
import { Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';
import { environment } from '../../environments/environment.prod';
import { 
  User, 
  AuthResponse, 
  PasswordResetResponse, 
  TokenVerificationResponse,
  AuthMethodResponse
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
  
  private tokenSubject = new BehaviorSubject<string | null>(null);
  public token$ = this.tokenSubject.asObservable();
  
  private tokenRefreshInProgress = false;
  private refreshTokenSubject = new BehaviorSubject<string | null>(null);

  // Default image paths
  private defaultAvatar = 'assets/default-avatar.png';
  private defaultCover = 'assets/default-cover.jpg';
  private defaultRecipePlaceholder = 'assets/recipe-placeholder.jpg';

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
        // Check if token is expired
        if (this.isTokenExpired(token)) {
          console.log('Token expired, attempting refresh...');
          // Try to refresh token
          this.refreshToken().subscribe({
            next: (newToken) => {
              console.log('Token refreshed successfully');
              this.initializeUserFromStorage(storedUser);
            },
            error: () => {
              console.log('Token refresh failed, clearing storage');
              this.clearStorage();
            }
          });
          return;
        }
        
        this.initializeUserFromStorage(storedUser);
        this.tokenSubject.next(token);
        
      } catch (error) {
        console.error('Error parsing stored user:', error);
        this.clearStorage();
      }
    } else {
      this.clearStorage();
    }
  }

  private initializeUserFromStorage(storedUser: string): void {
    const parsedUser = JSON.parse(storedUser);
    const user = this.formatUser(parsedUser);
    this.currentUserSubject.next(user);
  }

  private formatUser(userData: any): User {
    return {
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
  }

  private storeTokens(token: string, refreshToken: string): void {
    localStorage.setItem('token', token);
    localStorage.setItem('refreshToken', refreshToken);
    this.tokenSubject.next(token);
  }

  private clearStorage(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('currentUser');
    this.tokenSubject.next(null);
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
    try {
      const decoded = this.decodeToken(token);
      if (!decoded) return true;
      // Add 30 second buffer to prevent edge cases
      return (decoded.exp * 1000) - 30000 < Date.now();
    } catch {
      return true;
    }
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }

  // FIXED: Improved token refresh mechanism
  private refreshToken(): Observable<string> {
    // If a refresh is already in progress, wait for it
    if (this.tokenRefreshInProgress) {
      return this.refreshTokenSubject.pipe(
        filter(token => token !== null),
        map(token => token as string),
        switchMap(token => of(token))
      );
    }

    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      this.logout();
      return throwError(() => new Error('No refresh token available'));
    }

    this.tokenRefreshInProgress = true;
    this.refreshTokenSubject.next(null);

    return this.http.post<{ token: string; refreshToken: string }>(
      `${this.apiUrl}/auth/refresh-token`,
      { refreshToken }
    ).pipe(
      tap(response => {
        console.log('✅ Token refreshed successfully');
        this.storeTokens(response.token, response.refreshToken);
        this.tokenRefreshInProgress = false;
        this.refreshTokenSubject.next(response.token);
      }),
      map(response => response.token),
      catchError(error => {
        console.error('❌ Token refresh failed:', error);
        this.tokenRefreshInProgress = false;
        this.logout();
        return throwError(() => error);
      })
    );
  }

  // FIXED: Improved getValidToken with better error handling
  getValidToken(): Observable<string> {
    const token = this.getToken();
    
    if (!token) {
      console.warn('No token available');
      return throwError(() => ({ message: 'No token available', code: 'NO_TOKEN' }));
    }
    
    if (!this.isTokenExpired(token)) {
      return of(token);
    }
    
    console.log('Token expired, attempting refresh...');
    return this.refreshToken();
  }

  // ============ LOGIN METHOD ============
  login(email: string, password: string): Observable<User> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, { 
      email: email.toLowerCase().trim(), 
      password: password.trim() 
    }).pipe(
      tap(response => {
        console.log('✅ Login successful, storing tokens');
        this.storeTokens(response.token, response.refreshToken);
        
        const user = this.formatUser(response.user);
        
        localStorage.setItem('currentUser', JSON.stringify(user));
        this.currentUserSubject.next(user);
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
        console.log('✅ Registration successful, storing tokens');
        this.storeTokens(response.token, response.refreshToken);
        
        const user = this.formatUser(response.user);
        
        localStorage.setItem('currentUser', JSON.stringify(user));
        this.currentUserSubject.next(user);
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
    this.storeTokens(token, refreshToken);
    
    const user = this.formatUser(userData);
    
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
            const formattedUser = this.formatUser(user);
            localStorage.setItem('currentUser', JSON.stringify(formattedUser));
            this.currentUserSubject.next(formattedUser);
          }),
          catchError(this.handleError)
        );
      })
    );
  }

  // Upload Profile Picture - FIXED endpoint to match backend
  uploadProfilePicture(file: File): Observable<User> {
    return this.getValidToken().pipe(
      switchMap(token => {
        console.log('🔑 Token for upload:', token ? 'Present' : 'MISSING');
        
        const formData = new FormData();
        formData.append('profilePicture', file, file.name);

        const headers = new HttpHeaders({
          'Authorization': `Bearer ${token}`
        });

        console.log('📤 Uploading profile picture to:', `${this.apiUrl}/profile/profile-picture`);
        console.log('📄 File details:', {
          name: file.name,
          size: file.size,
          type: file.type
        });

        return this.http.post<any>(`${this.apiUrl}/profile/profile-picture`, formData, { 
          headers,
          reportProgress: true
        }).pipe(
          tap(response => {
            console.log('✅ Profile picture upload response:', response);
            if (response?.success && response.user) {
              const formattedUser = this.formatUser(response.user);
              localStorage.setItem('currentUser', JSON.stringify(formattedUser));
              this.currentUserSubject.next(formattedUser);
            }
          }),
          map(response => response.user),
          catchError(this.handleError)
        );
      })
    );
  }

  // ============ IMAGE URL HANDLING ============
  getFullProfileImageUrl(relativePath: string | undefined | null): string {
    if (!relativePath || relativePath === 'null' || relativePath === 'undefined') {
      return this.defaultAvatar;
    }
    return this.formatImageUrl(relativePath);
  }

  getFullCoverImageUrl(relativePath: string | undefined | null): string {
    if (!relativePath || relativePath === 'null' || relativePath === 'undefined') {
      return this.defaultCover;
    }
    return this.formatImageUrl(relativePath);
  }

  getRecipeImageUrl(relativePath: string | undefined | null): string {
    if (!relativePath || relativePath === 'null' || relativePath === 'undefined') {
      return this.defaultRecipePlaceholder;
    }
    return this.formatImageUrl(relativePath);
  }

  private formatImageUrl(path: string): string {
    // Clean the path
    const cleanPath = path.split('?')[0].trim();
    
    // If it's already a full URL, return as-is
    if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) {
      return cleanPath;
    }
    
    // If it's a Cloudinary URL without protocol
    if (cleanPath.includes('cloudinary.com')) {
      return `https://${cleanPath}`;
    }
    
    // If it's a local path
    if (cleanPath.startsWith('/uploads')) {
      const backendUrl = environment.apiUrl.replace('/api', '');
      return `${backendUrl}${cleanPath}`;
    }
    
    // Default fallback
    return this.defaultAvatar;
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
  updateUserState(updatedUser: User): void {
    const formattedUser = this.formatUser(updatedUser);
    localStorage.setItem('currentUser', JSON.stringify(formattedUser));
    this.currentUserSubject.next(formattedUser);
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
  // ADD THIS METHOD
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
          errorMessage = 'Unauthorized access. Please log in again.';
          errorCode = 'UNAUTHORIZED';
          // Don't auto logout on 401 - let the component handle it
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