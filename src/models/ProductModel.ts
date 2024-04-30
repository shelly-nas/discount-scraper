class ProductModel {
    id: number;
    name: string;
    category: string;
    supermarket: string;

    constructor(id: number, name: string, category: string, supermarket: string) {
        this.id = id;
        this.name = name;
        this.category = category;
        this.supermarket = supermarket;
    }
}

export default ProductModel;
