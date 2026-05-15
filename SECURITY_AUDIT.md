# Security & Quality Audit — Zanim Zniknie Landing Page

**Data audytu:** 2026-05-15  
**Audytor:** GitHub Copilot CLI  
**URL docelowy:** https://frugo1314.github.io/zanim-zniknie-landing/ → https://zanim-zniknie.pl  
**Pliki audytowane:** `index.html`, `js/main.js`, `css/style.css`, `css/animations.css`  
**Narzędzia:** curl, openssl, whatweb, dig, whois, analiza statyczna kodu

---

## STRESZCZENIE WYKONAWCZE

| Priorytet  | Liczba issues |
|------------|--------------|
| 🔴 CRITICAL | 3            |
| 🟠 HIGH     | 6            |
| 🟡 MEDIUM   | 6            |
| 🔵 LOW      | 5            |
| ✅ DOBRE    | 5            |

**Najpoważniejszy problem:** Newsletter form i koszyk są niefunkcjonalne — żadne dane użytkownika nie są faktycznie zapisywane, mimo że UI sugeruje sukces. To eliminuje całą wartość biznesową landingu.

---

## 🔴 CRITICAL

---

### C1 — Newsletter form nie wysyła danych (BRAK integracji backend)

**Co znalezione:**  
`js/main.js` linia ~255–275: funkcja `initForms()` wywołuje `event.preventDefault()`, waliduje email, pokazuje komunikat `"Dzięki! Sprawdź skrzynkę i potwierdź zapis."` i resetuje formularz — ale **nie wykonuje żadnego `fetch()`, `XMLHttpRequest` ani `form.submit()`**. Adresy email są dosłownie nigdzie nie zapisywane.

```js
// AKTUALNY KOD (skrót) — bez żadnego fetch/POST:
on(form, 'submit', (event) => {
  event.preventDefault();
  // ...walidacja...
  if (error) error.textContent = 'Dzięki! Sprawdź skrzynkę i potwierdź zapis.'; // ← FAKE
  form.reset();
});
```

**Ryzyko biznesowe:**  
Każdy użytkownik który zapisał się na newsletter **NIE jest na liście**. Zero leadów zbieranych. Cały funnel marketingowy jest zepsuty. Wzmianka o "sprawdzeniu skrzynki" sugeruje email potwierdzający — który nigdy nie przychodzi.

**Fix:**  
Zintegruj z Klaviyo (rekomendowane dla Shopify), Mailchimp, lub Shopify Customer API.

```html
<!-- Opcja 1: Mailchimp embed (formularz z action URL) -->
<form action="https://xxx.us1.list-manage.com/subscribe/post?u=XXX&amp;id=YYY" 
      method="POST" data-newsletter-form novalidate>

<!-- Opcja 2: fetch do Klaviyo API -->
```

```js
// W initForms(), po walidacji:
const response = await fetch('https://a.klaviyo.com/api/profiles/', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'revision': '2024-07-15' },
  body: JSON.stringify({ data: { type: 'profile', attributes: { email: email.value.trim() } } })
});
```

---

### C2 — "Dodaj do koszyka" jest fikcyjne (BRAK Shopify checkout)

**Co znalezione:**  
`js/main.js` funkcja `addToCart()`: inkrementuje lokalny licznik `state.cartCount`, zmienia tekst przycisku na `"Dodano ✓"` i po 1,3s przywraca oryginał. **Brak wywołania Shopify Cart API, brak `fetch('/cart/add.js')`, brak żadnego checkout flow.**

```js
const addToCart = (productId) => {
  state.cartCount += 1;  // ← tylko lokalny counter
  updateCartBadge();
  // ← brak fetch do Shopify
};
```

**Ryzyko biznesowe:**  
Użytkownik klika "Dodaj do koszyka", widzi licznik koszyka rosnący do `1`, myśli że produkt jest w koszyku — i nie ma możliwości przejścia do checkout. Zero konwersji. Potencjalne skargi do UOKiK za wprowadzanie w błąd (art. 5 Dyrektywy 2005/29/WE).

**Fix:**  
Zintegruj ze Shopify Storefront API lub prostymi linkami produktowymi:

