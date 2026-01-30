import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { RecipeService } from '../../services/recipe.service';
import { NotificationService, Notification } from '../../services/notification.service';
import { Subscription, filter } from 'rxjs';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    FormsModule
  ],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit, OnDestroy {
  isLoggedIn: boolean = false;
  currentUser: any = null;
  menuOpen: boolean = false;
  showDropdown: boolean = false;
  searchQuery: string = '';
  searchActive: boolean = false;
  showSuggestions: boolean = false;
  
  // Notification properties
  showNotificationDropdown: boolean = false;
  recentNotifications: Notification[] = [];
  notificationUnreadCount: number = 0;
  notificationLoading: boolean = false;
  isOnNotificationPage: boolean = false;
  
  suggestions: string[] = [
    'Chicken Curry',
    'Vegetable Soup',
    'Pasta Carbonara',
    'Chocolate Cake',
    'Healthy Salad',
    'Beef Steak',
    'Sushi Rolls',
    'Pizza Dough'
  ];
  
  filteredSuggestions: string[] = [];
  
  private authSubscription!: Subscription;
  private notificationSubscriptions: Subscription[] = [];
  private routerSubscription!: Subscription;

  constructor(
    private authService: AuthService,
    private recipeService: RecipeService,
    private notificationService: NotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Subscribe to router events to detect when on notification page
    this.routerSubscription = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      // Check if current route is notification page
      this.isOnNotificationPage = event.url.includes('/notifications');
    });

    // Subscribe to auth state changes
    this.authSubscription = this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.isLoggedIn = !!user && this.authService.isAuthenticated();
      
      if (this.isLoggedIn) {
        // Initialize notifications
        this.notificationService.initializeNotifications();
        this.setupNotificationSubscriptions();
      } else {
        // Clear notifications if logged out
        this.recentNotifications = [];
        this.notificationUnreadCount = 0;
        this.showNotificationDropdown = false;
      }
    });
  }

  setupNotificationSubscriptions(): void {
    // Subscribe to notifications
    this.notificationSubscriptions.push(
      this.notificationService.notifications$.subscribe(
        (notifications: Notification[]) => {
          this.recentNotifications = notifications.slice(0, 5); // Only show 5
        }
      )
    );

    // Subscribe to unread count
    this.notificationSubscriptions.push(
      this.notificationService.unreadCount$.subscribe(
        (count: number) => {
          // IMPORTANT: Only show unread count if NOT on notification page
          if (!this.isOnNotificationPage) {
            this.notificationUnreadCount = count;
          } else {
            // If on notification page, don't show any count
            this.notificationUnreadCount = 0;
          }
        }
      )
    );

    // Subscribe to loading state
    this.notificationSubscriptions.push(
      this.notificationService.isLoading$.subscribe(
        (loading: boolean) => {
          this.notificationLoading = loading;
        }
      )
    );
  }

  getProfileImageUrl(relativePath: string | undefined): string {
    if (!relativePath) {
      return 'assets/images/default-avatar.png';
    }
    
    // Use auth service method for consistency
    return this.authService.getFullProfileImageUrl(relativePath);
  }

  handleImageError(event: Event): void {
    const imgElement = event.target as HTMLImageElement;
    imgElement.src = 'assets/user.png';
  }

  toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
    if (!this.menuOpen) {
      this.showDropdown = false;
    }
  }

  closeMenu(): void {
    this.menuOpen = false;
    this.showDropdown = false;
  }

  toggleProfileDropdown(): void {
    this.showDropdown = !this.showDropdown;
    // Close notification dropdown if open
    if (this.showDropdown && this.showNotificationDropdown) {
      this.showNotificationDropdown = false;
    }
  }

  toggleNotificationDropdown(): void {
    if (!this.isLoggedIn) return;
    
    this.showNotificationDropdown = !this.showNotificationDropdown;
    // Close profile dropdown if open
    if (this.showNotificationDropdown && this.showDropdown) {
      this.showDropdown = false;
    }
    
    if (this.showNotificationDropdown) {
      // Load recent notifications when opening dropdown
      this.loadRecentNotifications();
      
      // Mark all as read when opening dropdown
      if (this.notificationUnreadCount > 0) {
        this.notificationService.markAllAsRead().subscribe({
          error: (error: any) => {
            console.error('Error marking all as read:', error);
          }
        });
      }
    }
  }

  closeNotificationDropdown(): void {
    this.showNotificationDropdown = false;
  }

  hideDropdown(): void {
    this.showDropdown = false;
  }

  logout(): void {
    this.authService.logout();
    this.notificationService.clearNotifications();
    this.closeMenu();
    this.hideDropdown();
    this.closeNotificationDropdown();
  }

  activateSearch(): void {
    this.searchActive = true;
    this.showSuggestions = true;
  }

  deactivateSearch(): void {
    setTimeout(() => {
      this.searchActive = false;
      this.showSuggestions = false;
    }, 200);
  }

  onSearchInput(): void {
    if (this.searchQuery.trim()) {
      this.filteredSuggestions = this.suggestions.filter(suggestion =>
        suggestion.toLowerCase().includes(this.searchQuery.toLowerCase())
      ).slice(0, 5);
      this.showSuggestions = true;
    } else {
      this.filteredSuggestions = [];
      this.showSuggestions = false;
    }
  }

  selectSuggestion(suggestion: string): void {
    this.searchQuery = suggestion;
    this.searchRecipes();
  }

  searchRecipes(): void {
    if (this.searchQuery.trim()) {
      // Navigate to recipes page with search query
      window.location.href = `/recipes?search=${encodeURIComponent(this.searchQuery)}`;
      this.searchQuery = '';
      this.showSuggestions = false;
      this.closeMenu();
    }
  }

  // Notification methods
  loadRecentNotifications(): void {
    this.notificationService.getRecentNotifications(5).subscribe({
      error: (error: any) => {
        console.error('Error loading recent notifications:', error);
      }
    });
  }

  markAllNotificationsAsRead(): void {
    if (this.notificationUnreadCount > 0) {
      this.notificationService.markAllAsRead().subscribe({
        error: (error: any) => {
          console.error('Error marking all as read:', error);
        }
      });
    }
  }

  viewAllNotifications(): void {
    this.closeNotificationDropdown();
    // Navigate to full notifications page
    this.router.navigate(['/notifications']);
  }

  handleNotificationClick(notification: Notification): void {
    if (!notification.read) {
      this.notificationService.markAsRead(notification._id).subscribe({
        error: (error: any) => {
          console.error('Error marking as read:', error);
        }
      });
    }
    
    // Handle notification action based on type
    this.handleNotificationAction(notification);
    
    // Close dropdown after click
    this.closeNotificationDropdown();
  }

  handleNotificationAction(notification: Notification): void {
    switch (notification.type) {
      case 'recipe_liked':
      case 'recipe_saved':
      case 'review_added':
        if (notification.recipe?._id) {
          this.router.navigate(['/recipes', notification.recipe._id]);
        }
        break;
      case 'follow':
      case 'new_follower':
        if (notification.sender?._id) {
          // Navigate to author profile page
          this.router.navigate(['/author', notification.sender._id]);
        }
        break;
      default:
        break;
    }
  }

  // NEW: Handle clicking on sender name in dropdown
  handleSenderClick(senderId: string, event: Event): void {
    event.stopPropagation(); // Prevent notification click
    event.preventDefault(); // Prevent default behavior
    
    if (senderId) {
      this.closeNotificationDropdown();
      this.router.navigate(['/author', senderId]);
    }
  }

  // NEW: Handle clicking on recipe in dropdown
  handleRecipeClick(recipeId: string, event: Event): void {
    event.stopPropagation(); // Prevent notification click
    event.preventDefault(); // Prevent default behavior
    
    if (recipeId) {
      this.closeNotificationDropdown();
      this.router.navigate(['/recipes', recipeId]);
    }
  }

  getNotificationIcon(type: string): string {
    return this.notificationService.getNotificationIcon(type);
  }

  getNotificationColor(type: string): string {
    return this.notificationService.getNotificationColor(type);
  }

  formatNotificationTime(createdAt: string): string {
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

  @HostListener('document:click', ['$event'])
  handleClickOutside(event: Event): void {
    const target = event.target as HTMLElement;
    
    // Close profile dropdown if clicked outside
    if (!target.closest('.profile-menu') && !target.closest('.menu-toggle')) {
      this.showDropdown = false;
    }
    
    // Close notification dropdown if clicked outside
    if (!target.closest('.notifications-dropdown') && !target.closest('.bell-container')) {
      this.showNotificationDropdown = false;
    }
    
    // Close search suggestions if clicked outside
    if (!target.closest('.search-bar')) {
      this.showSuggestions = false;
    }
    
    // Close mobile menu if clicked outside
    if (!target.closest('.nav-section') && !target.closest('.menu-toggle')) {
      this.menuOpen = false;
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    if (window.innerWidth > 768) {
      this.menuOpen = false;
    }
  }

  ngOnDestroy(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
    
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
    
    // Unsubscribe from notification observables
    this.notificationSubscriptions.forEach(sub => sub.unsubscribe());
  }
}