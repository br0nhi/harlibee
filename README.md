# Harlibee – islamski edukativni portal

Statična web stranica (HTML, CSS, JavaScript, bez servera) za YouTube kanal **Harlibee** ([@harlibee](https://www.youtube.com/@harlibee)), na bosanskom jeziku.

**Adresa nakon objave:** https://br0nhi.github.io/harlibee/

## Šta sadrži

| Sekcija | Putanja | Napomena |
|---|---|---|
| Početna | `index.html` | Predstavljanje kanala i najnoviji videi (iz `data/videos.json`) |
| Članci | `clanci/` | Lista članaka i dva primjera članka uz video |
| Šablon članka | `clanci/sablon-clanka.html` | Polazna tačka za nove članke (nije indeksiran) |
| 99 Allahovih imena | `99-imena/` | Kartice, kviz i praćenje napretka; podaci su u `data/imena.json` |
| O kanalu | `o-kanalu/` | Priča, način rada, česta pitanja |
| Newsletter | `newsletter/` | Prijava preko Formspreea (form ID `xljdbndn`) |

Ostalo:

- **Dizajn:** vrlo tamna ljubičasta pozadina `#120A1F`, zlatna `#FFC83D` za naslove, narandžasta `#FF7A1A` samo za dugmad i akcente, tekst `#F7F3FF`. Sav tekst ima kontrast od najmanje 7:1 (WCAG AAA), a tekst na dugmadi 7,4:1. Fokus za tastaturu je jasno vidljiv (zlatni okvir od 3 px), a tu su i link „Preskoči na sadržaj” i poštovanje postavke „smanji animacije”.
- **Fontovi** (Lora, Source Sans 3, Amiri) su u `assets/fonts/` i ne učitavaju se s Googleovih servera, pa posjetioci ne šalju podatke trećoj strani.
- **SEO:** meta opisi, canonical, Open Graph i Twitter oznake, strukturirani podaci (JSON-LD), `sitemap.xml` i `robots.txt`.
- **Slike za dijeljenje (Open Graph):** 1200×630 PNG u `assets/img/og/`.
- **YouTube player** se učitava tek kad posjetilac klikne (`youtube-nocookie.com`). Stranica je zato brža, a bez klika se ne postavljaju YouTube kolačići.

## Pregled na vlastitom računaru

Stranice učitavaju JSON fajlove, pa ih ne otvarajte dvoklikom (`file://`). Pokrenite lokalni server u folderu projekta:

```bash
python3 -m http.server 8000
```

Zatim otvorite http://localhost:8000.

## Objava na GitHub Pages

Objavu radi workflow `.github/workflows/pages.yml`.

1. Na GitHubu otvorite repozitorij → **Settings → Pages**.
2. Pod **Build and deployment → Source** izaberite **GitHub Actions**.
3. Spojite izmjene u granu `main` (npr. preko pull requesta). Svaki push na `main` pokreće objavu.
4. Status pratite u kartici **Actions**. Za 1–2 minute sajt je na `https://br0nhi.github.io/harlibee/`.

Workflow se pokreće i **svaki dan u 06:00 UTC**. Tada skripta `scripts/update_videos.py` preuzme YouTube RSS feed kanala i osvježi listu najnovijih videa, bez ručnog rada. Ako feed nije dostupan, ostaje posljednja sačuvana lista. Objavu možete pokrenuti i ručno: **Actions → Objava na GitHub Pages → Run workflow**.

> GitHub gasi zakazane workflowe ako u repozitoriju nema aktivnosti 60 dana. Tada ga ponovo uključite u kartici Actions.

## Povezivanje vlastite domene (npr. `harlibee.ba`)

### 1. Pripremite fajlove

```bash
python3 scripts/set_domain.py harlibee.ba
```

Skripta u svim stranicama, sitemapu i `robots.txt` zamijeni `https://br0nhi.github.io/harlibee/` novom adresom (`https://harlibee.ba/`) i napravi fajl `CNAME`. Commitajte izmjene i pushajte na `main`.

### 2. Podesite DNS kod registrara domene

**Glavna domena** (`harlibee.ba`): dodajte četiri **A** zapisa za `@`:

```
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153
```

Po želji dodajte i **AAAA** zapise (IPv6):

```
2606:50c0:8000::153
2606:50c0:8001::153
2606:50c0:8002::153
2606:50c0:8003::153
```

**Poddomena `www`:** dodajte **CNAME** zapis `www` → `br0nhi.github.io`

Ako želite da glavna adresa bude `www.harlibee.ba`, pokrenite `python3 scripts/set_domain.py www.harlibee.ba`. Tada je dovoljan CNAME zapis za `www`, a GitHub automatski preusmjerava `harlibee.ba` na `www`, ako postoje i A zapisi.

### 3. Uključite domenu na GitHubu

1. **Settings → Pages → Custom domain**: upišite domenu i kliknite **Save**.
2. Kad provjera DNS-a prođe (od nekoliko minuta do 24 sata), označite **Enforce HTTPS**.
3. Preporuka: potvrdite domenu u **Settings (vašeg profila) → Pages → Add a domain**. Tako je niko drugi ne može vezati za svoj GitHub račun.

> `robots.txt` pretraživači čitaju samo s korijena domene, pa počinje djelovati tek s vlastitom domenom. Do tada se za indeksiranje koriste `sitemap.xml` i meta oznake.

### 4. Prijava u Google Search Console

Dodajte domenu na https://search.google.com/search-console i pošaljite `https://harlibee.ba/sitemap.xml`.

## Newsletter (Formspree)

Forme šalju podatke na `https://formspree.io/f/xljdbndn`. Prijava ide preko JavaScripta i poruka o uspjehu se prikaže na istoj stranici. Bez JavaScripta forma radi kao obična forma i vodi na Formspreeovu stranicu zahvale. Polje `_gotcha` je zamka za spam botove.

Prijave pregledate u Formspree panelu. Tamo po želji uključite i double opt-in, pa pretplatnik mora potvrditi adresu. Sama slanja newslettera radite u svom alatu za e-mail (npr. prijave izvezete kao CSV).

## Kako dodati novi članak

1. Napravite folder `clanci/naziv-clanka/` i u njega kopirajte postojeći članak (npr. `clanci/ajetul-kursija-ebu-hurejre/index.html`). Upute su i u `clanci/sablon-clanka.html`.
2. Zamijenite naslov, opis, datum, ID videa (dio linka iza `watch?v=`), `canonical`, `og:url`, `og:image` i JSON-LD podatke.
3. Napravite sliku za dijeljenje:
   ```bash
   npm install --no-save playwright && npx playwright install chromium
   node scripts/make-og.mjs "Naslov članka" og-naziv-clanka.png "Članak uz video · Kategorija"
   ```
4. Dodajte karticu članka u `clanci/index.html` (i po želji u sekciju „Članci uz video” na početnoj), a URL u `sitemap.xml`.

Zaglavlje i podnožje su isti na svim stranicama. Ako mijenjate meni, izmijenite ga u svakom HTML fajlu.

## 99 imena – podaci

`data/imena.json` sadrži `broj`, `arapski`, `transliteracija` i `znacenje` za svako ime. Popis slijedi predaju koju bilježi Tirmizi (br. 3507). Prijevodi su približni i napisani za učenje, pa ih prije objave neka pregleda neko ko je stručan.

Napredak (naučena imena i rezultati kviza) čuva se samo u pregledniku posjetioca (`localStorage`) i nikome se ne šalje. Ime se automatski označi kao naučeno kad ga posjetilac u kvizu pogodi dva puta zaredom.

## Struktura

```
├── index.html, 404.html, sitemap.xml, robots.txt, site.webmanifest, favicon.svg
├── clanci/            lista, članci, šablon
├── 99-imena/          kartice, kviz, napredak
├── o-kanalu/
├── newsletter/
├── data/              imena.json, videos.json
├── assets/css|js|img|fonts
├── scripts/           update_videos.py, set_domain.py, make-og.mjs
└── .github/workflows/pages.yml
```
