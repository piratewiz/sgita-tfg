import type { Response, Request } from "express";
import type { AuthRequest } from "../middlewares/auth.middleware.js";
import { ProductRepository } from "../repository/product.repository.js";
import type { CreateProductDto, UpdateProductDto } from "../dtos/product.dto.js";




const productRepository = new ProductRepository();


// get /api/products
export const getProducts = async (_req: AuthRequest, res: Response): Promise<void> => {
    try {
        res.json(await productRepository.findAll());
    } catch (error) {
        res.status(500).json({message: 'Error getting products'});
    }
}

// get /api/products/stock
export const getProductsByStock = async(_req: AuthRequest, res: Response): Promise<void> => {
    try {
        res.json(await productRepository.findMinStock());
    } catch (error) {
        res.status(500).json({message: 'Error getting products by stock'})
    }
}

// get /api/products/status/:status
export const getProductsByStatus = async (req: AuthRequest, res: Response): Promise<void> => {
    const allStatus = ['fresh', 'soon_expire', 'expired'];
    const {status} = req.params;
    if(typeof status !== 'string' || !allStatus.includes(status)) {
        res.status(400).json({message: 'Invalid status'});
        return;
    }

    try {
        res.json(await productRepository.findByStatus(req.params.status as any));
    } catch (error) {
        res.status(500).json({message: 'Error filtering products'})
    }
}

// get /api/products/:id
export const getProductById = async (req: Request<{id: string}>, res: Response): Promise<void> => {
    try {
        const product = await productRepository.findById(req.params.id)
        if(!product) {
            res.status(404).json({message: 'Product not found'});
            return;
        }
        
        res.json(product);
    } catch (error) {
        res.status(500).json({message: 'Error getting product by ID'});
    }
}


// post /api/products -> recordar sólo admin
export const createProduct = async(req: AuthRequest, res: Response): Promise<void> => {
    const data: CreateProductDto = req.body;
    const requireds: (keyof CreateProductDto)[] = [
        'name', 'category', 'codeProduct', 'unityType', 'quantity', 'minStock', 'expirationDate', 'providorId'
    ];

    const missings = requireds.filter((c) => data[c] === undefined || data[c] === '');
    if(missings.length) {
        res.status(400).json({message: `Inputs left: ${missings.join(', ')}`});
        return;
    }

    if (typeof data.minStock !== 'number' || data.minStock < 0) {
        res.status(400).json({message: 'minStock must be a number >= 0'});
        return;
    }

    try {
        const exists = await productRepository.findByCode(data.codeProduct);
        if(exists) {
            res.status(409).json({message: 'Product code registered already'});
            return;
        }

        res.status(201).json(await productRepository.create(data));
    } catch (error) {
        res.status(500).json({message: 'Error trying to create product'});
    }
}

// put /api/products/:id -> solo admin
export const updateProduct = async(req: AuthRequest, res: Response): Promise<void> => {
    const {id} = req.params as {id: string}
    try {
        const updated = await productRepository.update(id, req.body as UpdateProductDto);
        if(!updated) {
            res.status(404).json({message: 'product not found'});
            return;
        }

        res.json(updated);
    } catch (error) {
        res.status(500).json({message: 'Error trying to update the product'});
    }
}

// delete /api/products/:id -> solo admin
export const deleteProductById = async (req: AuthRequest, res: Response): Promise<void> => {
    const {id} = req.params as {id: string}
    try {
        const deleted = await productRepository.delete(id);
        if(!deleted) {
            res.status(404).json({message: 'Product not found'});
            return;
        }

        res.json({message: 'Product correctly deleted'});
    } catch (error) {
        res.status(500).json({message: 'Error deleting product'});
    }
}