```js
// Opcja A: link do produktu Shopify
button.addEventListener('click', () => {
  window.location.href = `https://zanim-zniknie.pl/products/${productHandle}`;
});

// Opcja B: Shopify Cart API
const addToCart = async (variantId) => {
  const res = await fetch('https://zanim-zniknie.pl/cart/add.js', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: variantId, quantity: 1 }),
    credentials: 'include'
  });
};
```

---

### C3 — Hardcoded fake social proof ("Już 2847 zapisanych")

**Co znalezione:**  
`index.html` linia 157: `<strong data-counter="2847">0</strong>` — liczba animuje się do 2847 przy scroll, ale jest statycznym placeholderem. Nie jest pobierana z żadnego API.

**Ryzyko biznesowe:**  
Pod polskim prawem (ustawa o nieuczciwych praktykach rynkowych, art. 5) podanie fałszywej liczby subskrybentów to **wprowadzająca w błąd praktyka handlowa**. Może skutkować karą od UOKiK (do 10% obrotu rocznego) lub skargami konsumentów. W połączeniu z C1 (newsletter nie działa) sytuacja jest szczególnie ryzykowna — liczba nie może nawet rosnąć.

**Fix:**  
Usuń licznik lub pobieraj z rzeczywistego API, lub zastąp ogólnikowym "Dołącz do tysięcy" bez konkretnych liczb, jeśli nie masz jeszcze danych.

---

## 🟠 HIGH

---

### H1 — Redirect chain przez HTTP (HTTPS downgrade)

**Co znalezione:**  
Plik `CNAME` wskazuje na `zanim-zniknie.pl`. GitHub Pages generuje redirect:

```
frugo1314.github.io/zanim-zniknie-landing/ 
  → HTTP 301 → http://zanim-zniknie.pl/        ← CLEARTEXT HTTP!
    → HTTP 301 → https://zanim-zniknie.pl/
```

**Ryzyko:** Choć nowoczesne przeglądarki obsługują HTTPS-first, użytkownicy korzystający ze starszych klientów, narzędzi (curl, wget) lub sieci korporacyjnych mogą trafić na cleartext hop. MITM możliwy teoretycznie.

**Fix:**  
GitHub Pages obsługuje HTTPS automatycznie dla domen z CNAME. Upewnij się że:
1. W GitHub Pages settings dla repo włączone jest **"Enforce HTTPS"**
2. DNS dla `zanim-zniknie.pl` ma rekord A wskazujący na adresy GitHub Pages (185.199.108-111.153), nie na Shopify — do czasu pełnej migracji na Shopify
3. Po migracji: Cloudflare (już obsługuje zanim-zniknie.pl) ma "Always Use HTTPS" i "HSTS" włączone w SSL/TLS settings

---

### H2 — Brak Security Headers (GitHub Pages nie wspiera nagłówków serwera)

**Co znalezione:**  
Odpowiedź z `frugo1314.github.io` zwraca **zero security headers**:

| Header | Status |
|--------|--------|
| `Content-Security-Policy` | ❌ brak |
| `Strict-Transport-Security` | ❌ brak |
| `X-Frame-Options` | ❌ brak |
| `X-Content-Type-Options` | ❌ brak |
| `Referrer-Policy` | ❌ brak |
| `Permissions-Policy` | ❌ brak |

**Ryzyko:** Clickjacking (brak X-Frame-Options), MIME sniffing attacks, referrer leakage do zewnętrznych domen, brak HTTPS enforcement.

**Fix (meta tags w HTML — jedyna opcja dla GitHub Pages):**

```html
<!-- Dodaj do <head>, za <meta charset>: -->

<!-- CSP — blokuje XSS i unauthorized resources -->
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self';
  style-src 'self' https://fonts.googleapis.com 'unsafe-inline';
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' https://images.unsplash.com data:;
  connect-src 'none';
  frame-ancestors 'none';
  upgrade-insecure-requests;
">

<!-- Referrer Policy -->
<meta name="referrer" content="strict-origin-when-cross-origin">

