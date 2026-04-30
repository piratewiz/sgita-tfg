import type { RegisterEmployeeDto } from "../dtos/auth.dto.js";
import Employee, { type IEmployee } from "../models/Employee.js";

export class AuthRepository {
    
    async findByEmail(email: string): Promise<IEmployee | null> {
        return Employee.findOne({email: email.toLowerCase().trim()});
    }

    async findById(id: string): Promise<IEmployee | null> {
        return Employee.findById(id).select('-password');
    }

    async create(data: RegisterEmployeeDto & {password: string}): Promise<IEmployee> {
        const employee = new Employee({
            name: data.name,
            surname: data.surname,
            dni: data.dni,
            nss: data.nss,
            numberEmployee: data.numberEmployee,
            rol: data.rol,
            email: data.email.toLowerCase().trim(),
            password: data.password,
            active: true
         });
        return employee.save();
    }

    async existsDuplicate(data: Partial<RegisterEmployeeDto>): Promise<string | null> {
        const checks: Promise<string | null>[] = [];

        if (data.email)
            checks.push(Employee.exists({email: data.email.toLowerCase().trim()}).then(r => r ? 'Email already exists' : null));
        if (data.dni)
            checks.push(Employee.exists({dni: data.dni.trim()}).then(r => r ? 'DNI already registered' : null));
        if (data.nss)
            checks.push(Employee.exists({nss: data.nss}).then(r => r ? 'NSS already registered' : null));
        if (data.numberEmployee)
            checks.push(Employee.exists({numberEmployee: data.numberEmployee}).then(r => r ? 'Employee number already registered' : null));

        const results = await Promise.all(checks);
        return results.find(r => r !== null) ?? null;
    }
}