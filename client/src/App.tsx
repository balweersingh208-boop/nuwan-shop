import { Switch, Route, Link, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/contexts/auth-context";
import { AuthProvider } from "@/contexts/auth-context";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Billing from "@/pages/billing";
import DueManagement from "@/pages/due";
import Inventory from "@/pages/inventory";
import Customers from "@/pages/customers";
import Sales from "@/pages/sales";
import About from "@/pages/about";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Receipt,
  Building2,
  Clock,
  LogOut,
} from "lucide-react";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/billing", label: "Billing", icon: ShoppingCart },
  { path: "/due", label: "Due", icon: Clock },
  { path: "/inventory", label: "Inventory", icon: Package },
  { path: "/customers", label: "Customers", icon: Users },
  { path: "/sales", label: "Sales", icon: Receipt },
  { path: "/about", label: "About", icon: Building2 },
];

function Router({ isAuthenticated }: { isAuthenticated: boolean }) {
  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="*" component={Login} />
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/billing" component={Billing} />
      <Route path="/due" component={DueManagement} />
      <Route path="/inventory" component={Inventory} />
      <Route path="/customers" component={Customers} />
      <Route path="/sales" component={Sales} />
      <Route path="/about" component={About} />
      <Route component={NotFound} />
    </Switch>
  );
}

function Navigation({ isAuthenticated, onLogout }: { isAuthenticated: boolean; onLogout: () => void }) {
  const [location] = useLocation();

  if (!isAuthenticated) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 bg-background border-b border-border/40 backdrop-blur-md bg-background/80">
      <div className="flex items-center justify-between gap-4 px-6 h-16">
        {/* Logo */}
        <Link href="/">
          <div className="flex items-center gap-3 cursor-pointer group">
            <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center p-1.5 overflow-hidden group-hover:shadow-md transition-all">
              <img 
                src="/favicon.png" 
                alt="Moon Shoes Logo" 
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="flex items-center gap-0.5">
          {navItems.map((item) => {
            const isActive = location === item.path;
            const Icon = item.icon;
            return (
              <Link key={item.path} href={item.path}>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  className={`gap-2 transition-all ${isActive ? "bg-primary text-primary-foreground" : ""}`}
                  data-testid={`nav-${item.label.toLowerCase()}`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden md:inline text-sm font-medium">{item.label}</span>
                </Button>
              </Link>
            );
          })}
        </nav>

        {/* Right Side */}
        <div className="flex items-center gap-1 ml-auto">
          <span className="text-xs text-muted-foreground hidden lg:block px-2">
            {new Date().toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </span>
          <ThemeToggle />
          <Button
            variant="ghost"
            size="sm"
            onClick={onLogout}
            data-testid="button-logout"
            className="gap-2 hover:bg-muted/50"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden md:inline text-sm">Logout</span>
          </Button>
        </div>
      </div>
    </header>
  );
}

function AppContent() {
  const { isAuthenticated, logout } = useAuth();
  const [, navigate] = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation isAuthenticated={isAuthenticated} onLogout={handleLogout} />
      <main className={isAuthenticated ? "min-h-[calc(100vh-64px)]" : "min-h-screen"}>
        <Router isAuthenticated={isAuthenticated} />
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <AppContent />
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
