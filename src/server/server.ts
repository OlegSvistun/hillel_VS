import './controllers/Inventory'
import './controllers/ItemList'
import './controllers/Functions'
import './controllers/Actionbar'
import './controllers/Actions'
//import './controllers/Drops'
import { initializeDecaySystem, triggerManualDecay } from './controllers/Decay';
import { initializeGroundItemCleanup, triggerManualGroundCleanup } from './controllers/GroundItemCleanup';

initializeDecaySystem();
initializeGroundItemCleanup();

RPC.register('inventory:triggerDecay', async (source, multiplier = 1.0) => { // You can use register a command to trigger this RPC if you want to.
    const isAdmin = await global.exports['qb-core'].IsPlayerAdmin(source);
    if (!isAdmin) {
        emitNet('DoLongHudText', source, 'You do not have permission to use this command.', 2);
        return false;
    }
    
    const result = await triggerManualDecay(multiplier);
    if (result) {
        emitNet('DoLongHudText', source, `Item decay process completed with multiplier ${multiplier}.`, 1);
    } else {
        emitNet('DoLongHudText', source, 'Failed to process item decay.', 2);
    }
    return result;
});

RPC.register('inventory:cleanupGround', async (source) => { // You can use register a command to trigger this RPC if you want to.
    const isAdmin = await global.exports['qb-core'].IsPlayerAdmin(source);
    if (!isAdmin) {
        emitNet('DoLongHudText', source, 'You do not have permission to use this command.', 2);
        return false;
    }
    
    try {
        await triggerManualGroundCleanup(source);
        emitNet('DoLongHudText', source, `Ground item cleanup process completed.`, 1);
        return true;
    } catch (error) {
        console.error('Error during manual ground cleanup:', error);
        emitNet('DoLongHudText', source, 'Failed to clean up ground items.', 2);
        return false;
    }
});

global.exports('LoadInventory', (source: number, citizenId: string) => {
    console.log(`Запитано інвентар для ${source} (CID: ${citizenId})`);

    return {
        items: [] // або реальні предмети
    };
});

global.exports('SaveInventory', (source: number, citizenId: string, inventoryData: any) => {
    console.log(`Зберігаємо інвентар для ${source} (CID: ${citizenId})`);
    // inventoryData = [{ name: 'water_bottle', amount: 3 }, ...]
    // Тут можна зробити збереження в БД
});
