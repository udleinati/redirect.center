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
    <div class="max-w-5xl mx-auto px-4 py-6 text-center text-sm text-gray-500 space-y-2">
      <p>redirect.center &mdash; Free DNS-based redirect service</p>
      <p class="flex items-center justify-center gap-3">
        <a href="mailto:support@redirect.center" class="inline-flex items-center gap-1 hover:text-gray-700 transition">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
          support@redirect.center
        </a>
        <span class="text-gray-300">&middot;</span>
        <span class="inline-flex items-center gap-1">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
          Chat with us
        </span>
      </p>
      <p>
        <a href="/terms" class="hover:text-gray-700 transition">Terms of Service</a>
      </p>
    </div>
  </footer>
  <!-- Start of Tawk.to Script -->
  <!-- TODO: Replace XXXXXXXX with your tawk.to Property ID -->
  <script type="text/javascript">
  var Tawk_API=Tawk_API||{}, Tawk_LoadStart=new Date();
  (function(){
  var s1=document.createElement("script"),s0=document.getElementsByTagName("script")[0];
  s1.async=true;
  s1.src='https://embed.tawk.to/XXXXXXXX/default';
  s1.charset='UTF-8';
  s1.setAttribute('crossorigin','*');
  s0.parentNode.insertBefore(s1,s0);
  })();
  </script>
  <!-- End of Tawk.to Script -->
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
