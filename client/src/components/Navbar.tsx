import { Link, useLocation } from "wouter";
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
    <div className="sticky top-0 z-50 w-full backdrop-blur-md bg-background/80 border-b border-border shadow-sm">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        
        {/* Desktop & Mobile Header Title */}
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="font-bold text-xl bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-500 cursor-pointer">
              NutriTrack
            </span>
          </Link>
        </div>

        {/* Desktop Navigation Links */}
        <div className="hidden md:flex items-center gap-2">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location === link.href;
            return (
              <Link key={link.href} href={link.href}>
                <a className={`btn btn-sm btn-ghost gap-2 px-3 flex flex-nowrap whitespace-nowrap items-center ${isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`}>
                  <Icon className="w-4 h-4" />
                  {link.label}
                </a>
              </Link>
            );
          })}
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <div className="dropdown dropdown-end">
            <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar border border-primary/20 bg-primary/5">
              <div className="w-10 rounded-full">
                <img alt="User avatar" src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} />
              </div>
            </div>
            <ul tabIndex={0} className="mt-3 z-[1] p-2 shadow-lg menu menu-sm dropdown-content bg-card border border-border rounded-box w-52 text-foreground">
              <li className="menu-title px-4 py-2">
                <span className="text-foreground font-medium truncate block w-full">{user.username}</span>
              </li>
              <div className="divider my-0"></div>
              <li className="md:hidden">
                <Link href="/dashboard"><a><LayoutDashboard className="w-4 h-4" /> Dashboard</a></Link>
              </li>
              <li className="md:hidden">
                <Link href="/tracker"><a><PlusCircle className="w-4 h-4" /> Log Food</a></Link>
              </li>
              <li className="md:hidden">
                <Link href="/stats"><a><BarChart3 className="w-4 h-4" /> Stats</a></Link>
              </li>
              <li className="md:hidden">
                <Link href="/ai-coach"><a><BrainCircuit className="w-4 h-4" /> AI Coach</a></Link>
              </li>
              <li>
                <Link href="/profile">
                  <a><UserCircle className="w-4 h-4" /> Profile</a>
                </Link>
              </li>
              <li>
                <a onClick={() => logoutMutation.mutate()} className="text-destructive">
                  <LogOut className="w-4 h-4" /> Logout
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
