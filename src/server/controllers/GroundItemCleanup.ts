const CLEANUP_INTERVAL_MINUTES = 10;        // How often to run cleanup check
const MAX_GROUND_ITEMS = 300;               // Maximum number of items allowed on the ground
const ITEM_MAX_AGE_HOURS = 3;               // Default max age for items (3 hours)
const LOW_VALUE_ITEM_MAX_AGE_MINUTES = 20;  // Max age for low value items (20 minutes)
const VALUABLE_ITEM_MAX_AGE_HOURS = 8;      // Max age for valuable items (8 hours)
const INITIAL_STARTUP_DELAY = 10000;        // Delay before first cleanup on server start (10 seconds)

const CLEAR_ALL_DROPS_ON_STARTUP = true; // Set to false if you want to disable this feature

// low value items (will be cleaned up faster)
const LOW_VALUE_ITEMS = [
    'water', 'sandwich', 'bandage', 'cigarette', 'lighter',
    'coffee', 'donut', 'soda', 'burger', 'hotdog'
];

// valuable items (will stay longer)
const VALUABLE_ITEMS = [
    'id_card', 'wallet', 'cash', 'phone', 'goldbar', 'rolex',
    'goldchain', 'pistol', 'radio', 'armor', 'lockpick'
];

export function initializeGroundItemCleanup() {
    console.log(`[INVENTORY] Initializing ground item cleanup system. Running every ${CLEANUP_INTERVAL_MINUTES} minutes.`);
    
    setTimeout(() => {
        if (CLEAR_ALL_DROPS_ON_STARTUP) {
            clearAllDroppedItems().then(() => {
                setInterval(performGroundItemCleanup, CLEANUP_INTERVAL_MINUTES * 60 * 1000);
            });
        } else {
            performStartupCleanup().then(() => {
                setInterval(performGroundItemCleanup, CLEANUP_INTERVAL_MINUTES * 60 * 1000);
            });
        }
    }, INITIAL_STARTUP_DELAY);
}

async function performStartupCleanup() {
    console.log('[INVENTORY] Running server startup ground item cleanup...');
    
    try {
        await syncGroundItemsWithObjects();
        
        const droppedItems = await global.exports.oxmysql.query_async(`
            SELECT id, item_id, name, slot, quantity, information, createdAt, 
                   UNIX_TIMESTAMP() - UNIX_TIMESTAMP(createdAt) as age_seconds
            FROM user_inventory2 
            WHERE dropped = 1
            ORDER BY createdAt ASC
        `);
        
        if (!droppedItems || droppedItems.length === 0) {
            console.log('[INVENTORY] No ground items found for startup cleanup.');
            return;
        }
        
        console.log(`[INVENTORY] Found ${droppedItems.length} items on the ground during startup.`);
        
        const itemsToCleanup = identifyItemsForStartupCleanup(droppedItems);
        
        if (itemsToCleanup.length === 0) {
            console.log('[INVENTORY] No items need cleanup during startup.');
            return;
        }
        
        console.log(`[INVENTORY] Cleaning up ${itemsToCleanup.length} ground items during startup.`);
        await cleanupItems(itemsToCleanup);
        
    } catch (error) {
        console.error('[INVENTORY] Error during startup ground item cleanup:', error);
    }
}

