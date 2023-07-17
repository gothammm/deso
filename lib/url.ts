import { URL_REGEX } from "./constants.ts";

interface URL {
  pathname: string;
  searchParams: Map<string, string>;
  hostname: string;
}

export const parseUrl = (url: string): URL | undefined => {
  const matchGroups = url.match(URL_REGEX);

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
