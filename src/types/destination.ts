export interface Destination {
  protocol: "http" | "https";
  host: string;
  pathnames: string[];
  queries: string[];
  status: number;
  port?: number;
}

export function createDestination(): Destination {
  return {
    protocol: "http",
    host: "",
    pathnames: [],
    queries: [],
    status: 301,
  };
}
