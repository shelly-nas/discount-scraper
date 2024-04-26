import JsonDataContext from "../data/JsonDataContext";
import ProductCategoryModel from "../models/ProductCategoryModel";
import { DiscountModel } from "../models/DiscountModel";
import ProductModel from "../models/ProductModel";

class DiscountController {
    private context: JsonDataContext<DiscountModel>;

    constructor(context: JsonDataContext<DiscountModel>) {
        this.context = context;
    }

    async getDiscounts(): Promise<DiscountModel[]> {
        return await this.context.load();
    }

    async addDiscount(productId: number, originalPrice: number, discountPrice: number, specialDiscount: string): Promise<void> {
        const discounts = await this.context.load();
        // Simulate fetching the product from some repository
        const productCategory = new ProductCategoryModel("Sample Category", 1);
        const product = new ProductModel("Sample Product", 0, productId);
        const discount = new DiscountModel(0, originalPrice, discountPrice, specialDiscount);
        discounts.push(discount);
        await this.context.save(discounts);
    }

    public static deserializeDiscount(data: any): DiscountModel {
        const productCategory = new ProductCategoryModel(data.product.category.name, data.product.category.id);
        const product = new ProductModel(data.product.name, 0, data.product.id);
        return new DiscountModel(0, data.originalPrice, data.discountPrice, data.specialDiscount, data.id);
    }
}

export default DiscountController;
