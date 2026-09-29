"use client";

import { useSyncExternalStore } from "react";

export type Lang = "en" | "sq";

const LANG_KEY = "wander.lang";
const listeners = new Set<() => void>();

// The chosen language lives in localStorage, exposed as an external store so
// every component re-renders when it's switched. English until chosen.
export function getLang(): Lang {
  try {
    return localStorage.getItem(LANG_KEY) === "sq" ? "sq" : "en";
  } catch {
    return "en";
  }
}

export function setLang(lang: Lang) {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {}
  document.documentElement.lang = lang;
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

export const useLang = () => useSyncExternalStore(subscribe, getLang, () => "en" as const);
export const useT = () => DICT[useLang()];

type Step = { title: string; body: string };

const en = {
  brand: "Aventurierët",
  language: "Language",
  takeTour: "Take the tour",

  home: {
    heading1: "Your whole trip,",
    heading2: "planned like a local.",
    intro:
      "Tell us how long you're staying and what you love. Aventurierët builds a day-by-day plan with hidden gems, realistic timing, and everything you'd otherwise forget: airport transfers, closures, tipping, what to pack.",
    features: [
      ["💎", "Hidden gems, not just the top-10 list"],
      ["🗺️", "Every stop on a map, routed so you don't zig-zag"],
      ["✨", "Rain? Tired? Re-plan any day in one tap"],
      ["▶", "Paste a TikTok and its places land on your map"],
      ["🎟️", "Book tickets, tables, stays and rides from the plan"],
    ] as [string, string][],
    yourTrips: "Your trips",
    deleteTrip: "Delete trip",
    lostConnection: "Lost connection to the planner.",
    stopped: "The planner stopped unexpectedly.",
    unfinishedDays: "Days that didn't finish can be planned individually.",
  },

  days: (n: number) => `${n} ${n === 1 ? "day" : "days"}`,
  dayN: (n: number) => `Day ${n}`,

  form: {
    steps: ["Where & when", "Who's going", "Your vibe", "Fine print"],
    whereTo: "Where to?",
    wherePlaceholder: "Lisbon, Kyoto, the Amalfi Coast…",
    arriving: "Arriving",
    staying: "Staying",
    whosGoing: "Who's going?",
    travelers: {
      solo: ["Solo", "Just me"],
      couple: ["Couple", "Two of us"],
      friends: ["Friends", "The crew"],
      family: ["Family", "With kids"],
    },
    kidsAges: "Kids' ages",
    kidsPlaceholder: "e.g. 4 and 9",
    mobility: "Anything about getting around?",
    mobilityPlaceholder: "e.g. stroller, bad knee, no long walks (optional)",
    pace: "Pace",
    paces: {
      chill: ["Chill", "Long lunches, naps"],
      balanced: ["Balanced", "See a lot, rest a bit"],
      packed: ["Packed", "Sleep when home"],
    },
    budget: "Budget",
    budgets: {
      budget: ["Smart", "Street food & free gems"],
      mid: ["Comfortable", "Treat yourself sometimes"],
      luxury: ["Splurge", "Best of the best"],
    },
    love: "What do you love?",
    interests: {} as Record<string, string>,
    mustDo: "Must do or see",
    mustDoPlaceholder: "That rooftop bar from TikTok, a cooking class, sunset somewhere special…",
    skip: "Skip",
    skipPlaceholder: "Tourist traps, museums, clubs…",
    food: "Food needs",
    foodPlaceholder: "Vegetarian, halal, no seafood…",
    arrival: "Arrival & departure",
    arrivalPlaceholder: "e.g. land at LIS 14:00, fly out 18:00 on the last day",
    back: "← Back",
    next: "Next →",
    submit: "✨ Plan my trip",
  },

  generating: {
    messages: [
      "Picking the right neighbourhood for each day…",
      "Checking which museums close on your dates…",
      "Working out how you get from the airport…",
      "Finding the best area to base yourself…",
      "Asking the locals where they actually eat…",
      "Timing the big sights for when the queues are short…",
    ],
    planning: (d: string) => `Planning ${d}`,
    sketching: "Sketching the shape of your trip. Days will appear one by one.",
  },

  invite: {
    title: "Aventurierët is invite-only for now",
    body: "Enter the code you were given to start planning.",
    placeholder: "Invite code",
    continue: "Continue",
  },

  shared: {
    note: "Someone shared this trip with you.",
    planOwn: "Plan my own",
    makeYours: "✨ Make it yours",
  },

  trip: {
    allTrips: "← All trips",
    stats: ["days", "places", "hidden gems", "pp / day"],
    tabs: { days: "🗓️ Itinerary", essentials: "🧳 Know before you go", stay: "🏨 Where to stay" },
    addTikTok: "▶ Add from TikTok",
    creatingLink: "Creating link…",
    updateShare: "🔗 Update & share",
    share: "🔗 Share trip",
    linkCopied: "✓ Link copied!",
    yourLink: "Your trip link",
    linkNote: "Anyone with the link can view this trip. If you edit it later, tap Share again to update the link.",
    linkError: "Couldn't create the link. Try again.",
    close: "Close",
    savedFromTikTok: (n: number) => `📌 Saved from TikTok (${n})`,
    addToDay: (n: number) => `+ Day ${n}`,
    remove: (name: string) => `Remove ${name}`,
    changeDay: "✨ Change this day",
    tweaks: ["🌧️ It's raining", "😴 More relaxed", "💸 Cheaper", "💎 More local", "🌙 Night owl"],
    tweakPlaceholder: "Or say anything… “add a beach”",
    energy: { light: "🟢 Easy day", moderate: "🟡 Moderate", intense: "🔴 Big day" },
    ifRains: "If it rains: ",
    planningDay: (n: number) => `Planning day ${n}…`,
    replanningDay: (n: number) => `Re-planning day ${n}…`,
    notPlanned: "This day hasn't been planned yet.",
    planThisDay: "✨ Plan this day",
    dragHint: "Drag ⋮⋮ to reorder — times update automatically.",
    othersBuilding: " Other days are still being planned.",
    replanLost: "Lost connection while re-planning. Try again.",
    replanFailed: "Couldn't re-plan this day. Try again.",
    gatheringTips: "🧭 Gathering local tips for your dates…",
    tipsFailed: "These tips couldn't be loaded for this trip.",
    baseIn: "Base yourself in",
    alsoGood: "Also good: ",
    seeStays: (area: string) => `See stays in ${area} for your dates ↗`,
    fromAirport: "Getting there from the airport",
    workingOut: "Working it out…",
    notAvailable: "Not available.",
    essentials: {
      arrival: "Arrival",
      gettingAround: "Getting around",
      money: "Money & tipping",
      connectivity: "Staying connected",
      power: "Power",
      weather: "Weather",
      safety: "Safety",
      etiquette: "Etiquette",
    },
    headsUp: "⚠️ Heads up for your dates",
    pack: "🧳 Pack this",
    phrases: "🗣️ Say it like a local",
  },

  stop: {
    hiddenGem: "💎 Hidden gem",
    fromTikTok: "▶ From TikTok",
    bookAhead: "Book ahead",
    approx: "≈ location",
    approxTitle: "We couldn't confirm this exact spot on the map — double-check before you go",
    whyYou: "Why you: ",
    insiderTip: "💡 Insider tip: ",
    directions: "Directions",
    ride: "🚕 Ride here",
    reviews: "Reviews & hours",
    watchTikTok: "▶ Watch your TikTok",
    seeTikTok: "▶ See it on TikTok",
    drag: "Drag to reorder",
    booking: { tickets: "Get tickets", book: "Book", reserve: "Reserve" },
  },

  tiktok: {
    title: "Add from TikTok",
    subtitle: "Paste a video link. We'll find the places and pin them on your trip.",
    reading: "Reading…",
    find: "Find",
    status: {
      found: "✓ On the map",
      approx: "≈ Neighbourhood only",
      not_found: "Not found on the map",
      other_city: "Different city",
    },
    alreadyIn: "Already in your trip",
    whichPlace: "Which place is this?",
    correctName: "Correct name or address…",
    typeName: "Type the place's name…",
    search: "Search",
    saveForLater: "📌 Save for later",
    addToDay: (n: number) => `Add to Day ${n}`,
    save: (n: number) => `Save ${n} ${n === 1 ? "place" : "places"}`,
    add: (n: number) => `Add ${n} ${n === 1 ? "place" : "places"}`,
    lostConnection: "Lost connection. Try again.",
    wentWrong: "Something went wrong.",
  },

  notFound: {
    title: "This trip wandered off",
    body: "The link may be mistyped, or the shared trip has expired. You can plan a fresh one in about a minute.",
    cta: "✨ Plan a trip",
  },

  tour: {
    next: "Next",
    back: "Back",
    skip: "Skip tour",
    done: "Let's go!",
    home: {
      welcome: {
        title: "Welcome to Aventurierët 👋",
        body: "Your personal trip planner. This quick tour shows you everything the app can do — it takes under a minute.",
      },
      lang: {
        title: "English or Shqip",
        body: "Switch the language anytime. New trips are written in the language you pick.",
      },
      form: {
        title: "Plan in 4 quick steps",
        body: "Tell us where and when, who's going, your pace, budget and interests, then any must-dos, things to skip, food needs and flight times. Tap ✨ Plan my trip at the end — it takes about a minute.",
      },
      features: {
        title: "What you get",
        body: "A day-by-day plan with hidden gems, every stop on a map, one-tap re-planning, TikTok imports and booking links for tickets, tables, stays and rides.",
      },
      trips: {
        title: "Your trips",
        body: "Every trip you plan is saved in this browser. Open one anytime, or tap ✕ to delete it.",
      },
      help: {
        title: "Need a refresher?",
        body: "Tap here to replay this tour. Once your first trip is ready, we'll show you around the plan too.",
      },
    } satisfies Record<string, Step>,
    trip: {
      header: {
        title: "Your trip at a glance",
        body: "The title, a short summary and the key numbers: days, places, hidden gems and a daily budget per person.",
      },
      tabs: {
        title: "Three sections",
        body: "🗓️ Itinerary is the day-by-day plan. 🧳 Know before you go covers arrival, money, safety, weather, packing and local phrases. 🏨 Where to stay suggests the best area and links to stays for your dates.",
      },
      days: {
        title: "Pick a day",
        body: "Switch between days here. A spinning ◌ means that day is still being planned — you can already browse the finished ones.",
      },
      map: {
        title: "Live map",
        body: "Numbered pins follow the day's route in order. Gold pins are hidden gems and 📌 pins are places you saved from TikTok. Tap a pin to jump to that stop.",
      },
      change: {
        title: "Change this day",
        body: "Raining? Tired? Want it cheaper or more local? Pick a quick option or type anything, and only this day gets re-planned.",
      },
      stops: {
        title: "Every stop, timed",
        body: "Tap a stop to see why it suits you, an insider tip, and buttons to book, get directions, call a ride, read reviews or watch it on TikTok. Drag ⋮⋮ to reorder (times update automatically) or tap ✕ to remove a stop.",
      },
      tiktok: {
        title: "Add from TikTok",
        body: "Paste a TikTok video link and we find the places in it. Add them straight to a day or save them for later.",
      },
      share: {
        title: "Share your trip",
        body: "Create a link anyone can open. Friends can view the plan and copy it into their own trips.",
      },
      help: {
        title: "That's everything!",
        body: "Replay this tour anytime from here. Have a great trip! 🧭",
      },
    } satisfies Record<string, Step>,
  },
};

type Dict = typeof en;

const sq: Dict = {
  brand: "Aventurierët",
  language: "Gjuha",
  takeTour: "Shiko udhëzuesin",

  home: {
    heading1: "Gjithë udhëtimi yt,",
    heading2: "i planifikuar si nga një vendas.",
    intro:
      "Na trego sa ditë qëndron dhe çfarë të pëlqen. Aventurierët ndërton një plan ditë pas dite me perla të fshehura, orare realiste dhe gjithçka që përndryshe do ta harroje: transferta nga aeroporti, ditë mbylljeje, bakshishe, çfarë të marrësh me vete.",
    features: [
      ["💎", "Perla të fshehura, jo vetëm lista top-10"],
      ["🗺️", "Çdo ndalesë në hartë, me rrugë pa zigzage"],
      ["✨", "Bie shi? Je i lodhur? Riplanifiko çdo ditë me një prekje"],
      ["▶", "Ngjit një TikTok dhe vendet e tij dalin në hartën tënde"],
      ["🎟️", "Rezervo bileta, tavolina, akomodime dhe udhëtime nga plani"],
    ],
    yourTrips: "Udhëtimet e tua",
    deleteTrip: "Fshi udhëtimin",
    lostConnection: "Lidhja me planifikuesin u ndërpre.",
    stopped: "Planifikuesi ndaloi papritur.",
    unfinishedDays: "Ditët që nuk përfunduan mund të planifikohen një nga një.",
  },

  days: (n) => `${n} ditë`,
  dayN: (n) => `Dita ${n}`,

  form: {
    steps: ["Ku & kur", "Kush vjen", "Stili yt", "Detajet"],
    whereTo: "Për ku?",
    wherePlaceholder: "Lisbonë, Kioto, Bregu i Amalfit…",
    arriving: "Mbërritja",
    staying: "Qëndrimi",
    whosGoing: "Kush vjen?",
    travelers: {
      solo: ["Vetëm", "Vetëm unë"],
      couple: ["Çift", "Ne të dy"],
      friends: ["Shokë", "I gjithë grupi"],
      family: ["Familje", "Me fëmijë"],
    },
    kidsAges: "Moshat e fëmijëve",
    kidsPlaceholder: "p.sh. 4 dhe 9",
    mobility: "Diçka për lëvizjen?",
    mobilityPlaceholder: "p.sh. karrocë fëmijësh, gju i lënduar, pa ecje të gjata (opsionale)",
    pace: "Ritmi",
    paces: {
      chill: ["Qetë", "Dreka të gjata, pushime"],
      balanced: ["Mesatar", "Shih shumë, pusho pak"],
      packed: ["Plot", "Do flesh kur të kthehesh"],
    },
    budget: "Buxheti",
    budgets: {
      budget: ["Kursimtar", "Ushqim rruge & perla falas"],
      mid: ["Komod", "Kënaqu herë pas here"],
      luxury: ["Luks", "Më të mirat e më të mirave"],
    },
    love: "Çfarë të pëlqen?",
    interests: {
      "Food & markets": "Ushqim & tregje",
      "Hidden gems": "Perla të fshehura",
      History: "Histori",
      "Art & museums": "Art & muze",
      "Nature & hikes": "Natyrë & ecje",
      Beaches: "Plazhe",
      Nightlife: "Jetë nate",
      "Coffee & cafés": "Kafe & kafene",
      Shopping: "Pazar",
      "Photography spots": "Vende për foto",
      Adventure: "Aventurë",
      "Wellness & spa": "Mirëqenie & spa",
      Architecture: "Arkitekturë",
      "Local culture": "Kulturë vendase",
    },
    mustDo: "Patjetër për të bërë ose parë",
    mustDoPlaceholder: "Ai bar në tarracë nga TikTok, një kurs gatimi, perëndimi i diellit diku të veçantë…",
    skip: "Shmang",
    skipPlaceholder: "Kurthe turistike, muze, klube…",
    food: "Nevoja ushqimore",
    foodPlaceholder: "Vegjetarian, hallall, pa fruta deti…",
    arrival: "Mbërritja & nisja",
    arrivalPlaceholder: "p.sh. mbërrij në TIA në 14:00, nisem në 18:00 ditën e fundit",
    back: "← Mbrapa",
    next: "Tjetra →",
    submit: "✨ Planifiko udhëtimin",
  },

  generating: {
    messages: [
      "Po zgjedhim lagjen e duhur për çdo ditë…",
      "Po kontrollojmë cilat muze mbyllen në datat e tua…",
      "Po llogarisim si të vish nga aeroporti…",
      "Po gjejmë zonën më të mirë për të qëndruar…",
      "Po pyesim vendasit ku hanë vërtet…",
      "Po caktojmë orarin e atraksioneve kur radhët janë të shkurtra…",
    ],
    planning: (d) => `Po planifikojmë ${d}`,
    sketching: "Po skicojmë formën e udhëtimit. Ditët do të shfaqen një nga një.",
  },

  invite: {
    title: "Aventurierët është vetëm me ftesë për momentin",
    body: "Shkruaj kodin që të është dhënë për të filluar planifikimin.",
    placeholder: "Kodi i ftesës",
    continue: "Vazhdo",
  },

  shared: {
    note: "Dikush e ndau këtë udhëtim me ty.",
    planOwn: "Planifiko timin",
    makeYours: "✨ Bëje tëndin",
  },

  trip: {
    allTrips: "← Të gjitha udhëtimet",
    stats: ["ditë", "vende", "perla", "për pers. / ditë"],
    tabs: { days: "🗓️ Itinerari", essentials: "🧳 Para se të nisesh", stay: "🏨 Ku të qëndrosh" },
    addTikTok: "▶ Shto nga TikTok",
    creatingLink: "Po krijohet lidhja…",
    updateShare: "🔗 Përditëso & ndaj",
    share: "🔗 Ndaj udhëtimin",
    linkCopied: "✓ Lidhja u kopjua!",
    yourLink: "Lidhja e udhëtimit",
    linkNote: "Kushdo me lidhjen mund ta shohë këtë udhëtim. Nëse e ndryshon më vonë, shtyp sërish Ndaj për të përditësuar lidhjen.",
    linkError: "Lidhja nuk u krijua dot. Provo përsëri.",
    close: "Mbyll",
    savedFromTikTok: (n) => `📌 Ruajtur nga TikTok (${n})`,
    addToDay: (n) => `+ Dita ${n}`,
    remove: (name) => `Hiq ${name}`,
    changeDay: "✨ Ndrysho këtë ditë",
    tweaks: ["🌧️ Bie shi", "😴 Më qetë", "💸 Më lirë", "💎 Më vendase", "🌙 Natë e gjatë"],
    tweakPlaceholder: "Ose thuaj çfarëdo… “shto një plazh”",
    energy: { light: "🟢 Ditë e lehtë", moderate: "🟡 Mesatare", intense: "🔴 Ditë e ngjeshur" },
    ifRains: "Nëse bie shi: ",
    planningDay: (n) => `Po planifikohet dita ${n}…`,
    replanningDay: (n) => `Po riplanifikohet dita ${n}…`,
    notPlanned: "Kjo ditë ende nuk është planifikuar.",
    planThisDay: "✨ Planifiko këtë ditë",
    dragHint: "Tërhiq ⋮⋮ për të ndryshuar radhën — oraret përditësohen automatikisht.",
    othersBuilding: " Ditët e tjera po planifikohen ende.",
    replanLost: "Lidhja u ndërpre gjatë riplanifikimit. Provo përsëri.",
    replanFailed: "Kjo ditë nuk u riplanifikua dot. Provo përsëri.",
    gatheringTips: "🧭 Po mbledhim këshilla vendase për datat e tua…",
    tipsFailed: "Këto këshilla nuk u ngarkuan dot për këtë udhëtim.",
    baseIn: "Qëndro në",
    alsoGood: "Gjithashtu mirë: ",
    seeStays: (area) => `Shih akomodime në ${area} për datat e tua ↗`,
    fromAirport: "Si të vish nga aeroporti",
    workingOut: "Po e llogarisim…",
    notAvailable: "Nuk është në dispozicion.",
    essentials: {
      arrival: "Mbërritja",
      gettingAround: "Lëvizja",
      money: "Para & bakshishe",
      connectivity: "Interneti",
      power: "Rryma",
      weather: "Moti",
      safety: "Siguria",
      etiquette: "Etiketa",
    },
    headsUp: "⚠️ Kujdes për datat e tua",
    pack: "🧳 Merr me vete",
    phrases: "🗣️ Thuaje si vendas",
  },

  stop: {
    hiddenGem: "💎 Perlë e fshehur",
    fromTikTok: "▶ Nga TikTok",
    bookAhead: "Rezervo paraprakisht",
    approx: "≈ vendndodhja",
    approxTitle: "Nuk e konfirmuam dot vendin e saktë në hartë — kontrolloje para se të shkosh",
    whyYou: "Pse për ty: ",
    insiderTip: "💡 Këshillë nga vendasit: ",
    directions: "Udhëzime",
    ride: "🚕 Merr një makinë",
    reviews: "Vlerësime & orare",
    watchTikTok: "▶ Shiko TikTok-un tënd",
    seeTikTok: "▶ Shihe në TikTok",
    drag: "Tërhiq për të ndryshuar radhën",
    booking: { tickets: "Merr bileta", book: "Rezervo", reserve: "Rezervo tavolinë" },
  },

  tiktok: {
    title: "Shto nga TikTok",
    subtitle: "Ngjit lidhjen e një videoje. Ne gjejmë vendet dhe i vendosim në udhëtimin tënd.",
    reading: "Po lexohet…",
    find: "Gjej",
    status: {
      found: "✓ Në hartë",
      approx: "≈ Vetëm lagjja",
      not_found: "Nuk u gjet në hartë",
      other_city: "Qytet tjetër",
    },
    alreadyIn: "Tashmë në udhëtimin tënd",
    whichPlace: "Cili vend është ky?",
    correctName: "Emri ose adresa e saktë…",
    typeName: "Shkruaj emrin e vendit…",
    search: "Kërko",
    saveForLater: "📌 Ruaje për më vonë",
    addToDay: (n) => `Shto te Dita ${n}`,
    save: (n) => `Ruaj ${n} ${n === 1 ? "vend" : "vende"}`,
    add: (n) => `Shto ${n} ${n === 1 ? "vend" : "vende"}`,
    lostConnection: "Lidhja u ndërpre. Provo përsëri.",
    wentWrong: "Diçka shkoi keq.",
  },

  notFound: {
    title: "Ky udhëtim humbi rrugën",
    body: "Lidhja mund të jetë shkruar gabim, ose udhëtimi i ndarë ka skaduar. Mund të planifikosh një të ri për rreth një minutë.",
    cta: "✨ Planifiko një udhëtim",
  },

  tour: {
    next: "Tjetra",
    back: "Mbrapa",
    skip: "Kalo udhëzuesin",
    done: "Fillojmë!",
    home: {
      welcome: {
        title: "Mirë se erdhe në Aventurierët 👋",
        body: "Planifikuesi yt personal i udhëtimeve. Ky udhëzues i shkurtër të tregon gjithçka që bën aplikacioni — zgjat më pak se një minutë.",
      },
      lang: {
        title: "English ose Shqip",
        body: "Ndrysho gjuhën kur të duash. Udhëtimet e reja shkruhen në gjuhën që zgjedh.",
      },
      form: {
        title: "Planifiko në 4 hapa të shpejtë",
        body: "Na trego ku dhe kur, kush vjen, ritmin, buxhetin dhe interesat, pastaj çfarë patjetër do të bësh, çfarë të shmangësh, nevojat ushqimore dhe oraret e fluturimit. Në fund shtyp ✨ Planifiko udhëtimin — zgjat rreth një minutë.",
      },
      features: {
        title: "Çfarë merr",
        body: "Një plan ditë pas dite me perla të fshehura, çdo ndalesë në hartë, riplanifikim me një prekje, import nga TikTok dhe lidhje rezervimi për bileta, tavolina, akomodime dhe udhëtime.",
      },
      trips: {
        title: "Udhëtimet e tua",
        body: "Çdo udhëtim që planifikon ruhet në këtë shfletues. Hape kur të duash, ose shtyp ✕ për ta fshirë.",
      },
      help: {
        title: "Të duhet një rikujtim?",
        body: "Shtyp këtu për ta parë sërish këtë udhëzues. Kur udhëtimi yt i parë të jetë gati, do të të tregojmë edhe planin.",
      },
    },
    trip: {
      header: {
        title: "Udhëtimi yt me një shikim",
        body: "Titulli, një përmbledhje e shkurtër dhe shifrat kryesore: ditët, vendet, perlat e fshehura dhe buxheti ditor për person.",
      },
      tabs: {
        title: "Tre seksione",
        body: "🗓️ Itinerari është plani ditë pas dite. 🧳 Para se të nisesh përfshin mbërritjen, paratë, sigurinë, motin, çfarë të marrësh me vete dhe fraza vendase. 🏨 Ku të qëndrosh sugjeron zonën më të mirë dhe lidhje për akomodime në datat e tua.",
      },
      days: {
        title: "Zgjidh një ditë",
        body: "Kalo nga një ditë te tjetra këtu. Një ◌ që rrotullohet do të thotë se ajo ditë po planifikohet ende — ditët e gatshme mund t'i shohësh që tani.",
      },
      map: {
        title: "Harta e gjallë",
        body: "Kunjat me numra ndjekin rrugën e ditës me radhë. Kunjat e arta janë perla të fshehura, ndërsa 📌 janë vende që ruajte nga TikTok. Shtyp një kunj për të shkuar te ajo ndalesë.",
      },
      change: {
        title: "Ndrysho këtë ditë",
        body: "Bie shi? Je i lodhur? E do më lirë ose më vendase? Zgjidh një opsion të shpejtë ose shkruaj çfarëdo, dhe riplanifikohet vetëm kjo ditë.",
      },
      stops: {
        title: "Çdo ndalesë, me orar",
        body: "Shtyp një ndalesë për të parë pse të përshtatet, një këshillë nga vendasit dhe butona për rezervim, udhëzime, makinë, vlerësime ose për ta parë në TikTok. Tërhiq ⋮⋮ për të ndryshuar radhën (oraret përditësohen vetë) ose shtyp ✕ për ta hequr.",
      },
      tiktok: {
        title: "Shto nga TikTok",
        body: "Ngjit lidhjen e një videoje TikTok dhe ne gjejmë vendet në të. Shtoji direkt te një ditë ose ruaji për më vonë.",
      },
      share: {
        title: "Ndaj udhëtimin",
        body: "Krijo një lidhje që mund ta hapë kushdo. Miqtë mund ta shohin planin dhe ta kopjojnë te udhëtimet e tyre.",
      },
      help: {
        title: "Kaq ishte!",
        body: "Shiko sërish këtë udhëzues kur të duash nga këtu. Udhëtim të mbarë! 🧭",
      },
    },
  },
};

const DICT: Record<Lang, Dict> = { en, sq };
