// CREATE THIS - Used when you run: ng build --prod
export const environment = {
  production: true,                    // ← true for production
  apiUrl: 'https://food-recipe-backend-yqx9.onrender.com/api', // ← live backend
   imageBaseUrl: 'https://res.cloudinary.com',
   googleClientId: '911074336198-07hqjv87j2glss1b5a6i7tna4nr439tc.apps.googleusercontent.com',
  // Add your Vercel domain here
  frontendUrl: 'https://food-recipe-frontend-rust.vercel.app',
  // Also include for auth redirects
  redirectUri: 'https://food-recipe-frontend-rust.vercel.app',
  endpoints: {
    recipes: '/recipes',
    auth: '/auth',
    users: '/users'
  }
};