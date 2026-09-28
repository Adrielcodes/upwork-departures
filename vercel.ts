import type { VercelConfig } from "@vercel/config/v1";

export const config: VercelConfig = {
  framework: "nextjs",
  // Pull fresh proposal data from Upwork once a day (the Hobby plan limit)
  crons: [{ path: "/api/sync", schedule: "0 12 * * *" }],
};
