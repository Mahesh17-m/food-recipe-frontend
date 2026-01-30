# 🍳 Food Recipe Website - Frontend (Angular)

## 📋 Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Configuration](#environment-configuration)
- [Project Structure](#project-structure)
- [Development](#development)
- [Build & Deployment](#build--deployment)
- [API Integration](#api-integration)
- [Authentication](#authentication)
- [AI Assistant Integration](#ai-assistant-integration)
- [Testing](#testing)
- [Deployment Guide](#deployment-guide)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

---

## 🎯 Overview

A modern, responsive Food Recipe Website frontend built with Angular. Features include recipe discovery, user authentication, AI-powered cooking assistant, and interactive recipe management.

**Live Backend URL:** `https://food-recipe-backend-yqx9.onrender.com`

---

## ✨ Features

### 🍽️ Recipe Management
- Browse and search recipes
- Filter by categories, difficulty, cooking time
- Save favorite recipes
- Create and manage personal recipes
- Responsive recipe cards with images

### 🔐 Authentication
- Google OAuth 2.0 integration
- JWT token management
- Protected routes
- User profile management
- Session persistence

### 🤖 AI Cooking Assistant
- Interactive chat interface
- Recipe suggestions based on ingredients
- Cooking tips and techniques
- Ingredient substitution recommendations
- Real-time AI responses

### 📱 User Experience
- Fully responsive design (Mobile, Tablet, Desktop)
- Dark/Light theme support
- Loading states and error handling
- Toast notifications
- Image upload support
- Progressive Web App (PWA) ready

### 🔔 Real-time Features
- Notifications for recipe updates
- Live search functionality
- Favorite recipe sync
- Real-time AI chat

---

## 🛠 Tech Stack

| Technology | Purpose | Version |
|------------|---------|---------|
| **Angular** | Frontend Framework | 15+ |
| **TypeScript** | Programming Language | 4.8+ |
| **RxJS** | Reactive Programming | 7.5+ |
| **Angular Material** | UI Component Library | 15+ |
| **Angular Router** | Routing | 15+ |
| **Angular HttpClient** | HTTP Client | 15+ |
| **NgRx/Store** | State Management (Optional) | 15+ |
| **Socket.io Client** | Real-time Communication | 4.5+ |
| **Chart.js** | Data Visualization (Optional) | 3.9+ |

---

## 📋 Prerequisites

### **Required Software:**
1. **Node.js** (v18 or higher)
   ```bash
   node --version
   ```

2. **npm** (v8 or higher) or **yarn**
   ```bash
   npm --version
   ```

3. **Angular CLI**
   ```bash
   npm install -g @angular/cli@latest
   ng version
   ```

4. **Git** (for version control)
   ```bash
   git --version
   ```

### **Required Accounts:**
- [Google Cloud Console](https://console.cloud.google.com/) - OAuth credentials
- [Vercel](https://vercel.com/) - Deployment platform
- [GitHub](https://github.com/) - Code repository

---

## ⚡ Quick Start

### **1. Clone Repository**
```bash
git clone https://github.com/Mahesh17-m/food-recipe-frontend.git
cd food-recipe-frontend
```

### **2. Install Dependencies**
```bash
npm install
# or
yarn install
```

### **3. Environment Setup**
```bash
# Copy environment template
cp src/environments/environment.example.ts src/environments/environment.ts
cp src/environments/environment.example.ts src/environments/environment.prod.ts
```

### **4. Configure Environment Variables**
Edit `src/environments/environment.ts`:
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:5000/api',  // Local backend
  googleClientId: 'your-google-client-id.apps.googleusercontent.com',
  aiEndpoint: 'http://localhost:5000/api/chatbot',
  socketUrl: 'http://localhost:5000',
  appName: 'Food Recipe App',
  version: '1.0.0'
};
```

### **5. Run Development Server**
```bash
ng serve
# Open http://localhost:4200 in browser
```

---

## 🔧 Environment Configuration

### **Development Environment (`environment.ts`)**
```typescript
export const environment = {
  production: false,
  
  // API Configuration
  apiUrl: 'http://localhost:5000/api',
  socketUrl: 'http://localhost:5000',
  aiEndpoint: 'http://localhost:5000/api/chatbot',
  
  // Authentication
  googleClientId: 'your-local-client-id.apps.googleusercontent.com',
  tokenRefreshInterval: 300000, // 5 minutes
  
  // App Configuration
  appName: 'Food Recipe App (Dev)',
  version: '1.0.0',
  defaultLanguage: 'en',
  
  // Feature Flags
  enableDebug: true,
  enableAnalytics: false,
  
  // UI Configuration
  defaultTheme: 'light',
  pageSize: 10,
  
  // External Services
  cloudinaryCloudName: 'your-cloud-name',
  
  // Timeouts
  requestTimeout: 30000,
  aiResponseTimeout: 60000
};
```

### **Production Environment (`environment.prod.ts`)**
```typescript
export const environment = {
  production: true,
  
  // API Configuration - UPDATE WITH YOUR ACTUAL BACKEND URL
  apiUrl: 'https://food-recipe-backend-yqx9.onrender.com/api',
  socketUrl: 'https://food-recipe-backend-yqx9.onrender.com',
  aiEndpoint: 'https://food-recipe-backend-yqx9.onrender.com/api/chatbot',
  
  // Authentication
  googleClientId: 'your-production-client-id.apps.googleusercontent.com',
  tokenRefreshInterval: 300000,
  
  // App Configuration
  appName: 'Food Recipe App',
  version: '1.0.0',
  defaultLanguage: 'en',
  
  // Feature Flags
  enableDebug: false,
  enableAnalytics: true,
  
  // UI Configuration
  defaultTheme: 'light',
  pageSize: 12,
  
  // External Services
  cloudinaryCloudName: 'your-cloud-name',
  
  // Timeouts
  requestTimeout: 30000,
  aiResponseTimeout: 45000
};
```

### **Environment Template (`environment.example.ts`)**
```typescript
export const environment = {
  production: false,
  apiUrl: 'YOUR_BACKEND_API_URL',
  googleClientId: 'YOUR_GOOGLE_CLIENT_ID',
  aiEndpoint: 'YOUR_AI_ENDPOINT',
  socketUrl: 'YOUR_SOCKET_URL',
  appName: 'Food Recipe App',
  version: '1.0.0'
};
```

---

## 📁 Project Structure

```
src/
├── app/
│   ├── core/                    # Core functionality
│   │   ├── interceptors/        # HTTP interceptors
│   │   ├── guards/             # Route guards
│   │   ├── services/           # Core services
│   │   └── models/             # Core models/interfaces
│   │
│   ├── modules/                # Feature modules
│   │   ├── auth/              # Authentication module
│   │   │   ├── components/    # Login, register, profile
│   │   │
│   │   ├── recipes/           # Recipe module
│   │   ├── ai-assistant/      # AI chat module
│   ├── layout/                # Layout components
│   │   ├── header/
│   │   ├── footer/
│   │   ├── sidebar/
│   │   └── main-layout/
│   ├── pages/                # Page components
│   │   ├── home/
│   │   ├── about/
│   │   ├── contact/
│   │   └── not-found/
│   ├── store/                # State management (if using NgRx)
│   │   ├── actions/
│   │   ├── reducers/
│   │   ├── effects/
│   │   └── selectors/
│   │
│   ├── styles/              # Global styles
│   │   ├── themes/          # Theme configurations
│   │   ├── variables.scss   # SCSS variables
│   │   └── mixins.scss      # SCSS mixins
│   │
│   ├── app-routing.module.ts # Main routing
│   ├── app.component.ts     # Root component
│   └── app.module.ts        # Root module
│
├── assets/                  # Static assets
│   ├── images/             # Images, icons
│   ├── fonts/              # Custom fonts
│   └── icons/              # SVG icons
│
├── environments/           # Environment configurations
│   ├── environment.ts
│   ├── environment.prod.ts
│   └── environment.example.ts
│
├── index.html             # Main HTML file
├── main.ts               # Application entry point
├── styles.scss           # Global styles
└── test.ts               # Test configuration
```

---

## 🚀 Development

### **Start Development Server**
```bash
# Default port (4200)
ng serve

# Custom port
ng serve --port 4300

# Open browser automatically
ng serve --open

# With live reload
ng serve --live-reload
```

### **Development Commands**
```bash
# Generate new component
ng generate component components/recipe-card

# Generate new service
ng generate service services/recipe

# Generate new module
ng generate module modules/recipes

# Generate new guard
ng generate guard guards/auth

# Generate new pipe
ng generate pipe pipes/truncate
```

### **Code Quality**
```bash
# Lint code
ng lint

# Format code
ng format

# Run tests
ng test

# Run e2e tests
ng e2e
```

---

## 🏗️ Build & Deployment

### **Build for Production**
```bash
# Production build with optimization
ng build --configuration production

# Build with custom output path
ng build --output-path=dist/food-recipe-app

# Analyze bundle size
ng build --stats-json
# then: npx webpack-bundle-analyzer dist/stats.json
```

### **Build Output**
```
dist/food-recipe-frontend/
├── index.html              # Entry point
├── favicon.ico            # Favicon
├── assets/                # Static assets
├── *.js                   # JavaScript bundles
├── *.css                  # Style sheets
└── *.js.map              # Source maps (development)
```

---

## 🔌 API Integration

### **API Service Example**
```typescript
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  // Recipe endpoints
  getRecipes(): Observable<any> {
    return this.http.get(`${this.apiUrl}/recipes`, { headers: this.getHeaders() });
  }

  getRecipe(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/recipes/${id}`, { headers: this.getHeaders() });
  }

  createRecipe(recipe: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/recipes`, recipe, { headers: this.getHeaders() });
  }

  updateRecipe(id: string, recipe: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/recipes/${id}`, recipe, { headers: this.getHeaders() });
  }

  deleteRecipe(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/recipes/${id}`, { headers: this.getHeaders() });
  }

  // AI Assistant endpoint
  chatWithAI(message: string): Observable<any> {
    return this.http.post(`${environment.aiEndpoint}`, { message }, { headers: this.getHeaders() });
  }
}
```

### **HTTP Interceptor**
```typescript
import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = localStorage.getItem('auth_token');
    
    if (token) {
      req = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }
    
    return next.handle(req).pipe(
      catchError(error => {
        // Handle authentication errors
        if (error.status === 401) {
          // Redirect to login or refresh token
          localStorage.removeItem('auth_token');
          window.location.href = '/login';
        }
        throw error;
      })
    );
  }
}
```

---

## 🔐 Authentication

### **Google OAuth Integration**
```typescript
import { Injectable } from '@angular/core';
import { SocialAuthService, GoogleLoginProvider } from '@abacritt/angularx-social-login';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  constructor(private socialAuthService: SocialAuthService) {}

  signInWithGoogle(): Promise<any> {
    return this.socialAuthService.signIn(GoogleLoginProvider.PROVIDER_ID);
  }

  signOut(): void {
    this.socialAuthService.signOut();
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('auth_token');
  }

  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }
}
```

### **Auth Guard**
```typescript
import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(): boolean {
    if (this.authService.isAuthenticated()) {
      return true;
    }
    
    this.router.navigate(['/login']);
    return false;
  }
}
```

---

## 🤖 AI Assistant Integration

### **AI Service**
```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AIMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class AIService {
  private aiEndpoint = environment.aiEndpoint;
  private conversation: AIMessage[] = [];
  private conversationSubject = new Subject<AIMessage[]>();

  constructor(private http: HttpClient) {}

  sendMessage(message: string): Observable<any> {
    const userMessage: AIMessage = {
      id: this.generateId(),
      content: message,
      sender: 'user',
      timestamp: new Date()
    };

    this.conversation.push(userMessage);
    this.conversationSubject.next([...this.conversation]);

    return this.http.post(this.aiEndpoint, { message });
  }

  getRecipeSuggestions(ingredients: string[]): Observable<any> {
    return this.http.post(`${this.aiEndpoint}/suggest-recipes`, { ingredients });
  }

  getCookingTips(recipeId: string): Observable<any> {
    return this.http.get(`${this.aiEndpoint}/tips/${recipeId}`);
  }

  getConversation(): Observable<AIMessage[]> {
    return this.conversationSubject.asObservable();
  }

  clearConversation(): void {
    this.conversation = [];
    this.conversationSubject.next([]);
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}
```

### **AI Chat Component**
```typescript
@Component({
  selector: 'app-ai-chat',
  template: `
    <div class="chat-container">
      <div class="messages">
        <div *ngFor="let message of messages" 
             [class.user]="message.sender === 'user'"
             [class.ai]="message.sender === 'ai'">
          {{message.content}}
        </div>
      </div>
      <div class="input-area">
        <input [(ngModel)]="userInput" 
               (keyup.enter)="sendMessage()"
               placeholder="Ask me about cooking...">
        <button (click)="sendMessage()">Send</button>
      </div>
    </div>
  `
})
export class AIChatComponent {
  messages: AIMessage[] = [];
  userInput = '';

  constructor(private aiService: AIService) {
    this.aiService.getConversation().subscribe(messages => {
      this.messages = messages;
    });
  }

  sendMessage(): void {
    if (!this.userInput.trim()) return;

    this.aiService.sendMessage(this.userInput).subscribe({
      next: (response) => {
        const aiMessage: AIMessage = {
          id: this.generateId(),
          content: response.message,
          sender: 'ai',
          timestamp: new Date()
        };
        this.messages.push(aiMessage);
      },
      error: (error) => {
        console.error('AI Error:', error);
      }
    });

    this.userInput = '';
  }
}
```

---

## 📱 Responsive Design

### **Breakpoints Configuration**
```scss
// styles.scss or variables.scss
$breakpoints: (
  'xs': 0,
  'sm': 576px,
  'md': 768px,
  'lg': 992px,
  'xl': 1200px,
  'xxl': 1400px
);

@mixin respond-to($breakpoint) {
  @if map-has-key($breakpoints, $breakpoint) {
    @media (min-width: map-get($breakpoints, $breakpoint)) {
      @content;
    }
  } @else {
    @warn "Unknown breakpoint: #{$breakpoint}";
  }
}
```

### **Responsive Recipe Card**
```html
<!-- recipe-card.component.html -->
<div class="recipe-card" [class.mobile]="isMobile">
  <img [src]="recipe.image" [alt]="recipe.title" class="recipe-image">
  <div class="recipe-content">
    <h3 class="recipe-title">{{recipe.title}}</h3>
    <div class="recipe-meta">
      <span class="cook-time">🕐 {{recipe.cookTime}} min</span>
      <span class="difficulty">⚡ {{recipe.difficulty}}</span>
    </div>
    <p class="recipe-description">{{recipe.description | truncate:100}}</p>
    <div class="recipe-actions">
      <button (click)="viewRecipe()">View</button>
      <button (click)="toggleFavorite()">
        {{isFavorite ? '❤️' : '🤍'}}
      </button>
    </div>
  </div>
</div>

---
## 📸 Screenshots & Demo

> ⚠️ Make sure images exist in `assets/screens/` and are committed to GitHub

### 🏠 Home Page
![Home Page](assets/screens/home-page.png)

---

### 🍳 Recipe Details
![Recipe Details](assets/screens/recipe-details.png)

---

### 🔍 Recipes View Page
![Recipe Search](assets/screens/recipe-search.png)

---

### 🤖 AI Cooking Assistant
![AI Assistant](assets/screens/ai-chatbot.png)

---

### 👤 User Dashboard
![User Dashboard](assets/screens/user-dashboard.png)

---

### 👨‍🍳 Chefs Page
![Chefs Section](assets/screens/chefs-page.png)

---

### 🎨 Chef Profile Page
![Chef Profile](assets/screens/chef-profile.png)

---

### 📝 Recipe Adding Form
![Recipe Adding Form](assets/screens/recipe-add-form.png)

---

### 🔔 Notification Page
![Notification Page](assets/screens/notification-page.png)

---

## 🧪 Testing

### **Unit Tests**
```bash
# Run unit tests
ng test

# Run with coverage
ng test --code-coverage

# Watch mode
ng test --watch

---

### **E2E Tests**
```bash
# Run e2e tests
ng e2e

# Run specific spec
ng e2e --specs=./e2e/recipe.e2e-spec.ts
```

### **Example Test**
```typescript
import { TestBed } from '@angular/core/testing';
import { RecipeService } from './recipe.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('RecipeService', () => {
  let service: RecipeService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [RecipeService]
    });
    service = TestBed.inject(RecipeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch recipes', () => {
    const recipes = service.getRecipes();
    expect(recipes).toBeDefined();
  });
});
```

---

## 🚀 Deployment Guide

### **Deploy to Vercel (Recommended)**

#### **Step 1: Prepare for Deployment**
```bash
# Update production environment
# Edit: src/environments/environment.prod.ts
apiUrl: 'https://food-recipe-backend-yqx9.onrender.com/api'

