/** Deep clone + freeze so returned records can never be mutated by callers (ADR-0002 immutability intent). */
export function deepFreezeClone<T>(value: T): T {
  const clone: T = JSON.parse(JSON.stringify(value));
  return deepFreeze(clone);
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value as Record<string, unknown>).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}