<!-- X-Frame-Options nie jest wspierane przez meta tag — wymaga serwera lub Cloudflare -->
<!-- X-Content-Type-Options nie jest wspierane przez meta tag -->
```

> **Uwaga:** `frame-ancestors` w CSP meta tag **nie jest respektowane przez przeglądarki** (tylko nagłówek HTTP działa). Dla pełnej ochrony użyj Cloudflare Page Rules lub po migracji Shopify nagłówki będą ustawione automatycznie (zanim-zniknie.pl na Shopify już ma `X-Frame-Options: DENY`).

---

### H3 — Brak SRI (Subresource Integrity) dla Google Fonts

**Co znalezione:**

```html
<!-- index.html linia 14-16 — brak integrity= -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
```

**Ryzyko:** Jeśli Google Fonts CDN zostałby skompromitowany (supply-chain attack), złośliwy CSS mógłby być załadowany do Twojej strony. Bez SRI przeglądarka nie weryfikuje integralności.

**Fix:**  
Google Fonts dynamicznie generuje CSS (różny per user-agent), więc SRI hash nie jest praktyczny. **Rekomendowana alternatywa:** self-host fonty.

```bash
# 1. Pobierz fonty przez google-webfonts-helper (https://gwfh.mranftl.com)
# 2. Umieść w /fonts/
# 3. Zdefiniuj @font-face w CSS
```

```css
@font-face {
  font-family: 'Inter';
  src: url('../fonts/inter-400.woff2') format('woff2');
  font-weight: 400;
  font-display: swap;
}
```

Alternatywnie, jeśli zostajesz przy CDN, dodaj `font-display=swap` do URL (już nie ma w URL) i zaakceptuj brak SRI.

---

### H4 — localStorage bez zgody użytkownika (RODO/GDPR)

**Co znalezione:**  
`js/main.js` linia 295, 309:

```js
localStorage.getItem('zz_exit_dismissed')  // odczyt bez zgody
localStorage.setItem('zz_exit_dismissed', '1')  // zapis bez zgody
```

**Ryzyko:** Zgodnie z art. 5(3) Dyrektywy 2002/58/WE (ePrivacy) i polską implementacją (Prawo telekomunikacyjne art. 173) **każde przechowywanie informacji w urządzeniu końcowym użytkownika** wymaga jego uprzedniej zgody lub musi być niezbędne do działania usługi. UODO może nałożyć karę.

**Fix — opcja A (techniczna, brak bannera):**  
Argument "ściśle niezbędne" ma szansę przy ciasteczku preferencji UI — ale jest ryzykowny. Bezpieczniej użyć sesyjnego storage:

```js
// Zmień localStorage na sessionStorage (znika po zamknięciu karty)
const canShowExit = () => ... && sessionStorage.getItem('zz_exit_dismissed') !== '1';
const closeExitModal = () => {
  sessionStorage.setItem('zz_exit_dismissed', '1');
  ...
};
```

**Fix — opcja B (pełna zgodność):** Dodaj baner cookie consent (Cookiebot, CookieYes, lub własny) który ustawia `localStorage` tylko po kliknięciu "Akceptuj".

---

### H5 — Brak DMARC record (ryzyko phishingu z domeny)

**Co znalezione:**  
`dig _dmarc.zanim-zniknie.pl TXT` zwraca pusty wynik. SPF jest ustawiony (`v=spf1 include:mx.ovh.com -all`) ale bez DMARC atakujący może wysyłać emaile podszywając się pod `@zanim-zniknie.pl`.

**Ryzyko:** Phishing kampanie udające obsługę klienta Zanim Zniknie, fałszywe potwierdzenia zamówień. Bezpośredni damage do reputacji i potencjalne oszustwa na klientach.

**Fix:**  
Dodaj rekord DNS TXT:

```
_dmarc.zanim-zniknie.pl. IN TXT "v=DMARC1; p=quarantine; rua=mailto:dmarc@zanim-zniknie.pl; ruf=mailto:dmarc@zanim-zniknie.pl; pct=100; sp=quarantine"
```

Docelowo po wdrożeniu i monitorowaniu: zmień `p=quarantine` na `p=reject`.

---

### H6 — Brak CAA DNS record (dowolne CA może wystawić cert)

**Co znalezione:**  
`dig zanim-zniknie.pl CAA +short` zwraca pusty wynik. Brak ograniczenia które CA mogą wystawiać certyfikaty.

**Ryzyko:** Przy błędzie lub kompromitacji innego CA (historia: DigiNotar, Comodo), fałszywy cert dla zanim-zniknie.pl jest możliwy.

**Fix:**  
Dodaj rekord CAA (Cloudflare obsługuje zanim-zniknie.pl — dodaj przez Cloudflare DNS panel lub OVH):

```
zanim-zniknie.pl. IN CAA 0 issue "letsencrypt.org"
zanim-zniknie.pl. IN CAA 0 issue "digicert.com"
zanim-zniknie.pl. IN CAA 0 iodef "mailto:admin@zanim-zniknie.pl"
```

---

## 🟡 MEDIUM

---

### M1 — Brak `<link rel="canonical">` — duplikacja contentu

**Co znalezione:**  
Strona dostępna jest pod dwoma URL-ami: `https://frugo1314.github.io/zanim-zniknie-landing/` i `https://zanim-zniknie.pl`. Brak tagu canonical.

