// registrar paquete manualmente
export interface RegisterBatchDto {
    batchCode: string;
    productId: string;
    unitQuantity: number;
    expireDate: string; // será en formato ISO
}


// registrar varios paquetes de una vez
export interface RegisterLotsDto {
    lots: RegisterBatchDto[];
    // registrar varios paquetes a la vez
}