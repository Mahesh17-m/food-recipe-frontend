import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { AddRecipeComponent } from './component/add-recipe/add-recipe.component';
import { HomeComponent } from './component/home/home.component';
import { LoginComponent } from './component/login/login.component';
import { ProfileComponent } from './component/profile/profile.component';
import { RecipeDetailComponent } from './component/recipe-detail/recipe-detail.component';
import { RecipeListComponent } from './component/recipe-list/recipe-list.component';
import { FavoriteRecipesComponent } from './component/favorite-recipes/favorite-recipes.component';
import { MyRecipesComponent } from './component/my-recipes/my-recipes.component';
import { SavedRecipesComponent } from './component/saved-recipes/saved-recipes.component';
import { SettingsComponent } from './component/settings/settings.component';
import { EditRecipeComponent } from './component/edit-recipe/edit-recipe.component';
import { AuthorProfileComponent } from './component/author-profile/author-profile.component';
import { ChefsComponent } from './component/chefs/chefs.component';
import { NotificationsComponent } from './component/notifications/notifications.component';
import { ForgotPasswordComponent } from './component/forgot-password/forgot-password.component';
import { OAuthCallbackComponent } from './component/oauth-callback/oauth-callback.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'auth', component: LoginComponent },
  {
    path: 'profile',
    component: ProfileComponent,
    canActivate: [AuthGuard],
  children: [
    { path: '', redirectTo: 'my-recipes', pathMatch: 'full' },   // default
    { path: 'my-recipes', component: MyRecipesComponent },
    { path: 'favorites', component: FavoriteRecipesComponent },
    { path: 'saved', component: SavedRecipesComponent },
    { path: 'settings', component: SettingsComponent }
  ]
  },
  { path: 'edit-recipe/:id', component: EditRecipeComponent },
  { path: 'add-recipe', component: AddRecipeComponent, canActivate: [AuthGuard] },
  { path: 'recipes', component: RecipeListComponent },
  { path: 'recipes/:id', component: RecipeDetailComponent },
  { path: 'author/:userId', component: AuthorProfileComponent }, // Add this route
   { path: 'oauth-callback', component: OAuthCallbackComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'reset-password/:token', component: ForgotPasswordComponent },
   { path: 'chefs', component: ChefsComponent },
       {
    path: 'notifications',
    component: NotificationsComponent
  },
  { path: '**', redirectTo: '' }
];