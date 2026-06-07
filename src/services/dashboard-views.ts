// Server-rendered HTML for the passwordless auth pages and the "My Domains"
// dashboard (ADR-0003 / Phase 10–11). Pure string builders, no I/O, so the route
// handlers in main.ts stay thin. Every interpolated value is HTML-escaped via
// `esc` — domains and emails originate from user input and an external provider.

export function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Design tokens mirror the marketing site (views/index.vto): the same blue->cyan
// brand, system font stack, and rounded surfaces, so the dashboard reads as one
// product. Light/dark is driven entirely by prefers-color-scheme (no JS, no FOUC).
const STYLE = `
:root {
  color-scheme: light;
  --brand: #2563eb; --brand-2: #0ea5e9;
  --bg: #f8fafc; --surface: #ffffff; --surface-2: #eef2f7;
  --text: #1e293b; --muted: #64748b; --border: #e2e8f0;
  --ring: rgba(37,99,235,.15);
  --ok-bg:#ecfdf5; --ok-fg:#065f46; --ok-bd:#a7f3d0;
  --err-bg:#fef2f2; --err-fg:#991b1b; --err-bd:#fecaca;
  --warn-bg:#fffbeb; --warn-fg:#92400e; --warn-bd:#fde68a;
  --radius: 12px; --radius-sm: 8px;
  --shadow: 0 1px 2px rgba(15,23,42,.04), 0 12px 28px -16px rgba(15,23,42,.18);
}
* { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body {
  margin: 0; min-height: 100vh;
  font: 16px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  color: var(--text); background: var(--bg);
}
h1 { font-size: 1.5rem; line-height: 1.25; margin: 0 0 .4rem; font-weight: 700; letter-spacing: -.01em; }
h2 { font-size: 1.05rem; margin: 1.75rem 0 .5rem; font-weight: 650; }
p { margin: .5rem 0; }
a { color: var(--brand); text-decoration: none; }
a:hover { text-decoration: underline; }
.muted { color: var(--muted); }
.container { max-width: 46rem; margin: 0 auto; padding: 2.5rem 1.25rem; }

/* Brand wordmark, shared with the marketing site's identity. */
.brand { display: inline-flex; align-items: center; gap: .6rem; font-weight: 700; font-size: 1.1rem; color: var(--text); letter-spacing: -.02em; }
.brand:hover { text-decoration: none; }
.brand .mark { width: 2rem; height: 2rem; border-radius: .6rem; display: inline-flex; align-items: center; justify-content: center; color: #fff; background: linear-gradient(135deg, var(--brand), var(--brand-2)); box-shadow: 0 6px 16px -6px var(--ring); }
.brand .mark svg { width: 1.1rem; height: 1.1rem; display: block; }
.brand .dot { color: var(--brand); }

/* Centered auth shell (login, link-expired). */
.auth { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1.25rem; padding: 2rem 1.25rem; background: var(--bg); }
.auth-card { width: 100%; max-width: 25rem; padding: 2rem 1.75rem; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow); }
.auth-foot { margin: 0; font-size: .8rem; color: var(--muted); text-align: center; }
.auth-foot a { color: var(--muted); }
.tc { text-align: center; }
.auth-icon { width: 3rem; height: 3rem; margin: 0 auto 1rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.auth-icon svg { width: 1.5rem; height: 1.5rem; }
.auth-icon.ok { background: var(--ok-bg); color: var(--ok-fg); }
.auth-icon.err { background: var(--err-bg); color: var(--err-fg); }

/* Forms */
.field { margin: 1rem 0; }
label { display: block; font-size: .85rem; font-weight: 600; margin-bottom: .4rem; }
input[type=email], input[type=text] {
  width: 100%; padding: .7rem .85rem; font: inherit; color: var(--text);
  background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--radius-sm);
  outline: none; transition: border-color .15s, box-shadow .15s;
}
input::placeholder { color: var(--muted); }
input:focus { border-color: var(--brand); box-shadow: 0 0 0 4px var(--ring); }

/* Buttons */
button, .btn {
  display: inline-flex; align-items: center; justify-content: center; gap: .5rem;
  padding: .7rem 1rem; font: inherit; font-weight: 600; cursor: pointer; text-decoration: none;
  border: 1px solid transparent; border-radius: var(--radius-sm);
  color: #fff; background: linear-gradient(135deg, var(--brand), var(--brand-2));
  box-shadow: 0 8px 20px -10px var(--ring); transition: transform .12s, box-shadow .15s, filter .15s;
}
button:hover, .btn:hover { filter: brightness(1.04); box-shadow: 0 12px 26px -12px var(--ring); text-decoration: none; }
button:active, .btn:active { transform: translateY(1px); }
button svg, .btn svg { width: 18px; height: 18px; }
.btn-block { width: 100%; }
button.secondary, .btn.secondary { background: var(--surface-2); color: var(--text); border-color: var(--border); box-shadow: none; }
button.secondary:hover, .btn.secondary:hover { background: var(--bg); filter: none; }
button.danger { background: transparent; color: #dc2626; border-color: transparent; box-shadow: none; padding: .35rem .6rem; }
button.danger:hover { background: var(--err-bg); filter: none; }

/* Notices */
.notice { display: flex; gap: .6rem; align-items: flex-start; padding: .75rem .9rem; margin: 1rem 0; font-size: .9rem; border-radius: var(--radius-sm); border: 1px solid transparent; }
.notice .ico { flex-shrink: 0; display: inline-flex; }
.notice .ico svg { display: block; width: 18px; height: 18px; }
.notice-cta { margin-top: .6rem; }
.notice.ok { background: var(--ok-bg); color: var(--ok-fg); border-color: var(--ok-bd); }
.notice.err { background: var(--err-bg); color: var(--err-fg); border-color: var(--err-bd); }
.notice.warn { background: var(--warn-bg); color: var(--warn-fg); border-color: var(--warn-bd); }

/* Portal primitives */
table { border-collapse: collapse; width: 100%; margin: .5rem 0; }
td, th { text-align: left; padding: .55rem .5rem; border-bottom: 1px solid var(--border); }
.scope { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; }
.cap { font-variant-numeric: tabular-nums; color: var(--muted); font-weight: 600; }
fieldset { border: 1px solid var(--border); border-radius: var(--radius-sm); margin: 1.5rem 0; padding: 1.25rem; }
legend { padding: 0 .4rem; font-weight: 600; }
.row { display: flex; gap: .5rem; flex-wrap: wrap; align-items: center; }

/* App shell (portal) */
.topbar { position: sticky; top: 0; z-index: 10; display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: .8rem 1.25rem; background: var(--surface); border-bottom: 1px solid var(--border); }
.topbar .brand { font-size: 1rem; }
.account { display: flex; align-items: center; gap: .75rem; font-size: .85rem; color: var(--muted); }
.account .who { max-width: 12rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.page-head { margin: 1.5rem 0 .5rem; }
.btn-sm { padding: .45rem .75rem; font-size: .85rem; }
.panel { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); box-shadow: var(--shadow); padding: 1.25rem 1.35rem; margin: 1rem 0; }
.panel-head { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-bottom: .35rem; }
.panel-head h2 { margin: 0; font-size: 1.05rem; }
.badge { font-variant-numeric: tabular-nums; font-weight: 600; font-size: .8rem; color: var(--muted); background: var(--surface-2); border: 1px solid var(--border); border-radius: 999px; padding: .2rem .65rem; white-space: nowrap; }
.dlist { list-style: none; margin: .85rem 0; padding: 0; border: 1px solid var(--border); border-radius: var(--radius-sm); overflow: hidden; }
.dlist li { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: .6rem .85rem; }
.dlist li + li { border-top: 1px solid var(--border); }
.dlist .host { font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace; font-size: .9rem; word-break: break-all; }
.empty { margin: .85rem 0; padding: 1.1rem; border: 1px dashed var(--border); border-radius: var(--radius-sm); color: var(--muted); text-align: center; font-size: .9rem; }
.add-form { display: flex; gap: .5rem; flex-wrap: wrap; margin-top: .85rem; }
.add-form input { flex: 1 1 12rem; }

/* Long-form (legal) pages */
.legal-top { margin-bottom: 1.5rem; }
.lead { font-size: 1.05rem; color: var(--text); }
.legal h2 { margin-top: 1.75rem; }
.legal ul { padding-left: 1.25rem; margin: .5rem 0; }
.legal li { margin: .35rem 0; }
.legal a { word-break: break-word; }
code { font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace; font-size: .88em; background: var(--surface-2); padding: .1rem .35rem; border-radius: 4px; }
.page-foot { margin-top: 2.5rem; padding-top: 1rem; border-top: 1px solid var(--border); font-size: .85rem; }
`;

