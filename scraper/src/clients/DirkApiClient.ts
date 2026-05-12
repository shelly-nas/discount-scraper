import axios from "axios";
import ApiClient from "./ApiClient";
import { scraperLogger } from "../utils/Logger";

const GRAPHQL_URL = "https://web-gateway.dirk.nl/graphql";
const GRAPHQL_HEADERS = {
  "Content-Type": "application/json",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Origin: "https://www.dirk.nl",
  Referer: "https://www.dirk.nl/",
};

interface DirkDepartment {
  id: number;
  description: string;
}

interface DirkOffer {
  offerId: number;
  headerText: string;
  subText: string | null;
  promotionText: string | null;
  normalPrice: number;
  offerPrice: number;
  startDate: string;
  endDate: string;
  type: string;
  packaging: string | null;
}

const OFFERS_QUERY = `
  query listOffersByDepartment($department: Int!) {
    listOffers(department: $department) {
      currentOffers {
        offerId
        headerText
        subText
        promotionText
        normalPrice
        offerPrice
        startDate
        endDate
        type
        packaging
      }
    }
  }
`;

async function gql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const response = await axios.post(
    GRAPHQL_URL,
    { query, variables },
    { headers: GRAPHQL_HEADERS }
  );
  if (response.data.errors) {
    throw new Error(
      `GraphQL error: ${response.data.errors.map((e: { message: string }) => e.message).join(", ")}`
    );
  }
  return response.data.data as T;
}

class DirkApiClient extends ApiClient {
  public name = "Dirk";

  constructor() {
    super();
    scraperLogger.debug(`Created a '${this.name}' API Client instance.`);
  }

  private async fetchDepartments(): Promise<DirkDepartment[]> {
    const data = await gql<{ listDepartments: { departments: DirkDepartment[] } }>(
      "{ listDepartments { departments { id description } } }"
    );
    return data.listDepartments.departments;
  }

  private async fetchOffersByDepartment(departmentId: number): Promise<DirkOffer[]> {
    const data = await gql<{
      listOffers: { currentOffers: DirkOffer[] };
    }>(OFFERS_QUERY, { department: departmentId });
    return data.listOffers?.currentOffers ?? [];
  }

  public async fetchDiscounts(): Promise<{
    discounts: IProductDiscountDetails[];
    expireDate: string;
  }> {
    scraperLogger.info(`Fetching Dirk discounts via GraphQL API`);

    const departments = await this.fetchDepartments();
    scraperLogger.info(`Found ${departments.length} departments`);

    const discounts: IProductDiscountDetails[] = [];
    let latestExpireDate = "";

    for (const dept of departments) {
      const offers = await this.fetchOffersByDepartment(dept.id);
      if (offers.length === 0) continue;

      scraperLogger.info(
        `Department '${dept.description}': ${offers.length} offers`
      );

      for (const offer of offers) {
        const specialDiscount = [offer.subText, offer.promotionText]
          .filter(Boolean)
          .join(" ")
          .trim();

        const productName = [offer.headerText, offer.packaging]
          .filter(Boolean)
          .join(" ")
          .trim();

        discounts.push({
          name: productName,
          originalPrice: offer.normalPrice,
          discountPrice: offer.offerPrice,
          specialDiscount,
          category: dept.description,
          supermarket: this.name,
          expireDate: offer.endDate,
        });

        // Track latest expire date across all offers
        if (!latestExpireDate || offer.endDate > latestExpireDate) {
          latestExpireDate = offer.endDate;
        }
      }
    }

    scraperLogger.info(
      `Total Dirk discounts fetched: ${discounts.length}, expire: ${latestExpireDate}`
    );

    return { discounts, expireDate: latestExpireDate };
  }
}

export default DirkApiClient;
