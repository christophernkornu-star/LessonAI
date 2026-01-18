import * as React from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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

interface ComboboxOption {
  value: string
  label: string
}

interface ComboboxWithInputProps {
  options: ComboboxOption[]
  value?: string
  onValueChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  className?: string
  disabled?: boolean
  allowCustom?: boolean
}

export function ComboboxWithInput({
  options,
  value,
  onValueChange,
  placeholder = "Select or type...",
  searchPlaceholder = "Search...",
  emptyText = "No option found.",
  className,
  disabled = false,
  allowCustom = true,
}: ComboboxWithInputProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState(value || "")
  const [isTyping, setIsTyping] = React.useState(false)

  React.useEffect(() => {
    if (value !== inputValue && !isTyping) {
      setInputValue(value || "")
    }
  }, [value, isTyping])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)
    setIsTyping(true)
    if (allowCustom) {
      onValueChange(newValue)
    }
  }

  const handleInputBlur = () => {
    setIsTyping(false)
  }

  const handleClear = () => {
    setInputValue("")
    onValueChange("")
  }

  const selectedOption = options.find((option) => option.value === value || option.label === value)

  return (
    <div className={cn("relative flex gap-1.5 sm:gap-2", className)}>
      <div className="flex-1 relative">
        <Input
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          placeholder={placeholder}
          disabled={disabled}
          className="pr-8 text-sm sm:text-base h-10 sm:h-11"
        />
        {inputValue && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-2 hover:bg-transparent"
            onClick={handleClear}
          >
            <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
          </Button>
        )}
      </div>
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-10 sm:w-11 px-0 h-10 sm:h-11 shrink-0"
            disabled={disabled}
          >
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-[min(calc(100vw-2rem),400px)] p-0 shadow-lg" 
          align="end"
          sideOffset={4}
        >
          <Command className="rounded-lg">
            <CommandInput placeholder={searchPlaceholder} className="text-sm" />
            <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
              {emptyText}
            </CommandEmpty>
            <CommandGroup className="max-h-[200px] sm:max-h-[280px] overflow-auto p-1">
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={(currentValue) => {
                    const selected = options.find(opt => opt.value === currentValue)
                    if (selected) {
                      setInputValue(selected.label)
                      onValueChange(selected.label)
                      setOpen(false)
                    }
                  }}
                  className="text-sm py-2.5 px-2"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 shrink-0",
                      selectedOption?.value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="line-clamp-2">{option.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
