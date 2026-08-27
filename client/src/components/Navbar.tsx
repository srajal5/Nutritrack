import { Link, useLocation } from "wouter";
import BrandLogo from "@/components/BrandLogo";
import { useAuth } from "../hooks/use-auth";
import { 
  LayoutDashboard, 
  PlusCircle, 
  BarChart3, 
  BrainCircuit, 
  UserCircle,
  LogOut
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

export default function Navbar() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();

  // Do not show navbar if user is not authenticated
  if (!user) return null;

  const navLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/tracker", label: "Log Food", icon: PlusCircle },
    { href: "/stats", label: "Stats", icon: BarChart3 },
    { href: "/ai-coach", label: "AI Coach", icon: BrainCircuit },
    { href: "/profile", label: "Profile", icon: UserCircle },
  ];

  return (
    <nav aria-label="Main navigation" className="sticky top-0 z-50 w-full backdrop-blur-md bg-background/80 border-b border-border shadow-sm">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        
        {/* Brand — the gradient-clipped text this replaced rendered as an
            unreadable colour smear and omitted the "AI" half of the name. */}
        <div className="flex items-center gap-2">
          <Link href="/dashboard" aria-label="NutriTrackAI home" className="flex items-center">
            <BrandLogo size="sm" />
          </Link>
        </div>

        {/* Desktop Navigation Links */}
        <div className="hidden md:flex items-center gap-2">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location === link.href;
            return (
              // wouter's <Link> renders its own <a>; wrapping another anchor
              // inside produced invalid nested <a><a> markup (React's
              // validateDOMNesting warning seen in production).
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive ? 'page' : undefined}
                className={`btn btn-sm btn-ghost gap-2 px-3 flex flex-nowrap whitespace-nowrap items-center ${isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}
              >
                <Icon className="w-4 h-4" />
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" aria-label="Open user menu" className="relative h-10 w-10 rounded-full border border-primary/20 bg-primary/5">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} alt="Avatar" />
                  <AvatarFallback>{user.username?.substring(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none truncate">{user.username}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="md:hidden">
                <DropdownMenuItem asChild>
                  <Link href="/dashboard" className="cursor-pointer"><LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/tracker" className="cursor-pointer"><PlusCircle className="mr-2 h-4 w-4" /> Log Food</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/stats" className="cursor-pointer"><BarChart3 className="mr-2 h-4 w-4" /> Stats</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/ai-coach" className="cursor-pointer"><BrainCircuit className="mr-2 h-4 w-4" /> AI Coach</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </div>
              <DropdownMenuItem asChild>
                <Link href="/profile" className="cursor-pointer">
                  <UserCircle className="mr-2 h-4 w-4" /> Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => logoutMutation.mutate()} className="text-destructive cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" /> Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
}
