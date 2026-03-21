import { layout, escapeHtml } from "./layout.ts";
import type { User, Seat, Domain } from "../../../shared/src/types.ts";

export function landingPage(): string {
  const content = `
    <!-- Hero -->
    <section class="bg-gradient-to-b from-blue-50 to-white py-20">
      <div class="max-w-4xl mx-auto px-4 text-center">
        <h1 class="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
          DNS-Based Domain Redirects
        </h1>
        <p class="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Redirect any domain using only a DNS CNAME record. No server, no hosting, no code.
        </p>
        <div class="flex gap-4 justify-center">
          <a href="#pricing" class="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition">
            View Plans
          </a>
          <a href="#how-it-works" class="border border-gray-300 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition">
            How It Works
          </a>
        </div>
      </div>
    </section>

    <!-- Free HTTP -->
    <section class="py-16 bg-white">
      <div class="max-w-4xl mx-auto px-4 text-center">
        <div class="inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
          HTTP redirects are FREE &mdash; forever
        </div>
        <p class="text-gray-600 max-w-2xl mx-auto">
          Create HTTP redirects at no cost, with no account required. Simply point a CNAME record to
          redirect.center and encode your target in the subdomain.
        </p>
      </div>
    </section>

    <!-- How It Works -->
    <section id="how-it-works" class="py-16 bg-gray-50">
      <div class="max-w-4xl mx-auto px-4">
        <h2 class="text-3xl font-bold text-center mb-12">How It Works</h2>
        <div class="grid md:grid-cols-3 gap-8">
          <div class="bg-white p-6 rounded-xl shadow-sm">
            <div class="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-bold mb-4">1</div>
            <h3 class="font-semibold mb-2">Encode Your Target</h3>
            <p class="text-sm text-gray-600">
              Take your target URL and encode it as a subdomain. Dots become dashes, slashes become dots.
            </p>
          </div>
          <div class="bg-white p-6 rounded-xl shadow-sm">
            <div class="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-bold mb-4">2</div>
            <h3 class="font-semibold mb-2">Create a CNAME</h3>
            <p class="text-sm text-gray-600">
              Point your domain's CNAME record to the encoded subdomain at redirect.center.
            </p>
          </div>
          <div class="bg-white p-6 rounded-xl shadow-sm">
            <div class="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-bold mb-4">3</div>
            <h3 class="font-semibold mb-2">Done!</h3>
            <p class="text-sm text-gray-600">
              Visitors to your domain are automatically redirected. Supports 301, 302, 307, 308 codes.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- HTTPS Section -->
    <section class="py-16 bg-white">
      <div class="max-w-4xl mx-auto px-4">
        <h2 class="text-3xl font-bold text-center mb-4">HTTPS Redirects</h2>
        <p class="text-center text-gray-600 mb-8 max-w-2xl mx-auto">
          Need SSL/TLS for your redirects? Our paid plans automatically provision and renew certificates
          for your custom domain, giving your visitors a secure redirect experience.
        </p>
        <div class="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          <div class="bg-gray-50 p-6 rounded-xl">
            <h3 class="font-semibold mb-2">Simple</h3>
            <p class="text-sm text-gray-600">
              One domain, one redirect. Perfect for a single branded short URL or landing page redirect.
            </p>
          </div>
          <div class="bg-gray-50 p-6 rounded-xl">
            <h3 class="font-semibold mb-2">Wildcard</h3>
            <p class="text-sm text-gray-600">
              Wildcard certificate covering all subdomains. Ideal for pattern-based redirects across an entire domain.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Pricing -->
    <section id="pricing" class="py-16 bg-gray-50">
      <div class="max-w-4xl mx-auto px-4">
        <h2 class="text-3xl font-bold text-center mb-4">Pricing</h2>
        <p class="text-center text-gray-600 mb-12">Each seat covers one domain with automatic HTTPS certificate provisioning.</p>

        <div class="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          <!-- Simple -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div class="p-6">
              <h3 class="text-xl font-bold mb-1">Simple</h3>
              <p class="text-sm text-gray-500 mb-4">Single domain redirect with HTTPS</p>
              <div class="mb-2">
                <span class="text-3xl font-bold">$3</span>
                <span class="text-gray-500">/month</span>
              </div>
              <p class="text-sm text-gray-400 mb-6">
                or $32.40/year <span class="text-green-600 font-medium">(save 10%)</span>
              </p>
              <ul class="space-y-2 text-sm text-gray-600 mb-6">
                <li class="flex items-start gap-2"><span class="text-green-500 mt-0.5">&#10003;</span> Automatic SSL certificate</li>
                <li class="flex items-start gap-2"><span class="text-green-500 mt-0.5">&#10003;</span> Single domain</li>
                <li class="flex items-start gap-2"><span class="text-green-500 mt-0.5">&#10003;</span> All redirect types (301, 302, 307, 308)</li>
                <li class="flex items-start gap-2"><span class="text-green-500 mt-0.5">&#10003;</span> Path &amp; query string forwarding</li>
              </ul>
              <a href="/auth/login" class="block text-center bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition font-medium">
                Subscribe
              </a>
            </div>
          </div>

          <!-- Wildcard -->
          <div class="bg-white rounded-xl shadow-sm border-2 border-blue-500 overflow-hidden relative">
            <div class="absolute top-0 right-0 bg-blue-500 text-white text-xs px-3 py-1 rounded-bl-lg font-medium">
              Popular
            </div>
            <div class="p-6">
              <h3 class="text-xl font-bold mb-1">Wildcard</h3>
              <p class="text-sm text-gray-500 mb-4">All subdomains with wildcard HTTPS</p>
              <div class="mb-2">
                <span class="text-3xl font-bold">$5</span>
                <span class="text-gray-500">/month</span>
              </div>
              <p class="text-sm text-gray-400 mb-6">
                or $54/year <span class="text-green-600 font-medium">(save 10%)</span>
              </p>
              <ul class="space-y-2 text-sm text-gray-600 mb-6">
                <li class="flex items-start gap-2"><span class="text-green-500 mt-0.5">&#10003;</span> Wildcard SSL certificate</li>
                <li class="flex items-start gap-2"><span class="text-green-500 mt-0.5">&#10003;</span> All subdomains covered</li>
                <li class="flex items-start gap-2"><span class="text-green-500 mt-0.5">&#10003;</span> All redirect types (301, 302, 307, 308)</li>
                <li class="flex items-start gap-2"><span class="text-green-500 mt-0.5">&#10003;</span> Path &amp; query string forwarding</li>
              </ul>
              <a href="/auth/login" class="block text-center bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition font-medium">
                Subscribe
              </a>
            </div>
          </div>
        </div>

        <p class="text-center text-sm text-gray-500 mt-8">
          HTTP redirects remain <strong>free forever</strong>. Paid plans add HTTPS support with automatic certificate management.
        </p>
      </div>
    </section>
  `;

  return layout("Free DNS-Based Domain Redirect Service", content);
}

