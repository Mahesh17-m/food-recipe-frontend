// User Interface
export interface User {
  id?: string; // Changed from required to optional
  savedRecipesCount: number;
  _id: string;
  username: string;
  email: string;
  name?: string;
  profilePicture?: string;
  coverPicture?: string;
  tagline?: string;
  bio?: string;
  location?: string;
  website?: string;
  cookingStyle?: string;
  socialMedia?: {
    twitter?: string;
    instagram?: string;
    facebook?: string;
    youtube?: string;
    linkedin?: string;
  };
  interests?: string[];
  specialties?: string[];
  favoriteIngredients?: string[];
  recipesCount?: number;
  favoritesCount?: number;
  reviewsCount?: number;
  followersCount?: number;
  followingCount?: number;
  totalLikes?: number;
  totalViews?: number;
  totalInteractions?: number;
  engagementRate?: number;
  memberSince?: string;
  lastActive?: string;
  isVerified?: boolean;
  isProChef?: boolean;
  proChefInfo?: {
    certification?: string;
    experience?: string;
    restaurant?: string;
    awards?: string[];
  };
  privacySettings?: {
    showEmail?: boolean;
    showFollowers?: boolean;
    showFollowing?: boolean;
    showActivity?: boolean;
  };
  notificationSettings?: {
    emailNotifications?: boolean;
    pushNotifications?: boolean;
    followerNotifications?: boolean;
    recipeNotifications?: boolean;
  };
  favorites?: any[];
  savedRecipes?: any[];
  followers?: string[] | User[];
  following?: string[] | User[];
  badges?: Badge[];
  recentRecipes?: Recipe[];
  recentReviews?: Review[];
  createdAt?: string;
  updatedAt?: string;
  
  // NEW FIELDS FOR OAUTH AND PASSWORD RESET
  provider?: 'local' | 'google';
  googleId?: string;
  emailVerified?: boolean;
  passwordResetAttempts?: number;
  lastPasswordReset?: string;
}

// Badge Interface
export interface Badge {
  name: string;
  icon: string;
  earnedAt: string;
  description: string;
}

// Chef Interface
export interface Chef {
  _id: string;
  name: string;
  username: string;
  email: string;
  profilePicture?: string;
  bio?: string;
  recipesCount: number;
  followersCount: number;
  isVerified: boolean;
  createdAt: string;
  specialty?: string;
  socialMedia?: {
    website?: string;
    instagram?: string;
    youtube?: string;
  };
}

// Recipe-related interfaces
export interface Recipe {
  id?: string; // Changed from required to optional
  isSaved?: any;
  isFavorite?: any;
  likesCount?: number;
  _id: string;
  title: string;
  description?: string;
  ingredients: Ingredient[];
  instructions: Instruction[];
  prepTime: number;
  cookTime: number;
  servings: number;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  category?: string;
  cuisine?: string;
  imageUrl?: string;
  userId?: string;
  user?: User;
  author?: User;
  rating?: number;
  reviewCount?: number;
  reviews?: Review[];
  nutrition?: Nutrition;
  notes?: string;
  tags?: string[];
  isPublished?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Ingredient {
  name: string;
  amount: string;
  unit?: string;
  notes?: string;
  adjustedAmount?: string;
}

export interface Instruction {
  text: string;
  imageUrl?: string;
  stepNumber?: number;
}

export interface Review {
  _id: string;
  rating: number;
  comment: string;
  author: User;
  recipeId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Nutrition {
  calories?: string;
  protein?: string;
  carbs?: string;
  fat?: string;
  fiber?: string;
  sugar?: string;
  sodium?: string;
}

// Auth Response Interfaces
export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: User;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  username: string;
  email: string;
  password: string;
}

// NEW INTERFACES FOR OAUTH & PASSWORD RESET
export interface PasswordResetResponse {
  message: string;
  code: string;
  status?: number;
}

export interface TokenVerificationResponse {
  valid: boolean;
  email?: string;
  message: string;
  code: string;
  status?: number;
}

export interface AuthMethodResponse {
  exists: boolean;
  provider: 'local' | 'google';
  hasPassword: boolean;
  emailVerified: boolean;
  message?: string;
  status?: number;
}

export interface OAuthCallbackData {
  token: string;
  refreshToken: string;
  user: User;
}