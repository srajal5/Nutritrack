import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { FoodEntryDocument } from '../types';

const RecentFoodEntries = ({ userId = 1, limit = 4 }) => {
  const [showAll, setShowAll] = useState(false);
  
  // Fetch food entries
  const { data: foodEntries = [], isLoading } = useQuery<FoodEntryDocument[]>({
    queryKey: [`/api/food-entries?userId=${userId}`],
    initialData: []
  });
  
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6 animate-pulse">
        <div className="flex justify-between items-center mb-4">
          <div className="h-6 w-48 bg-slate-200 rounded"></div>
          <div className="h-4 w-20 bg-slate-200 rounded"></div>
        </div>
        {[...Array(4)].map((_, index) => (
          <div key={index} className="border-b border-neutral-100 py-4 flex items-center space-x-4">
            <div className="w-14 h-14 bg-slate-200 rounded-lg"></div>
            <div className="flex-1">
              <div className="h-5 w-32 bg-slate-200 rounded mb-2"></div>
              <div className="h-4 w-24 bg-slate-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }
  
  const displayEntries = showAll ? foodEntries : (foodEntries?.slice(0, limit) || []);
  
  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-heading text-xl font-semibold">Recent Food Entries</h3>
        <button 
          onClick={() => setShowAll(!showAll)} 
          className="text-sm text-primary hover:text-primary-dark font-medium"
        >
          {showAll ? 'Show Less' : 'View All'}
        </button>
      </div>
      
      {displayEntries.length === 0 ? (
        <div className="py-8 text-center text-neutral-500">
          <p>No food entries yet. Start tracking your meals!</p>
        </div>
      ) : (
        displayEntries.map((entry, index) => (
          <div 
            key={entry.id} 
            className={`${index < displayEntries.length - 1 ? 'border-b border-neutral-100' : ''} py-4 flex items-center space-x-4`}
          >
            <div className="w-14 h-14 bg-neutral-100 rounded-lg overflow-hidden">
              {entry.imageUrl ? (
                <img 
                  src={entry.imageUrl} 
                  alt={entry.name} 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-neutral-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex justify-between">
                <h4 className="font-medium">{entry.name}</h4>
                <span className="font-mono text-sm">{Math.round(entry.calories)} kcal</span>
              </div>
              <p className="text-sm text-neutral-500">
                {entry.servingSize}
              </p>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default RecentFoodEntries;
