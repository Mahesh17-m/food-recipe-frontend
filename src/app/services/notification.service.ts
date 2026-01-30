import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of, BehaviorSubject } from 'rxjs';
import { catchError, tap, switchMap, map, distinctUntilChanged } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  sender?: {
    _id: string;
    username: string;
    profilePicture: string;
    name: string;
  };
  recipe?: {
    _id: string;
    title: string;
    imageUrl: string;
  };
}

export interface NotificationsResponse {
  notifications: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  unreadCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private apiUrl = environment.apiUrl;
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  public notifications$ = this.notificationsSubject.asObservable().pipe(
    distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr))
  );
  
  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable().pipe(
    distinctUntilChanged()
  );

  private isLoadingSubject = new BehaviorSubject<boolean>(false);
  public isLoading$ = this.isLoadingSubject.asObservable();

  private isFullPageSubject = new BehaviorSubject<boolean>(false);
  public isFullPage$ = this.isFullPageSubject.asObservable();

  private isDropdownOpenSubject = new BehaviorSubject<boolean>(false);
  public isDropdownOpen$ = this.isDropdownOpenSubject.asObservable();

  // Track if user is on notification page
  private isOnNotificationPageSubject = new BehaviorSubject<boolean>(false);
  public isOnNotificationPage$ = this.isOnNotificationPageSubject.asObservable();

  private lastLoadTime = 0;
  private readonly CACHE_DURATION = 30000; // 30 seconds

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    // Setup notification monitoring when user logs in
    this.setupNotificationMonitoring();
  }

  private setupNotificationMonitoring(): void {
    // Subscribe to auth state changes
    this.authService.currentUser$.subscribe(user => {
      if (user && this.authService.isAuthenticated()) {
        // User just logged in - create welcome/notification
        this.handleUserLogin(user._id);
        
        // Setup auto-refresh
        this.setupAutoRefresh();
      } else {
        // User logged out - clear everything
        this.clearNotifications();
      }
    });
  }

  private setupAutoRefresh(): void {
    // Refresh every 5 minutes
    setInterval(() => {
      if (this.authService.isAuthenticated()) {
        this.refreshNotifications();
      }
    }, 300000); // 5 minutes
  }

  private handleUserLogin(userId: string): void {
    // Initialize notifications
    this.initializeNotifications();
    
    // Call backend to create welcome/login notification
    this.triggerLoginNotification(userId);
  }

  private triggerLoginNotification(userId: string): void {
    // This would typically be done by the backend when user logs in
    // But we can also trigger it from frontend for testing
    this.getNotifications(1, 20, true).subscribe();
  }

  private createAuthHeaders(token: string): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('Notification service error:', error);
    
    let errorMessage = 'An error occurred';
    
    if (error.error instanceof ErrorEvent) {
      errorMessage = error.error.message;
    } else {
      if (error.status === 404) {
        errorMessage = 'Notifications endpoint not found';
      } else if (error.status === 401) {
        errorMessage = 'Unauthorized access';
      } else if (error.status === 0) {
        errorMessage = 'Network error. Please check your connection.';
      } else if (error.error?.message) {
        errorMessage = error.error.message;
      }
    }
    
    return throwError(() => new Error(errorMessage));
  }

  getNotifications(page: number = 1, limit: number = 20, forceRefresh: boolean = false): Observable<NotificationsResponse> {
    const now = Date.now();
    
    // Use cache if not forcing refresh and cache is still valid
    if (!forceRefresh && (now - this.lastLoadTime) < this.CACHE_DURATION) {
      const cached = this.notificationsSubject.value;
      if (cached.length > 0) {
        // Remove duplicates before returning
        const uniqueCached = this.removeDuplicates(cached);
        return of({
          notifications: uniqueCached,
          pagination: {
            page: 1,
            limit: uniqueCached.length,
            total: uniqueCached.length,
            pages: 1
          },
          unreadCount: uniqueCached.filter(n => !n.read).length
        });
      }
    }

    this.isLoadingSubject.next(true);
    
    return this.authService.getValidToken().pipe(
      switchMap(token => {
        const headers = this.createAuthHeaders(token);
        return this.http.get<NotificationsResponse>(
          `${this.apiUrl}/notifications?page=${page}&limit=${limit}`, 
          { headers }
        ).pipe(
          tap(response => {
            // Remove duplicates before storing
            const uniqueNotifications = this.removeDuplicates(response.notifications);
            this.notificationsSubject.next(uniqueNotifications);
            
            // Only update unread count if user is NOT on notification page
            if (!this.isOnNotificationPageSubject.value) {
              this.unreadCountSubject.next(response.unreadCount);
            } else {
              // If on notification page, set unread count to 0
              this.unreadCountSubject.next(0);
            }
            
            this.lastLoadTime = now;
            this.isLoadingSubject.next(false);
          }),
          catchError(error => {
            this.isLoadingSubject.next(false);
            console.error('Error fetching notifications:', error);
            
            if (error.status === 404) {
              console.warn('Notifications endpoint not available, returning empty response');
              const emptyResponse: NotificationsResponse = {
                notifications: [],
                pagination: {
                  page: 1,
                  limit: 0,
                  total: 0,
                  pages: 1
                },
                unreadCount: 0
              };
              this.notificationsSubject.next([]);
              
              // Only update unread count if user is NOT on notification page
              if (!this.isOnNotificationPageSubject.value) {
                this.unreadCountSubject.next(0);
              }
              
              return of(emptyResponse);
            }
            
            return this.handleError(error);
          })
        );
      }),
      catchError(error => {
        this.isLoadingSubject.next(false);
        console.warn('Auth failed for notifications, returning empty response');
        const emptyResponse: NotificationsResponse = {
          notifications: [],
          pagination: {
            page: 1,
            limit: 0,
            total: 0,
            pages: 1
          },
          unreadCount: 0
        };
        this.notificationsSubject.next([]);
        
        // Only update unread count if user is NOT on notification page
        if (!this.isOnNotificationPageSubject.value) {
          this.unreadCountSubject.next(0);
        }
        
        return of(emptyResponse);
      })
    );
  }

  private removeDuplicates(notifications: Notification[]): Notification[] {
    const seen = new Set();
    return notifications.filter(notification => {
      const duplicate = seen.has(notification._id);
      seen.add(notification._id);
      return !duplicate;
    });
  }

  // Get recent notifications for dropdown (max 5)
  getRecentNotifications(limit: number = 5): Observable<Notification[]> {
    this.isLoadingSubject.next(true);
    
    return this.authService.getValidToken().pipe(
      switchMap(token => {
        const headers = this.createAuthHeaders(token);
        return this.http.get<NotificationsResponse>(
          `${this.apiUrl}/notifications?page=1&limit=${limit}`, 
          { headers }
        ).pipe(
          map(response => response.notifications),
          tap(notifications => {
            // Store only recent notifications
            this.notificationsSubject.next(notifications);
            
            // Only update unread count if user is NOT on notification page
            if (!this.isOnNotificationPageSubject.value) {
              const unreadCount = notifications.filter(n => !n.read).length;
              this.unreadCountSubject.next(unreadCount);
            } else {
              // If on notification page, set unread count to 0
              this.unreadCountSubject.next(0);
            }
            
            this.isLoadingSubject.next(false);
          }),
          catchError(error => {
            this.isLoadingSubject.next(false);
            console.error('Error fetching recent notifications:', error);
            
            // If endpoint doesn't exist, return empty array
            if (error.status === 404) {
              console.warn('Notifications endpoint not available, returning empty array');
              this.notificationsSubject.next([]);
              
              // Only update unread count if user is NOT on notification page
              if (!this.isOnNotificationPageSubject.value) {
                this.unreadCountSubject.next(0);
              }
              
              return of([]);
            }
            
            return this.handleError(error);
          })
        );
      }),
      catchError(error => {
        this.isLoadingSubject.next(false);
        console.warn('Auth failed for recent notifications, returning empty array');
        this.notificationsSubject.next([]);
        
        // Only update unread count if user is NOT on notification page
        if (!this.isOnNotificationPageSubject.value) {
          this.unreadCountSubject.next(0);
        }
        
        return of([]);
      })
    );
  }

  // Get unread notifications count
  getUnreadCount(): Observable<number> {
    return this.authService.getValidToken().pipe(
      switchMap(token => {
        const headers = this.createAuthHeaders(token);
        return this.http.get<NotificationsResponse>(
          `${this.apiUrl}/notifications?page=1&limit=1}`, 
          { headers }
        ).pipe(
          tap(response => {
            // Only update unread count if user is NOT on notification page
            if (!this.isOnNotificationPageSubject.value) {
              this.unreadCountSubject.next(response.unreadCount);
            } else {
              // If on notification page, set unread count to 0
              this.unreadCountSubject.next(0);
            }
          }),
          map(response => {
            // Return 0 if user is on notification page
            if (this.isOnNotificationPageSubject.value) {
              return 0;
            }
            return response.unreadCount;
          }),
          catchError(error => {
            console.error('Error fetching unread count:', error);
            
            // If endpoint doesn't exist, calculate from local notifications
            if (error.status === 404) {
              const currentNotifications = this.notificationsSubject.value;
              const unreadCount = currentNotifications.filter(n => !n.read).length;
              
              // Only update unread count if user is NOT on notification page
              if (!this.isOnNotificationPageSubject.value) {
                this.unreadCountSubject.next(unreadCount);
                return of(unreadCount);
              } else {
                // If on notification page, return 0
                this.unreadCountSubject.next(0);
                return of(0);
              }
            }
            
            return this.handleError(error);
          })
        );
      }),
      catchError(error => {
        console.warn('Auth failed for unread count, returning 0');
        
        // Always return 0 if auth failed
        this.unreadCountSubject.next(0);
        return of(0);
      })
    );
  }

  // Mark notification as read
  markAsRead(notificationId: string): Observable<void> {
    return this.authService.getValidToken().pipe(
      switchMap(token => {
        const headers = this.createAuthHeaders(token);
        return this.http.patch<void>(
          `${this.apiUrl}/notifications/${notificationId}/read`,
          {},
          { headers }
        ).pipe(
          tap(() => {
            // Update local state
            const currentNotifications = this.notificationsSubject.value;
            const updatedNotifications = currentNotifications.map(notification =>
              notification._id === notificationId ? { ...notification, read: true } : notification
            );
            this.notificationsSubject.next(updatedNotifications);
            
            // Update unread count based on page location
            const newUnreadCount = updatedNotifications.filter(notification => !notification.read).length;
            if (!this.isOnNotificationPageSubject.value) {
              this.unreadCountSubject.next(newUnreadCount);
            } else {
              this.unreadCountSubject.next(0);
            }
          }),
          catchError(error => {
            console.error('Error marking notification as read:', error);
            
            // If endpoint doesn't exist, update local state only
            if (error.status === 404) {
              console.warn('Notifications endpoint not available, updating local state only');
              const currentNotifications = this.notificationsSubject.value;
              const updatedNotifications = currentNotifications.map(notification =>
                notification._id === notificationId ? { ...notification, read: true } : notification
              );
              this.notificationsSubject.next(updatedNotifications);
              
              // Update unread count based on page location
              const newUnreadCount = updatedNotifications.filter(notification => !notification.read).length;
              if (!this.isOnNotificationPageSubject.value) {
                this.unreadCountSubject.next(newUnreadCount);
              } else {
                this.unreadCountSubject.next(0);
              }
              
              return of(void 0);
            }
            
            return this.handleError(error);
          })
        );
      }),
      catchError(error => {
        console.warn('Auth failed for mark as read, updating local state only');
        const currentNotifications = this.notificationsSubject.value;
        const updatedNotifications = currentNotifications.map(notification =>
          notification._id === notificationId ? { ...notification, read: true } : notification
        );
        this.notificationsSubject.next(updatedNotifications);
        
        // Update unread count based on page location
        const newUnreadCount = updatedNotifications.filter(notification => !notification.read).length;
        if (!this.isOnNotificationPageSubject.value) {
          this.unreadCountSubject.next(newUnreadCount);
        } else {
          this.unreadCountSubject.next(0);
        }
        
        return of(void 0);
      })
    );
  }

  // Mark all notifications as read
  markAllAsRead(): Observable<void> {
    return this.authService.getValidToken().pipe(
      switchMap(token => {
        const headers = this.createAuthHeaders(token);
        return this.http.patch<void>(
          `${this.apiUrl}/notifications/read-all`,
          {},
          { headers }
        ).pipe(
          tap(() => {
            // Update local state
            const currentNotifications = this.notificationsSubject.value;
            const updatedNotifications = currentNotifications.map(notification => ({
              ...notification,
              read: true
            }));
            this.notificationsSubject.next(updatedNotifications);
            
            // Set unread count to 0 regardless of page
            this.unreadCountSubject.next(0);
          }),
          catchError(error => {
            console.error('Error marking all notifications as read:', error);
            
            // If endpoint doesn't exist, update local state only
            if (error.status === 404) {
              console.warn('Notifications endpoint not available, updating local state only');
              const currentNotifications = this.notificationsSubject.value;
              const updatedNotifications = currentNotifications.map(notification => ({
                ...notification,
                read: true
              }));
              this.notificationsSubject.next(updatedNotifications);
              
              // Set unread count to 0 regardless of page
              this.unreadCountSubject.next(0);
              return of(void 0);
            }
            
            return this.handleError(error);
          })
        );
      }),
      catchError(error => {
        console.warn('Auth failed for mark all as read, updating local state only');
        const currentNotifications = this.notificationsSubject.value;
        const updatedNotifications = currentNotifications.map(notification => ({
          ...notification,
          read: true
        }));
        this.notificationsSubject.next(updatedNotifications);
        
        // Set unread count to 0 regardless of page
        this.unreadCountSubject.next(0);
        return of(void 0);
      })
    );
  }

  // Delete notification
  deleteNotification(notificationId: string): Observable<void> {
    return this.authService.getValidToken().pipe(
      switchMap(token => {
        const headers = this.createAuthHeaders(token);
        return this.http.delete<void>(
          `${this.apiUrl}/notifications/${notificationId}`,
          { headers }
        ).pipe(
          tap(() => {
            // Update local state
            const currentNotifications = this.notificationsSubject.value;
            const updatedNotifications = currentNotifications.filter(
              notification => notification._id !== notificationId
            );
            this.notificationsSubject.next(updatedNotifications);
            
            // Update unread count based on page location
            const newUnreadCount = updatedNotifications.filter(notification => !notification.read).length;
            if (!this.isOnNotificationPageSubject.value) {
              this.unreadCountSubject.next(newUnreadCount);
            } else {
              this.unreadCountSubject.next(0);
            }
          }),
          catchError(error => {
            console.error('Error deleting notification:', error);
            
            // If endpoint doesn't exist, update local state only
            if (error.status === 404) {
              console.warn('Notifications endpoint not available, updating local state only');
              const currentNotifications = this.notificationsSubject.value;
              const updatedNotifications = currentNotifications.filter(
                notification => notification._id !== notificationId
              );
              this.notificationsSubject.next(updatedNotifications);
              
              // Update unread count based on page location
              const newUnreadCount = updatedNotifications.filter(notification => !notification.read).length;
              if (!this.isOnNotificationPageSubject.value) {
                this.unreadCountSubject.next(newUnreadCount);
              } else {
                this.unreadCountSubject.next(0);
              }
              
              return of(void 0);
            }
            
            return this.handleError(error);
          })
        );
      }),
      catchError(error => {
        console.warn('Auth failed for delete notification, updating local state only');
        const currentNotifications = this.notificationsSubject.value;
        const updatedNotifications = currentNotifications.filter(
          notification => notification._id !== notificationId
        );
        this.notificationsSubject.next(updatedNotifications);
        
        // Update unread count based on page location
        const newUnreadCount = updatedNotifications.filter(notification => !notification.read).length;
        if (!this.isOnNotificationPageSubject.value) {
          this.unreadCountSubject.next(newUnreadCount);
        } else {
          this.unreadCountSubject.next(0);
        }
        
        return of(void 0);
      })
    );
  }

  // Clear all notifications
  clearAllNotifications(): Observable<void> {
    return this.authService.getValidToken().pipe(
      switchMap(token => {
        const headers = this.createAuthHeaders(token);
        return this.http.delete<void>(`${this.apiUrl}/notifications`, { headers }).pipe(
          tap(() => {
            this.notificationsSubject.next([]);
            this.unreadCountSubject.next(0);
          }),
          catchError(this.handleError)
        );
      })
    );
  }

  // Dropdown control methods
  toggleDropdown(): void {
    this.isDropdownOpenSubject.next(!this.isDropdownOpenSubject.value);
  }

  openDropdown(): void {
    this.isDropdownOpenSubject.next(true);
  }

  closeDropdown(): void {
    this.isDropdownOpenSubject.next(false);
  }

  // Full page control methods
  setFullPage(value: boolean): void {
    this.isFullPageSubject.next(value);
    // Also update notification page status
    this.isOnNotificationPageSubject.next(value);
  }

  // Method to manually set if user is on notification page
  setOnNotificationPage(isOnPage: boolean): void {
    this.isOnNotificationPageSubject.next(isOnPage);
    
    // When user leaves notification page, refresh unread count
    if (!isOnPage) {
      this.getUnreadCount().subscribe();
    } else {
      // When user enters notification page, set unread count to 0
      this.unreadCountSubject.next(0);
    }
  }

  // Get notification icon based on type (clean SVG icons)
  getNotificationIcon(type: string): string {
    const icons: { [key: string]: string } = {
      'welcome': 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
      'login': 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z',
      'follow': 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
      'recipe_added': 'M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z',
      'recipe_liked': 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
      'recipe_saved': 'M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z',
      'review_added': 'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z',
      'comment_added': 'M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18zM18 14H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z',
      'new_follower': 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
      'achievement': 'M19 5h-2V3H7v2H5c-1.1 0-2 .9-2 2v1c0 2.55 1.92 4.63 4.39 4.94.63 1.5 1.98 2.63 3.61 2.96V19H7v2h10v-2h-4v-3.1c1.63-.33 2.98-1.46 3.61-2.96C19.08 12.63 21 10.55 21 8V7c0-1.1-.9-2-2-2zM5 8V7h2v3.82C5.84 10.4 5 9.3 5 8zm14 0c0 1.3-.84 2.4-2 2.82V7h2v1z'
    };
    return icons[type] || 'M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z';
  }

  // Get notification color based on type (natural colors - no gradients)
  getNotificationColor(type: string): string {
    const colors: { [key: string]: string } = {
      'welcome': '#4CAF50', // Green
      'login': '#2196F3',   // Blue
      'follow': '#FF9800',  // Orange
      'recipe_added': '#9C27B0', // Purple
      'recipe_liked': '#F44336', // Red
      'recipe_saved': '#009688', // Teal
      'review_added': '#FFC107', // Amber
      'comment_added': '#795548', // Brown
      'new_follower': '#E91E63', // Pink
      'achievement': '#3F51B5' // Indigo
    };
    return colors[type] || '#607D8B'; // Blue Grey (default)
  }

  // Get notification category
  getNotificationCategory(type: string): string {
    const categories: { [key: string]: string } = {
      'welcome': 'System',
      'login': 'System',
      'follow': 'Social',
      'recipe_added': 'Recipe',
      'recipe_liked': 'Recipe',
      'recipe_saved': 'Recipe',
      'review_added': 'Recipe',
      'comment_added': 'Social',
      'new_follower': 'Social',
      'achievement': 'Achievement'
    };
    return categories[type] || 'System';
  }

  // Initialize notifications (called on app startup)
  initializeNotifications(): void {
    this.getNotifications().subscribe();
  }

  // Refresh notifications
  refreshNotifications(): void {
    this.getNotifications(1, 20, true).subscribe();
  }

  // Helper method to update unread count
  private updateUnreadCount(notifications: Notification[]): void {
    const unreadCount = notifications.filter(notification => !notification.read).length;
    
    // Only update if user is NOT on notification page
    if (!this.isOnNotificationPageSubject.value) {
      this.unreadCountSubject.next(unreadCount);
    } else {
      this.unreadCountSubject.next(0);
    }
  }

  // Clear all notifications (for logout)
  clearNotifications(): void {
    this.notificationsSubject.next([]);
    this.unreadCountSubject.next(0);
    this.isLoadingSubject.next(false);
    this.isFullPageSubject.next(false);
    this.isDropdownOpenSubject.next(false);
    this.isOnNotificationPageSubject.next(false);
  }
}