export function loginPage(error?: string): string {
  const errorHtml = error
    ? `<div class="bg-red-50 text-red-700 p-3 rounded-lg text-sm mb-4">${escapeHtml(error)}</div>`
    : "";

  const content = `
    <div class="max-w-md mx-auto px-4 py-16">
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <h1 class="text-2xl font-bold mb-2">Sign In</h1>
        <p class="text-gray-600 text-sm mb-6">Enter your email to receive a magic link.</p>
        ${errorHtml}
        <form method="POST" action="/auth/login">
          <label for="email" class="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            required
            placeholder="you@example.com"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none mb-4"
          />
          <button
            type="submit"
            class="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition font-medium"
          >
            Send Magic Link
          </button>
        </form>
      </div>
    </div>
  `;

  return layout("Sign In", content);
}

export function magicLinkSentPage(email: string): string {
  const content = `
    <div class="max-w-md mx-auto px-4 py-16 text-center">
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div class="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h1 class="text-2xl font-bold mb-2">Check Your Email</h1>
        <p class="text-gray-600 mb-4">
          We sent a sign-in link to <strong>${escapeHtml(email)}</strong>.
        </p>
        <p class="text-sm text-gray-500">
          The link expires in 24 hours. If you don't see it, check your spam folder.
        </p>
      </div>
    </div>
  `;

  return layout("Check Your Email", content);
}

