# SEO launch list (for John)

Simple steps, in order. Tick each one. Claude Code did the code side; the steps below need your accounts.

## A. Vercel (project telning, Pro plan) — once

- [ ] **www → telning.com.** Vercel → Project → Settings → Domains → Add `www.telning.com` → choose "Redirect to telning.com" (308).
      Then at your DNS provider add a CNAME `www` → `cname.vercel-dns.com` (Vercel shows the exact value). Today `www.telning.com` has no DNS record at all.
- [ ] **One URL style.** Done in code: `vercel.json` has `"trailingSlash": false`, so `/guide/` redirects to `/guide` (the QR address). Nothing to click.
- [ ] **Preview = noindex.** Done in code: preview deployments send `<meta name="robots" content="noindex">` and the build fails if production has it. Vercel also adds an `X-Robots-Tag: noindex` header to preview URLs by itself.
- [ ] **Firewall.** Vercel → Project → Firewall. Make sure no rule challenges or blocks the search and AI bots in `robots.txt` (Googlebot, Bingbot, Applebot, OAI-SearchBot, ChatGPT-User, PerplexityBot, Perplexity-User, Claude-SearchBot, Claude-User, and the training bots GPTBot, ClaudeBot, Google-Extended, Applebot-Extended, CCBot). "Bot Protection" and "Attack Challenge Mode" should stay off, or allow-list these bots.
- [ ] **Deploy** the `site-v2-pages` branch (merge to `main`). Check `https://telning.com/robots.txt`, `/sitemap.xml` and `/llms.txt` open.

## B. Google Search Console — once

1. [ ] Open https://search.google.com/search-console → Add property → **Domain** → `telning.com`.
2. [ ] Google shows a TXT record. Add it at your DNS provider (type TXT, host `@`, the value Google gives). Wait a few minutes, click Verify.
       (If DNS is a problem, tell Claude Code the HTML-tag code instead: it goes into `site-data.json` → `verification.google`.)
3. [ ] Sitemaps (left menu) → enter `sitemap.xml` → Submit.
4. [ ] URL Inspection (top bar): paste `https://telning.com/`, press Enter, click **Request indexing**. Repeat for `/tada`, `/guide`, `/send`, `/about`, `/pim`, `/teachers`.

## C. Bing Webmaster Tools — once

1. [ ] Open https://www.bing.com/webmasters → Sign in → **Import from Google Search Console** (fastest; it copies the verified site and the sitemap).
2. [ ] If import does not work: Add site → `https://telning.com` → verify by DNS CNAME, or give Claude Code the meta-tag code (`verification.bing`).
3. [ ] Sitemaps → submit `https://telning.com/sitemap.xml`.
4. [ ] IndexNow is in the code: on every push to `main`, GitHub sends the changed URLs to IndexNow (file `.github/workflows/indexnow.yml`). Bing's index is also used by some AI assistants.

## D. After one to two weeks

- [ ] Search Console → **Pages**: every page should be "Indexed". If one says "Discovered – currently not indexed" or "Crawled – currently not indexed", request indexing again and tell Claude Code which page.
- [ ] Search Console → **Enhancements** / **Shopping** / **Structured data**: no errors. (Breadcrumbs and FAQ may show here.)
- [ ] Search Console → **Core Web Vitals** and **HTTPS**: all green.
- [ ] Bing Webmaster → **Site Scan** once: no errors.

## E. Every month

- [ ] Search Console → **Search results** → look at Queries and Pages. Note which pages get impressions but few clicks (title or description could be better) and which queries we miss. Tell Claude Code: "improve /guide for the query X".
- [ ] Keyword Planner (Google Ads, free with an account): check the phrases in `docs/seo-keyword-map.md`.

## F. Decisions you still owe (from the brief, section 8)

- [ ] Training bots: allowed now (default). Say "block" to change `robots.txt`.
- [ ] The Amazon author page URL, when it exists → `social.amazonAuthor` in `site-data.json` (goes into the Organization `sameAs`).
- [ ] "colouring" vs "coloring": see `docs/seo-keyword-map.md`.
- [ ] Landing H1: keep "Little stories, growing minds." or change (see the keyword map).
