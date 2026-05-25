export const parseUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    return {
      pathname: parsed.pathname,
      searchParams: parsed.searchParams,
      hostname: parsed.hostname,
    };
  } catch {
    return undefined;
  }
};
