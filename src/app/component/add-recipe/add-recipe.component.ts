import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RecipeService } from '../../services/recipe.service';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-add-recipe',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, FormsModule, RouterModule],
  templateUrl: './add-recipe.component.html',
  styleUrls: ['./add-recipe.component.css']
})
export class AddRecipeComponent implements OnInit {
  recipeForm!: FormGroup;
  isSubmitting = false;
  imagePreview: string | null = null;
  imageError: string | null = null;
  selectedFile: File | null = null;
  categories = [
    'Breakfast', 'Lunch', 'Dinner', 'Desserts', 
    'Vegetarian', 'Vegan', 'Gluten-Free', 'Ketos','Non-Vegetarian', 'Salads', 'Soups', 'Snacks','Juices'
  ];

  constructor(
    private fb: FormBuilder,
    private recipeService: RecipeService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initializeForm();
  }

  initializeForm(): void {
    this.recipeForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required, Validators.minLength(10)]],
      category: ['', Validators.required],
      prepTime: ['', [Validators.required, Validators.min(1)]],
      cookTime: ['', [Validators.required, Validators.min(1)]],
      servings: ['', [Validators.required, Validators.min(1)]],
      difficulty: ['', Validators.required],
      ingredients: this.fb.array([this.createIngredient()], Validators.required),
      instructions: this.fb.array([this.createInstruction()], Validators.required),
      nutrition: this.fb.group({
        calories: [''],
        carbs: [''],
        protein: [''],
        fat: ['']
      }),
      notes: ['']
    });
  }

  createIngredient(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      amount: ['', Validators.required]
    });
  }

  createInstruction(): FormGroup {
    return this.fb.group({
      text: ['', [Validators.required, Validators.minLength(10)]],
      imageUrl: ['']
    });
  }

  get ingredients(): FormArray {
    return this.recipeForm.get('ingredients') as FormArray;
  }

  get instructions(): FormArray {
    return this.recipeForm.get('instructions') as FormArray;
  }

  addIngredient(): void {
    this.ingredients.push(this.createIngredient());
  }

  removeIngredient(index: number): void {
    if (this.ingredients.length > 1) {
      this.ingredients.removeAt(index);
    }
  }

  addInstruction(): void {
    this.instructions.push(this.createInstruction());
  }

  removeInstruction(index: number): void {
    if (this.instructions.length > 1) {
      this.instructions.removeAt(index);
    }
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.imageError = null;
    
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        this.imageError = 'Only JPEG, PNG, GIF or WEBP images are allowed';
        return;
      }
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        this.imageError = 'Image must be less than 5MB';
        return;
      }
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagePreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  removeImage(): void {
    this.imagePreview = null;
    this.selectedFile = null;
    const fileInput = document.getElementById('image') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  onSubmit(): void {
    console.log('Form submitted');
    console.log('Form valid:', this.recipeForm.valid);
    console.log('Form errors:', this.recipeForm.errors);
    
    // Log individual field errors for debugging
    Object.keys(this.recipeForm.controls).forEach(key => {
      const control = this.recipeForm.get(key);
      if (control?.invalid) {
        console.log(`Field ${key} errors:`, control.errors);
      }
    });

    // Check if form is valid
    if (this.recipeForm.invalid) {
      console.log('Form is invalid - marking all fields as touched');
      this.markFormGroupTouched(this.recipeForm);
      return;
    }

    this.isSubmitting = true;

    // Prepare the recipe data with proper type conversion
    const recipeData = {
      title: this.recipeForm.value.title?.trim(),
      description: this.recipeForm.value.description?.trim(),
      category: this.recipeForm.value.category,
      prepTime: parseInt(this.recipeForm.value.prepTime) || 0,
      cookTime: parseInt(this.recipeForm.value.cookTime) || 0,
      servings: parseInt(this.recipeForm.value.servings) || 1,
      difficulty: this.recipeForm.value.difficulty,
      ingredients: this.recipeForm.value.ingredients.map((ing: any) => ({
        name: ing.name?.trim(),
        amount: ing.amount?.trim()
      })),
      instructions: this.recipeForm.value.instructions.map((inst: any) => ({
        text: inst.text?.trim(),
        imageUrl: inst.imageUrl?.trim() || ''
      })),
      nutrition: {
        calories: this.recipeForm.value.nutrition.calories ? parseInt(this.recipeForm.value.nutrition.calories) : null,
        carbs: this.recipeForm.value.nutrition.carbs ? parseInt(this.recipeForm.value.nutrition.carbs) : null,
        protein: this.recipeForm.value.nutrition.protein ? parseInt(this.recipeForm.value.nutrition.protein) : null,
        fat: this.recipeForm.value.nutrition.fat ? parseInt(this.recipeForm.value.nutrition.fat) : null
      },
      notes: this.recipeForm.value.notes?.trim() || ''
    };

    console.log('Sending recipe data:', recipeData);

    if (this.selectedFile) {
      // Use FormData for file upload
      const formData = new FormData();
      formData.append('data', JSON.stringify(recipeData));
      formData.append('image', this.selectedFile, this.selectedFile.name);
      
      console.log('Sending with image via FormData');
      
      this.recipeService.createRecipe(formData).subscribe({
        next: (recipe) => {
          console.log('Recipe created successfully:', recipe);
          this.isSubmitting = false;
          this.router.navigate(['/recipes', recipe._id]);
        },
        error: (error) => {
          console.error('Error creating recipe:', error);
          this.isSubmitting = false;
          this.imageError = error.message || 'Failed to create recipe. Please try again.';
        }
      });
    } else {
      // Send as JSON without image
      console.log('Sending without image as JSON');
      
      this.recipeService.createRecipe(recipeData).subscribe({
        next: (recipe) => {
          console.log('Recipe created successfully:', recipe);
          this.isSubmitting = false;
          this.router.navigate(['/recipes', recipe._id]);
        },
        error: (error) => {
          console.error('Error creating recipe:', error);
          this.isSubmitting = false;
          this.imageError = error.message || 'Failed to create recipe. Please try again.';
        }
      });
    }
  }

  // Helper method to mark all form controls as touched
  private markFormGroupTouched(formGroup: FormGroup | FormArray) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      if (control instanceof FormGroup || control instanceof FormArray) {
        this.markFormGroupTouched(control);
      } else {
        control?.markAsTouched();
      }
    });
  }

  // Helper method to check if a field is invalid
  isFieldInvalid(fieldName: string): boolean {
    const field = this.recipeForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  // Helper method to check if form array item is invalid
  isFormArrayItemInvalid(arrayName: string, index: number, fieldName: string): boolean {
    const array = this.recipeForm.get(arrayName) as FormArray;
    const item = array.at(index) as FormGroup;
    const field = item.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  handleImageError(event: Event): void {
    const imgElement = event.target as HTMLImageElement;
    imgElement.src = 'assets/recipe-placeholder.jpg';
    imgElement.onerror = null;
  }
}