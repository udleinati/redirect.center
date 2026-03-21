import type { User } from "../../../shared/src/types.ts";

export function layout(title: string, content: string, user?: User): string {
  const navLinks = user
    ? `<div class="flex items-center gap-4">
         <span class="text-sm text-gray-600">${escapeHtml(user.email)}</span>
         <a href="/dashboard" class="text-sm text-blue-600 hover:text-blue-800">Dashboard</a>
         <a href="/auth/logout" class="text-sm text-gray-500 hover:text-gray-700">Logout</a>
       </div>`
    : `<div class="flex items-center gap-4">
         <a href="/auth/login" class="text-sm font-medium text-blue-600 hover:text-blue-800">Sign In</a>
       </div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)} - redirect.center</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50 text-gray-900 min-h-screen flex flex-col">
  <nav class="bg-white border-b border-gray-200">
    <div class="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
      <a href="/" class="text-xl font-bold text-blue-600">redirect.center</a>
      ${navLinks}
    </div>
  </nav>
  <main class="flex-1">
    ${content}
  </main>
  <footer class="border-t border-gray-200 bg-white">
    <div class="max-w-5xl mx-auto px-4 py-6 text-center text-sm text-gray-500">
      redirect.center &mdash; Free DNS-based redirect service
    </div>
  </footer>
</body>
</html>`;
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
