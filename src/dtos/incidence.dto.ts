export interface CreateIncidenceDto {
    orderId: string;
    providerId: string;
    type: 'incorrect quantity' | 'expired product' | 'damaged product' | 'other'
    description: string;
}

export interface UpdateIncidenceDto {
    status: 'open' | 'in progress' | 'resolved';
}