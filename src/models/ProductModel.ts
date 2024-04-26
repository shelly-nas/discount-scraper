class ProductModel {
    id: number;
    name: string;
    category?: number;
    supermarket: string;

    constructor(id: number, name: string, category: number, supermarket: string) {
        this.id = id;
        this.name = name;
        this.category = category; // Index of ProductCategoryModel
        this.supermarket = supermarket;
    }
}

export default ProductModel;
