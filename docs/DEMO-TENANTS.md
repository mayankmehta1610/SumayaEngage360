# Global demo companies — URLs & logins

Seeded by `apps/api/scripts/seed-global-demo.mjs` (idempotent; run with
`API_URL=https://engage360-api-qhnr.onrender.com node scripts/seed-global-demo.mjs`
for production). One country-specific company per supported jurisdiction, each
with provisioned operating cities, a careers page, published jobs located in
real local cities, and candidates who applied through the public careers flow.

**Every workspace admin and HR password:** `Demo@12345`
(users: `admin@<tenant>.demo` — Tenant admin, `hr@<tenant>.demo` — HR)

Production base: `https://engage360-web.onrender.com`

| Country | Company | Workspace login URL | Organization ID | Admin email | Careers page |
|---|---|---|---|---|---|
| 🇮🇳 India | Meridian Infotech | `/in/company` | `meridian-in` | `admin@meridian-in.demo` | `/careers/meridian-in/meridian-in` |
| 🇺🇸 United States | Blue Harbor Software | `/us/company` | `blueharbor-us` | `admin@blueharbor-us.demo` | `/careers/blueharbor-us/blueharbor-us` |
| 🇬🇧 United Kingdom | Thistle & Crown Consulting | `/gb/company` | `thistlecrown-gb` | `admin@thistlecrown-gb.demo` | `/careers/thistlecrown-gb/thistlecrown-gb` |
| 🇨🇦 Canada | Northlight Systems | `/ca/company` | `northlight-ca` | `admin@northlight-ca.demo` | `/careers/northlight-ca/northlight-ca` |
| 🇦🇺 Australia | Wattle Digital | `/au/company` | `wattle-au` | `admin@wattle-au.demo` | `/careers/wattle-au/wattle-au` |
| 🇳🇿 New Zealand | Kauri Cloudworks | `/nz/company` | `kauri-nz` | `admin@kauri-nz.demo` | `/careers/kauri-nz/kauri-nz` |
| 🇦🇪 UAE | Falcon Gate Group | `/ae/company` | `falcongate-ae` | `admin@falcongate-ae.demo` | `/careers/falcongate-ae/falcongate-ae` |
| 🇸🇦 Saudi Arabia | Qimam Talent Co | `/sa/company` | `qimam-sa` | `admin@qimam-sa.demo` | `/careers/qimam-sa/qimam-sa` |
| 🇶🇦 Qatar | Pearl Bay Services | `/qa/company` | `pearlbay-qa` | `admin@pearlbay-qa.demo` | `/careers/pearlbay-qa/pearlbay-qa` |
| 🇧🇭 Bahrain | Manama Bridge Solutions | `/bh/company` | `manamabridge-bh` | `admin@manamabridge-bh.demo` | `/careers/manamabridge-bh/manamabridge-bh` |
| 🇰🇼 Kuwait | Gulf Anchor Trading | `/kw/company` | `gulfanchor-kw` | `admin@gulfanchor-kw.demo` | `/careers/gulfanchor-kw/gulfanchor-kw` |
| 🇴🇲 Oman | Muscat Peak Technologies | `/om/company` | `muscatpeak-om` | `admin@muscatpeak-om.demo` | `/careers/muscatpeak-om/muscatpeak-om` |
| 🇪🇺 EU (member-state) | Europa Talent Partners | `/eu/company` | `europa-eu` | `admin@europa-eu.demo` | `/careers/europa-eu/europa-eu` |

Each tenant carries its jurisdiction's currency and timezone, operates in its
own country only (location pickers pin to it), and has:

- **Operating cities** provisioned (Settings → Operating cities) — e.g.
  Meridian: Pune, Bengaluru, Mumbai; Blue Harbor: Austin, San Francisco.
- **2–3 published jobs** in real local cities with work mode, experience
  bands, skills, and a 3-round interview plan.
- **2 applications** from locally-named candidates (structured location,
  resume file, experience/education), submitted through the real public
  careers apply flow — so the whole pipeline (screening → interviews → offer)
  can be demoed immediately.
- EU note: the geo master has no "EU" country (member-state scoped), so the
  Europa tenant's job locations are free text (Berlin, Amsterdam).

Original segment demos (acme, talentbridge, staffpro, jane-recruits, sumaya)
are unchanged — see `URLS-AND-LOGINS.md`.
