import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
export function Stepper({ steps, currentStep, className }) {
    return (_jsx("div", { className: cn("w-full", className), children: _jsx("div", { className: "flex items-center justify-between", children: steps.map((step, index) => (_jsxs(React.Fragment, { children: [_jsxs("div", { className: "flex flex-col items-center flex-1", children: [_jsx("div", { className: cn("w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors", index < currentStep
                                    ? "bg-primary border-primary text-primary-foreground"
                                    : index === currentStep
                                        ? "border-primary text-primary"
                                        : "border-muted-foreground/30 text-muted-foreground"), role: "status", "aria-label": `Step ${index + 1}: ${step}`, "aria-current": index === currentStep ? "step" : undefined, children: index < currentStep ? (_jsx(Check, { className: "w-5 h-5" })) : (_jsx("span", { className: "text-sm font-semibold", children: index + 1 })) }), _jsx("span", { className: cn("text-[10px] sm:text-xs mt-2 text-center max-w-16 sm:max-w-24 leading-tight", index <= currentStep
                                    ? "text-foreground font-medium"
                                    : "text-muted-foreground"), children: step })] }), index < steps.length - 1 && (_jsx("div", { className: cn("h-0.5 flex-1 mx-2 transition-colors", index < currentStep
                            ? "bg-primary"
                            : "bg-muted-foreground/30"), "aria-hidden": "true" }))] }, step))) }) }));
}
