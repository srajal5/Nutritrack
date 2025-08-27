import { useTheme } from '../components/ThemeProvider';
import { ThemeToggle } from '../components/ThemeToggle';

const ThemeTestPage = () => {
  const { theme, resolvedTheme } = useTheme();

  return (
    <div className="min-h-screen p-8 transition-colors duration-300" style={{ backgroundColor: 'hsl(var(--background))', color: 'hsl(var(--foreground))' }}>
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Theme Test Page</h1>
          <ThemeToggle />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Current Theme Info */}
          <div className="card p-6">
            <h2 className="text-2xl font-semibold mb-4">Current Theme</h2>
            <div className="space-y-2">
              <p><strong>Selected Theme:</strong> {theme}</p>
              <p><strong>Resolved Theme:</strong> {resolvedTheme}</p>
              <p><strong>CSS Variables Applied:</strong> ✅</p>
            </div>
          </div>

          {/* Theme Colors */}
          <div className="card p-6">
            <h2 className="text-2xl font-semibold mb-4">Theme Colors</h2>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded bg-background border"></div>
                <span>Background</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded bg-foreground"></div>
                <span>Foreground</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded bg-primary"></div>
                <span>Primary</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 rounded bg-secondary"></div>
                <span>Secondary</span>
              </div>
            </div>
          </div>

          {/* Test Content */}
          <div className="card p-6 md:col-span-2">
            <h2 className="text-2xl font-semibold mb-4">Test Content</h2>
            <p className="text-muted-foreground mb-4">
              This is some test content to verify that the theme is working correctly.
              The text should be visible and properly colored in both light and dark modes.
            </p>
            <div className="flex space-x-4">
              <button className="btn btn-primary">Primary Button</button>
              <button className="btn btn-secondary">Secondary Button</button>
              <button className="btn btn-outline">Outline Button</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThemeTestPage;
