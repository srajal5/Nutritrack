import { useAuth } from "../hooks/use-auth";
import { useTheme } from "../components/ThemeProvider";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { useState } from "react";
import { useToast } from "../hooks/use-toast";
import { Camera, Loader2, Moon, Bell, User } from "lucide-react";

export default function Profile() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(user?.profilePicture || null);
  const [formData, setFormData] = useState({
    name: user?.displayName || "",
    email: user?.email || "",
  });
  const [preferences, setPreferences] = useState({
    notifications: false,
  });

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Here you would typically make an API call to update the profile
      // For now, we'll just simulate a successful update
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8 space-y-6">
      
      <div className="flex items-center gap-3 mb-2">
        <div className="p-3 bg-primary/10 rounded-full">
          <User className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Profile</h1>
          <p className="text-muted-foreground">Manage your settings and preferences</p>
        </div>
      </div>

      <Card className="w-full card-shadow theme-transition rounded-3xl">
        <CardHeader>
          <CardTitle>Profile Settings</CardTitle>
          <CardDescription>
            Update your profile information and photo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Profile Photo */}
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <div className="w-32 h-32 rounded-full overflow-hidden bg-secondary">
                  {profileImage ? (
                    <img
                      src={profileImage}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary/10">
                      <Camera className="w-8 h-8 text-primary" />
                    </div>
                  )}
                </div>
                <label
                  htmlFor="photo-upload"
                  className="absolute bottom-0 right-0 bg-primary text-primary-foreground p-2 rounded-full cursor-pointer hover:bg-primary/90 transition-colors"
                >
                  <Camera className="w-4 h-4" />
                </label>
                <input
                  id="photo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </div>
            </div>

            {/* Name Field */}
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Your name"
              />
            </div>

            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Your email"
                disabled
              />
              <p className="text-sm text-muted-foreground">
                Email cannot be changed
              </p>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full rounded-xl py-6 text-lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Profile"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="w-full card-shadow theme-transition rounded-3xl mt-6">
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
          <CardDescription>
            Customize your app experience
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-2xl border border-border/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Moon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <Label className="text-base font-semibold">Dark Mode</Label>
                <p className="text-sm text-muted-foreground">Toggle dark theme</p>
              </div>
            </div>
            <button 
              onClick={() => {
                const newTheme = theme === 'dark' ? 'light' : 'dark';
                setTheme(newTheme);
                toast({ title: "Theme updated", description: `Switched to ${newTheme} mode.` });
              }}
              className={`w-14 h-8 rounded-full transition-colors relative ${theme === 'dark' ? 'bg-primary' : 'bg-muted-foreground/30'}`}
            >
              <div className={`absolute top-1 left-1 bg-card w-6 h-6 rounded-full transition-transform ${theme === 'dark' ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-2xl border border-border/50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-xl">
                <Bell className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <Label className="text-base font-semibold">Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive daily reminders</p>
              </div>
            </div>
            <button 
              onClick={() => {
                setPreferences(prev => ({ ...prev, notifications: !prev.notifications }));
                toast({ title: "Preference updated", description: "Notification preference saved." });
              }}
              className={`w-14 h-8 rounded-full transition-colors relative ${preferences.notifications ? 'bg-primary' : 'bg-muted-foreground/30'}`}
            >
              <div className={`absolute top-1 left-1 bg-card text-card-foreground w-6 h-6 rounded-full transition-transform ${preferences.notifications ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 