**Fix:**

```html
<link rel="canonical" href="https://zanim-zniknie.pl/">
```

---

### M2 — og:image wskazuje na nieistniejący plik

**Co znalezione:**  
`<meta property="og:image" content="https://zanim-zniknie.pl/og-image.jpg">` — curl zwraca 302→password page. Plik nie istnieje.

**Ryzyko:** Udostępnianie na social media pokaże pustą grafikę lub brak podglądu. Straty w organic reach o ~40–60% wg badań.

**Fix:** Utwórz grafikę OG (1200×630px), uploaduj na hosting i zaktualizuj URL.

---

### M3 — Brak favicon

**Co znalezione:**  
`GET /favicon.ico` na GitHub Pages zwraca 404.

**Fix:**

```html
<!-- Wygeneruj favicon przez https://realfavicongenerator.net -->
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
```

---

### M4 — Obrazy produktów z zewnętrznego Unsplash CDN (stock photos)

**Co znalezione:**  
Wszystkie 8 obrazów produktów to linki do `images.unsplash.com`:

```html
<img src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop" ...>
```

**Ryzyka:**
1. **Prawne:** Obrazy ze zdjęciami stockowymi nie przedstawiają rzeczywistych produktów. Naruszenie art. 5 Dyrektywy 2005/29/WE (misleading commercial practices) — zwłaszcza że przy dropshippingu klienci mogą oczekiwać produktu zgodnego z zdjęciem.
2. **Techniczne:** Zewnętrzne zależności CDN — URL-e mogą przestać działać, zdjęcia mogą być zamienione.
3. **Performance:** Dodatkowe połączenie do zewnętrznego hosta.

**Fix:** Użyj rzeczywistych zdjęć produktów lub zdecydowanie oznacz jako "zdjęcie poglądowe". Hostuj własne media.

---

### M5 — HSTS max-age za krótki (po stronie Shopify)

**Co znalezione:**  
`zanim-zniknie.pl` (Shopify/Cloudflare) zwraca `Strict-Transport-Security: max-age=7889238` ≈ **91 dni**. Minimalne wymaganie do HSTS Preload List: **365 dni (31536000 sekund)**. Bez preloadingu każde pierwsze połączenie może być cleartext.

**Fix:**  
W Cloudflare: SSL/TLS → Edge Certificates → włącz **HSTS** z:
- Max Age: `12 months`
- Include Subdomains: ✅
- Preload: ✅ (dopiero po stabilizacji konfiguracji)

---

### M6 — `content-language: pl-US` zamiast `pl-PL` (Shopify)

**Co znalezione:**  
Odpowiedź Shopify zwraca `content-language: pl-US`. Sklep jest polskim sklepem (PLN, adres PL), powinien deklarować `pl-PL`.

**Fix:** W Shopify Admin → Settings → Languages → ustaw Polish (Poland) jako primary language.

---

## 🔵 LOW

---

### L1 — Brak robots.txt i sitemap.xml

**Co znalezione:**  
Brak pliku `robots.txt` w projekcie. Brak `sitemap.xml`.

**Fix:**

```
# /robots.txt
User-agent: *
Allow: /
Sitemap: https://zanim-zniknie.pl/sitemap.xml

# Zablokuj duplikat na GitHub Pages:
User-agent: *
Disallow: /
Host: https://zanim-zniknie.pl
```

