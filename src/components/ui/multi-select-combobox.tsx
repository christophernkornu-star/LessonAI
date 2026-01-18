import * as React from "react"
import { Check, ChevronsUpDown, X, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface MultiSelectComboboxProps {
  options: string[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  className?: string
  disabled?: boolean
  maxDisplayed?: number
}

export function MultiSelectCombobox({
  options,
  selected,
  onChange,
  placeholder = "Select items...",
  searchPlaceholder = "Search...",
  emptyText = "No items found.",
  className,
  disabled = false,
  maxDisplayed = 2,
}: MultiSelectComboboxProps) {
  const [open, setOpen] = React.useState(false)

  const handleSelect = (item: string) => {
    if (selected.includes(item)) {
      onChange(selected.filter((i) => i !== item))
    } else {
      onChange([...selected, item])
    }
  }

  const handleRemove = (item: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(selected.filter((i) => i !== item))
  }

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange([])
  }

  const displayedItems = selected.slice(0, maxDisplayed)
  const remainingCount = selected.length - maxDisplayed

  return (
    <div className={cn("space-y-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between min-h-[44px] h-auto py-2 px-3 text-left font-normal",
              "border-input bg-background hover:bg-accent/50 transition-colors",
              "focus:ring-2 focus:ring-ring focus:ring-offset-2",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            disabled={disabled}
          >
            <div className="flex-1 flex items-center gap-2 overflow-hidden">
              {selected.length > 0 ? (
                <span className="text-sm truncate">
                  {selected.length} item{selected.length > 1 ? 's' : ''} selected
                </span>
              ) : (
                <span className="text-muted-foreground text-sm">{placeholder}</span>
              )}
            </div>
            <ChevronDown className={cn(
              "ml-2 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
              open && "rotate-180"
            )} />
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-[var(--radix-popover-trigger-width)] p-0 shadow-lg border-border/50" 
          align="start"
          sideOffset={4}
        >
          <Command className="rounded-lg">
            <CommandInput 
              placeholder={searchPlaceholder} 
              className="border-0 focus:ring-0"
            />
            <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
              {emptyText}
            </CommandEmpty>
            <CommandGroup className="max-h-[200px] sm:max-h-[280px] overflow-auto p-1">
              {options.map((option, index) => {
                const isSelected = selected.includes(option)
                return (
                  <CommandItem
                    key={`${option}-${index}`}
                    value={option}
                    onSelect={() => handleSelect(option)}
                    className={cn(
                      "flex items-start gap-2 px-2 py-2.5 rounded-md cursor-pointer",
                      "transition-colors duration-150",
                      isSelected && "bg-primary/10"
                    )}
                  >
                    <div className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded border mt-0.5",
                      "transition-colors duration-150",
                      isSelected 
                        ? "bg-primary border-primary text-primary-foreground" 
                        : "border-muted-foreground/30"
                    )}>
                      {isSelected && <Check className="h-3.5 w-3.5" />}
                    </div>
                    <span className="text-sm leading-relaxed flex-1">{option}</span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected items displayed as modern chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 p-2 bg-muted/30 rounded-lg border border-border/50">
          {displayedItems.map((item, index) => (
            <Badge 
              key={`${item}-${index}`} 
              variant="secondary" 
              className={cn(
                "max-w-full text-xs font-normal py-1 px-2 pr-1",
                "bg-background border border-border/50 shadow-sm",
                "hover:bg-accent transition-colors"
              )}
              title={item}
            >
              <span className="truncate max-w-[150px] sm:max-w-[250px]">
                {item.length > 40 ? item.substring(0, 40) + "..." : item}
              </span>
              <button
                type="button"
                className={cn(
                  "ml-1.5 p-0.5 rounded-full",
                  "hover:bg-destructive/20 hover:text-destructive",
                  "transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
                )}
                onClick={(e) => handleRemove(item, e)}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {remainingCount > 0 && (
            <Badge variant="outline" className="text-xs font-normal py-1 px-2">
              +{remainingCount} more
            </Badge>
          )}
          {selected.length > 1 && (
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-destructive ml-auto transition-colors"
              onClick={handleClearAll}
            >
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  )
}
