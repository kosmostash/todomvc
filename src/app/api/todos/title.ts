import { HTTPError } from "@kosmojs/core/errors";

/**
 * Trims a title the way the TodoMVC spec asks for, and refuses one that is
 * blank once trimmed - which `minLength: 1` alone cannot catch, since `" "`
 * is a perfectly valid one-character string.
 */
export const normalizeTitle = (title: string): string => {
  const normalized = title.trim();

  if (!normalized) {
    throw new HTTPError([400, "title: must not be blank"]);
  }

  return normalized;
};
