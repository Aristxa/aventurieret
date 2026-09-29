import type { Stop, Trip } from "./types";

// Deep links to partners. Swap in affiliate IDs here once you're approved
// (GetYourGuide partner_id, Booking.com aid, etc.) to earn commission.
const AFFILIATE = {
  getYourGuide: process.env.NEXT_PUBLIC_GYG_PARTNER_ID ?? "",
  booking: process.env.NEXT_PUBLIC_BOOKING_AID ?? "",
};

const enc = encodeURIComponent;

export function directionsLink(stop: Stop, mode: "walking" | "transit" | "driving" = "walking") {
  return `https://www.google.com/maps/dir/?api=1&destination=${stop.lat},${stop.lng}&travelmode=${mode}`;
}

export function mapsLink(stop: Stop, city: string) {
  return `https://www.google.com/maps/search/?api=1&query=${enc(`${stop.name} ${city}`)}`;
}

export function uberLink(stop: Stop) {
  const p = new URLSearchParams({
    action: "setPickup",
    pickup: "my_location",
    "dropoff[latitude]": String(stop.lat),
    "dropoff[longitude]": String(stop.lng),
    "dropoff[nickname]": stop.name,
  });
  return `https://m.uber.com/ul/?${p}`;
}

export function bookingLinkFor(stop: Stop, city: string): { kind: "tickets" | "book" | "reserve"; href: string } | null {
  switch (stop.bookingType) {
    case "activity":
    case "tickets": {
      const p = new URLSearchParams({ q: `${stop.name} ${city}` });
      if (AFFILIATE.getYourGuide) p.set("partner_id", AFFILIATE.getYourGuide);
      return { kind: stop.bookingType === "tickets" ? "tickets" : "book", href: `https://www.getyourguide.com/s/?${p}` };
    }
    case "restaurant":
      return { kind: "reserve", href: `https://www.google.com/maps/search/?api=1&query=${enc(`${stop.name} ${city} reservation`)}` };
    default:
      return null;
  }
}

export function staysLink(trip: Trip) {
  const start = new Date(trip.request.startDate + "T00:00:00");
  const end = new Date(start);
  end.setDate(end.getDate() + trip.request.days);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const adults = trip.request.travelers === "solo" ? 1 : trip.request.travelers === "friends" ? 3 : 2;
  const p = new URLSearchParams({
    ss: `${trip.plan.whereToStay.area}, ${trip.plan.destination.name}`,
    checkin: fmt(start),
    checkout: fmt(end),
    group_adults: String(adults),
  });
  if (AFFILIATE.booking) p.set("aid", AFFILIATE.booking);
  return `https://www.booking.com/searchresults.html?${p}`;
}

export function tiktokSearchLink(stop: Stop, city: string) {
  return `https://www.tiktok.com/search?q=${enc(`${stop.name} ${city}`)}`;
}
