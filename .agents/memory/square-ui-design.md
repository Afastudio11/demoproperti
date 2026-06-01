---
name: Square UI dashboard-4 design implementation
description: Design system adopted from Square UI dashboard-4 template for Satara dashboard — colors, layout, card patterns.
---

## Color Palette (oklch, dark mode default)

CSS variables use raw `oklch()` values (NOT `hsl(var(...))` wrappers).

```
background: oklch(0.145 0 0)     # near-black
card:        oklch(0.205 0 0)     # dark card
sidebar:     oklch(0.205 0 0)     # same as card
muted:       oklch(0.269 0 0)
border:      oklch(1 0 0 / 10%)   # subtle white
```

Dark mode is applied by adding `dark` class to `document.documentElement` in `main.tsx`.

**Why:** @theme inline must use `var(--token)` not `hsl(var(--token))` — mismatch causes all colors to break.

## Layout Structure

```jsx
<SidebarProvider className="bg-sidebar">
  <Sidebar>...</Sidebar>
  <div className="h-svh overflow-hidden lg:p-2 w-full">
    <div className="lg:border lg:rounded-md overflow-hidden flex flex-col bg-background h-full w-full">
      <Header />
      <main className="flex-1 overflow-auto p-4 sm:p-6">
        {children}
      </main>
    </div>
  </div>
</SidebarProvider>
```

Key visual: `lg:p-2` creates a gap revealing the sidebar background behind the rounded content card.

## Stats Card Pattern

```jsx
<div className="bg-card rounded-xl border p-4">
  <div className="flex items-center justify-between mb-3">
    <span className="text-sm font-medium">{title}</span>
    <Icon className="size-4 text-muted-foreground" />
  </div>
  <div className="bg-muted/50 dark:bg-neutral-800/50 border rounded-lg p-4">
    <span className="text-2xl font-medium tracking-tight">{value}</span>
    {/* trend with glow: text-green-400 up, text-pink-400 down */}
    {/* textShadow: "0 1px 6px rgba(68,255,118,0.25)" for green */}
  </div>
</div>
```

## Chart Colors

- Pink: `#ec4899`  
- Cyan: `#06b6d4`  
- Orange: `#f97316`  
- Green: `#22c55e`

## Sidebar Nav Item Size

- Button height: `h-7`
- Icon size: `size-3.5`
- Text: `text-sm`
- Logo box: `size-7 rounded-lg bg-foreground text-background`

## Badge / Status Tags Pattern

Inline spans instead of Badge component:
```
text-[10px] font-semibold px-2 py-0.5 rounded-md border
bg-emerald-500/15 text-emerald-400 border-emerald-500/30
```
