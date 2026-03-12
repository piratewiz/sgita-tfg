export interface CreateProviderDto {
    name: string;
    contact: string;
    phoneNumber: string;
    email: string;
}

export interface UpdateProviderDto {
    name?: string;
    contact?: string;
    phoneNumber?: string;
    email?: string;
    active?: boolean;
}