// Inline stroke icons (no icon font, no requests). Kept tiny and reused below.
const ICON = {
  mark:
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 19v-7a3 3 0 0 1 3-3h9"/><path d="m13 5 5 4-5 4"/></svg>`,
  mail:
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>`,
  check:
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>`,
  alert:
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8v5"/><path d="M12 16h.01"/></svg>`,
};

// The brand wordmark links back to the marketing homepage.
function brandLink(): string {
  return `<a class="brand" href="/"><span class="mark">${ICON.mark}</span><span>redirect<span class="dot">.center</span></span></a>`;
}

// Centered auth shell: brand above a single card, a small footer below. Used by
// the login and link-expired pages so they share one calm, focused layout.
function authShell(cardBody: string): string {
  return `<div class="auth">
  ${brandLink()}
  <main class="auth-card">${cardBody}</main>
  <p class="auth-foot">&copy; redirect.center &middot; <a href="/terms">Terms</a> &middot; <a href="/privacy">Privacy</a> &middot; <a href="/refunds">Refunds</a></p>
</div>`;
}

// `bare` skips the centered .container wrapper for full-page layouts (auth shell).
// `index` allows search engines in (public legal pages); everything else is noindex.
function layout(
  title: string,
  body: string,
  opts: { bare?: boolean; index?: boolean } = {},
): string {
  const inner = opts.bare ? body : `<div class="container">${body}</div>`;
  const robots = opts.index ? "index, follow" : "noindex";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="${robots}">
<meta name="theme-color" content="#2563eb">
<title>${esc(title)}</title>
<style>${STYLE}</style>
</head>
<body>
${inner}
</body>
</html>`;
}

// /login — email entry for the magic link. Always renders the same after a POST
// (anti-enumeration: never says whether the email is a known Customer). On `sent`
// it switches to a "check your inbox" confirmation while still offering a resend.
export function loginPage(
  opts: { sent?: boolean; error?: string } = {},
): string {
  const form = (submitLabel: string) =>
    `<form method="post" action="/auth/request">
  <div class="field">
    <label for="email">Email address</label>
    <input id="email" type="email" name="email" placeholder="you@example.com" required autofocus autocomplete="email">
  </div>
  <button class="btn-block" type="submit">${ICON.mail}<span>${
      esc(submitLabel)
    }</span></button>
</form>`;

  const card = opts.sent
    ? `<div class="tc">
  <div class="auth-icon ok">${ICON.mail}</div>
  <h1>Check your inbox</h1>
  <p class="muted">If that email belongs to a customer, we've just sent a one-time sign-in link. It expires in 15 minutes.</p>
</div>
<div class="notice ok"><span class="ico">${ICON.check}</span><span>Didn't get it? Check your spam folder, or request another link below.</span></div>
${form("Send another link")}`
    : `<h1>Sign in</h1>
<p class="muted">Manage HTTPS for your domains. We'll email you a one-time sign-in link &mdash; no password to remember.</p>
${
      opts.error
        ? `<div class="notice err"><span class="ico">${ICON.alert}</span><span>${
          esc(opts.error)
        }</span></div>`
        : ""
    }
${form("Email me a sign-in link")}`;

  return layout("Sign in — redirect.center", authShell(card), { bare: true });
}

// Shown when a magic link is invalid, expired, or already used.
export function verifyErrorPage(): string {
  const card = `<div class="tc">
  <div class="auth-icon err">${ICON.alert}</div>
  <h1>That link didn't work</h1>
  <p class="muted">Your sign-in link is invalid, expired, or already used. Sign-in links last 15 minutes and work only once.</p>
</div>
<a class="btn btn-block" href="/login">Request a fresh link</a>`;
  return layout(
    "Link expired — redirect.center",
    authShell(card),
    { bare: true },
  );
}

export interface ScopeView {
  scope: "single" | "whole-domain";
  label: string;
  cap: number; // 0 when no active Plan in this Scope
  domains: string[]; // active domains, oldest-first
  overCap: boolean; // domains.length > cap (post-downgrade grace)
}

// /portal — the "My Domains" dashboard. Lists each Scope's domains with used/cap,
// an add form (or an upgrade prompt when full / over cap), and per-domain remove.
// `canAddRemove` / `canBilling` gate the mutating controls so the page can render
// read-only before those routes land (the feature ships across Phases 10–12).
export function portalPage(opts: {
  email: string;
  scopes: ScopeView[];
  canAddRemove?: boolean;
  canBilling?: boolean;
  notice?: { kind: "ok" | "err" | "warn"; text: string };
}): string {
  const canAddRemove = opts.canAddRemove ?? true;
  const canBilling = opts.canBilling ?? true;
  const notice = opts.notice
    ? `<div class="notice ${opts.notice.kind}"><span class="ico">${
      opts.notice.kind === "ok" ? ICON.check : ICON.alert
    }</span><span>${esc(opts.notice.text)}</span></div>`
    : "";

  // An upgrade prompt offers the billing portal only once it exists (Phase 12).
  const upgradeCta = (label: string) =>
    canBilling
      ? `<form method="post" action="/billing/portal" style="display:inline"><button class="secondary btn-sm" type="submit">${
        esc(label)
      }</button></form>`
      : `<a class="btn secondary btn-sm" href="/?scope=upgrade">${
        esc(label)
      }</a>`;

  const sections = opts.scopes.map((s) => {
    const used = s.domains.length;
    const hasPlan = s.cap > 0 || used > 0;
    const rows = s.domains.length
      ? `<ul class="dlist">${
        s.domains.map((d) =>
          `<li><span class="host">${esc(d)}</span>${
            canAddRemove
              ? `<form method="post" action="/domains/${
                encodeURIComponent(d)
              }/delete" onsubmit="return confirm('Remove ${
                esc(d)
              }? Its HTTPS certificate will be torn down.')">
            <input type="hidden" name="scope" value="${esc(s.scope)}">
            <button class="danger btn-sm" type="submit">Remove</button>
          </form>`
              : ""
          }</li>`
        ).join("")
      }</ul>`
      : `<p class="empty">No domains in this scope yet.</p>`;

    const full = used >= s.cap;
    const addOrUpgrade = !hasPlan
      ? `<p class="muted">No active plan for this scope. <a href="/?scope=${
        esc(s.scope)
      }">Get one &rarr;</a></p>`
      : !canAddRemove
      ? ""
      : s.overCap
      ? `<div class="notice warn"><span class="ico">${ICON.alert}</span><div>You have ${used} domains but your plan now covers ${s.cap}. Remove ${
        used - s.cap
      } to re-enable the extras, or get a bigger plan:<div class="notice-cta">${
        upgradeCta("Upgrade your plan")
      }</div></div></div>`
      : full
      ? `<div class="notice warn"><span class="ico">${ICON.alert}</span><div>You've used all ${s.cap} ${
        s.cap === 1 ? "domain" : "domains"
      } in this plan.<div class="notice-cta">${
        upgradeCta("Upgrade to add more")
      }</div></div></div>`
      : `<form method="post" action="/domains" class="add-form">
          <input type="hidden" name="scope" value="${esc(s.scope)}">
          <input type="text" name="domain" placeholder="example.com" required autocomplete="off" spellcheck="false">
          <button type="submit">Add domain</button>
        </form>`;

    return `<section class="panel">
  <div class="panel-head"><h2>${
      esc(s.label)
    }</h2><span class="badge">${used} / ${s.cap || "—"}</span></div>
  ${rows}
  ${addOrUpgrade}
</section>`;
  }).join("");

  const billing = canBilling
    ? `<section class="panel">
  <div class="panel-head"><h2>Billing</h2></div>
  <p class="muted">Change your plan, update your card, or download invoices on Polar.</p>
  <form method="post" action="/billing/portal"><button class="secondary" type="submit">Open billing portal &rarr;</button></form>
</section>`
    : "";

  const body = `<div class="topbar">
  ${brandLink()}
  <div class="account">
    <span class="who">${esc(opts.email || "your account")}</span>
    <a class="btn secondary btn-sm" href="/logout">Sign out</a>
  </div>
</div>
<div class="container">
  <header class="page-head">
    <h1>My Domains</h1>
    <p class="muted">Domains you've enabled HTTPS for. Add or remove them anytime &mdash; certificates are issued and renewed automatically.</p>
  </header>
  ${notice}
  ${sections}
  ${billing}
  <footer class="page-foot muted">${legalNav()}</footer>
</div>`;

  return layout("My Domains — redirect.center", body, { bare: true });
}

