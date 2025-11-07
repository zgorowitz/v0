"use client"

import * as React from "react"
import { X, Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"

interface TagInputProps {
  value: string[]
  onChange: (tags: string[]) => void
  availableTags?: string[]
  placeholder?: string
}

export function TagInput({
  value = [],
  onChange,
  availableTags = [],
  placeholder = "Add tag...",
}: TagInputProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)

  // Add tag from input
  const addTag = (tagName: string) => {
    const trimmed = tagName.trim()
    if (!trimmed) return

    // Remove # if user typed it
    const cleanTag = trimmed.startsWith('#') ? trimmed.slice(1) : trimmed

    if (!value.includes(cleanTag)) {
      onChange([...value, cleanTag])
    }
    setInputValue("")
  }

  // Handle input key press
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(inputValue)
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      // Remove last tag on backspace if input is empty
      onChange(value.slice(0, -1))
    }
  }

  // Remove tag
  const removeTag = (tagToRemove: string) => {
    onChange(value.filter(tag => tag !== tagToRemove))
  }

  // Toggle tag from available list
  const toggleTag = (tag: string) => {
    if (value.includes(tag)) {
      removeTag(tag)
    } else {
      onChange([...value, tag])
    }
  }

  // Get available tags that aren't selected
  const unselectedTags = availableTags.filter(tag => !value.includes(tag))

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          className="flex h-auto min-h-[2.5rem] w-full cursor-pointer items-center justify-start rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <div className="flex flex-wrap gap-1">
            {value.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              value.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="gap-1 pr-1"
                  onClick={(e) => {
                    e.stopPropagation()
                  }}
                >
                  #{tag}
                  <span
                    className="ml-1 inline-flex cursor-pointer rounded-full hover:bg-muted"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeTag(tag)
                    }}
                  >
                    <X className="h-3 w-3" />
                  </span>
                </Badge>
              ))
            )}
          </div>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <div className="p-2">
          <div className="flex items-center gap-2">
            <Input
              ref={inputRef}
              type="text"
              placeholder={placeholder}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-8"
            />
            <Button
              type="button"
              size="sm"
              onClick={() => addTag(inputValue)}
              disabled={!inputValue.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {unselectedTags.length > 0 && (
          <>
            <Separator />
            <div className="max-h-[200px] overflow-y-auto p-2">
              <div className="text-xs font-medium text-muted-foreground mb-2 px-2">
                Available Tags
              </div>
              <div className="flex flex-wrap gap-1">
                {unselectedTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="cursor-pointer hover:bg-secondary"
                    onClick={() => toggleTag(tag)}
                  >
                    #{tag}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}
