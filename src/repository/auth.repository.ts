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
        if(data.email) {
            const byEmail = await Employee.findOne({email: data.email.toLowerCase().trim()});
            if(byEmail) return 'Email already exists';
        }

        if(data.dni) {
            const byDni = await Employee.findOne({dni: data.dni.trim()});
            if(byDni) return 'DNI already registered';
        }

        if(data.nss) {
            const byNss = await Employee.findOne({nss: data.nss});
            if(byNss) return 'NSS already registered';
        }

        if(data.numberEmployee) {
            const byNum = await Employee.findOne({numberEmployee: data.numberEmployee});
            if(byNum) return 'Employee number already registered';
        }
        return null;
    }
}