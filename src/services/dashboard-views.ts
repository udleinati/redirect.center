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

const STYLE = `
:root { color-scheme: light dark; }
* { box-sizing: border-box; }
body { font: 16px/1.5 system-ui, sans-serif; max-width: 46rem; margin: 0 auto; padding: 2rem 1.25rem; }
h1 { font-size: 1.5rem; margin: 0 0 .25rem; }
h2 { font-size: 1.05rem; margin: 2rem 0 .5rem; }
p { margin: .5rem 0; }
.muted { color: #6b7280; }
a { color: #2563eb; }
form { margin: .5rem 0; }
input[type=email], input[type=text] { padding: .55rem .7rem; border: 1px solid #9ca3af; border-radius: .4rem; width: 100%; max-width: 22rem; font: inherit; }
button, .btn { padding: .55rem .9rem; border: 0; border-radius: .4rem; background: #2563eb; color: #fff; font: inherit; cursor: pointer; text-decoration: none; display: inline-block; }
button.secondary, .btn.secondary { background: #e5e7eb; color: #111827; }
button.danger { background: transparent; color: #b91c1c; padding: .3rem .5rem; }
.notice { padding: .7rem .9rem; border-radius: .4rem; margin: 1rem 0; }
.notice.ok { background: #ecfdf5; color: #065f46; }
.notice.err { background: #fef2f2; color: #991b1b; }
.notice.warn { background: #fffbeb; color: #92400e; }
table { border-collapse: collapse; width: 100%; margin: .5rem 0; }
td, th { text-align: left; padding: .45rem .5rem; border-bottom: 1px solid #e5e7eb; }
.scope { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; }
.cap { font-variant-numeric: tabular-nums; color: #6b7280; }
fieldset { border: 1px solid #e5e7eb; border-radius: .5rem; margin: 1rem 0; padding: 1rem; }
legend { padding: 0 .4rem; font-weight: 600; }
.row { display: flex; gap: .5rem; flex-wrap: wrap; align-items: center; }
`;

function layout(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${esc(title)}</title>
<style>${STYLE}</style>
</head>
<body>
${body}
</body>
</html>`;
}

// /login — email entry for the magic link. Always renders the same after a POST
// (anti-enumeration: never says whether the email is a known Customer).
export function loginPage(
  opts: { sent?: boolean; error?: string } = {},
): string {
  const notice = opts.error
    ? `<div class="notice err">${esc(opts.error)}</div>`
    : opts.sent
    ? `<div class="notice ok">If that email belongs to a customer, we've sent a sign-in link. Check your inbox.</div>`
    : "";
  return layout(
    "Sign in — redirect.center",
    `
<h1>Sign in</h1>
<p class="muted">Manage the domains you've enabled HTTPS for. We'll email you a one-time sign-in link — no password.</p>
${notice}
<form method="post" action="/auth/request">
  <p><input type="email" name="email" placeholder="you@example.com" required autofocus></p>
  <p><button type="submit">Email me a sign-in link</button></p>
</form>`,
  );
}

// Shown when a magic link is invalid, expired, or already used.
export function verifyErrorPage(): string {
  return layout(
    "Link expired — redirect.center",
    `
<h1>That link didn't work</h1>
<div class="notice err">Your sign-in link is invalid, expired, or already used. Request a fresh one.</div>
<p><a class="btn" href="/login">Back to sign in</a></p>`,
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
    ? `<div class="notice ${opts.notice.kind}">${esc(opts.notice.text)}</div>`
    : "";

  // An upgrade prompt offers the billing portal only once it exists (Phase 12).
  const upgradeCta = (label: string) =>
    canBilling
      ? `<form method="post" action="/billing/portal" style="display:inline"><button class="secondary" type="submit">${
        esc(label)
      }</button></form>`
      : `<a class="btn secondary" href="/?scope=upgrade">${esc(label)}</a>`;

  const sections = opts.scopes.map((s) => {
    const used = s.domains.length;
    const hasPlan = s.cap > 0 || used > 0;
    const rows = s.domains.length
      ? `<table><tbody>${
        s.domains.map((d) => `
        <tr>
          <td>${esc(d)}</td>
          <td style="text-align:right">${
          canAddRemove
            ? `<form method="post" action="/domains/${
              encodeURIComponent(d)
            }/delete" onsubmit="return confirm('Remove ${
              esc(d)
            }? Its HTTPS certificate will be torn down.')">
              <input type="hidden" name="scope" value="${esc(s.scope)}">
              <button class="danger" type="submit">Remove</button>
            </form>`
            : ""
        }</td>
        </tr>`).join("")
      }</tbody></table>`
      : `<p class="muted">No domains yet.</p>`;

    const full = used >= s.cap;
    const addOrUpgrade = !hasPlan
      ? `<p class="muted">No active plan for this scope. <a href="/?scope=${
        esc(s.scope)
      }">Get one →</a></p>`
      : !canAddRemove
      ? ""
      : s.overCap
      ? `<div class="notice warn">You have ${used} domains but your plan now covers ${s.cap}. Remove ${
        used - s.cap
      } or ${upgradeCta("upgrade your plan")} to re-enable the extras.</div>`
      : full
      ? `<div class="notice warn">You've used all ${s.cap} domains in this plan. ${
        upgradeCta("Upgrade to add more")
      }</div>`
      : `<form method="post" action="/domains" class="row">
          <input type="hidden" name="scope" value="${esc(s.scope)}">
          <input type="text" name="domain" placeholder="example.com" required>
          <button type="submit">Add domain</button>
        </form>`;

    return `
<h2 class="scope"><span>${esc(s.label)}</span> <span class="cap">${used} / ${
      s.cap || "—"
    }</span></h2>
${rows}
${addOrUpgrade}`;
  }).join("");

  const billing = canBilling
    ? `<fieldset>
  <legend>Billing</legend>
  <p class="muted">Change your plan, update your card, or download invoices on Polar.</p>
  <form method="post" action="/billing/portal"><button class="secondary" type="submit">Open billing portal →</button></form>
</fieldset>`
    : "";

  return layout(
    "My Domains — redirect.center",
    `
<h1>My Domains</h1>
<p class="muted">Signed in as ${
      esc(opts.email || "your account")
    } · <a href="/logout">Sign out</a></p>
${notice}
${sections}
${billing}`,
  );
}
