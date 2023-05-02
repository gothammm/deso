interface URL {
  pathname: string;
  searchParams: Map<string, string>;
  hostname: string;
}

export const parseUrl = (url: string): URL | undefined => {
  const matchGroups = url.match(
    /^(https?|HTTPS?):\/\/([^\/\?#]+)(\/[^?\s]*)?(\?[^#\s]*)?(#[^\s]*)?$/,
  );

  if (!matchGroups) {
    return;
  }
  const [, , hostname, pathname, searchParamsPart] = matchGroups;

  const searchParams = new Map();

  return {
    hostname,
    pathname,
    searchParams: typeof searchParamsPart === "string"
      ? searchParamsPart
        .slice(1)
        .split("&")
        .reduce((acc, item) => {
          if (!item.includes("=")) {
            return acc;
          }
          const [key, value] = item.split("=");
          return acc.set(key, value);
        }, searchParams)
      : searchParams,
  };
};
