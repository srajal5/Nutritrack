import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { FoodEntryDocument } from '../types';
import { useAuth } from '@/hooks/use-auth';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  Loader2, 
  Camera, 
  Upload, 
  Apple, 
  Target, 
  Zap, 
  Droplet,
  CheckCircle,
  AlertCircle,
  Plus,
  X,
  Flame,
  Barcode,
  Search,
  Sparkles,
  Clock,
  Scale,
  Edit
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Define the form schema with enhanced validation
const foodEntrySchema = z.object({
  name: z.string().min(2, "Food name must be at least 2 characters"),
  description: z.string().optional(),
  servingSize: z.string().min(1, "Serving size is required"),
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  calories: z.number().min(0, "Calories cannot be negative").optional(),
  protein: z.number().min(0, "Protein cannot be negative").optional(),
  carbs: z.number().min(0, "Carbs cannot be negative").optional(),
  fat: z.number().min(0, "Fat cannot be negative").optional(),
  fiber: z.number().min(0, "Fiber cannot be negative").optional(),
  sugar: z.number().min(0, "Sugar cannot be negative").optional(),
});

type FoodEntryFormValues = z.infer<typeof foodEntrySchema>;

interface FoodEntryFormData extends FoodEntryFormValues {
  imageUrl?: string;
}

interface AnalysisResult {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  aiAnalysis: string;
  confidence: number;
  suggestions: string[];
}

// Enhanced food database with more accurate nutritional information
const foodDatabase = [
  { name: "Chicken Breast (100g)", calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, sugar: 0, category: "protein" },
  { name: "Salmon (100g)", calories: 208, protein: 25, carbs: 0, fat: 12, fiber: 0, sugar: 0, category: "protein" },
  { name: "Quinoa (1 cup cooked)", calories: 222, protein: 8, carbs: 39, fat: 4, fiber: 5, sugar: 2, category: "grain" },
  { name: "Greek Yogurt (170g)", calories: 100, protein: 17, carbs: 6, fat: 0.5, fiber: 0, sugar: 4, category: "dairy" },
  { name: "Banana (medium)", calories: 105, protein: 1.3, carbs: 27, fat: 0.4, fiber: 3, sugar: 14, category: "fruit" },
  { name: "Apple (medium)", calories: 95, protein: 0.5, carbs: 25, fat: 0.3, fiber: 4, sugar: 19, category: "fruit" },
  { name: "Almonds (28g)", calories: 164, protein: 6, carbs: 6, fat: 14, fiber: 4, sugar: 1, category: "nuts" },
  { name: "Spinach (1 cup raw)", calories: 7, protein: 0.9, carbs: 1, fat: 0.1, fiber: 0.7, sugar: 0.1, category: "vegetable" },
  { name: "Sweet Potato (100g)", calories: 86, protein: 1.6, carbs: 20, fat: 0.1, fiber: 3, sugar: 4, category: "vegetable" },
  { name: "Oatmeal (1 cup cooked)", calories: 166, protein: 6, carbs: 28, fat: 3.6, fiber: 4, sugar: 1, category: "grain" },
  { name: "Egg (large)", calories: 70, protein: 6, carbs: 0.6, fat: 5, fiber: 0, sugar: 0.4, category: "protein" },
  { name: "Avocado (100g)", calories: 160, protein: 2, carbs: 9, fat: 15, fiber: 7, sugar: 0.7, category: "fruit" },
];

