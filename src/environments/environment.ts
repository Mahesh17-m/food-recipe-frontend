// KEEP THIS - Used when you run: ng serve
export const environment = {
  production: false,                    // ← false for dev
  apiUrl: 'http://localhost:5000/api',  // ← local backend
  imageBaseUrl: 'http://localhost:5000',
  endpoints: {
    recipes: '/recipes',
    auth: '/auth',
    users: '/users'
  }
};