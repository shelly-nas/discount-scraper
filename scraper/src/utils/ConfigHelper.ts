import AhClient from "../clients/AhClient";
import DirkClient from "../clients/DirkClient";
import PlusClient from "../clients/PlusClient";
import SupermarketClient from "../clients/SupermarketClient";
import { serverLogger } from "./Logger";

export function getSupermarketClient(name: string): SupermarketClient {
  switch (name) {
    case "Albert Heijn":
      return new AhClient();
    case "Dirk":
      return new DirkClient();
    case "PLUS":
      return new PlusClient();
    default:
      serverLogger.error(
        "Descendent of Supermarket Client could not be found or instantiated."
      );
      process.exit(1);
  }
}
