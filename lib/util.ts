export function crawl<T extends Map<string, unknown>>(
  path: string[],
  map: T,
): unknown {
  const [head, ...tail] = path;
  const steppedMapValue = map.get(head);
  if (steppedMapValue instanceof Map) {
    return crawl(tail, steppedMapValue);
  }
  return steppedMapValue;
}
