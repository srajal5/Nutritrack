import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { FoodEntryDocument } from '../types';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

// Define the form schema
const foodEntrySchema = z.object({
  name: z.string().min(2, "Food name is required"),
  description: z.string().optional(),
  servingSize: z.string().min(1, "Serving size is required"),
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  calories: z.number().optional(),
  protein: z.number().optional(),
  carbs: z.number().optional(),
  fat: z.number().optional(),
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
  aiAnalysis: string;
}

const FoodEntryForm = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  
  // Initialize the form with FoodEntryFormValues type
  const form = useForm<FoodEntryFormValues>({
    resolver: zodResolver(foodEntrySchema),
    defaultValues: {
      name: "",
      description: "",
      servingSize: "",
      mealType: "breakfast",
    },
  });
  
  // Food entry mutation with proper typing
  const addFoodEntryMutation = useMutation<FoodEntryDocument, Error, FoodEntryFormData & { userId: number }>({
    mutationFn: async (data) => {
      const response = await apiRequest('POST', '/api/food-entries', data);
      return response.json();
    },
    onSuccess: (data: FoodEntryDocument) => {
      toast({
        title: 'Food entry added',
        description: 'Your food entry has been successfully analyzed and added.',
      });
      
      // Store analysis result to display detailed information
      setAnalysisResult({
        calories: data.calories || 0,
        protein: data.protein || 0,
        carbs: data.carbs || 0,
        fat: data.fat || 0,
        aiAnalysis: data.aiAnalysis || '', // This will be handled by the API
      });
      
      // Update form with the actual nutritional data
      form.setValue('calories', data.calories || 0);
      form.setValue('protein', data.protein || 0);
      form.setValue('carbs', data.carbs || 0);
      form.setValue('fat', data.fat || 0);
      
      // Don't reset form until user dismisses the analysis
      setImagePreview(null);
      queryClient.invalidateQueries({ queryKey: ['/api/food-entries'] });
      queryClient.invalidateQueries({ queryKey: ['/api/food-entries/daily'] });
    },
    onError: (error) => {
      toast({
        title: 'Error adding food entry',
        description: error.message || 'There was an error adding your food entry.',
        variant: 'destructive',
      });
    },
  });
  
  // Handle image upload
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Handle form submission
  const onSubmit = (data: FoodEntryFormValues) => {
    const formData: FoodEntryFormData = {
      ...data,
      imageUrl: imagePreview || undefined,
    };
    
    addFoodEntryMutation.mutate({
      ...formData,
      userId: 1, // Use actual user ID in production
    });
  };
  
  // Function to reset the form after analysis
  const handleReset = () => {
    setAnalysisResult(null);
    form.reset();
    queryClient.invalidateQueries({ queryKey: ['/api/food-entries'] });
    queryClient.invalidateQueries({ queryKey: ['/api/food-entries/daily'] });
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h3 className="font-heading text-xl font-semibold mb-4">Log Your Food</h3>
      
      {!analysisResult ? (
        // Show form if no analysis yet
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-neutral-700">Food Name</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="e.g. Grilled Chicken Salad" 
                      {...field} 
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-neutral-700">Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="e.g. With olive oil dressing and cherry tomatoes" 
                      className="resize-none"
                      rows={2}
                      {...field} 
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="servingSize"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-neutral-700">Serving Size</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g. 1 bowl" 
                        {...field} 
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="mealType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-neutral-700">Meal Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select meal type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="breakfast">Breakfast</SelectItem>
                        <SelectItem value="lunch">Lunch</SelectItem>
                        <SelectItem value="dinner">Dinner</SelectItem>
                        <SelectItem value="snack">Snack</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>

            <div>
              <p className="text-sm font-medium text-neutral-700 mb-1">Photo (optional)</p>
              <div 
                className="border-2 border-dashed border-neutral-200 rounded-lg p-4 text-center hover:bg-neutral-50 cursor-pointer transition"
                onClick={() => document.getElementById('food-photo-upload')?.click()}
              >
                {imagePreview ? (
                  <div className="relative w-full h-32">
                    <img 
                      src={imagePreview} 
                      alt="Food preview" 
                      className="h-full mx-auto object-cover rounded-md"
                    />
                    <button
                      type="button"
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        setImagePreview(null);
                        const input = document.getElementById('food-photo-upload') as HTMLInputElement;
                        if (input) input.value = '';
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-10 w-10 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="mt-1 text-sm text-neutral-500">Click to upload a photo</p>
                  </>
                )}
                <input 
                  type="file" 
                  id="food-photo-upload"
                  className="hidden" 
                  accept="image/*"
                  onChange={handleImageUpload}
                />
              </div>
            </div>
            
            <Button 
              type="submit"
              className="w-full bg-primary hover:bg-primary-dark transition-colors"
              disabled={addFoodEntryMutation.isPending}
            >
              {addFoodEntryMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                'Analyze with AI'
              )}
            </Button>
          </form>
        </Form>
      ) : (
        // Show analysis result
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <CardHeader className="bg-primary/10 pb-3">
              <CardTitle className="text-xl flex items-center">
                <span>AI Analysis Result</span>
                <Badge className="ml-2 bg-primary text-white">
                  {form.getValues('name')}
                </Badge>
              </CardTitle>
              <CardDescription>
                {form.getValues('description') || form.getValues('servingSize')}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5 space-y-4">
              <div className="grid grid-cols-4 gap-4 text-center">
                <div className="bg-primary/5 p-3 rounded-lg">
                  <div className="text-xl font-semibold">{analysisResult.calories}</div>
                  <div className="text-xs text-muted-foreground">Calories</div>
                </div>
                <div className="bg-primary/5 p-3 rounded-lg">
                  <div className="text-xl font-semibold">{analysisResult.protein}g</div>
                  <div className="text-xs text-muted-foreground">Protein</div>
                </div>
                <div className="bg-primary/5 p-3 rounded-lg">
                  <div className="text-xl font-semibold">{analysisResult.carbs}g</div>
                  <div className="text-xs text-muted-foreground">Carbs</div>
                </div>
                <div className="bg-primary/5 p-3 rounded-lg">
                  <div className="text-xl font-semibold">{analysisResult.fat}g</div>
                  <div className="text-xs text-muted-foreground">Fat</div>
                </div>
              </div>
              
              <div className="mt-4">
                <h4 className="font-semibold mb-2">Nutritional Analysis:</h4>
                <div className="text-sm text-gray-700 whitespace-pre-line p-3 bg-gray-50 rounded-lg">
                  {analysisResult.aiAnalysis}
                </div>
              </div>
              
              <div className="pt-3 flex justify-between">
                <Button 
                  variant="outline" 
                  onClick={handleReset}
                >
                  Log Another Food
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default FoodEntryForm;