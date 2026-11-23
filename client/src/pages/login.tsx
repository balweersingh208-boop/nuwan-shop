import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { AlertCircle, Package } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

export default function Login() {
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [, navigate] = useLocation();
  const { login, isLoading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!token.trim()) {
      setError("Please enter your token");
      return;
    }

    const success = await login(token);
    if (success) {
      navigate("/");
    } else {
      setError("Invalid token. Please try again.");
      setToken("");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <div className="p-8">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="h-16 w-16 bg-primary/10 rounded-xl flex items-center justify-center p-2 overflow-hidden shadow-inner">
              <img 
                src="/favicon.png" 
                alt="Moon Shoes Logo" 
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-center mb-2">
            The Moon Shoes & Slippers
          </h1>
          <p className="text-center text-muted-foreground mb-8">
            Shop Management System
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="token" className="text-sm font-medium">
                Access Token
              </label>
              <Input
                id="token"
                type="password"
                placeholder="Enter your token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                disabled={isLoading}
                data-testid="input-token"
                className="h-10"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-md">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
              data-testid="button-login"
            >
              {isLoading ? "Verifying..." : "Login"}
            </Button>
          </form>

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground mt-8">
            Please enter your access token to continue
          </p>
        </div>
      </Card>
    </div>
  );
}