async function syncGroundItemsWithObjects() {
    try {
        console.log('[INVENTORY] Syncing ground items with physical objects...');
        
        const droppedItems = await global.exports.oxmysql.query_async(`
            SELECT id FROM user_inventory2 WHERE dropped = 1
        `);
        
        if (!droppedItems || droppedItems.length === 0) {
            // console.log('[INVENTORY] No dropped items found during sync.');
            return;
        }
        
        const objectEntries = await global.exports.oxmysql.query_async(`
            SELECT id FROM __objects
        `);
        
        if (!objectEntries || objectEntries.length === 0) {
            console.log('[INVENTORY] No objects found in __objects table during sync.');
            return;
        }
        
        const droppedItemIds = new Set(droppedItems.map(item => item.id));
        const objectIds = new Set(objectEntries.map(obj => obj.id));
        
        const orphanedObjectIds = [...objectIds].filter(id => !droppedItemIds.has(id));
        
        const orphanedItemIds = [...droppedItemIds].filter(id => !objectIds.has(id));
        
        if (orphanedObjectIds.length > 0) {
            for (const batch of chunkArray(orphanedObjectIds, 50)) {
                try {
                    await global.exports.oxmysql.execute_async(`
                        DELETE FROM __objects WHERE id IN (${batch.join(',')})
                    `);
                    console.log(`[INVENTORY] Deleted ${batch.length} orphaned objects.`);
                } catch (error) {
                    console.error('[INVENTORY] Error deleting orphaned objects:', error);
                }
            }
        }
        
        if (orphanedItemIds.length > 0) {
            for (const itemId of orphanedItemIds) {
                try {
                    const itemDetails = await global.exports.oxmysql.query_async(`
                        SELECT * FROM user_inventory2 WHERE id = ?
                    `, [itemId]);
                    
                    if (itemDetails && itemDetails.length > 0) {
                        const item = itemDetails[0];
                        
                        if (item.name && typeof item.name === 'string') {
                            const coordsMatch = item.name.match(/ground::(-?\d+\.\d+),(-?\d+\.\d+),(-?\d+\.\d+)::/);
                            
                            if (coordsMatch) {
                                const [x, y, z] = coordsMatch.slice(1).map(parseFloat);
                                
                                emit('np-objects:inv:prepareObject', item.item_id, x, y, z, 0, {
                                    inventoryDrop: true,
                                    itemId: item.item_id
                                }, item.id);
                                
                                console.log(`[INVENTORY] Created missing object for item ${item.item_id} (ID: ${item.id})`);
                            }
                        }
                    }
                } catch (error) {
                    console.error(`[INVENTORY] Error handling orphaned inventory item ${itemId}:`, error);
                }
                
                await new Promise(resolve => setTimeout(resolve, 10));
            }
        }
        
    } catch (error) {
        console.error('[INVENTORY] Error during ground items sync:', error);
    }
}

function chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}

function identifyItemsForStartupCleanup(items) {
    if (!items || items.length === 0) return [];
    
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const itemsToRemove = [];
    
    const startupMaxItems = Math.max(MAX_GROUND_ITEMS * 0.8, 100);
    const quantityOverage = items.length - startupMaxItems;
    
    const locationGroups = new Map();
    
    for (const item of items) {
        const ageInSeconds = item.age_seconds || (currentTimestamp - (new Date(item.createdAt || Date.now()).getTime() / 1000));
        
        let maxAgeInSeconds;
        
        if (LOW_VALUE_ITEMS.includes(item.item_id)) {
            maxAgeInSeconds = LOW_VALUE_ITEM_MAX_AGE_MINUTES * 60 * 0.5; // 50% of normal time
        } else if (VALUABLE_ITEMS.includes(item.item_id)) {
            maxAgeInSeconds = VALUABLE_ITEM_MAX_AGE_HOURS * 3600 * 0.7; // 70% of normal time
        } else {
            maxAgeInSeconds = ITEM_MAX_AGE_HOURS * 3600 * 0.7; // 70% of normal time
        }
        
        const coordsMatch = item.name && typeof item.name === 'string' 
            ? item.name.match(/ground::(-?\d+\.\d+),(-?\d+\.\d+),(-?\d+\.\d+)::/)
            : null;
            
        if (coordsMatch) {
            const [x, y, z] = coordsMatch.slice(1).map(coord => parseFloat(coord));
            const locationKey = `${Math.floor(x/5)},${Math.floor(y/5)}`;
            
            if (!locationGroups.has(locationKey)) {
                locationGroups.set(locationKey, []);
            }
            locationGroups.get(locationKey).push(item);
        }
        
        if (ageInSeconds > maxAgeInSeconds) {
            itemsToRemove.push(item);
            continue;
        }
    }
    
    if (quantityOverage > 0 && itemsToRemove.length < quantityOverage) {
        const remainingItems = items.filter(item => !itemsToRemove.includes(item))
                                   .sort((a, b) => (b.age_seconds || 0) - (a.age_seconds || 0));
        
        const additionalItemsToRemove = remainingItems.slice(0, quantityOverage - itemsToRemove.length);
        itemsToRemove.push(...additionalItemsToRemove);
    }
    
    for (const [locationKey, locationItems] of locationGroups.entries()) {
        if (locationItems.length > 8) {
            console.log(`[INVENTORY] Location ${locationKey} has ${locationItems.length} items, cleaning up excess during startup.`);
            
            const itemsToKeep = locationItems
                .sort((a, b) => (a.age_seconds || 0) - (b.age_seconds || 0))
                .slice(0, 5);
                
            const excessItems = locationItems.filter(item => !itemsToKeep.includes(item));
            
            for (const item of excessItems) {
                if (!itemsToRemove.includes(item)) {
                    itemsToRemove.push(item);
                }
            }
        }
    }
    
    return itemsToRemove;
}