const FoodEntryForm = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [showFoodDatabase, setShowFoodDatabase] = useState(false);
  const [activeTab, setActiveTab] = useState('manual');

  const form = useForm<FoodEntryFormValues>({
    resolver: zodResolver(foodEntrySchema),
    defaultValues: {
      name: "",
      description: "",
      servingSize: "",
      mealType: "breakfast",
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
    },
  });

  // Mock AI analysis function
  const analyzeFood = async (foodName: string): Promise<AnalysisResult> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return {
      calories: Math.floor(Math.random() * 500) + 100,
      protein: Math.floor(Math.random() * 30) + 5,
      carbs: Math.floor(Math.random() * 50) + 10,
      fat: Math.floor(Math.random() * 20) + 2,
      fiber: Math.floor(Math.random() * 10) + 1,
      sugar: Math.floor(Math.random() * 20) + 2,
      aiAnalysis: `AI analysis of ${foodName}: This appears to be a nutritious food item with balanced macronutrients.`,
      confidence: Math.floor(Math.random() * 30) + 70,
      suggestions: [
        "Consider pairing with vegetables for added fiber",
        "This food provides good protein content",
        "Consider adding more vegetables for fiber",
      ]
    };
  };

  const handleFoodSelect = (food: typeof foodDatabase[0]) => {
    form.setValue('name', food.name);
    form.setValue('calories', food.calories);
    form.setValue('protein', food.protein);
    form.setValue('carbs', food.carbs);
    form.setValue('fat', food.fat);
    form.setValue('fiber', food.fiber);
    form.setValue('sugar', food.sugar);
    setShowFoodDatabase(false);
  };

  const filteredFoods = foodDatabase.filter(food =>
    food.name.toLowerCase().includes(form.watch('name').toLowerCase())
  );

  const mutation = useMutation({
    mutationFn: async (data: FoodEntryFormData) => {
      const response = await apiRequest('/api/food-entries', {
        method: 'POST',
        body: JSON.stringify({
          ...data,
          userId: user?.id,
          date: new Date().toISOString(),
        }),
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Food entry added successfully.",
      });
      form.reset();
      setAnalysisResult(null);
      queryClient.invalidateQueries({ queryKey: ['/api/food-entries'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add food entry. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: FoodEntryFormValues) => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "Please log in to add food entries.",
        variant: "destructive",
      });
      return;
    }

    mutation.mutate(data);
  };

  const handleAnalyze = async () => {
    const foodName = form.getValues('name');
    if (!foodName) {
      toast({
        title: "Error",
        description: "Please enter a food name to analyze.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await analyzeFood(foodName);
      setAnalysisResult(result);
      
      // Auto-fill form with analysis results
      form.setValue('calories', result.calories);
      form.setValue('protein', result.protein);
      form.setValue('carbs', result.carbs);
      form.setValue('fat', result.fat);
      form.setValue('fiber', result.fiber);
      form.setValue('sugar', result.sugar);
      
      toast({
        title: "Analysis Complete!",
        description: `AI analyzed ${foodName} with ${result.confidence}% confidence.`,
      });
    } catch (error) {
      toast({
        title: "Analysis Failed",
        description: "Failed to analyze food. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Input Method Tabs */}
      <div className="tabs tabs-boxed bg-base-200/50 p-1 mb-4">
        <button 
          className={`tab flex-1 ${activeTab === "manual" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("manual")}
        >
          <Edit className="h-4 w-4 mr-2" />
          Manual
        </button>
        <button 
          className={`tab flex-1 ${activeTab === "photo" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("photo")}
        >
          <Camera className="h-4 w-4 mr-2" />
          Photo
        </button>
        <button 
          className={`tab flex-1 ${activeTab === "barcode" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("barcode")}
        >
          <Barcode className="h-4 w-4 mr-2" />
          Barcode
        </button>
        <button 
          className={`tab flex-1 ${activeTab === "search" ? "tab-active" : ""}`}
          onClick={() => setActiveTab("search")}
        >
          <Search className="h-4 w-4 mr-2" />
          Search
        </button>
      </div>

      {/* Manual Entry Tab */}
      {activeTab === "manual" && (
        <div className="space-y-4">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Food Name</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., Grilled Chicken Salad"
                  className="input input-bordered"
                  {...form.register("name")}
                />
                {form.formState.errors.name && (
                  <label className="label">
                    <span className="label-text-alt text-error">{form.formState.errors.name.message}</span>
                  </label>
                )}
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text">Meal Type</span>
                </label>
                <select
                  className="select select-bordered"
                  {...form.register("mealType")}
                >
                  <option value="">Select meal type</option>
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                  <option value="snack">Snack</option>
                </select>
                {form.formState.errors.mealType && (
                  <label className="label">
                    <span className="label-text-alt text-error">{form.formState.errors.mealType.message}</span>
                  </label>
                )}
              </div>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Description (Optional)</span>
              </label>
              <textarea 
                placeholder="Add any notes about your meal..." 
                className="textarea textarea-bordered"
                {...form.register("description")}
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">Serving Size</span>
              </label>
              <input
                type="text"
                placeholder="e.g., 1 cup, 200g, 1 piece"
                className="input input-bordered"
                {...form.register("servingSize")}
              />
              {form.formState.errors.servingSize && (
                <label className="label">
                  <span className="label-text-alt text-error">{form.formState.errors.servingSize.message}</span>
                </label>
              )}
            </div>

            {/* Nutrition Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Scale className="h-5 w-5" />
                Nutrition Information
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text flex items-center gap-1">
                      <Flame className="h-3 w-3" />
                      Calories
                    </span>
                  </label>
                  <input 
                    type="number" 
                    className="input input-bordered"
                    {...form.register("calories", { valueAsNumber: true })}
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text flex items-center gap-1">
                      <Target className="h-3 w-3" />
                      Protein (g)
                    </span>
                  </label>
                  <input 
                    type="number" 
                    className="input input-bordered"
                    {...form.register("protein", { valueAsNumber: true })}
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text flex items-center gap-1">
                      <Zap className="h-3 w-3" />
                      Carbs (g)
                    </span>
                  </label>
                  <input 
                    type="number" 
                    className="input input-bordered"
                    {...form.register("carbs", { valueAsNumber: true })}
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text flex items-center gap-1">
                      <Droplet className="h-3 w-3" />
                      Fat (g)
                    </span>
                  </label>
                  <input 
                    type="number" 
                    className="input input-bordered"
                    {...form.register("fat", { valueAsNumber: true })}
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Fiber (g)</span>
                  </label>
                  <input 
                    type="number" 
                    className="input input-bordered"
                    {...form.register("fiber", { valueAsNumber: true })}
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Sugar (g)</span>
                  </label>
                  <input 
                    type="number" 
                    className="input input-bordered"
                    {...form.register("sugar", { valueAsNumber: true })}
                  />
                </div>
              </div>
            </div>

            {/* AI Analysis Button */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="btn btn-outline btn-primary"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    AI Analyze
                  </>
                )}
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={mutation.isPending}
              className="btn btn-primary w-full"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Food Entry
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Photo Analysis Tab */}
      {activeTab === "photo" && (
        <div className="space-y-4">
          <div className="text-center space-y-4">
            <div className="p-6 border-2 border-dashed border-base-300 rounded-lg">
              <Camera className="h-12 w-12 mx-auto text-base-content/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Photo Analysis
              </h3>
              <p className="text-base-content/70 mb-4">
                Take a photo of your food to get AI-powered nutritional analysis
              </p>
              <button className="btn btn-primary">
                <Camera className="h-4 w-4 mr-2" />
                Take Photo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Scanning Tab */}
      {activeTab === "barcode" && (
        <div className="space-y-4">
          <div className="text-center space-y-4">
            <div className="p-6 border-2 border-dashed border-base-300 rounded-lg">
              <Barcode className="h-12 w-12 mx-auto text-base-content/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Scan Barcode
              </h3>
              <p className="text-base-content/70 mb-4">
                Point your camera at a food product barcode to automatically detect nutritional information
              </p>
              <button 
                onClick={() => {
                  // Simulate barcode scanning
                  const mockBarcodeData = {
                    name: "Sample Product",
                    calories: 150,
                    protein: 8,
                    carbs: 20,
                    fat: 5,
                    fiber: 2,
                    sugar: 3
                  };
                  form.setValue('name', mockBarcodeData.name);
                  form.setValue('calories', mockBarcodeData.calories);
                  form.setValue('protein', mockBarcodeData.protein);
                  form.setValue('carbs', mockBarcodeData.carbs);
                  form.setValue('fat', mockBarcodeData.fat);
                  form.setValue('fiber', mockBarcodeData.fiber);
                  form.setValue('sugar', mockBarcodeData.sugar);
                  toast({
                    title: "Barcode Scanned!",
                    description: `Found: ${mockBarcodeData.name}`,
                  });
                }}
                className="btn btn-primary"
              >
                <Barcode className="h-4 w-4 mr-2" />
                Scan Barcode
              </button>
            </div>
            
            <div className="text-sm text-base-content/70">
              <p>• Ensure good lighting for accurate scanning</p>
              <p>• Hold the barcode steady in the camera view</p>
              <p>• Supported formats: UPC, EAN, Code 128</p>
            </div>
          </div>
        </div>
      )}

      {/* Food Search Tab */}
      {activeTab === "search" && (
        <div className="space-y-4">
          <div className="space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">Search Food Database</span>
              </label>
              <input
                type="text"
                placeholder="Search for foods..."
                className="input input-bordered"
                {...form.register("name")}
                onChange={(e) => {
                  form.setValue("name", e.target.value);
                  setShowFoodDatabase(true);
                }}
              />
            </div>

            {showFoodDatabase && (
              <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <h3 className="card-title">Food Database</h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {filteredFoods.map((food, index) => (
                      <button
                        key={index}
                        onClick={() => handleFoodSelect(food)}
                        className="btn btn-ghost w-full justify-start text-left"
                      >
                        <div>
                          <div className="font-medium">{food.name}</div>
                          <div className="text-sm text-base-content/70">
                            {food.calories} cal • {food.protein}g protein • {food.carbs}g carbs • {food.fat}g fat
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Analysis Results */}
      {analysisResult && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h3 className="card-title flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Analysis Results
            </h3>
            <div className="space-y-4">
              <p className="text-base-content/70">{analysisResult.aiAnalysis}</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-base-200 rounded-lg">
                  <div className="text-2xl font-bold text-primary">{analysisResult.calories}</div>
                  <div className="text-sm text-base-content/70">Calories</div>
                </div>
                <div className="text-center p-3 bg-base-200 rounded-lg">
                  <div className="text-2xl font-bold text-primary">{analysisResult.protein}g</div>
                  <div className="text-sm text-base-content/70">Protein</div>
                </div>
                <div className="text-center p-3 bg-base-200 rounded-lg">
                  <div className="text-2xl font-bold text-primary">{analysisResult.carbs}g</div>
                  <div className="text-sm text-base-content/70">Carbs</div>
                </div>
                <div className="text-center p-3 bg-base-200 rounded-lg">
                  <div className="text-2xl font-bold text-primary">{analysisResult.fat}g</div>
                  <div className="text-sm text-base-content/70">Fat</div>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold">Suggestions:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-base-content/70">
                  {analysisResult.suggestions.map((suggestion, index) => (
                    <li key={index}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FoodEntryForm;