// Recipe/Ingredient/Dish types
export interface Ingredient {
  id: number;
  name: string;
  unit: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

export interface DishIngredient {
  dishId: number;
  ingredientId: number;
  quantity: number;
  ingredient?: Ingredient;
}

export interface Dish {
  id: number;
  name: string;
  category: string;
  preparationTime: number;
  ingredients?: DishIngredient[];
}

export interface DishNutrition {
  dishId: number;
  dishName: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}
