import AhApiClient from "../clients/AhApiClient";
import AldiApiClient from "../clients/AldiApiClient";
import DirkApiClient from "../clients/DirkApiClient";
import HoogvlietApiClient from "../clients/HoogvlietApiClient";
import JumboApiClient from "../clients/JumboApiClient";
import LidlApiClient from "../clients/LidlApiClient";
import PlusApiClient from "../clients/PlusApiClient";
import ApiClient from "../clients/ApiClient";
import { serverLogger } from "./Logger";

export function getSupermarketClient(name: string): ApiClient {
  switch (name) {
    case "Albert Heijn":
      return new AhApiClient();
    case "Aldi":
      return new AldiApiClient();
    case "Dirk":
      return new DirkApiClient();
    case "Hoogvliet":
      return new HoogvlietApiClient();
    case "Jumbo":
      return new JumboApiClient();
    case "Lidl":
      return new LidlApiClient();
    case "PLUS":
      return new PlusApiClient();
    default:
      serverLogger.error(
        "Supermarket client not found for: " + name
      );
      process.exit(1);
  }
}
