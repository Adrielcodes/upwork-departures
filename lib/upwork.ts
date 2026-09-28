import { UPWORK_STATUSES } from "./stages";
import type { RawProposal } from "./sanitize";
import { readJson, writeJson } from "./store";

/**
 * Upwork OAuth 2.0 + GraphQL client.
 * Endpoints are from Upwork's official connectors (github.com/upwork/powerbi-connector).
 */

const AUTHORIZE_URL = "https://www.upwork.com/ab/account-security/oauth2/authorize";
const TOKEN_URL = "https://www.upwork.com/api/v3/oauth2/token";
const GRAPHQL_URL = "https://api.upwork.com/graphql";
const TOKENS_PATH = "tokens.json";
const PAGE_SIZE = 50;

interface Tokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

export function authorizeUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: env("UPWORK_CLIENT_ID"),
    redirect_uri: env("UPWORK_REDIRECT_URI"),
    state,
  });
  return `${AUTHORIZE_URL}?${params}`;
}

async function requestTokens(params: Record<string, string>): Promise<Tokens> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env("UPWORK_CLIENT_ID"),
      client_secret: env("UPWORK_CLIENT_SECRET"),
      ...params,
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Upwork token request failed (${res.status}): ${await res.text()}`);
  const body = (await res.json()) as { access_token: string; refresh_token: string; expires_in: number };
  const tokens = {
    accessToken: body.access_token,
    refreshToken: body.refresh_token,
    expiresAt: Date.now() + body.expires_in * 1000,
  };
  await writeJson(TOKENS_PATH, tokens);
  return tokens;
}

export function exchangeCode(code: string): Promise<Tokens> {
  return requestTokens({ grant_type: "authorization_code", code, redirect_uri: env("UPWORK_REDIRECT_URI") });
}

async function getAccessToken(): Promise<string> {
  const tokens = await readJson<Tokens>(TOKENS_PATH);
  if (!tokens) throw new Error("Upwork isn't connected yet. Visit /api/connect?key=… first.");
  // Refresh a few minutes early. Upwork may rotate the refresh token, so the new pair is saved.
  if (tokens.expiresAt - Date.now() > 5 * 60 * 1000) return tokens.accessToken;
  return (await requestTokens({ grant_type: "refresh_token", refresh_token: tokens.refreshToken })).accessToken;
}

async function graphql<T>(query: string, variables: Record<string, unknown>, token: string): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  if (process.env.UPWORK_TENANT_ID) headers["X-Upwork-API-TenantId"] = process.env.UPWORK_TENANT_ID;

  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });
  const body = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (!res.ok || body.errors?.length) {
    throw new Error(`Upwork GraphQL error: ${body.errors?.map((e) => e.message).join("; ") ?? res.status}`);
  }
  return body.data as T;
}

// Deliberately minimal: status, timestamps, category, and contract type. Nothing identifying.
const proposalsQuery = (withViewed: boolean) => `
  query Proposals($filter: VendorProposalFilter!, $sortAttribute: VendorProposalSortAttribute!, $pagination: Pagination!) {
    vendorProposals(filter: $filter, sortAttribute: $sortAttribute, pagination: $pagination) {
      edges {
        node {
          id
          status { status }
          auditDetails { createdDateTime modifiedDateTime }
          marketplaceJobPosting {
            classification { category { preferredLabel } }
            contractTerms { contractType }
          }
          ${withViewed ? "viewedByClient" : ""}
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

interface ProposalsPage {
  vendorProposals: {
    edges: {
      node: {
        id: string;
        status: { status: string };
        auditDetails: { createdDateTime: string; modifiedDateTime?: string | null };
        marketplaceJobPosting?: {
          classification?: { category?: { preferredLabel?: string } | null } | null;
          contractTerms?: { contractType?: string } | null;
        } | null;
        viewedByClient?: boolean | null;
      };
    }[];
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
  };
}

/** Fetches every proposal. Upwork requires a status filter, so we walk each status in turn. */
export async function fetchProposals(maxPerStatus = 500): Promise<RawProposal[]> {
  const token = await getAccessToken();
  let withViewed = true;
  const all: RawProposal[] = [];

  for (const status of UPWORK_STATUSES) {
    let after: string | undefined;
    for (let fetched = 0; fetched < maxPerStatus; fetched += PAGE_SIZE) {
      const variables = {
        filter: { status_eq: status },
        sortAttribute: { field: "CREATEDDATETIME", sortOrder: "DESC" },
        pagination: { first: PAGE_SIZE, ...(after ? { after } : {}) },
      };
      let page: ProposalsPage;
      try {
        page = await graphql<ProposalsPage>(proposalsQuery(withViewed), variables, token);
      } catch (err) {
        // viewedByClient is newer than the rest of the schema; drop it if this account's API doesn't have it
        if (withViewed && String(err).includes("viewedByClient")) {
          withViewed = false;
          page = await graphql<ProposalsPage>(proposalsQuery(false), variables, token);
        } else {
          throw err;
        }
      }

      for (const { node } of page.vendorProposals.edges) {
        all.push({
          id: node.id,
          status: node.status.status,
          createdDateTime: node.auditDetails.createdDateTime,
          modifiedDateTime: node.auditDetails.modifiedDateTime,
          category: node.marketplaceJobPosting?.classification?.category?.preferredLabel,
          contractType: node.marketplaceJobPosting?.contractTerms?.contractType,
          viewedByClient: withViewed ? (node.viewedByClient ?? null) : null,
        });
      }
      if (!page.vendorProposals.pageInfo.hasNextPage) break;
      after = page.vendorProposals.pageInfo.endCursor ?? undefined;
    }
  }
  return all;
}
