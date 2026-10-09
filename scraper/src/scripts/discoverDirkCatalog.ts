/**
 * Lists the queries of Dirk's GraphQL gateway, to find the one that returns
 * the full assortment (needed for a Dirk catalog client).
 *
 * The sandbox this was written in could not reach dirk.nl, so run it where
 * the scraper runs:
 *   docker exec discount-scraper-api node dist/scripts/discoverDirkCatalog.js
 */
import axios from "axios";

const GRAPHQL_URL = "https://web-gateway.dirk.nl/graphql";

const INTROSPECTION = `{
  __schema {
    queryType {
      fields {
        name
        args { name type { name kind ofType { name kind } } }
        type { name kind ofType { name kind } }
      }
    }
  }
}`;

function typeName(t: any): string {
  if (!t) return "?";
  if (t.kind === "NON_NULL") return `${typeName(t.ofType)}!`;
  if (t.kind === "LIST") return `[${typeName(t.ofType)}]`;
  return t.name ?? typeName(t.ofType);
}

async function main(): Promise<void> {
  const response = await axios.post(
    GRAPHQL_URL,
    { query: INTROSPECTION },
    {
      headers: {
        "Content-Type": "application/json",
        Origin: "https://www.dirk.nl",
        Referer: "https://www.dirk.nl/",
        "User-Agent": "Mozilla/5.0",
      },
    }
  );
  if (response.data.errors) {
    console.error("Introspection refused:", JSON.stringify(response.data.errors));
    process.exit(1);
  }
  const fields = response.data.data.__schema.queryType.fields as any[];
  for (const field of fields) {
    const args = field.args.map((a: any) => `${a.name}: ${typeName(a.type)}`).join(", ");
    const marker = /product|article|assortment|search|categor/i.test(field.name) ? "  <-- " : "";
    console.log(`${field.name}(${args}): ${typeName(field.type)}${marker}`);
  }
}

main().catch((error) => {
  console.error(error?.message ?? error);
  process.exit(1);
});
