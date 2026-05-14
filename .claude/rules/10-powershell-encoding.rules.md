---
description: Encoding rules for PowerShell and file creation in frontend projects
---

# PowerShell File Creation Encoding Rules

When using the AI assistant to create files via terminal commands (especially in Windows/PowerShell environments), the following rules MUST be strictly followed:

1. **Never use PowerShell `echo "content" > file.ext` to generate source code files.**
   - PowerShell's `>` output redirection creates files with `UTF-16LE` encoding by default.
   - Vite, React, and most modern bundlers expect `UTF-8` and will fail to parse `UTF-16LE` files, throwing "Internal server error: Failed to resolve import" or similar syntax errors.

2. **Always use native file editing tools (like `write_to_file` or `multi_replace_file_content`) to create or modify code files.**
   - These tools ensure proper `UTF-8` encoding.

3. **If a script must be used to generate multiple files**, run a Node.js script (e.g., `fs.writeFileSync(path, content, 'utf8')`) instead of PowerShell `echo`.

## Frontend Security Rules
- **Never store API Keys in frontend code**. Always use backend proxies, `appsettings.json`, or environment variables. API calls to external services like Gemini must be proxied through the .NET backend to keep keys secure.
