import { layout, escapeHtml } from "./layout.ts";
import type { User, Subscription, Domain, Certificate } from "../../../shared/src/types.ts";

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
          HTTP redirects are FREE
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
            <p class="text-sm text-gray-600">Take your target URL and encode it as a subdomain. Dots become dashes, slashes become dots.</p>
          </div>
          <div class="bg-white p-6 rounded-xl shadow-sm">
            <div class="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-bold mb-4">2</div>
            <h3 class="font-semibold mb-2">Create a CNAME</h3>
            <p class="text-sm text-gray-600">Point your domain's CNAME record to the encoded subdomain at redirect.center.</p>
          </div>
          <div class="bg-white p-6 rounded-xl shadow-sm">
            <div class="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-bold mb-4">3</div>
            <h3 class="font-semibold mb-2">Done!</h3>
            <p class="text-sm text-gray-600">Visitors to your domain are automatically redirected. Supports 301, 302, 307, 308 codes.</p>
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
          for your custom domains, giving your visitors a secure redirect experience.
        </p>
        <div class="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          <div class="bg-gray-50 p-6 rounded-xl">
            <h3 class="font-semibold mb-2">Simple Slot</h3>
            <p class="text-sm text-gray-600">One domain per slot. Buy multiple slots to cover multiple domains.</p>
          </div>
          <div class="bg-gray-50 p-6 rounded-xl">
            <h3 class="font-semibold mb-2">Wildcard Slot</h3>
            <p class="text-sm text-gray-600">Wildcard certificate covering all subdomains of a domain. One slot per wildcard domain.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Pricing -->
    <section id="pricing" class="py-16 bg-gray-50">
      <div class="max-w-4xl mx-auto px-4">
        <h2 class="text-3xl font-bold text-center mb-4">Pricing</h2>
        <p class="text-center text-gray-600 mb-12">Each slot covers one domain with automatic HTTPS certificate provisioning. Buy as many as you need.</p>
        <div class="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div class="p-6">
              <h3 class="text-xl font-bold mb-1">Simple Slot</h3>
              <p class="text-sm text-gray-500 mb-4">Single domain redirect with HTTPS</p>
              <div class="mb-2"><span class="text-3xl font-bold">$3</span><span class="text-gray-500">/slot/month</span></div>
              <p class="text-sm text-gray-400 mb-6">or $32.40/slot/year <span class="text-green-600 font-medium">(save 10%)</span></p>
              <ul class="space-y-2 text-sm text-gray-600 mb-6">
                <li class="flex items-start gap-2"><span class="text-green-500 mt-0.5">&#10003;</span> Automatic SSL certificate</li>
                <li class="flex items-start gap-2"><span class="text-green-500 mt-0.5">&#10003;</span> Buy multiple slots at once</li>
                <li class="flex items-start gap-2"><span class="text-green-500 mt-0.5">&#10003;</span> All redirect types (301, 302, 307, 308)</li>
                <li class="flex items-start gap-2"><span class="text-green-500 mt-0.5">&#10003;</span> Path &amp; query string forwarding</li>
              </ul>
              <a href="/auth/login" class="block text-center bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition font-medium">Subscribe</a>
            </div>
          </div>
          <div class="bg-white rounded-xl shadow-sm border-2 border-blue-500 overflow-hidden relative">
            <div class="absolute top-0 right-0 bg-blue-500 text-white text-xs px-3 py-1 rounded-bl-lg font-medium">Popular</div>
            <div class="p-6">
              <h3 class="text-xl font-bold mb-1">Wildcard Slot</h3>
              <p class="text-sm text-gray-500 mb-4">All subdomains with wildcard HTTPS</p>
              <div class="mb-2"><span class="text-3xl font-bold">$5</span><span class="text-gray-500">/slot/month</span></div>
              <p class="text-sm text-gray-400 mb-6">or $54/slot/year <span class="text-green-600 font-medium">(save 10%)</span></p>
              <ul class="space-y-2 text-sm text-gray-600 mb-6">
                <li class="flex items-start gap-2"><span class="text-green-500 mt-0.5">&#10003;</span> Wildcard SSL certificate</li>
                <li class="flex items-start gap-2"><span class="text-green-500 mt-0.5">&#10003;</span> All subdomains covered</li>
                <li class="flex items-start gap-2"><span class="text-green-500 mt-0.5">&#10003;</span> All redirect types (301, 302, 307, 308)</li>
                <li class="flex items-start gap-2"><span class="text-green-500 mt-0.5">&#10003;</span> Path &amp; query string forwarding</li>
              </ul>
              <a href="/auth/login" class="block text-center bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition font-medium">Subscribe</a>
            </div>
          </div>
        </div>
        <p class="text-center text-sm text-gray-500 mt-8">HTTP redirects remain <strong>free</strong>. Paid plans add HTTPS support with automatic certificate management.</p>
      </div>
    </section>
  `;
  return layout("Free DNS-Based Domain Redirect Service", content);
}

export function termsPage(): string {
  const content = `
    <div class="max-w-3xl mx-auto px-4 py-12">
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-8 md:p-12">
        ${termsContent()}
      </div>
    </div>
  `;
  return layout("Terms of Service", content);
}

export function termsAcceptPage(user: User): string {
  const content = `
    <div class="max-w-3xl mx-auto px-4 py-12">
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-8 md:p-12">
        ${termsContent()}
        <form method="POST" action="/terms/accept" class="mt-8 border-t border-gray-200 pt-6">
          <label class="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" id="tos-checkbox" class="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
            <span class="text-sm text-gray-700">I have read and agree to the Terms of Service</span>
          </label>
          <button type="submit" id="tos-submit"
            class="mt-4 w-full bg-blue-600 text-white py-2.5 px-4 rounded-lg font-medium transition disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-700"
            disabled>
            Continue
          </button>
        </form>
        <script>
          document.getElementById('tos-checkbox').addEventListener('change', function() {
            document.getElementById('tos-submit').disabled = !this.checked;
          });
        </script>
      </div>
    </div>
  `;
  return layout("Accept Terms of Service", content, user);
}

function termsContent(): string {
  return `
        <h1 class="text-3xl font-bold mb-2">Terms of Service</h1>
        <p class="text-sm text-gray-500 mb-8">Last updated: March 23, 2026</p>

        <div class="prose prose-gray max-w-none space-y-6 text-sm leading-relaxed text-gray-700">
          <section>
            <h2 class="text-lg font-semibold text-gray-900 mb-2">1. Introduction &amp; Acceptance</h2>
            <p>By accessing or using the redirect.center service ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree, you must not use the Service.</p>
            <p>The Service is operated by redirect.center ("We", "Us"). The following definitions apply throughout these Terms:</p>
            <ul class="list-disc pl-6 space-y-1">
              <li><strong>Service</strong> &mdash; the DNS-based domain redirect platform provided at redirect.center.</li>
              <li><strong>User</strong> &mdash; any person or entity that uses the Service, including the free tier.</li>
              <li><strong>Subscriber</strong> &mdash; a User who has subscribed to a paid plan.</li>
            </ul>
          </section>

          <section>
            <h2 class="text-lg font-semibold text-gray-900 mb-2">2. Service Description</h2>
            <p>redirect.center is a DNS-based domain redirect service. Users configure CNAME records pointing to redirect.center, and the Service performs HTTP redirects based on the DNS configuration.</p>
            <p>The Service offers:</p>
            <ul class="list-disc pl-6 space-y-1">
              <li><strong>Free HTTP redirects</strong> via CNAME records, with no account required.</li>
              <li><strong>Paid HTTPS redirects</strong> with automatic SSL/TLS certificate provisioning and renewal.</li>
            </ul>
            <p>Paid plans are available in two types:</p>
            <ul class="list-disc pl-6 space-y-1">
              <li><strong>Simple Slot</strong> &mdash; covers a single domain with HTTPS.</li>
              <li><strong>Wildcard Slot</strong> &mdash; covers all subdomains of a domain with a wildcard HTTPS certificate.</li>
            </ul>
          </section>

          <section>
            <h2 class="text-lg font-semibold text-gray-900 mb-2">3. Free Tier</h2>
            <p>HTTP redirects are offered at no cost and without requiring an account. The free tier is provided on an "as available" basis.</p>
            <p>We reserve the right to modify, limit, or discontinue the free tier at any time, with reasonable notice posted on the Service website.</p>
          </section>

          <section>
            <h2 class="text-lg font-semibold text-gray-900 mb-2">4. Paid Plans &amp; Billing</h2>
            <p>Paid plans are available at the following rates:</p>
            <ul class="list-disc pl-6 space-y-1">
              <li><strong>Simple Slot:</strong> $3/month or $32.40/year per slot.</li>
              <li><strong>Wildcard Slot:</strong> $5/month or $54/year per slot.</li>
            </ul>
            <p>Subscriptions renew automatically at the end of each billing cycle unless canceled by the Subscriber. Prices may be changed with at least 30 days' prior notice. Any price change applies at the next renewal date.</p>
          </section>

          <section>
            <h2 class="text-lg font-semibold text-gray-900 mb-2">5. Service Level Agreement (SLA)</h2>
            <p>For paid plans only, We commit to a monthly uptime of at least <strong>98%</strong>.</p>
            <p>The uptime calculation excludes:</p>
            <ul class="list-disc pl-6 space-y-1">
              <li>Scheduled maintenance (with at least 24 hours' advance notice).</li>
              <li>Circumstances beyond our reasonable control, including force majeure events, third-party DNS failures, and DDoS attacks.</li>
            </ul>
            <p>If monthly uptime falls below 98%, the Subscriber is entitled to a pro-rata credit for the downtime period. The maximum credit for any billing cycle is limited to the amount paid by the Subscriber for that cycle (month or year).</p>
            <p>For example: if your monthly plan costs $5/month and uptime falls to 95% in a given month, the maximum credit you may receive is $5.</p>
            <p>No compensation is provided for indirect, consequential, or incidental damages, or for lost profits.</p>
          </section>

          <section>
            <h2 class="text-lg font-semibold text-gray-900 mb-2">6. Termination by redirect.center</h2>
            <p>We may terminate a Subscriber's access to the Service at any time.</p>
            <p>If termination is initiated by Us and is <strong>not</strong> due to a violation of these Terms by the Subscriber, We will issue a <strong>pro-rata refund</strong> for the unused portion of the current billing period.</p>
            <p>For example: if a Subscriber paid for an annual plan and the Service is terminated after 6 months, the Subscriber will receive a refund of 50% of the annual fee.</p>
            <p>If termination is due to a violation of these Terms by the User, no refund will be issued.</p>
          </section>

          <section>
            <h2 class="text-lg font-semibold text-gray-900 mb-2">7. Termination by User</h2>
            <p>Subscribers may cancel their subscription at any time through the dashboard. Upon cancellation, the Service remains active until the end of the current paid billing period.</p>
            <p>No pro-rata refund is provided for voluntary cancellations, unless required by applicable law.</p>
          </section>

          <section>
            <h2 class="text-lg font-semibold text-gray-900 mb-2">8. Acceptable Use</h2>
            <p>You may not use the Service to:</p>
            <ul class="list-disc pl-6 space-y-1">
              <li>Redirect to illegal, malicious, phishing, or malware-hosting content, or content that infringes third-party rights.</li>
              <li>Artificially generate traffic or abuse the Service infrastructure.</li>
              <li>Engage in any activity that violates applicable laws.</li>
            </ul>
            <p>We reserve the right to immediately suspend or terminate access for any violation of this section, without refund.</p>
          </section>

          <section>
            <h2 class="text-lg font-semibold text-gray-900 mb-2">9. Limitation of Liability</h2>
            <p>The Service is provided <strong>"AS IS"</strong> and <strong>"AS AVAILABLE"</strong> without warranties of any kind, express or implied.</p>
            <p>We do not guarantee that the Service will be uninterrupted or error-free, except as expressly stated in the SLA.</p>
            <p><strong>Our total aggregate liability to any Subscriber is limited to the amount paid by the Subscriber in the current billing cycle.</strong></p>
            <p>In no event shall We be liable for indirect, consequential, incidental, or punitive damages, including but not limited to lost profits, lost data, or loss of business.</p>
          </section>

          <section>
            <h2 class="text-lg font-semibold text-gray-900 mb-2">10. Modifications to Terms</h2>
            <p>We may modify these Terms at any time. Material changes will be communicated with at least 30 days' advance notice by email (for Subscribers) or by notice on the Service website.</p>
            <p>Continued use of the Service after such notice constitutes acceptance of the revised Terms.</p>
          </section>

          <section>
            <h2 class="text-lg font-semibold text-gray-900 mb-2">11. Governing Law</h2>
            <p>These Terms are governed by applicable international law. In the event of a dispute, the parties agree to attempt amicable resolution before pursuing any legal action.</p>
          </section>

          <section>
            <h2 class="text-lg font-semibold text-gray-900 mb-2">12. Contact</h2>
            <p>For questions about these Terms, please contact us at <a href="mailto:support@redirect.center" class="text-blue-600 hover:text-blue-800">support@redirect.center</a>.</p>
          </section>
        </div>`;
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
          <input type="email" id="email" name="email" required placeholder="you@example.com"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none mb-4" />
          <button type="submit" class="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition font-medium">Send Magic Link</button>
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
        <p class="text-gray-600 mb-4">We sent a sign-in link to <strong>${escapeHtml(email)}</strong>.</p>
        <p class="text-sm text-gray-500">The link expires in 24 hours. If you don't see it, check your spam folder.</p>
      </div>
    </div>
  `;
  return layout("Check Your Email", content);
}

