class ProductModel {
    id: number;
    name: string;
    category: string;
    supermarket: string;
    product_url: string | null;

    constructor(id: number, name: string, category: string, supermarket: string, product_url: string | null = null) {
        this.id = id;
        this.name = name;
        this.category = category;
        this.supermarket = supermarket;
        this.product_url = product_url;
    }
}

export default ProductModel;
