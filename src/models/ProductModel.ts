import ProductCategoryModel from "./ProductCategoryModel";

class ProductModel {
    id: number;
    name?: string;
    category?: number;

    constructor(name: string, category: number, id: number) {
        this.id = id;
        this.name = name;
        this.category = category; // Index of ProductCategoryModel
    }
}

export default ProductModel;