function renderDomainCertificateStatus(d: Domain, cert: Certificate | null | undefined): string {
  const acmeCname = `_acme-challenge.${d.domain}.acme.redirect.center`;

  // No certificate yet, or cert still pending/dns_configured — show DNS instructions or progress
  if (!cert || cert.status === "pending" || cert.status === "dns_configured") {
    const hasRequestedValidation = !!d.validation_requested_at;

    // User clicked "Validate Domain" — show progress with auto-reload
    if (hasRequestedValidation && d.validation_status === "pending") {
      return `
        <div class="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm">
          <p class="text-gray-700 font-medium mb-2">Configure DNS for HTTPS:</p>
          <div class="bg-white p-2 rounded border border-gray-200 font-mono text-xs mb-2">
            <div><span class="text-gray-500">Type:</span> CNAME</div>
            <div><span class="text-gray-500">Name:</span> _acme-challenge.${escapeHtml(d.domain)}</div>
            <div class="flex items-center gap-2">
              <span><span class="text-gray-500">Value:</span> ${escapeHtml(acmeCname)}</span>
              <button onclick="navigator.clipboard.writeText('${escapeHtml(acmeCname)}')" class="text-blue-500 hover:text-blue-700" title="Copy">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              </button>
            </div>
          </div>
          <p class="text-gray-500 text-xs mb-2">This CNAME is permanent. Do not remove it after validation — it is needed for automatic certificate renewals.</p>
          <div class="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
            <p class="text-blue-800 font-medium mb-1">Validation in progress...</p>
            <p class="text-blue-700 text-xs">We're verifying the DNS configuration and issuing the certificate. This may take up to 5 minutes.</p>
            <p class="text-blue-600 text-xs mt-1">This page refreshes automatically.</p>
          </div>
        </div>
        <script>setTimeout(() => location.reload(), 15000);</script>`;
    }

    // No validation requested yet — show DNS instructions with Validate button
    return `
      <div class="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm">
        <p class="text-gray-700 font-medium mb-2">Configure DNS for HTTPS:</p>
        <div class="bg-white p-2 rounded border border-gray-200 font-mono text-xs mb-2">
          <div><span class="text-gray-500">Type:</span> CNAME</div>
          <div><span class="text-gray-500">Name:</span> _acme-challenge.${escapeHtml(d.domain)}</div>
          <div class="flex items-center gap-2">
            <span><span class="text-gray-500">Value:</span> ${escapeHtml(acmeCname)}</span>
            <button onclick="navigator.clipboard.writeText('${escapeHtml(acmeCname)}')" class="text-blue-500 hover:text-blue-700" title="Copy">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            </button>
          </div>
        </div>
        <p class="text-gray-500 text-xs mb-2">This CNAME is permanent. Do not remove it after validation — it is needed for automatic certificate renewals.</p>
        <form method="POST" action="/dashboard/domains/${d.id}/validate" class="inline">
          <button type="submit" class="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 transition">
            Validate Domain
          </button>
        </form>
      </div>`;
  }

  if (cert.status === "issuing") {
    return `
      <div class="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
        <p class="text-blue-800 font-medium">DNS verified. Issuing certificate...</p>
        <p class="text-blue-600 text-xs mt-1">This may take a few minutes.</p>
      </div>
      <script>setTimeout(() => location.reload(), 15000);</script>`;
  }

  if (cert.status === "issued") {
    const expiryDate = cert.expires_at ? new Date(cert.expires_at).toLocaleDateString() : "N/A";
    const renewalDate = cert.expires_at
      ? new Date(new Date(cert.expires_at).getTime() - 14 * 24 * 60 * 60 * 1000).toLocaleDateString()
      : "N/A";
    return `
      <div class="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
        <p class="text-green-800 font-medium">HTTPS active</p>
        <p class="text-green-700 text-xs">Certificate valid until ${escapeHtml(expiryDate)}. Next auto-renewal: ${escapeHtml(renewalDate)}.</p>
      </div>`;
  }

  if (cert.status === "failed") {
    return `
      <div class="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm">
        <p class="text-gray-700 font-medium mb-2">Configure DNS for HTTPS:</p>
        <div class="bg-white p-2 rounded border border-gray-200 font-mono text-xs mb-2">
          <div><span class="text-gray-500">Type:</span> CNAME</div>
          <div><span class="text-gray-500">Name:</span> _acme-challenge.${escapeHtml(d.domain)}</div>
          <div class="flex items-center gap-2">
            <span><span class="text-gray-500">Value:</span> ${escapeHtml(acmeCname)}</span>
            <button onclick="navigator.clipboard.writeText('${escapeHtml(acmeCname)}')" class="text-blue-500 hover:text-blue-700" title="Copy">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            </button>
          </div>
        </div>
        <p class="text-gray-500 text-xs mb-2">This CNAME is permanent. Do not remove it after validation — it is needed for automatic certificate renewals.</p>
        <div class="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm">
          <p class="text-red-800 font-medium">Validation failed</p>
          <p class="text-red-700 text-xs mb-2">${escapeHtml(cert.error_message ?? "Unknown error")}</p>
        </div>
        <form method="POST" action="/dashboard/domains/${d.id}/validate" class="inline mt-2">
          <button type="submit" class="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700 transition">Try Again</button>
        </form>
      </div>`;
  }

  if (cert.status === "renewal_failed") {
    const expiryDate = cert.expires_at ? new Date(cert.expires_at).toLocaleDateString() : "N/A";
    return `
      <div class="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm">
        <p class="text-orange-800 font-medium">Renewal problem</p>
        <p class="text-orange-700 text-xs">Certificate expires ${escapeHtml(expiryDate)}. Error: ${escapeHtml(cert.error_message ?? "Unknown")}</p>
        <p class="text-orange-600 text-xs mt-1">Verify the CNAME <code>_acme-challenge</code> is still configured.</p>
        <form method="POST" action="/dashboard/domains/${d.id}/validate" class="inline mt-1">
          <button type="submit" class="bg-orange-600 text-white px-3 py-1 rounded text-xs hover:bg-orange-700 transition">Check DNS Now</button>
        </form>
      </div>`;
  }

  if (cert.status === "expired") {
    return `
      <div class="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm">
        <p class="text-red-800 font-medium">Certificate expired</p>
        <p class="text-red-700 text-xs mb-2">HTTPS redirects are no longer working for this domain.</p>
        <form method="POST" action="/dashboard/domains/${d.id}/validate" class="inline">
          <button type="submit" class="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700 transition">Request New Certificate</button>
        </form>
      </div>`;
  }

  return "";
}

