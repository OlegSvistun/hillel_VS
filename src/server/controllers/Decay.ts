import { ItemList } from './ItemList';

const DECAY_INTERVAL_MINUTES = 10 // Changed from 1 to 10 minutes for production
let DECAY_BASE_MULTIPLIER = 1.0 // Base multiplier for decay rates
const MINIMUM_QUALITY = 0
const MAX_ITEMS_PER_QUERY = 50

const DECAY_EXEMPT_ITEMS = [
    'cash',
    'id_card',
    'housekey',
    'simcard'
];

export function initializeDecaySystem() {
    console.log(`[INVENTORY] Initializing item decay system. Items will decay every ${DECAY_INTERVAL_MINUTES} minutes.`);
    
    setTimeout(() => {
        processItemDecay();
        setInterval(processItemDecay, DECAY_INTERVAL_MINUTES * 60 * 1000);
    }, 30000);
}

async function processItemDecay() {
    try {
        await processPlayerInventories();
        
        const QBCore = global.exports['qb-core'].GetCoreObject();
        const onlinePlayers = QBCore.Functions.GetPlayers();
        
        if (onlinePlayers && onlinePlayers.length > 0) {
            for (const player of onlinePlayers) {
                TriggerClientEvent('inventory:refreshInventory', parseInt(player));
            }
            console.log(`[INVENTORY] Notified ${onlinePlayers.length} players to refresh inventory`);
        }
    } catch (error) {
        console.error('[INVENTORY] Error during item decay process:', error);
    }
}

async function processPlayerInventories() {
    let playerInventories = []
    let totalUpdated = 0
    let totalDestroyed = 0
    
    try {
        const QBCore = global.exports['qb-core'].GetCoreObject()
        const onlinePlayers = QBCore.Functions.GetPlayers()
        
        if (onlinePlayers && onlinePlayers.length > 0) {
            for (const player of onlinePlayers) {
                try {
                    const playerSrc = parseInt(player)
                    const character = global.exports['ghost-lib'].getCharacter(playerSrc)
                    
                    if (character && character.citizenid) {
                        playerInventories.push({
                            citizenid: character.citizenid,
                            src: playerSrc,
                            name: `body-${character.citizenid}`
                        })
                    }
                } catch (playerError) {
                    console.error(`[DECAY] Error getting character data for player ${player}:`, playerError)
                }
            }
            console.log(`[DECAY] Found ${playerInventories.length} online player inventories to process`)
        }
    } catch (playerError) {
        console.warn(`[DECAY] Couldn't get online players:`, playerError)
    }
    
    if (playerInventories.length === 0) {
        console.log('[INVENTORY] No online player inventories found for decay processing.')
        return
    }
    
    console.log(`[INVENTORY] Processing decay for ${playerInventories.length} player inventories.`)
    
    for (const playerInv of playerInventories) {
        try {
            const inventoriesToProcess = [
                playerInv.name, // body inventory
                `backpack-${playerInv.citizenid}`,
                `clothing-${playerInv.citizenid}`,
                `pockets-${playerInv.citizenid}`
            ];
            
            for (const invName of inventoriesToProcess) {
                const items = await global.exports.oxmysql.query_async(`
                    SELECT * FROM user_inventory2 
                    WHERE name = ? AND quality IS NOT NULL AND quality > 0
                    LIMIT ${MAX_ITEMS_PER_QUERY}
                `, [invName])
                
                if (!items || items.length === 0) continue
                
                console.log(`[DECAY] Processing ${items.length} items in ${invName} for player ${playerInv.citizenid}`)
                
                for (const item of items) {
                    const result = await processItem(item, invName)
                    totalUpdated += result.updated ? 1 : 0
                    totalDestroyed += result.destroyed ? 1 : 0
                }
            }
            
            if (playerInv.src) {
                TriggerClientEvent('inventory:refreshInventory', playerInv.src)
            }
        } catch (error) {
            console.error(`[DECAY] Error processing inventory for ${playerInv.citizenid}:`, error)
        }
    }
    
    console.log(`[INVENTORY] Player inventory decay: ${totalUpdated} items decayed, ${totalDestroyed} items reached 0%.`)
}

async function processItem(item, inventoryName) {
    if (!item.item_id) return { updated: false, destroyed: false }
    
    if (DECAY_EXEMPT_ITEMS.includes(item.item_id)) return { updated: false, destroyed: false }
    
    const itemConfig = ItemList[item.item_id]
    if (!itemConfig) return { updated: false, destroyed: false }
    
    const quality = parseInt(item.quality || 100)
    const decayRate = itemConfig.decayrate || 0
    
    if (decayRate <= 0) return { updated: false, destroyed: false }
    
    const decayAmount = decayRate * DECAY_BASE_MULTIPLIER
    
    const canFullyDegrade = itemConfig.fullyDegrades === true
    const minimumAllowedQuality = canFullyDegrade ? 0 : 10 // Items that can fully degrade go to 0%, others stop at 10%
    
    const newQuality = Math.max(minimumAllowedQuality, Math.floor(quality - decayAmount))
    
    if (newQuality === quality) return { updated: false, destroyed: false }
    
    try {
        const itemExists = await global.exports.oxmysql.query_async(`
            SELECT id FROM user_inventory2 WHERE id = ? LIMIT 1
        `, [item.id]);
        
        if (!itemExists || itemExists.length === 0) {
            console.log(`[DECAY] Item ${item.item_id} (ID: ${item.id}) no longer exists in database, skipping`);
            return { updated: false, destroyed: false };
        }
        
        console.log(`[DECAY] Item ${item.item_id} (ID: ${item.id}) in ${inventoryName}: Quality ${quality} → ${newQuality} (Can fully degrade: ${canFullyDegrade})`)
        
        const updateResult = await global.exports.oxmysql.execute_async(`
            UPDATE user_inventory2 SET quality = ? WHERE id = ?
        `, [newQuality, item.id]);
        
        if (updateResult && updateResult.affectedRows > 0) {
            if (newQuality === 0 && canFullyDegrade) {
                console.log(`[DECAY] Item ${item.item_id} (ID: ${item.id}) in ${inventoryName} reached 0% quality (fullyDegrades property)`)
                return { updated: false, destroyed: true }
            } else {
                return { updated: true, destroyed: false }
            }
        }
    } catch (error) {
        console.error(`[DECAY] Error updating item ${item.item_id} (ID: ${item.id}):`, error)
        
        try {
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const retryResult = await global.exports.oxmysql.execute_async(`
                UPDATE user_inventory2 SET quality = ? WHERE id = ?
            `, [newQuality, item.id]);
            
            if (retryResult && retryResult.affectedRows > 0) {
                console.log(`[DECAY] Successfully updated item ${item.item_id} on retry`);
                if (newQuality === 0 && canFullyDegrade) {
                    return { updated: false, destroyed: true }
                } else {
                    return { updated: true, destroyed: false }
                }
            }
        } catch (retryError) {
            console.error(`[DECAY] Retry failed for item ${item.item_id}:`, retryError);
        }
    }
    
    return { updated: false, destroyed: false }
}

export async function triggerManualDecay(multiplier = 1.0) {
    DECAY_BASE_MULTIPLIER = multiplier
    await processItemDecay()
    DECAY_BASE_MULTIPLIER = 1.0
    return true
}