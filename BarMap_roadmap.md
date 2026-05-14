# BarMap — How to actually build this app

This is the straight-up guide for going from the prototype HTML to a real product. Written for someone non-technical, but every step is doable.

---

## What you have right now

A single HTML file that opens in any browser. ~70 real calisthenics parks across the island of Ireland, with satellite imagery, search, posts, meetups, leaderboards, profiles.

**Limits of the prototype:**
- All data resets on refresh — no real database
- Anyone can "post" but it isn't saved
- No login, no photos, no notifications
- Park coordinates are a mix: ~23 are exact (OpenStreetMap-verified, shown with green pins), the rest are approximate by neighborhood and need to be sanity-checked against satellite view

That's fine for showing the idea to friends and getting feedback. The next step is making it real.

---

## The big decisions, in order

### 1. Web app or mobile app?

**Recommendation: Progressive Web App (PWA) first.** A PWA is a website that installs to a phone like an app, works offline, sends push notifications, accesses the camera, and uses GPS. You build it once and it works on iPhone, Android, and desktop. No App Store approval, no waiting.

A native iOS/Android app is the eventual goal but it's 3-5x the work and cost. Most map/social apps (Strava-lite, Komoot, AllTrails) launched as PWAs first. You can wrap a PWA into a native shell later using something like Capacitor.

### 2. The stack (what to actually use)

For someone non-technical or learning, this is the cheapest, fastest path:

| Piece | Pick | Why |
|---|---|---|
| Frontend framework | **Next.js + React** | Same language as the prototype, huge community, deploy to Vercel free tier |
| Map | **MapLibre GL JS + MapTiler** | Better-looking than Leaflet, free up to 100k map loads/month. Google Maps gets expensive fast. |
| Backend (database, auth, storage) | **Supabase** | One service for login, database, photo uploads, real-time updates. Free tier covers thousands of users. |
| Park data | **OpenStreetMap (Overpass API)** | Free, community-maintained, queryable. The verified pins in your prototype came from this. |
| Hosting | **Vercel** | Free for small apps. Connects to GitHub — push code, it deploys. |
| Domain | Namecheap, ~€10/year | barmap.ie or similar |

**Total cost to launch:** roughly €10/year for the domain. Everything else is free until you have real traction.

### 3. The minimum viable product (4-6 weeks of focused work)

Strip the feature list to the bone:

1. **Map with verified parks** — pull live from OSM, no manual data entry. (1 week)
2. **Login** (email or Google) — Supabase handles it. (2 days)
3. **Posts per park** — users can post text + 1 photo. (1 week)
4. **One challenge per park** with a manual leaderboard. (3-4 days)
5. **"Add a park" submissions** that go into a moderation queue you approve. (3-4 days)

Skip for v1: meetups, profiles with badges, follows, comments, DMs. Add those once people are actually using it.

### 4. Getting the data right

For your "every park in the world" ambition, OpenStreetMap is the answer. There are roughly **15,000 outdoor fitness stations** tagged on OSM globally. They are queried with the Overpass API like this:

```
[out:json];
node["leisure"="fitness_station"](around:50000, LAT, LNG);
out;
```

That returns every fitness station within 50 km of any point. **This is the same data that powers calisthenics-hub.com and calibase.org** — they're not doing magic, they're querying OSM and adding a frontend.

For parks that aren't on OSM yet, you have two options:
- **Crowdsource it** — users submit, you moderate. This is the long-term play.
- **Improve OSM directly** — adding a fitness station to OpenStreetMap takes 5 minutes and benefits every app on the planet. If you build community, get them adding to OSM too.

**Important: no, I can't (and neither can anyone) just look at satellite imagery and automatically detect pull-up bars.** Computer vision research exists for this but it's an unsolved problem in practice. OSM crowdsourcing is what every map-based fitness app uses.

### 5. The realistic timeline

| Phase | Time | What ships |
|---|---|---|
| 0. Validate | 1-2 weeks | Share the prototype with 20 calisthenics people. Listen. |
| 1. MVP | 4-6 weeks | Real backend, login, persistent posts, OSM data live |
| 2. Beta | 2-3 months | Photos, meetups, push notifications, mobile polish, ~500 users |
| 3. Native shell | 1-2 months | Wrap PWA with Capacitor, publish to App Store + Play Store |
| 4. Expand globally | Ongoing | Switch from "Ireland" filter to worldwide |

### 6. Your honest options for actually building it

**a) Learn to build it yourself.** Realistic if you have 5-10 hours/week and patience. Start with freeCodeCamp's React course, then Supabase docs. You'd ship MVP in 3-4 months. The advantage: you understand the product deeply and can iterate fast.

**b) Use AI coding tools.** Tools like Cursor, Replit Agent, Lovable, v0.dev, or this very assistant can generate working code if you can specify what you want. Best for someone willing to learn but not become a full developer. Realistic timeline: 6-10 weeks for MVP if you're focused.

**c) Hire a developer.** A solo full-stack dev in Ireland or Eastern Europe will build the MVP for €5k-€15k. Find one on Upwork, Toptal, or via the local calisthenics community. You stay in charge of product decisions.

**d) Find a technical co-founder.** Hardest to find but cheapest if it works. Post in r/IrishStartups, IndieHackers, or local startup events.

### 7. What to do this week

1. Open the prototype on your phone. Walk around your local park. Notice what's missing.
2. Show it to 10 calisthenics friends. Ask: *"Would you use this every week? What's the one feature that would make you use it daily?"*
3. Pick one feature from their answers. That's your real v1.
4. Decide which build path (a, b, c, d above) fits your situation.
5. If you want my help on next steps — bring the answers back here and I'll help you scope the MVP build, write a brief for a developer, or start generating the actual code.

---

## A few things I'd push back on

- **Don't try to launch globally on day one.** Strava started in San Francisco. Tinder started at USC. A tight community of 200 Dubliners is way more valuable than 200,000 cold "users" worldwide.
- **Don't over-build before you have users.** Leaderboards are fun. So are challenges, badges, follows. But if no one's checking the app twice a week, none of that matters. Posts + photos + map is enough to start.
- **Don't pay for Google Maps.** It costs money the moment you have real users. MapLibre + MapTiler is the standard for indie apps now.

---

**Bottom line:** the prototype proves the idea works visually. Real product needs a backend (Supabase), real map tiles (MapTiler), and 4-6 weeks of focused build. Pick your build path, validate with 10 real calisthenics people, and ship the smallest possible version.

Bring questions back. Happy to draft the developer brief, scope the MVP module by module, or start writing the real React code with you.
