export interface LoginDto {
    email: string;
    password: string;
}

export interface RegisterEmployeeDto {
    name: string;
    surname: string;
    dni: string;
    nss: string;
    numberEmployee: string;
    rol: 'encargado' | 'empleado'
    email: string;
    password: string;
}