Uwaga: docelowo sitemapę obsługuje Shopify automatycznie pod `/sitemap.xml`.

---

### L2 — Deprecated `X-XSS-Protection` header (Shopify)

**Co znalezione:**  
`zanim-zniknie.pl` zwraca `X-XSS-Protection: 1; mode=block`. Header jest deprecated od 2019 i usunięty z Chrome 78+. Może powodować problemy w starych IE/Edge.

**Ryzyko:** Niskie — to nagłówek po stronie Shopify, poza Twoją kontrolą.

**Fix:** Zgłoś Shopify support lub zaakceptuj jako irrelevant (CSP jest ważniejszy).

---

### L3 — Server-Timing header ujawnia infrastrukturę (Shopify)

**Co znalezione:**  
`server-timing: asn;desc="49981", edge;desc="AMS", country;desc="NL", theme;desc="186355319089"` — ujawnia ASN, lokalizację edge, country origin, ID motywu Shopify.

**Fix:** Cloudflare → Transform Rules → Response Header Modification → Remove `server-timing`. Lub zaakceptuj (info i tak dostępne przez Cloudflare traceroute).

---

### L4 — Ticker content duplication via JavaScript

**Co znalezione:**  
`js/main.js` funkcja `initTicker()`:

```js
ticker.textContent = `${ticker.textContent} ${ticker.textContent}`;
```

Używa `textContent` (bezpieczne — nie parsuje HTML), ale duplikuje zawartość przez JS co wpływa na dostępność (screen readery przeczytają tekst dwukrotnie). Aria-hidden nie jest ustawione.

**Fix:**

```html
<!-- W HTML dodaj: -->
<div data-ticker aria-hidden="true">...</div>
```

---

### L5 — Brak `<meta name="twitter:card">` i Twitter/X OG tags

**Co znalezione:**  
Brak twitter meta tagów. Udostępnianie na Twitter/X użyje domyślnego miniaturki lub nie pokaże preview.

**Fix:**

```html
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@ZanimZniknie">
<meta name="twitter:title" content="Zanim Zniknie | Kuratorska selekcja gadżetów">
<meta name="twitter:description" content="Wybieramy najlepsze gadżety zanim trafią do każdego sklepu.">
<meta name="twitter:image" content="https://zanim-zniknie.pl/og-image.jpg">
```

---

## ✅ CO DZIAŁA DOBRZE

| Obszar | Ocena |
|--------|-------|
| **TLS/SSL** | TLS 1.3, Let's Encrypt, X25519MLKEM768 (post-quantum), brak znanych podatności (HEARTBLEED, ROBOT, POODLE). ✅ |
| **DNSSEC** | Włączony z podpisem DS. ✅ |
| **SPF** | `v=spf1 include:mx.ovh.com -all` (hard fail). ✅ |
| **JS security** | Brak `eval()`, `innerHTML`, `document.write()`. Honeypot w formularzu. Solidna obsługa focus trap w modalu i menu. ✅ |
| **Accessibility basics** | `skip-link`, `aria-expanded`, `aria-hidden`, `aria-label`, `role="dialog"`, `aria-modal`, IntersectionObserver z graceful degradation, `prefers-reduced-motion` respektowane. ✅ |
| **Shopify security headers** | Po przejściu na zanim-zniknie.pl: CSP, HSTS, X-Frame-Options: DENY, X-Content-Type-Options: nosniff, X-Permitted-Cross-Domain-Policies, HttpOnly cookies. ✅ |

---

## ⚡ QUICK WINS — 5 fixów w HTML/JS bez zmian serwera

Możesz wdrożyć bezpośrednio, bez dostępu do serwera:

### QW1 — Security headers jako meta tagi

Dodaj do `<head>` zaraz po `<meta charset>`:

```html
<meta http-equiv="Content-Security-Policy" 
  content="default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com 'unsafe-inline'; font-src 'self' https://fonts.gstatic.com; img-src 'self' https://images.unsplash.com data: https:; connect-src 'none'; upgrade-insecure-requests;">
<meta name="referrer" content="strict-origin-when-cross-origin">
```

### QW2 — Canonical + Twitter cards

