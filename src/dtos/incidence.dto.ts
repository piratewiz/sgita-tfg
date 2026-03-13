export interface CreateIncidenceDto {
    orderId: string;
    providerId: string;
    type: 'invalid quantity' | 'expired product' | 'damaged' | 'other'
    description: string;
}

export interface UpdateIncidenceDto {
    status: 'open' | 'in progress' | 'resolved';
}