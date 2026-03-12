export interface CreateTruckDto {
    licencePlate: string;
    truckModel: string;
}

export interface UpdateTruckDto {
    licencePlate?: string;
    truckModel?: string;
    active?: boolean;
}
