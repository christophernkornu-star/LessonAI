import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import * as React from "react";
import { Check, X, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
export function MultiSelectCombobox({ options, selected, onChange, placeholder = "Select items...", searchPlaceholder = "Search...", emptyText = "No items found.", className, disabled = false, maxDisplayed = 2, }) {
    const [isOpen, setIsOpen] = React.useState(false);
    const [searchValue, setSearchValue] = React.useState("");
    const containerRef = React.useRef(null);
    const dropdownRef = React.useRef(null);
    // Filter options based on search
    const filteredOptions = React.useMemo(() => {
        if (!searchValue.trim())
            return options;
        const search = searchValue.toLowerCase();
        return options.filter(option => option.toLowerCase().includes(search));
    }, [options, searchValue]);
    // Handle click outside to close dropdown
    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current &&
                !containerRef.current.contains(event.target)) {
                setIsOpen(false);
                setSearchValue("");
            }
        };
        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);
    const handleToggle = () => {
        if (!disabled) {
            setIsOpen(!isOpen);
            if (isOpen) {
                setSearchValue("");
            }
        }
    };
    const handleSelect = (item) => {
        // Toggle selection - DO NOT close dropdown
        if (selected.includes(item)) {
            onChange(selected.filter((i) => i !== item));
        }
        else {
            onChange([...selected, item]);
        }
    };
    const handleRemove = (item, e) => {
        e.stopPropagation();
        onChange(selected.filter((i) => i !== item));
    };
    const handleClearAll = (e) => {
        e.stopPropagation();
        onChange([]);
    };
    const displayedItems = selected.slice(0, maxDisplayed);
    const remainingCount = selected.length - maxDisplayed;
    return (_jsxs("div", { className: cn("space-y-2 relative", className), ref: containerRef, children: [_jsxs(Button, { type: "button", variant: "outline", role: "combobox", "aria-expanded": isOpen, onClick: handleToggle, className: cn("w-full justify-between min-h-[44px] h-auto py-2 px-3 text-left font-normal", "border-input bg-background hover:bg-accent/50 transition-colors", "focus:ring-2 focus:ring-ring focus:ring-offset-2", disabled && "opacity-50 cursor-not-allowed"), disabled: disabled, children: [_jsx("div", { className: "flex-1 flex items-center gap-2 overflow-hidden", children: selected.length > 0 ? (_jsxs("span", { className: "text-sm truncate", children: [selected.length, " item", selected.length > 1 ? 's' : '', " selected"] })) : (_jsx("span", { className: "text-muted-foreground text-sm", children: placeholder })) }), _jsx(ChevronDown, { className: cn("ml-2 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200", isOpen && "rotate-180") })] }), isOpen && (_jsxs("div", { ref: dropdownRef, className: "absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg", style: { top: '100%' }, children: [_jsxs("div", { className: "flex items-center border-b px-3 gap-2", children: [_jsx(Search, { className: "h-4 w-4 text-muted-foreground" }), _jsx("input", { type: "text", className: "flex h-10 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground", placeholder: searchPlaceholder, value: searchValue, onChange: (e) => setSearchValue(e.target.value), onClick: (e) => e.stopPropagation() })] }), _jsx("div", { className: "max-h-[200px] sm:max-h-[280px] overflow-auto p-1", children: filteredOptions.length === 0 ? (_jsx("div", { className: "py-6 text-center text-sm text-muted-foreground", children: emptyText })) : (filteredOptions.map((option, index) => {
                            const isSelected = selected.includes(option);
                            return (_jsxs("div", { role: "option", "aria-selected": isSelected, onClick: (e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleSelect(option);
                                }, className: cn("flex items-start gap-2 px-2 py-2.5 rounded-md cursor-pointer select-none", "transition-colors duration-150", "hover:bg-accent hover:text-accent-foreground", isSelected && "bg-primary/10"), children: [_jsx("div", { className: cn("flex h-5 w-5 shrink-0 items-center justify-center rounded border mt-0.5", "transition-colors duration-150", isSelected
                                            ? "bg-primary border-primary text-primary-foreground"
                                            : "border-muted-foreground/30"), children: isSelected && _jsx(Check, { className: "h-3.5 w-3.5" }) }), _jsx("span", { className: "text-sm leading-relaxed flex-1", children: option })] }, `${option}-${index}`));
                        })) })] })), selected.length > 0 && (_jsxs("div", { className: "flex flex-wrap gap-1.5 p-2.5 bg-primary/5 dark:bg-primary/10 rounded-lg border border-primary/20", children: [displayedItems.map((item, index) => (_jsxs(Badge, { variant: "default", className: cn("max-w-full text-xs font-medium py-1.5 px-2.5 pr-1.5", "bg-primary/90 text-primary-foreground border-0", "hover:bg-primary transition-colors shadow-sm"), title: item, children: [_jsx("span", { className: "truncate max-w-[150px] sm:max-w-[250px]", children: item.length > 40 ? item.substring(0, 40) + "..." : item }), _jsx("button", { type: "button", className: cn("ml-1.5 p-0.5 rounded-full", "hover:bg-primary-foreground/20", "transition-colors focus:outline-none focus:ring-1 focus:ring-primary-foreground/50"), onClick: (e) => handleRemove(item, e), children: _jsx(X, { className: "h-3 w-3" }) })] }, `${item}-${index}`))), remainingCount > 0 && (_jsxs(Badge, { variant: "secondary", className: "text-xs font-medium py-1.5 px-2.5 bg-secondary text-secondary-foreground", children: ["+", remainingCount, " more"] })), selected.length > 1 && (_jsx("button", { type: "button", className: "text-xs text-primary hover:text-destructive ml-auto transition-colors font-medium", onClick: handleClearAll, children: "Clear all" }))] }))] }));
}
