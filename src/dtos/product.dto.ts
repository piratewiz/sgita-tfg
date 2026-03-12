export interface CreateProductDto {
    name: string;
    category: string;
    codeProduct: string;
    unityType: 'kg' | 'ud' | 'liter' | 'box' | 'pack';
    quantity: number;
    minStock: number;
    expirationDate: string;
    providorId: string;
}

export interface UpdateProductDto {
    name?: string;
    category?: string;
    codeProduct?: string;
    unityType?: 'kg' | 'ud' | 'liter' | 'box' | 'pack';
    quantity?: number;
    minStock?: number;
    expirationDate?: string;
    providorId?: string;
}