export function dashboardPage(
  user: User,
  seats: Seat[],
  domains: Map<string, Domain | null>,
): string {
  const seatRows = seats.length > 0
    ? seats
        .map((seat) => {
          const domain = domains.get(seat.id);
          const statusBadge = statusToBadge(seat.status);
          const domainText = domain
            ? escapeHtml(domain.domain)
            : '<span class="text-gray-400 italic">No domain</span>';

          return `
            <tr class="border-b border-gray-100 hover:bg-gray-50">
              <td class="py-3 px-4">
                <a href="/dashboard/seats/${seat.id}" class="text-blue-600 hover:text-blue-800 font-medium">
                  ${escapeHtml(seat.type.charAt(0).toUpperCase() + seat.type.slice(1))}
                </a>
              </td>
              <td class="py-3 px-4">${domainText}</td>
              <td class="py-3 px-4">${statusBadge}</td>
              <td class="py-3 px-4 text-right">
                <a href="/dashboard/seats/${seat.id}" class="text-sm text-blue-600 hover:text-blue-800">Manage</a>
              </td>
            </tr>
          `;
        })
        .join("")
    : `<tr><td colspan="4" class="py-8 px-4 text-center text-gray-500">
         No seats yet. <a href="/dashboard/subscribe" class="text-blue-600 hover:text-blue-800">Subscribe to get started.</a>
       </td></tr>`;

  const content = `
    <div class="max-w-4xl mx-auto px-4 py-8">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold">Dashboard</h1>
        <div class="flex gap-3">
          ${user.stripe_customer_id ? '<a href="/dashboard/portal" class="text-sm border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition">Billing Portal</a>' : ""}
          <a href="/dashboard/subscribe" class="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
            New Seat
          </a>
        </div>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table class="w-full">
          <thead>
            <tr class="bg-gray-50 text-left text-sm text-gray-500">
              <th class="py-3 px-4 font-medium">Type</th>
              <th class="py-3 px-4 font-medium">Domain</th>
              <th class="py-3 px-4 font-medium">Status</th>
              <th class="py-3 px-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${seatRows}
          </tbody>
        </table>
      </div>
    </div>
  `;

  return layout("Dashboard", content, user);
}

export function subscribePage(config: {
  simpleMonthly?: string;
  simpleYearly?: string;
  wildcardMonthly?: string;
  wildcardYearly?: string;
}, user: User): string {
  const content = `
    <div class="max-w-3xl mx-auto px-4 py-8">
      <h1 class="text-2xl font-bold mb-2">Choose a Plan</h1>
      <p class="text-gray-600 mb-8">Each seat covers one domain with automatic HTTPS certificate provisioning.</p>

      <div class="grid md:grid-cols-2 gap-6">
        <!-- Simple Monthly -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 class="font-bold text-lg mb-1">Simple - Monthly</h3>
          <p class="text-sm text-gray-500 mb-3">Single domain with HTTPS</p>
          <div class="text-2xl font-bold mb-4">$3<span class="text-base font-normal text-gray-500">/mo</span></div>
          <form method="POST" action="/dashboard/subscribe">
            <input type="hidden" name="priceId" value="${escapeHtml(config.simpleMonthly ?? "")}" />
            <input type="hidden" name="seatType" value="simple" />
            <button type="submit" class="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition font-medium"
              ${config.simpleMonthly ? "" : "disabled"}>
              Subscribe
            </button>
          </form>
        </div>

        <!-- Simple Yearly -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 class="font-bold text-lg mb-1">Simple - Yearly</h3>
          <p class="text-sm text-gray-500 mb-3">Single domain with HTTPS</p>
          <div class="text-2xl font-bold mb-1">$32.40<span class="text-base font-normal text-gray-500">/yr</span></div>
          <p class="text-sm text-green-600 font-medium mb-3">Save 10%</p>
          <form method="POST" action="/dashboard/subscribe">
            <input type="hidden" name="priceId" value="${escapeHtml(config.simpleYearly ?? "")}" />
            <input type="hidden" name="seatType" value="simple" />
            <button type="submit" class="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition font-medium"
              ${config.simpleYearly ? "" : "disabled"}>
              Subscribe
            </button>
          </form>
        </div>

        <!-- Wildcard Monthly -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 class="font-bold text-lg mb-1">Wildcard - Monthly</h3>
          <p class="text-sm text-gray-500 mb-3">All subdomains with wildcard HTTPS</p>
          <div class="text-2xl font-bold mb-4">$5<span class="text-base font-normal text-gray-500">/mo</span></div>
          <form method="POST" action="/dashboard/subscribe">
            <input type="hidden" name="priceId" value="${escapeHtml(config.wildcardMonthly ?? "")}" />
            <input type="hidden" name="seatType" value="wildcard" />
            <button type="submit" class="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition font-medium"
              ${config.wildcardMonthly ? "" : "disabled"}>
              Subscribe
            </button>
          </form>
        </div>

        <!-- Wildcard Yearly -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 class="font-bold text-lg mb-1">Wildcard - Yearly</h3>
          <p class="text-sm text-gray-500 mb-3">All subdomains with wildcard HTTPS</p>
          <div class="text-2xl font-bold mb-1">$54<span class="text-base font-normal text-gray-500">/yr</span></div>
          <p class="text-sm text-green-600 font-medium mb-3">Save 10%</p>
          <form method="POST" action="/dashboard/subscribe">
            <input type="hidden" name="priceId" value="${escapeHtml(config.wildcardYearly ?? "")}" />
            <input type="hidden" name="seatType" value="wildcard" />
            <button type="submit" class="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition font-medium"
              ${config.wildcardYearly ? "" : "disabled"}>
              Subscribe
            </button>
          </form>
        </div>
      </div>

      <div class="mt-6 text-center">
        <a href="/dashboard" class="text-sm text-gray-500 hover:text-gray-700">Back to Dashboard</a>
      </div>
    </div>
  `;

  return layout("Choose a Plan", content, user);
}

