export function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function initials(fullName: string): string {
  return fullName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function formatInTimeZone(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(iso));
}

export function shortId(id: string): string {
  return id.slice(0, 8);
}

/** Returns the element after `current` in `items`, wrapping around at the end. */
export function cycleNext<T>(items: readonly T[], current: T): T {
  const idx = items.indexOf(current);
  return items[(idx + 1) % items.length] ?? items[0] ?? current;
}

/** Separates a Shop brand from its location, e.g. "Apex Charter MX · Hangar 1". */
const SHOP_NAME_SEPARATOR = "·";

/** The leading brand portion of a Shop name, dropping the " · Hangar 1" suffix. */
export function shortShopName(name: string): string {
  return (name.split(SHOP_NAME_SEPARATOR)[0] ?? name).trim();
}

/** The trailing location portion of a Shop name ("Hangar 1"), or null if none. */
export function shopLocationSuffix(name: string): string | null {
  const part = name.split(SHOP_NAME_SEPARATOR)[1];
  return part ? part.trim() : null;
}