# Build for production
ng build --configuration production

# Test build locally
npx serve dist/food-recipe-frontend
```

#### **Step 2: Create vercel.json**
```json
{
  "builds": [
    {
      "src": "dist/food-recipe-frontend/*",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "dist/food-recipe-frontend/index.html"
    }
  ],
  "buildCommand": "npm run build:prod",
  "outputDirectory": "dist/food-recipe-frontend",
  "framework": "angular",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

#### **Step 3: Update package.json Scripts**
```json
{
  "scripts": {
    "start": "ng serve",
    "build": "ng build",
    "build:prod": "ng build --configuration production",
    "test": "ng test",
    "lint": "ng lint",
    "e2e": "ng e2e",
    "vercel-build": "npm run build:prod"
  }
}
```

#### **Step 4: Deploy to Vercel**
1. **Push code to GitHub**
   ```bash
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push origin main
   ```

2. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Import GitHub repository
   - Configure project:
     - Framework: Angular
     - Build Command: `npm run build:prod`
     - Output Directory: `dist/food-recipe-frontend`
     - Install Command: `npm install`

3. **Set Environment Variables** in Vercel:
   ```
   NODE_ENV=production
   API_URL=https://food-recipe-backend-yqx9.onrender.com/api
   ```

4. **Click Deploy**

### **Alternative: Deploy to Netlify**
```toml
# netlify.toml
[build]
  command = "npm run build:prod"
  publish = "dist/food-recipe-frontend"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

---

## 🐛 Troubleshooting

### **Common Issues & Solutions**

#### **❌ CORS Errors**
```typescript
// Update backend CORS to include frontend domain
app.use(cors({
  origin: ['https://your-frontend.vercel.app', 'http://localhost:4200'],
  credentials: true
}));
```

#### **❌ Build Errors**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install

# Check Angular version compatibility
ng version
```

#### **❌ Authentication Issues**
1. Verify Google OAuth client ID
2. Check redirect URIs in Google Cloud Console
3. Ensure JWT tokens are properly stored

#### **❌ API Connection Failed**
```typescript
// Check environment configuration
console.log('API URL:', environment.apiUrl);
// Should be: https://food-recipe-backend-yqx9.onrender.com/api
```

#### **❌ Memory Issues**
```json
// Update package.json
{
  "scripts": {
    "build:prod": "node --max-old-space-size=4096 ./node_modules/@angular/cli/bin/ng build --configuration production"
  }
}
```

---

## 📊 Performance Optimization

### **Bundle Optimization**
```bash
# Analyze bundle
ng build --stats-json
npx webpack-bundle-analyzer dist/stats.json

# Lazy loading modules
const routes: Routes = [
  {
    path: 'recipes',
    loadChildren: () => import('./modules/recipes/recipes.module').then(m => m.RecipesModule)
  }
];
```

### **Image Optimization**
```html
<!-- Use lazy loading for images -->
<img [src]="recipe.image" 
     [alt]="recipe.title"
     loading="lazy"
     width="300"
     height="200">
```

---

## 🔐 Security Best Practices

### **Frontend Security**
1. **Environment Variables:** Never commit secrets
2. **Content Security Policy:** Implement CSP headers
3. **XSS Protection:** Sanitize user inputs
4. **HTTPS Enforcement:** Always use HTTPS in production
5. **Token Storage:** Use HttpOnly cookies or secure storage

### **Secure HTTP Headers**
```typescript
// In server configuration or meta tags
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; script-src 'self' 'unsafe-inline';">
```

---

## 📈 Monitoring & Analytics

### **Error Tracking**
```typescript
// Error handler service
@Injectable({ providedIn: 'root' })
export class ErrorHandlerService {
  handleError(error: any): void {
    console.error('Application Error:', error);
    // Send to error tracking service (Sentry, etc.)
  }
}
```

### **Performance Monitoring**
```typescript
// Performance tracking
@NgModule({
  providers: [
    {
      provide: APP_INITIALIZER,
      useFactory: () => () => {
        if (environment.production) {
          // Initialize analytics
        }
      },
      multi: true
    }
  ]
})
```

---

## 🤝 Contributing

### **Development Workflow**
1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

### **Code Standards**
- Follow Angular Style Guide
- Write meaningful commit messages
- Add tests for new features
- Update documentation

---


## 📞 Support & Contact

- **GitHub Issues:** [Report Bugs](https://github.com/Mahesh17-m/food-recipe-frontend/issues)
- **Documentation:** [Read Docs](https://your-docs-url.com)
- **Email:** mbmandalapu200217@gmail.com

---

## 🙏 Acknowledgments

- **Angular Team** - For the amazing framework
- **Google AI** - For Generative AI capabilities
- **Render** - Backend hosting
- **Vercel** - Frontend hosting
- **All Contributors** - For making this project better

---

## 🎉 Ready to Deploy!

**Your frontend is ready!** Update the production environment with your backend URL and deploy to Vercel.

**Production Configuration:**
```typescript
// src/environments/environment.prod.ts
export const environment = {
  production: true,
  apiUrl: 'https://food-recipe-backend-yqx9.onrender.com/api',
  googleClientId: 'YOUR_PRODUCTION_GOOGLE_CLIENT_ID',
  aiEndpoint: 'https://food-recipe-backend-yqx9.onrender.com/api/chatbot',
  socketUrl: 'https://food-recipe-backend-yqx9.onrender.com',
  appName: 'Food Recipe App',
  version: '1.0.0'
};
```

**Happy Cooking! 👨‍🍳👩‍🍳**