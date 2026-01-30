import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { NotificationService, Notification, NotificationsResponse } from '../../services/notification.service';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.css']
})
export class NotificationsComponent implements OnInit, OnDestroy {
  notifications: Notification[] = [];
  filteredNotifications: Notification[] = [];
  unreadCount: number = 0;
  isLoading: boolean = false;
  isAuthenticated: boolean = false;
  
  selectedFilter: string = 'all';
  currentPage: number = 1;
  totalPages: number = 1;
  totalNotifications: number = 0;
  
  filters = [
    { id: 'all', name: 'All', icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z' },
    { id: 'unread', name: 'Unread', icon: 'M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z' },
    { id: 'recipe', name: 'Recipes', icon: 'M8.1 13.34l2.83-2.83L3.91 3.5c-1.56 1.56-1.56 4.09 0 5.66l4.19 4.18zm6.78-1.81c1.53.71 3.68.21 5.27-1.38 1.91-1.91 2.28-4.65.81-6.12-1.46-1.46-4.2-1.1-6.12.81-1.59 1.59-2.09 3.74-1.38 5.27L3.7 19.87l1.41 1.41L12 14.41l6.88 6.88 1.41-1.41L13.41 13l1.47-1.47z' },
    { id: 'social', name: 'Social', icon: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z' }
  ];
  
  private subscriptions: Subscription[] = [];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private notificationService: NotificationService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.setupSubscriptions();
    this.checkAuthStatus();
    this.notificationService.setOnNotificationPage(true);
    this.markAllAsReadAutomatically();
  }

  setupSubscriptions(): void {
    this.subscriptions.push(
      this.notificationService.notifications$.subscribe(
        (notifications: Notification[]) => {
          const uniqueNotifications = this.removeDuplicates(notifications);
          this.notifications = uniqueNotifications;
          this.applyFilter();
        }
      )
    );

    this.subscriptions.push(
      this.notificationService.unreadCount$.subscribe(
        (count: number) => {
          this.unreadCount = 0;
        }
      )
    );

    this.subscriptions.push(
      this.notificationService.isLoading$.subscribe(
        (loading: boolean) => {
          this.isLoading = loading;
        }
      )
    );
  }

  checkAuthStatus(): void {
    this.subscriptions.push(
      this.authService.currentUser$.subscribe(user => {
        this.isAuthenticated = !!user && this.authService.isAuthenticated();
        
        if (this.isAuthenticated) {
          this.loadNotifications();
        } else {
          this.notifications = [];
          this.unreadCount = 0;
          this.router.navigate(['/auth']);
        }
      })
    );
  }

  loadNotifications(): void {
    this.notificationService.getNotifications(this.currentPage, 20).subscribe({
      next: (response: NotificationsResponse) => {
        this.totalNotifications = response.pagination.total;
        this.totalPages = response.pagination.pages;
      },
      error: (error: any) => {
        console.error('Error loading notifications:', error);
      }
    });
  }

  applyFilter(): void {
    let filtered = [...this.notifications];
    
    switch (this.selectedFilter) {
      case 'unread':
        filtered = filtered.filter(n => !n.read);
        break;
      case 'recipe':
        filtered = filtered.filter(n => 
          ['recipe_added', 'recipe_liked', 'recipe_saved', 'review_added'].includes(n.type)
        );
        break;
      case 'social':
        filtered = filtered.filter(n => 
          ['follow', 'comment_added', 'new_follower'].includes(n.type)
        );
        break;
    }
    
    this.filteredNotifications = filtered;
  }

  handleNotificationClick(notification: Notification): void {
    if (!notification.read) {
      this.notificationService.markAsRead(notification._id).subscribe({
        error: (error: any) => {
          console.error('Error marking as read:', error);
        }
      });
    }
    
    this.handleNotificationAction(notification);
  }

  handleNotificationAction(notification: Notification): void {
    switch (notification.type) {
      case 'recipe_liked':
      case 'recipe_saved':
      case 'review_added':
      case 'recipe_added':
        if (notification.recipe?._id) {
          this.router.navigate(['/recipes', notification.recipe._id]);
        }
        break;
      default:
        break;
    }
  }

  markAllAsReadAutomatically(): void {
    this.notificationService.markAllAsRead().subscribe({
      error: (error: any) => {
        console.error('Error marking all as read:', error);
      }
    });
  }

  deleteNotification(notificationId: string, event: Event): void {
    event.stopPropagation();
    if (confirm('Are you sure you want to delete this notification?')) {
      this.notificationService.deleteNotification(notificationId).subscribe({
        error: (error: any) => {
          console.error('Error deleting notification:', error);
        }
      });
    }
  }

  clearAllNotifications(): void {
    if (confirm('Are you sure you want to clear all notifications?')) {
      this.notificationService.clearAllNotifications().subscribe({
        error: (error: any) => {
          console.error('Error clearing all notifications:', error);
        }
      });
    }
  }

  onFilterChange(filter: string): void {
    this.selectedFilter = filter;
    this.applyFilter();
  }

  getNotificationIcon(type: string): string {
    return this.notificationService.getNotificationIcon(type);
  }

  getNotificationColor(type: string): string {
    return this.notificationService.getNotificationColor(type);
  }

  getNotificationCategory(type: string): string {
    return this.notificationService.getNotificationCategory(type);
  }

  getProfilePicture(relativePath: string): string {
    return this.authService.getFullProfileImageUrl(relativePath);
  }

  getRecipeImage(relativePath: string): string {
    const baseUrl = 'http://localhost:5000';
    if (relativePath?.startsWith('/')) {
      return `${baseUrl}${relativePath}`;
    }
    return relativePath || 'assets/recipe-placeholder.jpg';
  }

  getFilterCount(filterId: string): number {
    switch (filterId) {
      case 'all':
        return this.notifications.length;
      case 'unread':
        return this.notifications.filter(n => !n.read).length;
      case 'recipe':
        return this.notifications.filter(n => 
          ['recipe_added', 'recipe_liked', 'recipe_saved', 'review_added'].includes(n.type)
        ).length;
      case 'social':
        return this.notifications.filter(n => 
          ['follow', 'comment_added', 'new_follower'].includes(n.type)
        ).length;
      default:
        return 0;
    }
  }

  removeDuplicates(notifications: Notification[]): Notification[] {
    const seen = new Set();
    return notifications.filter(notification => {
      const duplicate = seen.has(notification._id);
      seen.add(notification._id);
      return !duplicate;
    });
  }

  trackNotificationById(index: number, notification: Notification): string {
    return notification._id;
  }

  formatTime(createdAt: string): string {
    const now = new Date();
    const notificationDate = new Date(createdAt);
    const diffInMinutes = Math.floor((now.getTime() - notificationDate.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return notificationDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }

  // FIXED: Navigate to author's profile using the correct route
  navigateToSenderProfile(senderId: string, event: MouseEvent): void {
    console.log('🚀 Navigating to author profile for sender:', senderId);
    
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    
    if (senderId) {
      // Use the correct route: /author/:userId
      this.router.navigate(['/author', senderId]).then(
        (success) => {
          if (success) {
            console.log('✅ Successfully navigated to author profile');
          } else {
            console.log('❌ Navigation to author profile failed');
          }
        },
        (error) => {
          console.error('Navigation error:', error);
        }
      );
    }
  }

  navigateToRecipe(recipeId: string, event: MouseEvent): void {
    console.log('Navigating to recipe:', recipeId);
    
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    
    if (recipeId) {
      this.router.navigate(['/recipes', recipeId]);
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadNotifications();
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.notificationService.setOnNotificationPage(false);
  }
}