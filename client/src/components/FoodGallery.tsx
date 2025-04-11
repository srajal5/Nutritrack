const FoodGallery = () => {
  // Mock food gallery items
  const galleryItems = [
    {
      name: "Protein-Packed Salad",
      calories: 420,
      imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&h=400&q=80"
    },
    {
      name: "Berry Breakfast Bowl",
      calories: 310,
      imageUrl: "https://images.unsplash.com/photo-1505576399279-565b52d4ac71?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&h=400&q=80"
    },
    {
      name: "Meal Prep Ideas",
      calories: null,
      description: "Various options",
      imageUrl: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&h=400&q=80"
    },
    {
      name: "Balanced Dinner Plate",
      calories: 480,
      imageUrl: "https://images.unsplash.com/photo-1615937722923-67f6deaf2cc9?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&h=400&q=80"
    },
    {
      name: "Green Power Smoothie",
      calories: 240,
      imageUrl: "https://images.unsplash.com/photo-1494597564530-871f2b93ac55?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&h=400&q=80"
    },
    {
      name: "Healthy Snack Options",
      calories: null,
      description: "150-250 kcal",
      imageUrl: "https://images.unsplash.com/photo-1607532941433-304659e8198a?ixlib=rb-1.2.1&auto=format&fit=crop&w=600&h=400&q=80"
    }
  ];
  
  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-6">
        <h2 className="font-heading text-3xl font-bold text-center mb-4">Healthy Food Inspiration</h2>
        <p className="text-center text-neutral-600 max-w-2xl mx-auto mb-12">Discover delicious and nutritious meal ideas to keep your diet on track.</p>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {galleryItems.map((item, index) => (
            <div 
              key={index} 
              className="rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="w-full h-48 overflow-hidden">
                <img 
                  src={item.imageUrl} 
                  alt={item.name} 
                  className="w-full h-full object-cover" 
                />
              </div>
              <div className="p-3">
                <p className="font-medium text-sm">{item.name}</p>
                <p className="text-xs text-neutral-500">
                  {item.calories ? `${item.calories} kcal` : item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FoodGallery;
