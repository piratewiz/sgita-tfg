export interface CreateIncidenceDto {
    orderId: string;
    providorId: string;
    type: 'invalid quantity' | 'expired product' | 'damaged' | 'other'
    description: string;
}

export interface UpdateIncidenceDto {
    status: 'open' | 'in progress' | 'resolved';
}