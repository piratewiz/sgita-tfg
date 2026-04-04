import { BatchRepository } from "../repository/batch.repository.js";
import { ProductRepository } from "../repository/product.repository.js";



const productRepository = new ProductRepository();
const batchRepository = new BatchRepository();

// se llama a esta función desde index.ts al arrancar el servidor
export const updateExpirationStatus = async (): Promise<void> => {
    try {
        await productRepository.updateStatusExpiredProducts();
        await batchRepository.updateExpirationStatus();
        console.log(`[Cron] Expiration status have been updated: ${new Date().toLocaleString()}`);
    } catch (error) {
        console.error('[Cron] Error trying to update expiration status', error);
    }
}


// creación del cron, por defecto dejo que se ejecuta cada 6 horas
export const initCron = (): void => {
    const interval = Number(process.env.CRON_INTERVAL_MS) || 6 * 60 * 60 * 1000; // 6 horas

    // ejecutar cron al arrancar
    updateExpirationStatus();

    // ejecutar periódicamente
    setInterval(updateExpirationStatus, interval);

    console.log('[Cron]  Expiration controller activated');
    
} 