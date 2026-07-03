# Better Bookmarks

Better Bookmarks is a local-first WXT browser extension for saving pages into a private bookmark graph. A user-triggered save captures a sanitized page snapshot plus an optional visible-page screenshot, sends that payload to the user's OpenAI key through the Responses API, validates structured weighted keywords, and stores the resulting graph locally in IndexedDB.

The extension uses React 19, the React Compiler, WXT MV3 entrypoints, TanStack Query/Router for extension UI state, Dexie for IndexedDB, Zod for boundary parsing, and Vite+ as the project toolchain.
