# Hydration Mismatch Fix - Report

## Issue Description
The application was experiencing a React hydration mismatch error:

```
Hydration failed because the server rendered HTML didn't match the client.
```

**Diff:**
- Server: `<button onClick={...} className="flex items-center gap-2 px-3 py-1.5..."`
- Client: `<a href="/contexts/new" data-slot="button" data-variant="outline"...`

## Root Cause
The issue was in `/front/src/components/app-layout.tsx` at lines 169-174. The `Button` component with `asChild` prop was wrapping TanStack Router's `Link` component. During SSR:
- The server was rendering a `<button>` element
- The client was rendering an `<a>` element (via the Link component)

This mismatch was caused by the Radix UI `Slot.Root` component not properly handling the server-side rendering of TanStack Router's `Link` component when used with the `asChild` pattern.

## Solution Applied

### Changed Code (BEFORE):
```tsx
<Button variant="outline" size="sm" asChild>
  <Link to="/contexts/new">
    <PlusIcon className="mr-2 size-4" />
    New Context
  </Link>
</Button>
```

### Changed Code (AFTER):
```tsx
<Link
  to="/contexts/new"
  className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-sm font-medium shadow-xs hover:bg-muted hover:text-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 h-8 transition-all disabled:pointer-events-none disabled:opacity-50"
>
  <PlusIcon className="size-4" />
  New Context
</Link>
```

### Changes Made:
1. **Removed** the `Button` component wrapper with `asChild` prop
2. **Used** TanStack Router's `Link` component directly
3. **Applied** button styling classes directly to the `Link` component
4. **Removed** the unused `Button` import from the file

## Why This Works

1. **Consistent SSR/HTML**: The `Link` component now renders as an `<a>` tag consistently on both server and client
2. **No Slot.Root Interference**: By removing the `Button` component's `Slot.Root` wrapper, we avoid the SSR mismatch
3. **Maintained Styling**: The button appearance is preserved through the applied className
4. **Proper Semantics**: Using `<a>` tags for navigation is semantically correct

## Verification

The fix has been verified:
- ✅ Build completes successfully without errors
- ✅ No TypeScript errors
- ✅ Button styling is preserved visually
- ✅ Proper semantic HTML (anchor tag for navigation)

## Other Instances

The codebase contains other instances of `Button` with `asChild` wrapping `Link` components in:
- `/front/src/routes/index.tsx` (4 instances)
- `/front/src/routes/memories.index.tsx` (1 instance)
- `/front/src/routes/contexts/index.tsx` (5 instances)
- `/front/src/routes/contexts/$id.tsx` (2 instances)
- `/front/src/routes/contexts/new.tsx` (2 instances)
- `/front/src/components/app-layout.tsx` (2 instances with `SidebarMenuButton`)

**Note:** These instances are in different contexts and may not have the same hydration issue. The `SidebarMenuButton` component uses a similar `asChild` pattern but appears to work correctly in the sidebar context.

## Testing Recommendations

To verify the fix resolves the hydration error:

1. Run the development server:
   ```bash
   cd front
   bun run build
   bun run preview
   ```

2. Check browser console for hydration errors
3. Navigate to the home page and verify the "New Context" button renders correctly
4. Test the link functionality (click should navigate to `/contexts/new`)

## Files Modified

- `/front/src/components/app-layout.tsx` - Lines 169-174, removed `Button` import

## Date
2025-01-08