// Branded HTML (+ plain-text) for the magic-link email. Inline styles only — mail
// clients strip <style>/<head>, so every rule lives on the element, and the layout
// is table-based for the same reason. dashboard.ts passes the absolute sign-in URL.
export function magicLinkEmail(link: string): { html: string; text: string } {
  const href = esc(link);
  const html =
    `<!doctype html><html><body style="margin:0;padding:0;background:#f8fafc;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;box-shadow:0 12px 28px -16px rgba(15,23,42,.18);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
        <tr><td style="padding:28px 32px 0;font-size:18px;font-weight:700;letter-spacing:-.4px;">redirect<span style="color:#2563eb;">.center</span></td></tr>
        <tr><td style="padding:16px 32px 0;font-size:20px;font-weight:700;">Sign in to your dashboard</td></tr>
        <tr><td style="padding:10px 32px 0;font-size:15px;line-height:1.6;color:#475569;">Click the button below to sign in. This link expires in 15 minutes and can be used once.</td></tr>
        <tr><td style="padding:24px 32px;">
          <a href="${href}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:13px 22px;border-radius:10px;">Sign in to redirect.center</a>
        </td></tr>
        <tr><td style="padding:0 32px 4px;font-size:13px;line-height:1.6;color:#64748b;">Or paste this link into your browser:</td></tr>
        <tr><td style="padding:0 32px 24px;font-size:12px;line-height:1.5;word-break:break-all;"><a href="${href}" style="color:#2563eb;">${href}</a></td></tr>
        <tr><td style="padding:16px 32px;border-top:1px solid #e2e8f0;font-size:12px;line-height:1.6;color:#94a3b8;">If you didn't request this email, you can safely ignore it &mdash; no one can sign in without this link.</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
  const text =
    `Sign in to redirect.center\n\nClick to sign in: ${link}\n\nThis link expires in 15 minutes and can be used once. If you didn't request it, ignore this email.`;
  return { html, text };
}

