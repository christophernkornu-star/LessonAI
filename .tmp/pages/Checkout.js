import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Lock } from "lucide-react";
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
    return (_jsxs("div", { className: "min-h-screen bg-gradient-subtle", children: [_jsx("header", { className: "border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60", children: _jsx("div", { className: "container mx-auto px-4 py-4", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h1", { className: "text-2xl font-bold text-foreground", children: "LessonAI" }), _jsx(Button, { variant: "outline", onClick: () => navigate("/generator"), children: "Back" })] }) }) }), _jsx("main", { className: "container mx-auto px-4 py-12", children: _jsxs("div", { className: "mx-auto max-w-2xl", children: [_jsxs("div", { className: "mb-8 text-center", children: [_jsx("h2", { className: "mb-2 text-3xl font-bold text-foreground", children: "Complete Your Purchase" }), _jsx("p", { className: "text-muted-foreground", children: "Secure payment to download your AI-generated lesson note" })] }), _jsxs("div", { className: "grid gap-6", children: [_jsxs(Card, { className: "p-6 shadow-medium", children: [_jsx("h3", { className: "mb-4 text-lg font-semibold text-foreground", children: "Order Summary" }), _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-muted-foreground", children: "Lesson Note Generation" }), _jsx("span", { className: "font-medium text-foreground", children: "$9.99" })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-muted-foreground", children: "Processing Fee" }), _jsx("span", { className: "font-medium text-foreground", children: "$0.50" })] }), _jsx("div", { className: "border-t border-border pt-3", children: _jsxs("div", { className: "flex justify-between text-lg font-bold", children: [_jsx("span", { className: "text-foreground", children: "Total" }), _jsx("span", { className: "text-primary", children: "$10.49" })] }) })] })] }), _jsxs(Card, { className: "p-6 shadow-medium", children: [_jsxs("div", { className: "mb-4 flex items-center gap-2", children: [_jsx(Lock, { className: "h-5 w-5 text-primary" }), _jsx("h3", { className: "text-lg font-semibold text-foreground", children: "Payment Information" })] }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "cardNumber", children: "Card Number" }), _jsxs("div", { className: "relative", children: [_jsx(Input, { id: "cardNumber", placeholder: "1234 5678 9012 3456", className: "pl-10" }), _jsx(CreditCard, { className: "absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" })] })] }), _jsxs("div", { className: "grid gap-4 md:grid-cols-2", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "expiry", children: "Expiry Date" }), _jsx(Input, { id: "expiry", placeholder: "MM/YY" })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "cvv", children: "CVV" }), _jsx(Input, { id: "cvv", placeholder: "123", maxLength: 3 })] })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "name", children: "Cardholder Name" }), _jsx(Input, { id: "name", placeholder: "John Doe" })] }), _jsx(Button, { onClick: handlePayment, disabled: processing, className: "w-full bg-gradient-hero hover:opacity-90", size: "lg", children: processing ? ("Processing...") : (_jsxs(_Fragment, { children: [_jsx(Lock, { className: "mr-2 h-4 w-4" }), "Pay $10.49"] })) }), _jsx("p", { className: "text-center text-sm text-muted-foreground", children: "Your payment is secure and encrypted" })] })] })] })] }) })] }));
};
export default Checkout;
