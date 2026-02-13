## Project Overview

Create a Google Docs clone web application with real-time collaborative document editing capabilities. The UI should closely match the attached reference image (google doc) with the sane familiar document-style layout.

---

## Tech Stack (Strict Requirements)

| Category | Technology | Version/Notes |
|----------|----------|----------|
| Package Manager | pnpm | Required |
| Framework | Next.js | 16.1.1 (latest) |
| Backend/Real-time | Convex | Real-time sync | database |
| UI Components | shadcn/ui | With Vega style preset |
| Styling | Tailwind CSS | Included with shadcn |
| Rich Text Editor | TipTap | Via ProseMirror sync |
| Icons | Lucide | Included with shadcn |
| Font | Inter | Included with shadcn |

---

## Setup Commands

### 1. Install Dependencies
```shell script
pnpm install convex
pnpm install @convex-dev/presence
pnpm install @convex-dev/prosemirror-sync
```

### 2. If we have Node / npm errors
```shell script
npm audit fix
```

---

## Core Features

### 1. Real-Time Collaboration
- Multiple users can edit the same document simultaneously
- Changes sync instantly across all connected clients
- Use Convex for real-time data synchronization

### 2. Rich Text Editing (TipTap)
- Full formatting toolbar (bold, italic, underline, font selection)
- Text alignment options
- Lists (bulleted, numbered)
- Links and images
- Headings and paragraph styles
- Use '@convex-dev/prosemirror-sync' for collaborative editing.
- Reference : https://www.convex.dev/components/prosemirror-sync/

### 3. Presence System

....

---

## Project Structure (Suggested)
```
|--- appp/

....
```

etc etc