// ── Legal pages (Terms / Privacy / Refunds) ─────────────────────────────────
// Public, indexable documents served on the FQDN. Drafts tailored to an EU /
// Portugal service with Polar as Merchant of Record — review with a lawyer and
// fill in the legal-entity details before relying on them. Bump LAST_UPDATED on
// any change.

const LAST_UPDATED = "6 June 2026";
const OPERATOR = "Udlei Nati";
const SUPPORT_EMAIL = "udlei@nati.biz";

// Footer/cross-links shared by the legal pages (and the portal). The current page
// is shown as bold text instead of a link.
function legalNav(current?: string): string {
  const items: ReadonlyArray<[string, string, string]> = [
    ["/terms", "Terms of Service", "terms"],
    ["/privacy", "Privacy Policy", "privacy"],
    ["/refunds", "Refunds &amp; Withdrawal", "refunds"],
  ];
  const links = items.map(([href, label, key]) =>
    key === current
      ? `<strong>${label}</strong>`
      : `<a href="${href}">${label}</a>`
  );
  return [...links, `<a href="/">Home</a>`].join(" &middot; ");
}

// Shared chrome for a legal document: brand, title, "last updated", content, nav.
function legalPage(title: string, current: string, content: string): string {
  return layout(
    `${title} — redirect.center`,
    `<div class="legal-top">${brandLink()}</div>
<h1>${esc(title)}</h1>
<p class="muted">Last updated: ${LAST_UPDATED}</p>
<div class="legal">${content}</div>
<footer class="page-foot muted">${legalNav(current)}</footer>`,
    { index: true },
  );
}