export function checkoutSuccessPage(user: User): string {
  const content = `
    <div class="max-w-md mx-auto px-4 py-16 text-center">
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 class="text-2xl font-bold mb-2">Subscription Active!</h1>
        <p class="text-gray-600 mb-6">
          Your seat has been created. You can now configure your domain in the dashboard.
        </p>
        <a href="/dashboard" class="inline-block bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 transition font-medium">
          Go to Dashboard
        </a>
      </div>
    </div>
  `;

  return layout("Subscription Active", content, user);
}

export function seatDetailPage(user: User, seat: Seat, domain: Domain | null): string {
  const statusBadge = statusToBadge(seat.status);
  const domainValue = domain ? escapeHtml(domain.domain) : "";
  const validationBadge = domain ? validationToBadge(domain.validation_status) : "";

  const domainInfo = domain
    ? `<div class="mt-4 p-4 bg-gray-50 rounded-lg">
         <div class="flex items-center justify-between mb-2">
           <span class="text-sm font-medium text-gray-700">Current Domain</span>
           ${validationBadge}
         </div>
         <p class="font-mono text-sm">${escapeHtml(domain.domain)}</p>
         ${domain.is_wildcard ? '<p class="text-xs text-gray-500 mt-1">Wildcard certificate (*.domain)</p>' : ""}
       </div>`
    : "";

  const content = `
    <div class="max-w-2xl mx-auto px-4 py-8">
      <div class="flex items-center gap-2 mb-6">
        <a href="/dashboard" class="text-sm text-gray-500 hover:text-gray-700">Dashboard</a>
        <span class="text-gray-300">/</span>
        <span class="text-sm text-gray-900">Seat Details</span>
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div class="flex items-center justify-between mb-4">
          <h1 class="text-xl font-bold">${escapeHtml(seat.type.charAt(0).toUpperCase() + seat.type.slice(1))} Seat</h1>
          ${statusBadge}
        </div>

        ${seat.current_period_end
          ? `<p class="text-sm text-gray-500">Current period ends: ${new Date(seat.current_period_end).toLocaleDateString()}</p>`
          : ""}

        ${domainInfo}
      </div>

      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 class="text-lg font-semibold mb-4">${domain ? "Change" : "Set"} Domain</h2>
        <form method="POST" action="/dashboard/seats/${seat.id}/domain">
          <label for="domain" class="block text-sm font-medium text-gray-700 mb-1">Domain</label>
          <input
            type="text"
            id="domain"
            name="domain"
            value="${domainValue}"
            required
            placeholder="example.com"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none mb-4"
          />
          <p class="text-sm text-gray-500 mb-4">
            After setting the domain, point its DNS to redirect.center for validation.
          </p>
          <button
            type="submit"
            class="bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 transition font-medium"
            ${seat.status !== "active" ? "disabled" : ""}
          >
            ${domain ? "Update" : "Set"} Domain
          </button>
          ${seat.status !== "active" ? '<p class="text-sm text-red-500 mt-2">Domain changes are disabled while seat is not active.</p>' : ""}
        </form>
      </div>
    </div>
  `;

  return layout("Seat Details", content, user);
}

export function errorPage(title: string, message: string): string {
  const content = `
    <div class="max-w-md mx-auto px-4 py-16 text-center">
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h1 class="text-2xl font-bold mb-2">${escapeHtml(title)}</h1>
        <p class="text-gray-600 mb-6">${escapeHtml(message)}</p>
        <a href="/" class="inline-block text-blue-600 hover:text-blue-800 font-medium">Go Home</a>
      </div>
    </div>
  `;

  return layout(title, content);
}

function statusToBadge(status: string): string {
  const colors: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    canceled: "bg-red-100 text-red-700",
    past_due: "bg-yellow-100 text-yellow-700",
  };
  const colorClass = colors[status] ?? "bg-gray-100 text-gray-700";
  return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}">${status}</span>`;
}

function validationToBadge(status: string): string {
  const colors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    validated: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700",
  };
  const colorClass = colors[status] ?? "bg-gray-100 text-gray-700";
  return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}">${status}</span>`;
}
