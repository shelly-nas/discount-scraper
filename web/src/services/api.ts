import axios from "axios";
import {
  ProductWithDiscount,
  ConfigurationsStats,
  SupermarketStatus,
} from "../types";

const API_BASE_URL = "/api";

export const discountService = {
  async getAllDiscounts(): Promise<ProductWithDiscount[]> {
    try {
      const response = await axios.get(`${API_BASE_URL}/discounts`);
      return response.data;
    } catch (error) {
      console.error("Error fetching discounts:", error);
      throw error;
    }
  },

  async getDiscountsByFilter(
    filters: Record<string, string>
  ): Promise<ProductWithDiscount[]> {
    try {
      const response = await axios.get(`${API_BASE_URL}/discounts`, {
        params: filters,
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching filtered discounts:", error);
      throw error;
    }
  },
};

export const configurationsService = {
  async getStats(): Promise<ConfigurationsStats> {
    try {
      const response = await axios.get(`${API_BASE_URL}/dashboard/stats`);
      return response.data;
    } catch (error) {
      console.error("Error fetching configurations stats:", error);
      throw error;
    }
  },

  async getStatuses(): Promise<SupermarketStatus[]> {
    try {
      const response = await axios.get(`${API_BASE_URL}/dashboard/statuses`);
      return response.data;
    } catch (error) {
      console.error("Error fetching supermarket statuses:", error);
      throw error;
    }
  },

  async runScraper(supermarket: string): Promise<void> {
    try {
      await axios.post(`${API_BASE_URL}/scraper/run/${supermarket}`);
    } catch (error) {
      console.error(`Error running scraper for ${supermarket}:`, error);
      throw error;
    }
  },
};
