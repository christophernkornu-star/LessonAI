import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger, } from "@/components/ui/popover";
export function Combobox({ options, value, onValueChange, placeholder = "Select option...", searchPlaceholder = "Search...", emptyText = "No option found.", className, disabled = false, }) {
    const [open, setOpen] = React.useState(false);
    return (_jsxs(Popover, { open: open, onOpenChange: setOpen, children: [_jsx(PopoverTrigger, { asChild: true, children: _jsxs(Button, { variant: "outline", role: "combobox", "aria-expanded": open, className: cn("w-full justify-between", className), disabled: disabled, children: [value
                            ? options.find((option) => option.value === value)?.label
                            : placeholder, _jsx(ChevronsUpDown, { className: "ml-2 h-4 w-4 shrink-0 opacity-50" })] }) }), _jsx(PopoverContent, { className: "w-[--radix-popover-trigger-width] p-0", children: _jsxs(Command, { children: [_jsx(CommandInput, { placeholder: searchPlaceholder }), _jsx(CommandEmpty, { children: emptyText }), _jsx(CommandGroup, { className: "max-h-64 overflow-auto", children: options.map((option) => (_jsxs(CommandItem, { value: option.value, onSelect: (currentValue) => {
                                    onValueChange(currentValue === value ? "" : currentValue);
                                    setOpen(false);
                                }, children: [_jsx(Check, { className: cn("mr-2 h-4 w-4", value === option.value ? "opacity-100" : "opacity-0") }), option.label] }, option.value))) })] }) })] }));
}