async function performGroundItemCleanup() {
    console.log('[INVENTORY] Running ground item cleanup...');
    
    try {
        const droppedItems = await global.exports.oxmysql.query_async(`
            SELECT id, item_id, name, slot, quantity, information, createdAt, 
                   UNIX_TIMESTAMP() - UNIX_TIMESTAMP(createdAt) as age_seconds
            FROM user_inventory2 
            WHERE dropped = 1
            ORDER BY createdAt ASC
        `);
        
        if (!droppedItems || droppedItems.length === 0) {
            console.log('[INVENTORY] No ground items found for cleanup.');
            return;
        }
        
        console.log(`[INVENTORY] Found ${droppedItems.length} items on the ground.`);
        
        const itemsToCleanup = identifyItemsForCleanup(droppedItems);
        
        if (itemsToCleanup.length === 0) {
            console.log('[INVENTORY] No items need cleanup at this time.');
            return;
        }
        
        console.log(`[INVENTORY] Cleaning up ${itemsToCleanup.length} ground items.`);
        await cleanupItems(itemsToCleanup);
        
    } catch (error) {
        console.error('[INVENTORY] Error during ground item cleanup:', error);
    }
}

function identifyItemsForCleanup(items) {
    if (!items || items.length === 0) return [];
    
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const itemsToRemove = [];
    
    const quantityOverage = items.length - MAX_GROUND_ITEMS;
    
    const locationGroups = new Map();
    
    for (const item of items) {
        const ageInSeconds = item.age_seconds || (currentTimestamp - (new Date(item.createdAt || Date.now()).getTime() / 1000));
        
        let maxAgeInSeconds;
        
        if (LOW_VALUE_ITEMS.includes(item.item_id)) {
            maxAgeInSeconds = LOW_VALUE_ITEM_MAX_AGE_MINUTES * 60;
        } else if (VALUABLE_ITEMS.includes(item.item_id)) {
            maxAgeInSeconds = VALUABLE_ITEM_MAX_AGE_HOURS * 3600;
        } else {
            maxAgeInSeconds = ITEM_MAX_AGE_HOURS * 3600;
        }
        
        const coordsMatch = item.name && typeof item.name === 'string' 
            ? item.name.match(/ground::(-?\d+\.\d+),(-?\d+\.\d+),(-?\d+\.\d+)::/)
            : null;
            
        if (coordsMatch) {
            const [x, y, z] = coordsMatch.slice(1).map(coord => parseFloat(coord));
            const locationKey = `${Math.floor(x/10)},${Math.floor(y/10)}`;
            
            if (!locationGroups.has(locationKey)) {
                locationGroups.set(locationKey, []);
            }
            locationGroups.get(locationKey).push(item);
        }
        
        if (ageInSeconds > maxAgeInSeconds) {
            itemsToRemove.push(item);
            continue;
        }
    }
    
    if (quantityOverage > 0 && itemsToRemove.length < quantityOverage) {
        const remainingItems = items.filter(item => !itemsToRemove.includes(item))
                                   .sort((a, b) => (b.age_seconds || 0) - (a.age_seconds || 0));
                                   
        const additionalItemsToRemove = remainingItems.slice(0, quantityOverage - itemsToRemove.length);
        itemsToRemove.push(...additionalItemsToRemove);
    }
    
    for (const [locationKey, locationItems] of locationGroups.entries()) {
        if (locationItems.length > 15) {
            console.log(`[INVENTORY] Location ${locationKey} has ${locationItems.length} items, cleaning up excess.`);
            
            const itemsToKeep = locationItems.sort((a, b) => (a.age_seconds || 0) - (b.age_seconds || 0)).slice(0, 10);
            const excessItems = locationItems.filter(item => !itemsToKeep.includes(item));
            
            for (const item of excessItems) {
                if (!itemsToRemove.includes(item)) {
                    itemsToRemove.push(item);
                }
            }
        }
    }
    
    return itemsToRemove;
}

