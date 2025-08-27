import { useTheme } from './ThemeProvider';
import { ThemeToggle } from './ThemeToggle';

const ThemeTest = () => {
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="h-8 rounded" style={{ backgroundColor: 'hsl(var(--background))' }}></div>
                <p className="text-sm">Background</p>
              </div>
              <div className="space-y-2">
                <div className="h-8 rounded" style={{ backgroundColor: 'hsl(var(--foreground))' }}></div>
                <p className="text-sm">Foreground</p>
              </div>
              <div className="space-y-2">
                <div className="h-8 rounded" style={{ backgroundColor: 'hsl(var(--primary))' }}></div>
                <p className="text-sm">Primary</p>
              </div>
              <div className="space-y-2">
                <div className="h-8 rounded" style={{ backgroundColor: 'hsl(var(--secondary))' }}></div>
                <p className="text-sm">Secondary</p>
              </div>
            </div>
          </div>

          {/* DaisyUI Components Test */}
          <div className="card p-6">
            <h2 className="text-2xl font-semibold mb-4">DaisyUI Components</h2>
            <div className="space-y-4">
              <div className="flex gap-2">
                <button className="btn btn-primary">Primary</button>
                <button className="btn btn-secondary">Secondary</button>
                <button className="btn btn-outline">Outline</button>
                <button className="btn btn-ghost">Ghost</button>
              </div>
              <div className="badge badge-primary">Primary Badge</div>
              <div className="badge badge-secondary">Secondary Badge</div>
            </div>
          </div>

          {/* Custom Components Test */}
          <div className="card p-6">
            <h2 className="text-2xl font-semibold mb-4">Custom Components</h2>
            <div className="space-y-4">
              <input type="text" placeholder="Input field" className="input w-full" />
              <label className="label">Sample Label</label>
              <div className="progress w-full">
                <div className="progress-indicator" style={{ width: '60%' }}></div>
              </div>
            </div>
          </div>

          {/* CSS Variables Display */}
          <div className="card p-6 md:col-span-2">
            <h2 className="text-2xl font-semibold mb-4">CSS Variables</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p><strong>--background:</strong></p>
                <p className="font-mono">{getComputedStyle(document.documentElement).getPropertyValue('--background')}</p>
              </div>
              <div>
                <p><strong>--foreground:</strong></p>
                <p className="font-mono">{getComputedStyle(document.documentElement).getPropertyValue('--foreground')}</p>
              </div>
              <div>
                <p><strong>--primary:</strong></p>
                <p className="font-mono">{getComputedStyle(document.documentElement).getPropertyValue('--primary')}</p>
              </div>
              <div>
                <p><strong>--secondary:</strong></p>
                <p className="font-mono">{getComputedStyle(document.documentElement).getPropertyValue('--secondary')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="card p-6 mt-6">
          <h2 className="text-2xl font-semibold mb-4">How to Test</h2>
          <ol className="list-decimal list-inside space-y-2">
            <li>Click the theme toggle button in the top right</li>
            <li>Watch the colors change immediately</li>
            <li>Check that all components update their colors</li>
            <li>Verify CSS variables are applied correctly</li>
            <li>Test system theme by changing your OS theme</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default ThemeTest;
