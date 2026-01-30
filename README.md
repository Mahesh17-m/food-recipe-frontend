I found the issue! The problem is with **inconsistent markdown formatting** and **missing image files**. Let me fix the README and add a troubleshooting section.

## **🔧 Fixed README with Proper Image Formatting:**

Here's the corrected version with proper image syntax:

```markdown
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

## 📸 Screenshots & Demo

### 🏠 Home Page
![Home Page](assets/screens/home-page.png)

### 🍳 Recipe Details
![Recipe Details](assets/screens/recipe-details.png)

### 🔍 Recipes View Page
![Recipe Search](assets/screens/recipe-search.png)

### 🤖 AI Cooking Assistant
![AI Assistant](assets/screens/ai-chatbot.png)

### 👤 User Dashboard
![User Dashboard](assets/screens/user-dashboard.png)

### 👨‍🍳 Chefs Page
![Chefs Section](assets/screens/chefs-page.png)

### 🎨 Chef Profile Page
![Chef Profile](assets/screens/chef-profile.png)

### 📝 Recipe Adding Form
![Recipe Adding Form](assets/screens/recipe-add-form.png)

### 🔔 Notification Page
![Notification Page](assets/screens/notification-page.png)

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

---

## 🐛 Troubleshooting

### **Common Build Errors**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

---

## 📞 Support & Contact

- **GitHub Issues:** [Report Bugs](https://github.com/Mahesh17-m/food-recipe-frontend/issues)
- **Email:** mbmandalapu200217@gmail.com

---

## 🙏 Acknowledgments

- **Angular Team** - For the amazing framework
- **Google AI** - For Generative AI capabilities
- **Render** - Backend hosting
- **Vercel** - Frontend hosting

---

## 🎉 Ready to Deploy!

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