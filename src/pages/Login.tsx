import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { QrCode, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import zdspgcLogo from "@/assets/zdspgc-logo.png";
import { loginUser } from "@/lib/auth";

const Login = () => {
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<"student" | "admin">("student");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const user = await loginUser(loginId, password, role);

      if (user && user.role === role) {
        toast({ title: "Login successful!", description: `Welcome back, ${user.firstName}!` });
        navigate(role === "admin" ? "/admin" : "/student");
      } else {
        toast({
          title: "Login failed",
          description: user ? "Incorrect role selected." : "Invalid Email or password.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({ title: "Server Error", description: "Could not connect to the authentication server.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3 mb-4">
            <img src={zdspgcLogo} alt="ZDSPGC" className="h-14 w-14 rounded-full" />
          </Link>
          <h1 className="text-2xl font-display font-bold text-foreground">Welcome Back</h1>
          <p className="text-muted-foreground text-sm mt-1">Sign in to AttendWise</p>
        </div>

        <div className="bg-card rounded-xl shadow-elevated p-8">
          {/* Role Toggle */}
          <div className="flex bg-muted rounded-lg p-1 mb-6">
            {(["student", "admin"] as const).map((r) => (
              <button
                key={r}
                onClick={() => {
                  setRole(r);
                  setLoginId(""); // Clear input when switching roles
                }}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-all capitalize ${role === r
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                {r === "student" ? "🎓 Student" : "🛡️ Admin"}
              </button>
            ))}
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="loginId" className="text-foreground">Email Address</Label>
              <Input
                id="loginId"
                type="email"
                placeholder={role === "admin" ? "admin@zdspgc.edu.ph" : "student@zdspgc.edu.ph"}
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                required
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-foreground">Password</Label>
              <div className="relative mt-1.5">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" disabled={isLoading} className="w-full bg-gold text-gold-foreground hover:bg-gold/90 font-semibold">
              {isLoading ? "Signing In..." : "Sign In"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Don't have an account?{" "}
            <Link to="/register" className="text-gold font-medium hover:underline">Register</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