export function dashboardPage(
  user: User,
  subscriptions: Subscription[],
  domains: Map<string, Domain[]>,
  certificates: Map<string, Certificate | null>,
): string {
  // Build alerts
  let alerts = "";
  for (const sub of subscriptions) {
    const typeName = sub.type === "simple" ? "Simple Slot" : "Wildcard Slot";

    if (sub.status === "past_due") {
      alerts += `
        <div class="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg mb-4">
          <strong>Payment failed</strong> for your ${escapeHtml(typeName)} subscription.
          The payment will be retried automatically.
          <a href="/dashboard/portal" class="underline font-medium">Update payment method</a>.
        </div>`;
    }

    if (sub.status === "canceled" && sub.grace_period_end) {
      const graceDate = new Date(sub.grace_period_end).toLocaleDateString();
      alerts += `
        <div class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4">
          <strong>Subscription canceled</strong> &mdash; ${escapeHtml(typeName)}.
          Your domains will be deactivated on ${escapeHtml(graceDate)}.
          <a href="/dashboard/subscribe" class="underline font-medium">Reactivate</a>.
        </div>`;
    }

    if (sub.over_limit) {
      const subDomains = domains.get(sub.id) ?? [];
      const excess = subDomains.length - sub.quantity;
      alerts += `
        <div class="bg-orange-50 border border-orange-200 text-orange-800 px-4 py-3 rounded-lg mb-4">
          <strong>Over limit</strong> &mdash; ${escapeHtml(typeName)}.
          You have more domains than slots. Remove ${excess} domain(s) to regularize.
        </div>`;
    }
  }

  // Certificate alerts
  for (const [, subDomains] of domains) {
    for (const d of subDomains) {
      const cert = certificates.get(d.id);
      if (cert?.status === "renewal_failed") {
        alerts += `
          <div class="bg-orange-50 border border-orange-200 text-orange-800 px-4 py-3 rounded-lg mb-4">
            Certificate renewal problem for <strong>${escapeHtml(d.domain)}</strong>.
            <a href="#domain-${d.id}" class="underline font-medium">Check details</a>.
          </div>`;
      }
      if (cert?.status === "expired") {
        alerts += `
          <div class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-4">
            Certificate for <strong>${escapeHtml(d.domain)}</strong> has expired.
            <a href="#domain-${d.id}" class="underline font-medium">Resolve</a>.
          </div>`;
      }
      if (cert?.status === "issued" && cert.expires_at) {
        const daysLeft = Math.ceil((new Date(cert.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (daysLeft <= 14 && daysLeft > 0) {
          const color = daysLeft <= 3 ? "red" : daysLeft <= 7 ? "orange" : "yellow";
          alerts += `
            <div class="bg-${color}-50 border border-${color}-200 text-${color}-800 px-4 py-3 rounded-lg mb-4">
              Certificate for <strong>${escapeHtml(d.domain)}</strong> expires in ${daysLeft} days.
              <a href="#domain-${d.id}" class="underline font-medium">View details</a>.
            </div>`;
        }
      }
    }
  }

  // Build subscription sections
  let subscriptionSections = "";

  if (subscriptions.length === 0) {
    subscriptionSections = `
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <p class="text-gray-500 mb-4">You don't have any subscriptions yet.</p>
        <div class="flex gap-3 justify-center">
          <a href="/dashboard/subscribe" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium">Subscribe Simple Slots</a>
          <a href="/dashboard/subscribe" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition text-sm font-medium">Subscribe Wildcard Slots</a>
        </div>
      </div>`;
  }

  for (const sub of subscriptions) {
    const typeName = sub.type === "simple" ? "Simple Slots" : "Wildcard Slots";
    const subDomains = domains.get(sub.id) ?? [];
    const availableSlots = Math.max(0, sub.quantity - subDomains.length);
    const intervalLabel = sub.billing_interval === "yearly" ? "Yearly" : "Monthly";
    const renewalDate = sub.current_period_end
      ? new Date(sub.current_period_end).toLocaleDateString()
      : "N/A";
    const statusBadge = statusToBadge(sub.status);

    // Domain rows with certificate status
    let domainRows = "";
    if (subDomains.length === 0) {
      domainRows = `<p class="text-sm text-gray-400 italic py-2">No domains added yet</p>`;
    } else {
      domainRows = subDomains.map(d => {
        const cert = certificates.get(d.id);
        const certInfo = renderDomainCertificateStatus(d, cert);
        return `
          <div id="domain-${d.id}" class="py-3 border-b border-gray-100 last:border-0">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <span class="font-mono text-sm">${escapeHtml(d.domain)}</span>
                ${certStatusBadge(cert)}
              </div>
              <form method="POST" action="/dashboard/domains/${d.id}/remove" onsubmit="return confirm('Remove ${escapeHtml(d.domain)}? The slot will become available.')">
                <button type="submit" class="text-xs text-red-500 hover:text-red-700">Remove</button>
              </form>
            </div>
            ${certInfo}
          </div>`;
      }).join("");
    }

    const canAddDomain = sub.status === "active" && !sub.over_limit && availableSlots > 0;
    const addDomainForm = canAddDomain ? `
      <form method="POST" action="/dashboard/subscriptions/${sub.id}/domains" class="mt-4 flex gap-2">
        <input type="text" name="domain" required placeholder="example.com"
          class="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
        <button type="submit" class="bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700 transition text-sm font-medium">+ Add</button>
      </form>
      <p class="text-xs text-gray-400 mt-1">After adding, configure DNS as instructed to activate HTTPS.</p>
    ` : "";

    const addSlotsForm = sub.status === "active" ? `
      <form method="POST" action="/dashboard/subscriptions/${sub.id}/add-slots" class="flex items-center gap-2">
        <input type="number" name="quantity" value="1" min="1" max="50" class="w-16 px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-center" />
        <button type="submit" class="text-sm text-blue-600 hover:text-blue-800 font-medium">Buy more slots</button>
      </form>
    ` : "";

    subscriptionSections += `
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
        <div class="p-6">
          <div class="flex items-center justify-between mb-1">
            <h2 class="text-lg font-bold">${escapeHtml(typeName)}</h2>
            ${statusBadge}
          </div>
          <p class="text-sm text-gray-500 mb-4">
            Plan: ${escapeHtml(intervalLabel)} &middot;
            ${sub.quantity} slot${sub.quantity > 1 ? "s" : ""} &middot;
            ${subDomains.length} in use &middot;
            ${availableSlots} available
            &middot; Next renewal: ${escapeHtml(renewalDate)}
          </p>
          <div class="flex items-center gap-3 mb-4">
            ${addSlotsForm}
            ${user.stripe_customer_id ? '<a href="/dashboard/portal" class="text-sm text-gray-500 hover:text-gray-700">Manage subscription</a>' : ""}
          </div>
          <div class="border-t border-gray-100 pt-4">
            <h3 class="text-sm font-medium text-gray-700 mb-2">Domains</h3>
            ${domainRows}
            ${addDomainForm}
          </div>
        </div>
      </div>
    `;
  }

  const content = `
    <div class="max-w-4xl mx-auto px-4 py-8">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-2xl font-bold">Dashboard</h1>
        <div class="flex gap-3">
          ${user.stripe_customer_id ? '<a href="/dashboard/portal" class="text-sm border border-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 transition">Billing Portal</a>' : ""}
          <a href="/dashboard/subscribe" class="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">Subscribe New Slot Type</a>
        </div>
      </div>
      ${alerts}
      ${subscriptionSections}
    </div>
  `;
  return layout("Dashboard", content, user);
}

export function subscribePage(config: {
  simpleMonthly?: string;
  simpleYearly?: string;
  wildcardMonthly?: string;
  wildcardYearly?: string;
}, user: User, existingSubscriptions: Subscription[]): string {
  const hasSimple = existingSubscriptions.some(s => s.type === "simple");
  const hasWildcard = existingSubscriptions.some(s => s.type === "wildcard");

  function slotCard(title: string, slotType: string, price: string, interval: string, priceId: string | undefined, hasExisting: boolean, badge?: string): string {
    if (hasExisting) {
      return `
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 opacity-60">
          <h3 class="font-bold text-lg mb-1">${title}</h3>
          <p class="text-sm text-gray-500 mb-3">${interval}</p>
          <div class="text-2xl font-bold mb-4">${price}</div>
          <p class="text-sm text-gray-500">You already have a ${slotType} subscription. Add more slots from your dashboard.</p>
        </div>`;
    }
    return `
      <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 class="font-bold text-lg mb-1">${title}${badge ? ` ${badge}` : ""}</h3>
        <p class="text-sm text-gray-500 mb-3">${interval}</p>
        <div class="text-2xl font-bold mb-4">${price}</div>
        <form method="POST" action="/dashboard/subscribe">
          <input type="hidden" name="priceId" value="${escapeHtml(priceId ?? "")}" />
          <input type="hidden" name="slotType" value="${escapeHtml(slotType)}" />
          <div class="flex items-center gap-2 mb-4">
            <label class="text-sm text-gray-600">Quantity:</label>
            <input type="number" name="quantity" value="1" min="1" max="50" class="w-16 px-2 py-1.5 border border-gray-300 rounded-lg text-sm text-center" />
          </div>
          <button type="submit" class="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition font-medium" ${priceId ? "" : "disabled"}>Subscribe</button>
        </form>
      </div>`;
  }

  const content = `
    <div class="max-w-3xl mx-auto px-4 py-8">
      <h1 class="text-2xl font-bold mb-2">Choose a Plan</h1>
      <p class="text-gray-600 mb-8">Each slot covers one domain with automatic HTTPS certificate provisioning.</p>
      <div class="grid md:grid-cols-2 gap-6">
        ${slotCard("Simple Slot - Monthly", "simple", '$3<span class="text-base font-normal text-gray-500">/slot/mo</span>', "Single domain with HTTPS", config.simpleMonthly, hasSimple)}
        ${slotCard("Simple Slot - Yearly", "simple", '$32.40<span class="text-base font-normal text-gray-500">/slot/yr</span>', "Single domain with HTTPS", config.simpleYearly, hasSimple, '<span class="text-sm text-green-600 font-medium">Save 10%</span>')}
        ${slotCard("Wildcard Slot - Monthly", "wildcard", '$5<span class="text-base font-normal text-gray-500">/slot/mo</span>', "All subdomains with wildcard HTTPS", config.wildcardMonthly, hasWildcard)}
        ${slotCard("Wildcard Slot - Yearly", "wildcard", '$54<span class="text-base font-normal text-gray-500">/slot/yr</span>', "All subdomains with wildcard HTTPS", config.wildcardYearly, hasWildcard, '<span class="text-sm text-green-600 font-medium">Save 10%</span>')}
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
        <p class="text-gray-600 mb-6">Your slots have been created. You can now add domains in the dashboard.</p>
        <a href="/dashboard" class="inline-block bg-blue-600 text-white py-2 px-6 rounded-lg hover:bg-blue-700 transition font-medium">Go to Dashboard</a>
      </div>
    </div>
  `;
  return layout("Subscription Active", content, user);
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
  const colors: Record<string, string> = { active: "bg-green-100 text-green-700", canceled: "bg-red-100 text-red-700", past_due: "bg-yellow-100 text-yellow-700" };
  const labels: Record<string, string> = { active: "Active", canceled: "Canceled", past_due: "Past Due" };
  return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status] ?? "bg-gray-100 text-gray-700"}">${labels[status] ?? status}</span>`;
}

function certStatusBadge(cert: Certificate | null | undefined): string {
  if (!cert) return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Pending</span>`;
  const map: Record<string, { color: string; label: string }> = {
    pending: { color: "bg-gray-100 text-gray-600", label: "Pending" },
    dns_configured: { color: "bg-blue-100 text-blue-700", label: "DNS OK" },
    issuing: { color: "bg-blue-100 text-blue-700", label: "Issuing..." },
    issued: { color: "bg-green-100 text-green-700", label: "HTTPS Active" },
    renewal_pending: { color: "bg-yellow-100 text-yellow-700", label: "Renewal Pending" },
    renewal_failed: { color: "bg-orange-100 text-orange-700", label: "Renewal Failed" },
    expired: { color: "bg-red-100 text-red-700", label: "Expired" },
    failed: { color: "bg-red-100 text-red-700", label: "Failed" },
  };
  const { color, label } = map[cert.status] ?? { color: "bg-gray-100 text-gray-700", label: cert.status };
  return `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color}">${label}</span>`;
}
