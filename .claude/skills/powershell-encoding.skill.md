---
description: How to fix Vite failed to resolve import errors caused by UTF-16LE encoding
---

# Fix Vite "Failed to resolve import" due to UTF-16LE Encoding

## Symptoms
- Vite terminal shows: `Internal server error: Failed to resolve import "@/routes/..." from "src/app/router.tsx". Does the file exist?`
- The file actually exists when checked via `dir` or `ls`.
- The file was recently created using PowerShell `echo "content" > file.tsx`.

## Root Cause
PowerShell uses `UTF-16LE` by default for output redirection (`>`). Vite, ESBuild, and React Router cannot properly parse `UTF-16LE` source code files, treating them as corrupted or missing.

## Resolution Skill
1. Identify all files created using PowerShell output redirection.
2. Convert them to `UTF-8`.
3. You can use a Node.js one-liner to overwrite them with UTF-8:
   ```javascript
   const fs = require('fs');
   const content = fs.readFileSync('file.tsx', 'utf16le'); // Read the broken file
   fs.writeFileSync('file.tsx', content, 'utf8'); // Save it back as utf-8
   ```
   *Note: If the file is small, the easiest way for the AI is to simply use the `write_to_file` tool to recreate the file content from scratch.*
4. Avoid using `echo >` in PowerShell for code files. Use native `write_to_file` tools.
