/**
 * The NutriTrackAI wordmark, shared by the public header and the authenticated
 * navbar so the brand cannot drift between the signed-out and signed-in views.
 */
export default function BrandLogo({
  size = 'md',
  className = '',
}: {
  size?: 'sm' | 'md';
  className?: string;
}) {
  const icon = size === 'sm' ? 'h-7 w-7' : 'h-8 w-8';
  const text = size === 'sm' ? 'text-xl' : 'text-2xl';

  return (
    <span className={`flex items-center ${className}`}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className={`${icon} text-primary shrink-0`}
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M14.243 5.757a6 6 0 10-.986 9.284 1 1 0 111.087 1.678A8 8 0 1118 10a3 3 0 01-3.757-4.243z"
          clipRule="evenodd"
        />
      </svg>
      <span className={`font-heading font-bold ${text} ml-2 text-foreground whitespace-nowrap`}>
        NutriTrack<span className="text-primary">AI</span>
      </span>
    </span>
  );
}
