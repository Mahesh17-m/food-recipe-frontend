import { Component, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RecipeService } from '../../services/recipe.service';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Recipe } from '../../models/recipe.model';

@Component({
  selector: 'app-edit-recipe',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, FormsModule, RouterModule],
  templateUrl: './edit-recipe.component.html',
  styleUrls: ['./edit-recipe.component.css']
})
export class EditRecipeComponent implements OnInit {
  recipeForm!: FormGroup;
  isSubmitting = false;
  imagePreview: string | null = null;
  imageError: string | null = null;
  selectedFile: File | null = null;
  recipeId: string | null = null;
  originalImageUrl: string | null = null;
  removeImageFlag = false;
  
  categories = [
    'Breakfast', 'Lunch', 'Dinner', 'Desserts', 
    'Vegetarian', 'Vegan', 'Gluten-Free', 'Ketos','Non-Vegetarian', 'Salads', 'Soups', 'Snacks','Juices'
  ];

  constructor(
    private fb: FormBuilder,
    private recipeService: RecipeService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.recipeId = this.route.snapshot.paramMap.get('id');
    this.initializeForm();
    if (this.recipeId) {
      this.loadRecipe();
    }
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

  loadRecipe(): void {
    if (!this.recipeId) return;

    this.recipeService.getRecipe(this.recipeId).subscribe({
      next: (recipe) => {
        console.log('Loaded recipe:', recipe);
        
        // Clear existing form arrays
        while (this.ingredients.length !== 0) {
          this.ingredients.removeAt(0);
        }
        while (this.instructions.length !== 0) {
          this.instructions.removeAt(0);
        }

        // Store original image URL
        this.originalImageUrl = recipe.imageUrl || null;
        this.imagePreview = recipe.imageUrl ? this.recipeService.getFullImageUrl(recipe.imageUrl) : null;

        // Populate form with recipe data
        this.recipeForm.patchValue({
          title: recipe.title,
          description: recipe.description,
          category: recipe.category,
          prepTime: recipe.prepTime,
          cookTime: recipe.cookTime,
          servings: recipe.servings,
          difficulty: recipe.difficulty,
          notes: recipe.notes || '',
          nutrition: recipe.nutrition || {
            calories: '',
            carbs: '',
            protein: '',
            fat: ''
          }
        });

        // Populate ingredients
        if (recipe.ingredients && recipe.ingredients.length > 0) {
          recipe.ingredients.forEach(ingredient => {
            this.ingredients.push(this.fb.group({
              name: [ingredient.name || '', [Validators.required, Validators.minLength(2)]],
              amount: [ingredient.amount || '', Validators.required]
            }));
          });
        } else {
          // Add one empty ingredient if none exist
          this.ingredients.push(this.createIngredient());
        }

        // Populate instructions
        if (recipe.instructions && recipe.instructions.length > 0) {
          recipe.instructions.forEach(instruction => {
            this.instructions.push(this.fb.group({
              text: [instruction.text || '', [Validators.required, Validators.minLength(10)]],
              imageUrl: [instruction.imageUrl || '']
            }));
          });
        } else {
          // Add one empty instruction if none exist
          this.instructions.push(this.createInstruction());
        }
      },
      error: (error) => {
        console.error('Error loading recipe:', error);
        alert('Failed to load recipe. Please try again.');
        this.router.navigate(['/profile']);
      }
    });
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.imageError = null;
    this.removeImageFlag = false; // Reset remove flag when new image is selected
    
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
    this.removeImageFlag = true; // Set flag to remove image
    this.originalImageUrl = null;
    
    const fileInput = document.getElementById('image') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  onSubmit(): void {
    console.log('Form submitted');
    
    if (this.recipeForm.invalid || !this.recipeId) {
      console.log('Form invalid or missing recipe ID');
      this.markFormGroupTouched(this.recipeForm);
      return;
    }

    this.isSubmitting = true;

    // Prepare the recipe data
    const recipeData: any = {
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
      notes: this.recipeForm.value.notes?.trim() || ''
    };

    // Add nutrition data if provided
    if (this.recipeForm.value.nutrition) {
      recipeData.nutrition = {
        calories: this.recipeForm.value.nutrition.calories ? parseInt(this.recipeForm.value.nutrition.calories) : null,
        carbs: this.recipeForm.value.nutrition.carbs ? parseInt(this.recipeForm.value.nutrition.carbs) : null,
        protein: this.recipeForm.value.nutrition.protein ? parseInt(this.recipeForm.value.nutrition.protein) : null,
        fat: this.recipeForm.value.nutrition.fat ? parseInt(this.recipeForm.value.nutrition.fat) : null
      };
    }

    console.log('Recipe data to update:', recipeData);

    const formData = new FormData();
    formData.append('data', JSON.stringify(recipeData));
    
    if (this.selectedFile) {
      console.log('Adding new image file');
      formData.append('image', this.selectedFile, this.selectedFile.name);
    } else if (this.removeImageFlag) {
      console.log('Image removal requested');
      // Send empty image field to indicate removal
      formData.append('image', '');
    }

    this.recipeService.updateRecipe(this.recipeId, formData).subscribe({
      next: (recipe) => {
        console.log('Recipe updated successfully:', recipe);
        this.isSubmitting = false;
        this.router.navigate(['/recipes', recipe._id]);
      },
      error: (error) => {
        console.error('Error updating recipe:', error);
        this.isSubmitting = false;
        this.imageError = error.message || 'Failed to update recipe. Please try again.';
        alert('Failed to update recipe: ' + (error.message || 'Unknown error'));
      }
    });
  }

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

  isFieldInvalid(fieldName: string): boolean {
    const field = this.recipeForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  isFormArrayItemInvalid(arrayName: string, index: number, fieldName: string): boolean {
    const array = this.recipeForm.get(arrayName) as FormArray;
    const item = array.at(index) as FormGroup;
    const field = item.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  handleImageError(event: Event): void {
    const imgElement = event.target as HTMLImageElement;
    imgElement.src = 'assets/recipe-placeholder.jpg';
  }
}