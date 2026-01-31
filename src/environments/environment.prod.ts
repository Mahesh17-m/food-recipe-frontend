// CREATE THIS - Used when you run: ng build --prod
export const environment = {
  production: true,                    // ← true for production
  apiUrl: 'https://food-recipe-backend-yqx9.onrender.com/api', // ← live backend
  imageBaseUrl: 'https://food-recipe-backend-yqx9.onrender.com',
  endpoints: {
    recipes: '/recipes',
    auth: '/auth',
    users: '/users'
  }
};