async function cleanupItems(itemsToCleanup) {
    if (!itemsToCleanup || itemsToCleanup.length === 0) return;
    
    try {
        const batchSize = 10;
        let successCount = 0;
        
        for (let i = 0; i < itemsToCleanup.length; i += batchSize) {
            const batch = itemsToCleanup.slice(i, i + batchSize);
            
            for (const item of batch) {
                try {
                    const result = await global.exports.oxmysql.execute_async(`
                        DELETE FROM user_inventory2 WHERE id = ?
                    `, [item.id]);
                    
                    if (result && result.affectedRows > 0) {
                        successCount++;
                        emit('np-objects:inv:DeleteObject', item.id, true);
                        console.log(`[CLEANUP] Successfully removed ground item ${item.item_id} (ID: ${item.id})`);
                    }
                } catch (itemError) {
                    console.error(`[CLEANUP] Error removing ground item ${item.item_id} (ID: ${item.id}):`, itemError);
                }
                
                await new Promise(resolve => setTimeout(resolve, 10));
            }
            
            if (i + batchSize < itemsToCleanup.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        console.log(`[INVENTORY] Successfully cleaned up ${successCount} ground items.`);
        
        if (successCount > 0) {
            const QBCore = global.exports['qb-core'].GetCoreObject();
            const onlinePlayers = QBCore.Functions.GetPlayers();
            
            if (onlinePlayers && onlinePlayers.length > 0) {
                emitNet('DoLongHudText', -1, 'Some items on the ground have deteriorated and disappeared.', 1);
            }
        }
        
    } catch (error) {
        console.error('[INVENTORY] Error during item cleanup:', error);
    }
}

export async function triggerManualGroundCleanup(source?: number) {
    console.log(`[INVENTORY] Manual ground item cleanup triggered by ${source || 'system'}`);
    await performGroundItemCleanup();
    return true;
}

async function clearAllDroppedItems() {
    console.log('[INVENTORY] Clearing ALL dropped items on server startup...');

    try {
        const droppedItems = await global.exports.oxmysql.query_async(`
            SELECT id, item_id FROM user_inventory2 WHERE dropped = 1
        `);

        if (!droppedItems || droppedItems.length === 0) {
            console.log('[INVENTORY] No dropped items found to clear.');
            return;
        }

        console.log(`[INVENTORY] Found ${droppedItems.length} dropped items. Clearing all...`);

        const droppedItemIds = droppedItems.map(item => item.id);

        const batches = chunkArray(droppedItemIds, 50);

        for (const batch of batches) {
            try {
                await global.exports.oxmysql.execute_async(`
                    DELETE FROM __objects WHERE id IN (${batch.join(',')})
                `);
                
                await global.exports.oxmysql.execute_async(`
                    DELETE FROM user_inventory2 WHERE id IN (${batch.join(',')})
                `);
                
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error) {
                console.error('[INVENTORY] Error processing batch deletion:', error);
            }
        }

        emitNet('np:inventory:removeDroppedItems', -1, droppedItemIds);

        console.log(`[INVENTORY] Successfully cleared ${droppedItems.length} dropped items on server startup.`);
    } catch (error) {
        console.error('[INVENTORY] Error clearing all dropped items:', error);
    }
}