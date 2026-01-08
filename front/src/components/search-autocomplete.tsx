import {
  useState,
  useEffect,
  useRef,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from 'react'
import { TagIcon, FolderIcon, KeyboardIcon } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverAnchor } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import type { MemoryType, Memory, Context } from '@/types'

export interface SearchAutocompleteHandle {
  focus: () => void
  blur: () => void
}

interface SearchAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onSearch: () => void
  contexts: Context[]
  memories: Memory[]
  placeholder?: string
  className?: string
}

const MEMORY_TYPES: MemoryType[] = [
  'note',
  'conversation',
  'snippet',
  'reference',
  'task',
  'idea',
]

type SuggestionType = 'type' | 'context' | 'tag' | null

interface Suggestion {
  type: SuggestionType
  value: string
  label: string
  prefix: string
}

export const SearchAutocomplete = forwardRef<
  SearchAutocompleteHandle,
  SearchAutocompleteProps
>(
  (
    {
      value,
      onChange,
      onSearch,
      contexts,
      memories,
      placeholder = 'Search in memories...',
      className,
    },
    ref,
  ) => {
    const [open, setOpen] = useState(false)
    const [selectedIndex, setSelectedIndex] = useState(-1)
    const inputRef = useRef<HTMLInputElement>(null)
    const scrollRef = useRef<HTMLDivElement>(null)

    // Expose methods to parent component
    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
      blur: () => inputRef.current?.blur(),
    }))

    // Extract all unique tags from memories
    const allTags = useMemo(() => {
      const tags = new Set<string>()
      memories.forEach((memory) => {
        memory.tags?.forEach((tag) => tags.add(tag))
      })
      return Array.from(tags).sort()
    }, [memories])

    // Detect what type of suggestion to show based on current input
    const suggestionType = useMemo((): SuggestionType => {
      const trimmed = value.trim()
      if (!trimmed) return null

      // Check for type: prefix
      const typeMatch = trimmed.match(/^(.*\s)?type:(\s*)$/)
      if (typeMatch) return 'type'

      // Check for context: prefix
      const contextMatch = trimmed.match(/^(.*\s)?context:(\s*)$/)
      if (contextMatch) return 'context'

      // Check for tag: prefix
      const tagMatch = trimmed.match(/^(.*\s)?tag:(\s*)$/)
      if (tagMatch) return 'tag'

      // Check if we're in the middle of typing one of these
      if (trimmed.includes('type:')) return 'type'
      if (trimmed.includes('context:')) return 'context'
      if (trimmed.includes('tag:')) return 'tag'

      return null
    }, [value])

    // Generate suggestions based on current input
    const suggestions = useMemo((): Suggestion[] => {
      if (!suggestionType) return []

      const trimmed = value.trim()

      switch (suggestionType) {
        case 'type': {
          // Extract the prefix before "type:"
          const match = trimmed.match(/^(.*\s)?type:(.*)$/)
          if (!match) return []

          const [, prefix = '', filter = ''] = match
          const filterLower = filter.toLowerCase().trim()

          return MEMORY_TYPES.filter((type) =>
            type.toLowerCase().includes(filterLower),
          ).map((type) => ({
            type: 'type' as const,
            value: type,
            label: type.charAt(0).toUpperCase() + type.slice(1),
            prefix: prefix + 'type:',
          }))
        }

        case 'context': {
          const match = trimmed.match(/^(.*\s)?context:(.*)$/)
          if (!match) return []

          const [, prefix = '', filter = ''] = match
          const filterLower = filter.toLowerCase().trim()

          return contexts
            .filter((ctx) => ctx.name.toLowerCase().includes(filterLower))
            .map((ctx) => ({
              type: 'context' as const,
              value: ctx.id,
              label: ctx.name,
              prefix: prefix + 'context:',
            }))
        }

        case 'tag': {
          const match = trimmed.match(/^(.*\s)?tag:(.*)$/)
          if (!match) return []

          const [, prefix = '', filter = ''] = match
          const filterLower = filter.toLowerCase().trim()

          return allTags
            .filter((tag) => tag.toLowerCase().includes(filterLower))
            .map((tag) => ({
              type: 'tag' as const,
              value: tag,
              label: tag,
              prefix: prefix + 'tag:',
            }))
        }

        default:
          return []
      }
    }, [value, suggestionType, contexts, allTags])

    // Auto-open popover when we have a suggestion type and suggestions
    useEffect(() => {
      setOpen(suggestionType !== null && suggestions.length > 0)
      setSelectedIndex(-1)
    }, [suggestionType, suggestions.length])

    // Handle keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!open || suggestions.length === 0) {
        if (e.key === 'Enter') {
          e.preventDefault()
          onSearch()
        }
        return
      }

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) =>
            prev < suggestions.length - 1 ? prev + 1 : prev,
          )
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0))
          break
        case 'Enter':
          e.preventDefault()
          if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
            applySuggestion(suggestions[selectedIndex])
          } else {
            onSearch()
          }
          break
        case 'Escape':
          e.preventDefault()
          setOpen(false)
          break
        case 'Tab':
          e.preventDefault()
          if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
            applySuggestion(suggestions[selectedIndex])
          } else if (suggestions.length > 0) {
            applySuggestion(suggestions[0])
          }
          break
      }
    }

    // Apply a suggestion
    const applySuggestion = (suggestion: Suggestion) => {
      const newValue = suggestion.prefix + suggestion.value + ' '
      onChange(newValue)
      setOpen(false)
      setSelectedIndex(-1)
      inputRef.current?.focus()
    }

    // Get icon for suggestion type
    const getSuggestionIcon = (type: SuggestionType) => {
      switch (type) {
        case 'type':
          return <TagIcon className="size-4" />
        case 'context':
          return <FolderIcon className="size-4" />
        case 'tag':
          return <TagIcon className="size-4" />
        default:
          return null
      }
    }

    // Scroll selected item into view
    useEffect(() => {
      if (selectedIndex >= 0 && scrollRef.current) {
        const items = scrollRef.current.querySelectorAll(
          '[data-suggestion-item]',
        )
        const selected = items[selectedIndex] as HTMLElement
        if (selected) {
          selected.scrollIntoView({ block: 'nearest' })
        }
      }
    }, [selectedIndex])

    return (
      <div className={cn('relative', className)}>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverAnchor asChild>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  ref={inputRef}
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={placeholder}
                  className="pr-20"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <Badge
                    variant="outline"
                    className="text-xs px-1.5 py-0 hidden sm:flex"
                  >
                    <KeyboardIcon className="size-3 mr-1" />
                    Tab
                  </Badge>
                </div>
              </div>
            </div>
          </PopoverAnchor>

          <PopoverContent
            align="start"
            className="w-[300px] p-0 z-50"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <ScrollArea className="max-h-[300px]">
              <div ref={scrollRef} className="p-1">
                {suggestions.map((suggestion, index) => (
                  <div
                    key={`${suggestion.type}-${suggestion.value}`}
                    data-suggestion-item
                    onClick={() => applySuggestion(suggestion)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors',
                      'hover:bg-accent hover:text-accent-foreground',
                      selectedIndex === index &&
                        'bg-accent text-accent-foreground',
                    )}
                  >
                    {getSuggestionIcon(suggestion.type)}
                    <span className="flex-1 truncate">{suggestion.label}</span>
                    <Badge variant="outline" className="text-xs">
                      {suggestion.type}
                    </Badge>
                  </div>
                ))}
                {suggestions.length === 0 && (
                  <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                    No suggestions found
                  </div>
                )}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>
      </div>
    )
  },
)

SearchAutocomplete.displayName = 'SearchAutocomplete'