```html
<link rel="canonical" href="https://zanim-zniknie.pl/">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@ZanimZniknie">
<meta name="twitter:image" content="https://zanim-zniknie.pl/og-image.jpg">
```

### QW3 — localStorage → sessionStorage (RODO quick fix)

W `js/main.js` (linie 295 i 309), zamień `localStorage` na `sessionStorage`:

```js
// Linia 295:
const canShowExit = () => window.innerWidth >= 1024 && modal && !state.exitShown && sessionStorage.getItem('zz_exit_dismissed') !== '1';

// Linia 309:
sessionStorage.setItem('zz_exit_dismissed', '1');
```

### QW4 — Usuń/zmień fake subscriber counter

W `index.html` linia 157, zmień:

```html
<!-- PRZED: -->
<p class="social-proof">Już <strong data-counter="2847">0</strong> zapisanych</p>

<!-- PO: -->
<p class="social-proof">Dołącz do pierwszych osób na liście</p>
```

### QW5 — Aria-hidden na ticker

W `index.html`, znajdź element `data-ticker` i dodaj `aria-hidden="true"`:

```html
<div data-ticker aria-hidden="true">...</div>
```

---

## SSL/TLS — SZCZEGÓŁY

| Parametr | Wartość | Ocena |
|----------|---------|-------|
| Protokół | TLS 1.3 | ✅ |
| Cipher suite | TLS_AES_128_GCM_SHA256 | ✅ |
| Key exchange | X25519MLKEM768 (post-quantum hybrid) | ✅ excellent |
| Certyfikat | *.github.io, Let's Encrypt R12 | ✅ |
| Weryfikacja | OK (kod 0) | ✅ |
| HEARTBLEED | N/A (TLS 1.3) | ✅ |
| ROBOT | N/A (AESGCM) | ✅ |
| POODLE/BEAST | N/A (TLS 1.3 only) | ✅ |
| HSTS (GitHub Pages) | ❌ brak | ⚠️ |

---

## OSINT — DOMENA zanim-zniknie.pl

| Parametr | Wartość |
|----------|---------|
| Rejestracja | 2026-05-15 (świeża!) |
| Rejestrator | OVH SAS |
| Typ rejestranta | individual (dane osobowe chronione przez RODO) |
| NS | ns200.anycast.me, dns200.anycast.me (Cloudflare) |
| DNSSEC | ✅ Podpisany (DS: 5155 8 2 ...) |
| SPF | ✅ `v=spf1 include:mx.ovh.com -all` |
| DMARC | ❌ Brak |
| MX | OVH (mx1/2/3.mail.ovh.net) |
| CAA | ❌ Brak |
| Hosting IP | 23.227.38.65 (Shopify/Cloudflare) |
| CMS wyciek | Shopify (`powered-by: Shopify` header) |

---

## ROADMAP — Kolejność wdrożenia

```
TYDZIEŃ 1 (Biznesowe CRITICAL):
  1. [ ] QW3: localStorage → sessionStorage
  2. [ ] QW4: Usuń fake counter
  3. [ ] C1: Podłącz newsletter (Klaviyo/Mailchimp)
  4. [ ] C2: Podłącz koszyk do Shopify lub zmień na linki produktowe

TYDZIEŃ 1 (Quick wins):
  5. [ ] QW1: CSP + Referrer-Policy meta tags
  6. [ ] QW2: Canonical + Twitter cards
  7. [ ] QW5: aria-hidden na ticker

TYDZIEŃ 2:
  8. [ ] H5: Dodaj DMARC record w DNS
  9. [ ] H6: Dodaj CAA record w DNS
  10. [ ] M1-M3: Favicon, og:image, canonical (jeśli nie w tyg. 1)
  11. [ ] Cloudflare HSTS: ustaw max-age=31536000

DŁUGOTERMINOWO:
  12. [ ] Self-host fonty (zastąp Google Fonts CDN)
  13. [ ] Cookie consent banner (pełna zgodność RODO)
  14. [ ] Realne zdjęcia produktów
  15. [ ] robots.txt + sitemap.xml
```

---

*Raport wygenerowany automatycznie. Zalecana weryfikacja przez prawnika przed wdrożeniem w zakresie zgodności z RODO/UODO.*
