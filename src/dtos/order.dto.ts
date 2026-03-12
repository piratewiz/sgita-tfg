export interface OrderLineDto {
    productId: string;
    expectedQuantity: number;
}

export interface CreateOrderDto {
    orderNumber: string;
    providerId: string;
    truckId: string;
    previsionArrivalDate: string;
    lines: OrderLineDto[];
    documentUrl?: string;
}


export interface UpdateOrderStatusDto {
    status: 'pending' | 'received' | 'incident';
    realDateReception?: string;
}

export interface ReceptionLineDto {
    productId: string;
    receivedQuantity: number;
    scannedCode: string;
    expirationDate: string;
}

export interface ReceptionOrderDto {
    lines: ReceptionLineDto[];
}