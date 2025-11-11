import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Download, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const Checkout = () => {
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);

  const handlePayment = () => {
    setProcessing(true);
    // Simulate payment processing
    setTimeout(() => {
      setProcessing(false);
      toast.success("Payment successful! Generating your lesson note...");
      setTimeout(() => {
        navigate("/download");
      }, 1500);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-foreground">LessonAI</h1>
            <Button variant="outline" onClick={() => navigate("/generator")}>
              Back
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8 text-center">
            <h2 className="mb-2 text-3xl font-bold text-foreground">Complete Your Purchase</h2>
            <p className="text-muted-foreground">
              Secure payment to download your AI-generated lesson note
            </p>
          </div>

          <div className="grid gap-6">
            {/* Order Summary */}
            <Card className="p-6 shadow-medium">
              <h3 className="mb-4 text-lg font-semibold text-foreground">Order Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lesson Note Generation</span>
                  <span className="font-medium text-foreground">$9.99</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Processing Fee</span>
                  <span className="font-medium text-foreground">$0.50</span>
                </div>
                <div className="border-t border-border pt-3">
                  <div className="flex justify-between text-lg font-bold">
                    <span className="text-foreground">Total</span>
                    <span className="text-primary">$10.49</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Payment Form */}
            <Card className="p-6 shadow-medium">
              <div className="mb-4 flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">Payment Information</h3>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cardNumber">Card Number</Label>
                  <div className="relative">
                    <Input
                      id="cardNumber"
                      placeholder="1234 5678 9012 3456"
                      className="pl-10"
                    />
                    <CreditCard className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="expiry">Expiry Date</Label>
                    <Input id="expiry" placeholder="MM/YY" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cvv">CVV</Label>
                    <Input id="cvv" placeholder="123" maxLength={3} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Cardholder Name</Label>
                  <Input id="name" placeholder="John Doe" />
                </div>

                <Button
                  onClick={handlePayment}
                  disabled={processing}
                  className="w-full bg-gradient-hero hover:opacity-90"
                  size="lg"
                >
                  {processing ? (
                    "Processing..."
                  ) : (
                    <>
                      <Lock className="mr-2 h-4 w-4" />
                      Pay $10.49
                    </>
                  )}
                </Button>

                <p className="text-center text-sm text-muted-foreground">
                  Your payment is secure and encrypted
                </p>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Checkout;
