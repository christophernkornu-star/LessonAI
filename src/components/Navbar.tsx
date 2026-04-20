import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
} from "@/components/ui/sheet";
import { Menu, X, Sparkles, LayoutDashboard, FileText, Settings, LogOut, LifeBuoy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ContactDeveloperDialog } from "./ContactDeveloperDialog";

export function Navbar() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
    };
    
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
    setIsOpen(false);
  };

  const NavItems = () => (
    <>
      {isLoggedIn ? (
        <>
          <Button variant="ghost" className="justify-start w-full sm:w-auto" onClick={() => { navigate("/dashboard"); setIsOpen(false); }}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Dashboard
          </Button>
          <Button variant="ghost" className="justify-start w-full sm:w-auto" onClick={() => { navigate("/generator"); setIsOpen(false); }}>
            <Sparkles className="mr-2 h-4 w-4" />
            Generate
          </Button>
           <Button variant="ghost" className="justify-start w-full sm:w-auto" onClick={() => { navigate("/templates"); setIsOpen(false); }}>
            <FileText className="mr-2 h-4 w-4" />
            Templates
          </Button>

          <ContactDeveloperDialog>
            <Button variant="ghost" className="justify-start w-full sm:w-auto" onClick={() => setIsOpen(false)}>
              <LifeBuoy className="mr-2 h-4 w-4" />
              Contact
            </Button>
          </ContactDeveloperDialog>

          <Button variant="ghost" className="justify-start w-full sm:w-auto mobile-only sm:hidden" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
          <Button variant="outline" className="hidden sm:inline-flex" onClick={handleSignOut}>
            Sign Out
          </Button>
        </>
      ) : (
        <>
          <ContactDeveloperDialog>
            <Button variant="ghost" className="justify-start w-full sm:w-auto">
              Contact
            </Button>
          </ContactDeveloperDialog>

          <Button variant="ghost" className="justify-start w-full sm:w-auto" onClick={() => { navigate("/login"); setIsOpen(false); }}>
            Sign In
          </Button>
          <Button className="bg-gradient-hero hover:opacity-90 justify-start w-full sm:w-auto" onClick={() => { navigate("/signup"); setIsOpen(false); }}>
            Get Started
          </Button>
        </>
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-50 shadow-sm border-b border-primary/10 bg-background/80 backdrop-blur-lg supports-[backdrop-filter]:bg-background/60">
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-primary/10 via-blue-500/5 to-secondary/10 pointer-events-none" />
      <div className="container relative mx-auto px-4 py-3 sm:py-4">
        <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 hover:scale-105 transition-transform duration-300" onClick={() => setIsOpen(false)}>
                <div className="flex bg-primary/10 p-1.5 rounded-lg items-center justify-center">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">LessonAI</h1>
            </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex gap-2 sm:gap-3 items-center">
            <NavItems />
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                  <SheetDescription className="sr-only">
                    Navigation menu for mobile devices
                  </SheetDescription>
                </SheetHeader>
                <div className="flex flex-col gap-4 mt-6">
                  <NavItems />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
