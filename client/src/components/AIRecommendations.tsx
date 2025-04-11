import { useQuery } from '@tanstack/react-query';

const AIRecommendations = ({ userId = 1 }) => {
  // Fetch AI recommendations
  const { data: recommendations, isLoading, isError } = useQuery({
    queryKey: [`/api/recommendations?userId=${userId}`],
  });
  
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6 animate-pulse">
        <div className="h-6 bg-slate-200 rounded mb-4"></div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }
  
  if (isError || !recommendations) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        <h3 className="font-heading text-xl font-semibold mb-4">AI Recommendations</h3>
        <div className="p-4 border-l-4 border-orange-500 bg-orange-50 rounded-r-lg">
          <h4 className="font-medium mb-1">Unable to load recommendations</h4>
          <p className="text-sm text-neutral-700">We couldn't load your personalized recommendations at this time. Please try again later.</p>
        </div>
      </div>
    );
  }
  
  // Determine border colors based on recommendation index
  const borderColors = ['primary', 'secondary', 'accent'];
  const bgColors = ['primary/5', 'secondary/5', 'accent/5'];
  
  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h3 className="font-heading text-xl font-semibold mb-4">AI Recommendations</h3>
      
      <div className="space-y-4">
        {recommendations.map((recommendation, index) => (
          <div 
            key={index}
            className={`p-4 border-l-4 border-${borderColors[index % 3]} bg-${bgColors[index % 3]} rounded-r-lg`}
            style={{
              borderLeftColor: index === 0 ? '#4CAF50' : index === 1 ? '#2196F3' : '#FF9800',
              backgroundColor: index === 0 ? 'rgba(76, 175, 80, 0.05)' : index === 1 ? 'rgba(33, 150, 243, 0.05)' : 'rgba(255, 152, 0, 0.05)'
            }}
          >
            <h4 className="font-medium mb-1">{recommendation.title}</h4>
            <p className="text-sm text-neutral-700">{recommendation.description}</p>
          </div>
        ))}
        
        {recommendations.length === 0 && (
          <div className="p-4 border-l-4 border-blue-500 bg-blue-50 rounded-r-lg">
            <h4 className="font-medium mb-1">Track More Foods</h4>
            <p className="text-sm text-neutral-700">Add more food entries to get personalized AI recommendations for your nutrition.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIRecommendations;