export function termsPage(): string {
  return legalPage(
    "Terms of Service",
    "terms",
    `<p class="lead">These Terms govern your use of redirect.center ("the Service"), operated by ${OPERATOR} ("we", "us"). By using the Service you agree to these Terms.</p>

<h2>1. The Service</h2>
<p>redirect.center turns DNS records into HTTP redirects. HTTP redirects are free. HTTPS is an optional paid add-on: when you enable a Plan for a domain, we issue and renew a TLS certificate for it automatically. The Service is provided on a best-effort basis, "as is", with no uptime or availability guarantee.</p>

<h2>2. Accounts &amp; sign-in</h2>
<p>The paid dashboard uses passwordless, e-mail "magic link" sign-in. You are responsible for keeping access to your e-mail inbox secure. We identify your account by the e-mail address held by our payment provider (see &sect;4).</p>

<h2>3. Acceptable use</h2>
<p>You must have the right to use any domain you point at the Service, and you are solely responsible for your DNS configuration and redirect destinations. You must not use the Service to:</p>
<ul>
  <li>break any applicable law or third-party right;</li>
  <li>distribute malware, or run phishing, spam, or fraudulent schemes;</li>
  <li>redirect to unlawful, infringing, or harmful content;</li>
  <li>abuse the certificate-issuance system or attempt to disrupt the Service.</li>
</ul>
<p>We may refuse, suspend, or remove any domain or redirect, and block abusive use, at our reasonable discretion — in particular where needed to protect the Service or comply with the law.</p>

<h2>4. Payments, billing &amp; taxes</h2>
<p>Paid Plans are sold and processed by <a href="https://polar.sh" rel="noopener">Polar</a>, our <strong>Merchant of Record</strong>. Polar handles checkout, invoicing, and applicable taxes (including EU VAT), and is the seller of record for your purchase. Prices are shown at checkout and Plans renew automatically each billing period until cancelled. You can manage your Plan, payment method, and invoices through the billing portal linked in your dashboard.</p>

<h2>5. Cancellation &amp; changes</h2>
<p>You can cancel at any time from the billing portal; cancellation stops future renewals. When a Plan ends or is cancelled, HTTPS for the covered domains stops being maintained. We may change, add, or remove features and adjust prices, giving reasonable notice of material changes (price changes apply from your next billing period).</p>

<h2>6. Disclaimer &amp; liability</h2>
<p>To the maximum extent permitted by law, the Service is provided without warranties of any kind, and we are not liable for indirect, incidental, or consequential damage, or for loss arising from DNS misconfiguration, downtime, or the redirect destinations you control. Where liability cannot be excluded, it is limited to the amount you paid for the Service in the 12 months before the event. Nothing here limits your mandatory statutory rights as a consumer.</p>

<h2>7. Suspension &amp; termination</h2>
<p>We may suspend or terminate access for breach of these Terms, abuse, or legal reasons. You may stop using the Service at any time.</p>

<h2>8. Changes to these Terms</h2>
<p>We may update these Terms; the "last updated" date above reflects the current version. Continued use after a change means you accept it.</p>

<h2>9. Governing law &amp; disputes</h2>
<p>These Terms are governed by the law of Portugal, without prejudice to the mandatory consumer-protection rules of your EU country of residence. EU consumers may also use the European Commission's <a href="https://ec.europa.eu/consumers/odr" rel="noopener">Online Dispute Resolution platform</a>.</p>

<h2>10. Contact</h2>
<p>Questions about these Terms: <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>`,
  );
}

