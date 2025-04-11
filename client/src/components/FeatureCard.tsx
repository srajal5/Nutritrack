interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  bgColorClass: string;
  iconColorClass: string;
}

const FeatureCard = ({ icon, title, description, bgColorClass, iconColorClass }: FeatureCardProps) => {
  return (
    <div className="bg-neutral-50 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className={`w-14 h-14 ${bgColorClass} rounded-lg flex items-center justify-center mb-4`}>
        <div className={`h-8 w-8 ${iconColorClass}`}>
          {icon}
        </div>
      </div>
      <h3 className="font-heading text-xl font-semibold mb-2">{title}</h3>
      <p className="text-neutral-700">{description}</p>
    </div>
  );
};

export default FeatureCard;