export function privacyPage(): string {
  return legalPage(
    "Privacy Policy",
    "privacy",
    `<p class="lead">This policy explains what personal data redirect.center ("the Service") collects, why, and your rights under the EU General Data Protection Regulation (GDPR / RGPD).</p>

<h2>1. Who is responsible</h2>
<p>The data controller is ${OPERATOR} ("we", "us"). For any privacy request, contact <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>

<h2>2. What we collect</h2>
<ul>
  <li><strong>Redirect traffic.</strong> When a visitor reaches a domain pointed at the Service, our servers log the IP address, the requested hostname, the user-agent, and a timestamp. We also keep aggregate counts of domains served.</li>
  <li><strong>Account data (paid tier).</strong> Your e-mail address (from our payment provider), the domains you enable, and your Plan/subscription details.</li>
  <li><strong>Sign-in.</strong> A single, strictly-necessary session cookie (<code>rc_session</code>) that keeps you logged in. No advertising or analytics cookies are used.</li>
  <li><strong>Payment data.</strong> Card and billing details are handled by our payment provider — we never see or store your card number.</li>
</ul>

<h2>3. Why we use it (legal bases)</h2>
<ul>
  <li><strong>Performance of a contract</strong> — to provide the paid HTTPS service you bought.</li>
  <li><strong>Legitimate interests</strong> — to operate, secure, and prevent abuse of the Service, and to keep basic usage statistics.</li>
  <li><strong>Legal obligation</strong> — to keep billing and tax records (via our payment provider).</li>
</ul>

<h2>4. Cookies</h2>
<p>We use only the strictly-necessary <code>rc_session</code> cookie for authentication. Because it is essential to a service you asked for, no consent banner is required, and we set no tracking cookies.</p>

<h2>5. Who we share data with</h2>
<p>We rely on a small number of processors to run the Service, and we do not sell your data:</p>
<ul>
  <li><a href="https://polar.sh" rel="noopener">Polar</a> — payments, invoicing, and customer management (Merchant of Record).</li>
  <li>An e-mail delivery provider — to send your sign-in links.</li>
  <li>Cloud hosting and storage providers — to run the Service and store TLS certificates.</li>
</ul>
<p>Some providers may process data outside the EEA; where they do, appropriate safeguards (such as the EU Standard Contractual Clauses) apply.</p>

<h2>6. How long we keep it</h2>
<p>Traffic logs are kept only for a limited period for security and operations. Account data is kept while your account is active and for as long as needed to meet legal and tax obligations, after which it is deleted or anonymised.</p>

<h2>7. Your rights</h2>
<p>Under the GDPR you may request access to, correction of, or erasure of your data; restrict or object to processing; and request portability. To exercise any of these, e-mail <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>. You also have the right to lodge a complaint with the Portuguese supervisory authority, <a href="https://www.cnpd.pt" rel="noopener">CNPD</a> (or your local authority).</p>

<h2>8. Security</h2>
<p>We use reasonable technical measures, including passwordless sign-in and signed, expiring session tokens, to protect your data.</p>

<h2>9. Children</h2>
<p>The Service is not directed at children under 16, and we do not knowingly collect their data.</p>

<h2>10. Changes &amp; contact</h2>
<p>We may update this policy; the "last updated" date reflects the current version. Questions: <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>`,
  );
}

export function refundsPage(): string {
  return legalPage(
    "Refunds & Withdrawal",
    "refunds",
    `<p class="lead">How refunds and the EU right of withdrawal work for paid redirect.center Plans.</p>

<h2>1. Who processes payments</h2>
<p>Paid Plans are sold and processed by <a href="https://polar.sh" rel="noopener">Polar</a>, our Merchant of Record. Invoices and refunds are handled through Polar; refunds are returned to your original payment method.</p>

<h2>2. Right of withdrawal (EU consumers)</h2>
<p>If you are a consumer in the EU, you normally have 14 days to withdraw from a distance contract without giving a reason.</p>

<h2>3. Immediate start &amp; what it means for withdrawal</h2>
<p>Enabling HTTPS starts immediately: we begin issuing your TLS certificate as soon as you buy. By completing checkout you ask us to begin at once and acknowledge that, once the service has been fully performed, you lose the 14-day right of withdrawal. If you withdraw while the service is only partly performed, you may be charged in proportion to what was already provided.</p>

<h2>4. How to request a refund or withdraw</h2>
<p>Within 14 days of purchase, contact us at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a> or through Polar. Eligible refunds are processed promptly to your original payment method.</p>

<h2>5. Cancelling vs. refunding</h2>
<p>You can cancel a Plan at any time from the billing portal to stop future renewals. Cancelling stops the next charge; it does not by itself refund the current period unless a refund is due under these terms or the law.</p>

<h2>6. If something is wrong</h2>
<p>Your statutory rights to a service that matches its description are unaffected. If HTTPS isn't working as described, contact us and we'll fix it or refund you where appropriate.</p>

<h2>7. Contact</h2>
<p>Refund and withdrawal requests: <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>`,
  );
}
