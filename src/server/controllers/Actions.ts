import { InventoryConfig } from "./Config";
import { findNextAvailableSlot, wouldExceedWeightLimit, handleGroundInventory, removeItem, findClosestDrop } from "./Functions";
import { Inventory } from "./Inventory";
import { ItemList } from "./ItemList";

RPC.register('inventory:addItem', async(source: any, data: any) => {
    const character = global.exports['ghost-lib'].getCharacter(source);
    
    if (!ItemList[data.Item]) {
        return TriggerClientEvent('DoLongHudText', source, `${data.Item} does not exist!`, 2);
    }
    
    if (data.Amount <= 0) {
        return TriggerClientEvent('DoLongHudText', source, 'Invalid item amount.', 2);
    }

    data.Amount = parseInt(data.Amount, 10);
    
    const inventoryItems = await global.exports.oxmysql.query_async('SELECT * FROM user_inventory2 WHERE name = @Name', {
        ['@Name']: 'body-' + character.citizenid
    });
    
    let currentWeight = 0;
    if (inventoryItems && inventoryItems.length > 0) {
        for (const item of inventoryItems) {
            currentWeight += (ItemList[item.item_id]?.weight || 0) * (parseInt(item.quantity || 1, 10));
        }
    }
    
    const itemWeight = (ItemList[data.Item]?.weight || 0) * data.Amount;
    const totalWeight = currentWeight + itemWeight;
    
    if (totalWeight > InventoryConfig['PersonalInventory'].MaxWeight) {
        return TriggerClientEvent('DoLongHudText', source, 'Your inventory is too heavy to hold this item.', 2);
    }
    
    let existingItems = null;
    let stackSuccess = false;

    if (ItemList[data.Item].stackable) {
        existingItems = await global.exports.oxmysql.query_async(`
            SELECT * FROM user_inventory2 
            WHERE name = @Name AND item_id = @ItemId
            ORDER BY quantity DESC
        `, {
            '@Name': 'body-' + character.citizenid,
            '@ItemId': data.Item
        });
    }
    
    if (existingItems && existingItems.length > 0 && ItemList[data.Item].stackable) {
        
        const item = existingItems[0];
        
        const currentQuantity = parseInt(item.quantity || 1, 10);
        
        const newQuantity = currentQuantity + data.Amount;
        
        await global.exports['oxmysql'].query_async(`
            UPDATE user_inventory2 
            SET quantity = @Quantity 
            WHERE id = @Id
        `, {
            '@Id': item.id,
            '@Quantity': newQuantity
        });
        
        stackSuccess = true;
    }
    
    if (!stackSuccess) {
        if (ItemList[data.Item].stackable) {
            const newSlot = await findNextAvailableSlot(source, 'body-' + character.citizenid);
            
            if (newSlot) {
                await global.exports['oxmysql'].query_async(`
                    INSERT INTO user_inventory2 (item_id, name, slot, quantity) 
                    VALUES (@ItemId, @Name, @Slot, @Quantity)
                `, {
                    '@ItemId': data.Item,
                    '@Name': 'body-' + character.citizenid,
                    '@Slot': newSlot,
                    '@Quantity': data.Amount
                });
            } else {
                return TriggerClientEvent('DoLongHudText', source, `Your inventory is full.`, 2);
            }
        } else {
            let addedCount = 0;
            
            for (let i = 0; i < data.Amount; i++) {
                const nextSlot = await findNextAvailableSlot(source, 'body-' + character.citizenid);
                
                if (nextSlot) {
                    await global.exports['oxmysql'].query_async(`
                        INSERT INTO user_inventory2 (item_id, name, slot, quantity) 
                        VALUES (@ItemId, @Name, @Slot, @Quantity)
                    `, {
                        '@ItemId': data.Item,
                        '@Name': 'body-' + character.citizenid,
                        '@Slot': nextSlot,
                        '@Quantity': 1
                    });
                    addedCount++;
                } else {
                    TriggerClientEvent('DoLongHudText', source, `Your inventory is full. Added ${addedCount} of ${data.Amount} items.`, 2);
                    break;
                }
            }
            
            if (addedCount == data.Amount) {
                TriggerClientEvent('DoLongHudText', source, `Added ${addedCount} ${ItemList[data.Item].name}`, 1);
            }
            return;
        }
    }
    TriggerClientEvent('DoLongHudText', source, `Added ${data.Amount} ${ItemList[data.Item].name}`, 1);
});

const dropCache = new Map<string, { timestamp: number, drop: any }>();
const dragCooldowns = new Map<string, {
    lastDrag: number,
    attempts: number,
    lastWarning: number
}>();

RPC.register('inventory:dragItem', async (source: number, data: any) => {
    // console.log('Dragging Item: ', JSON.stringify(data)); // Debugging purposes

    const playerKey = `${source}-${data.fromInventory}-${data.fromSlot}`;
    const now = Date.now();
    
    const playerTracking = dragCooldowns.get(playerKey) || {
        lastDrag: 0,
        attempts: 0,
        lastWarning: 0
    };
    
    const timeSinceLastDrag = now - playerTracking.lastDrag;
    
    if (timeSinceLastDrag < 500) {
        playerTracking.attempts++;
        
        if (playerTracking.attempts > 5 && (now - playerTracking.lastWarning) > 5000) {
            console.warn(`Player ${source} might be spamming inventory: ${playerTracking.attempts} rapid attempts`);
            playerTracking.lastWarning = now;
            
            if (playerTracking.attempts > 8) {
                TriggerClientEvent('DoLongHudText', source, 'Please slow down your inventory actions.', 2);
            }
        }
        
        dragCooldowns.set(playerKey, playerTracking);
        return;
    }
    
    playerTracking.lastDrag = now;
    
    if (timeSinceLastDrag > 2000) {
        playerTracking.attempts = 0;
    }
    
    dragCooldowns.set(playerKey, playerTracking);
    
    if (!data.toSlot || !data.toInventory) {
        console.error('Invalid drag data: missing destination slot or inventory');
        return;
    }
    
    if (data.fromInventory === data.toInventory && data.fromSlot === data.toSlot) {
        console.log('Source and destination are identical, ignoring drag operation');
        return;
    }
    
    const character = global.exports['ghost-lib'].getCharacter(source);
    if (!character) {
        console.error('Character not found for source', source);
        return;
    }

    if (data.toInventory === 'clothing') {
        const character = global.exports['ghost-lib'].getCharacter(source);
        if (character) {
            data.toInventory = `clothing-${character.citizenid}`;
        }
    }
    
    try {
        const fetchedItem = await fetchSourceItem(source, data, character);
        if (!fetchedItem || !fetchedItem[0]) {
            console.error(`Item: ${data.itemId} not found in inventory ${data.fromInventory}, slot ${data.fromSlot}`);
            TriggerClientEvent('DoLongHudText', source, 'Item not found.', 2);
            return;
        }
        
        if (data.fromInventory.includes('ground::')) {
            const groundItemId = fetchedItem[0].id;
            
            await global.exports['oxmysql'].query_async(`
                UPDATE user_inventory2 
                SET name = ?, slot = ?, dropped = 0
                WHERE id = ?
            `, [data.toInventory, data.toSlot, groundItemId]);
            
            emit('np-objects:inv:DeleteObject', groundItemId, true);
            TriggerClientEvent('inventory:refreshInventory', source);
            return;
        }
        
        if (data.fromInventory === data.toInventory) {
            const destItem = await global.exports['oxmysql'].query_async(`
                SELECT * FROM user_inventory2 
                WHERE slot = @Slot AND name = @Name
            `, {
                '@Slot': data.toSlot,
                '@Name': data.toInventory
            });
            
            if (destItem && destItem[0]) {
                await global.exports['oxmysql'].query_async(`
                    UPDATE user_inventory2 
                    SET slot = ? 
                    WHERE id = ?
                `, [data.toSlot, fetchedItem[0].id]);
                
                await global.exports['oxmysql'].query_async(`
                    UPDATE user_inventory2 
                    SET slot = ? 
                    WHERE id = ?
                `, [data.fromSlot, destItem[0].id]);
            } else {
                await global.exports['oxmysql'].query_async(`
                    UPDATE user_inventory2 
                    SET slot = ? 
                    WHERE id = ?
                `, [data.toSlot, fetchedItem[0].id]);
            }
            
            TriggerClientEvent('inventory:refreshInventory', source);
            return;
        }
        
        const destinationCheckResult = await checkDestinationRestrictions(source, data);
        if (destinationCheckResult === false) {
            console.log(`Inventory restriction prevented move of ${data.itemId} to ${data.toInventory}`);
            return;
        }
        
        if (await checkWeightLimits(source, data, fetchedItem[0]) === false) {
            console.log(`Weight limit would be exceeded moving ${data.itemId} to ${data.toInventory}`);
            return;
        }
        
        if (await handleGroundInventory(data, fetchedItem[0])) {
            TriggerClientEvent('inventory:refreshInventory', source);
            return;
        }
        
        const destItem = await global.exports['oxmysql'].query_async(`
            SELECT * FROM user_inventory2 
            WHERE slot = @Slot AND name = @Name
        `, {
            '@Slot': data.toSlot,
            '@Name': data.toInventory
        });
        
        if (destItem && destItem[0]) {
            await global.exports['oxmysql'].query_async(`
                UPDATE user_inventory2 
                SET name = ?, slot = ? 
                WHERE id = ?
            `, [data.toInventory, data.toSlot, fetchedItem[0].id]);
            
            await global.exports['oxmysql'].query_async(`
                UPDATE user_inventory2 
                SET name = ?, slot = ? 
                WHERE id = ?
            `, [data.fromInventory, data.fromSlot, destItem[0].id]);
            
            if (data.toInventory.includes('phone') && destItem[0].information) {
                try {
                    let number = JSON.parse(destItem[0].information);
                    emitNet('inventory:phoneNumber', source, number);
                    emitNet('updatePhoneNumber', source, number);
                } catch (e) {
                    console.error('Error parsing phone information:', e);
                }
            }
        } else {
            await global.exports['oxmysql'].query_async(`
                UPDATE user_inventory2 
                SET name = ?, slot = ? 
                WHERE id = ?
            `, [data.toInventory, data.toSlot, fetchedItem[0].id]);
            
            if (data.toInventory.includes('phone') && fetchedItem[0].information) {
                try {
                    let number = JSON.parse(fetchedItem[0].information);
                    emitNet('inventory:phoneNumber', source, number);
                    emitNet('updatePhoneNumber', source, number);
                } catch (e) {
                    console.error('Error parsing phone information:', e);
                }
            }
        }
        
        TriggerClientEvent('inventory:refreshInventory', source);
    } catch (error) {
        console.error('Error processing dragItem operation:', error);
        TriggerClientEvent('DoLongHudText', source, 'Error moving item.', 2);
    }
});

async function fetchSourceItem(source: number, data: any, character: any) {
    if (!data.fromInventory.includes('ground::') && data.fromInventory !== 'clothing') {
        return await global.exports['oxmysql'].query_async(`
            SELECT * FROM user_inventory2 
            WHERE slot = @Slot AND item_id = @ItemId AND name = @Name
        `, {
            '@Slot': data.fromSlot,
            '@ItemId': data.itemId,
            '@Name': data.fromInventory
        });
    }
    
    if (data.fromInventory === 'clothing') {
        if (data.itemId === 'Backpack') data.itemId = 'bag';
        else if (data.itemId === 'Chest Armor') data.itemId = 'armor';
        else if (data.itemId === 'Glasses') data.itemId = 'glasses';
        
        return await global.exports['oxmysql'].query_async(`
            SELECT * FROM user_inventory2 
            WHERE slot = @Slot AND item_id = @ItemId AND name = @Name
        `, {
            '@Slot': data.fromSlot,
            '@ItemId': data.itemId,
            '@Name': `clothing-${character.citizenid}`
        });
    }
    
    if (data.fromInventory.includes('ground::')) {
        const coordsMatch = data.fromInventory.match(/ground::(-?\d+(\.\d+)?),(-?\d+(\.\d+)?),(-?\d+(\.\d+)?)::/);
        
        if (coordsMatch) {
            const x = parseFloat(coordsMatch[1]);
            const y = parseFloat(coordsMatch[2]);
            const z = parseFloat(coordsMatch[3]);
            
            const cacheKey = `${x},${y},${z}`;
            const cacheDuration = 60000; // 1 minute
            const cachedDrop = dropCache.get(cacheKey);
            let closestDrop;
            
            if (cachedDrop && (Date.now() - cachedDrop.timestamp < cacheDuration)) {
                console.log(`Using cached drop for coordinates: ${cacheKey}`);
                closestDrop = cachedDrop.drop;
            } else {
                closestDrop = await findClosestDrop(x, y, z, 6.0);
                
                if (closestDrop) {
                    dropCache.set(cacheKey, { timestamp: Date.now(), drop: closestDrop });
                }
            }
            
            if (closestDrop) {
                const fetchedItem = await global.exports['oxmysql'].query_async(`
                    SELECT * FROM user_inventory2 
                    WHERE id = @Id
                `, {
                    '@Id': closestDrop.id
                });
                
                if (fetchedItem && fetchedItem.length > 0) {
                    data.fromInventory = closestDrop.name;
                    data.fromSlot = fetchedItem[0].slot;
                    data.itemId = fetchedItem[0].item_id;
                    return fetchedItem;
                }
            }
        
            let fetchedItemQuery = await global.exports['oxmysql'].query_async(`
                SELECT * FROM user_inventory2 
                WHERE item_id = @ItemId AND slot = @Slot AND name = @Name
            `, {
                '@Slot': data.fromSlot,
                '@ItemId': data.itemId,
                '@Name': data.fromInventory
            });
            
            if (!fetchedItemQuery || fetchedItemQuery.length === 0) {
                fetchedItemQuery = await global.exports['oxmysql'].query_async(`
                    SELECT * FROM user_inventory2 
                    WHERE item_id = @ItemId AND dropped = 1
                    ORDER BY id DESC LIMIT 1
                `, {
                    '@ItemId': data.itemId
                });
                
                if (fetchedItemQuery && fetchedItemQuery.length > 0) {
                    data.fromSlot = fetchedItemQuery[0].slot;
                    data.fromInventory = fetchedItemQuery[0].name;
                }
            }
            
            return fetchedItemQuery;
        }
    }
    
    return null;
}

async function checkDestinationRestrictions(source: number, data: any) {
    if (data.toInventory.includes('pockets')) {
        const pocketsSlot = data.toSlot - 1; // 0 based index
        
        if (!Inventory.Pockets || !Inventory.Pockets.Slots || !Inventory.Pockets.Slots[pocketsSlot]) {
            console.error(`Invalid pocket slot: ${data.toSlot}`);
            TriggerClientEvent('DoLongHudText', source, `Invalid pocket slot.`, 2);
            return false;
        }
        
        const acceptedItems = Inventory.Pockets.Slots[pocketsSlot].acceptedItems;
        if (!acceptedItems || !Array.isArray(acceptedItems)) {
            console.error(`No accepted items defined for pocket slot ${data.toSlot}`);
            TriggerClientEvent('DoLongHudText', source, `This pocket slot doesn't accept items.`, 2);
            return false;
        }
        
        const itemName = ItemList[data.itemId]?.name || data.itemId;
        
        const normalizedAcceptedItems = acceptedItems.map(item => item.toLowerCase());
        const isAccepted = normalizedAcceptedItems.includes(itemName.toLowerCase()) || 
                           normalizedAcceptedItems.includes(data.itemId.toLowerCase());
        
        if (!isAccepted) {
            console.log(`Item ${itemName} rejected from pocket slot ${data.toSlot}`);
            TriggerClientEvent('DoLongHudText', source, `${itemName} cannot be placed in this pocket slot.`, 2);
            return false;
        }
        
        console.log(`Item ${itemName} accepted in pocket slot ${data.toSlot}`);
    }
    
    if (data.toInventory.includes('simcard')) {
        if (!Inventory.AdditionalInventories?.length) return false;
        
        const phoneSlot = Inventory.AdditionalInventories.find((inv: any) => 
            inv.inventoryName === 'Mobile Phone' || inv.name.includes('phone')
        );
        
        if (!phoneSlot) return false;
        
        if (!phoneSlot.acceptedItems) {
            phoneSlot.acceptedItems = [{
                acceptedItems: InventoryConfig['Simcard'].acceptedItems 
            }];
        }
        
        if (phoneSlot?.acceptedItems && 
            !phoneSlot.acceptedItems[0].acceptedItems.includes(ItemList[data.itemId].name)) {
            return false;
        }
        
        if (phoneSlot?.acceptedItems && 
            phoneSlot.acceptedItems[0].acceptedItems.includes(ItemList[data.itemId].name)) {
            const result = await global.exports.oxmysql.query_async(
                'SELECT * FROM user_inventory2 WHERE item_id = @item_id AND slot = @Slot AND name = @Name', 
                {
                    '@Name': data.fromInventory,
                    '@Slot': data.fromSlot,
                    '@item_id': data.itemId,
                }
            );
            
            if (result?.[0]?.information) {
                try {
                    let number = JSON.parse(result[0].information);
                    emitNet('inventory:phoneNumber', source, number);
                    emitNet('updatePhoneNumber', source, number);
                } catch (e) {
                    console.error('Error parsing phone information:', e);
                }
            }
        }
    }
    
    if (data.fromInventory.includes('phone')) {
        emitNet('inventory:phoneNumber', source, 'N/A');
        emitNet('updatePhoneNumber', source, 'N/A');
    }
    
    if (data.toInventory.includes('wallet')) {
        const isAccepted = InventoryConfig.Wallet.acceptedItems && 
                          Array.isArray(InventoryConfig.Wallet.acceptedItems) && 
                          InventoryConfig.Wallet.acceptedItems.includes(ItemList[data.itemId].name);
        
        if (!isAccepted) {
            TriggerClientEvent('DoLongHudText', source, 'This item cannot be stored in a wallet.', 2);
            return false;
        }
    }
    
    if (data.toInventory === 'clothing') {
        const character = global.exports['ghost-lib'].getCharacter(source);
        if (character) {
            data.toInventory = `clothing-${character.citizenid}`;
            console.log(`Fixed clothing inventory name to: ${data.toInventory}`);
        }
        
        const clothingSlots = Inventory.ClothingSlots || [];
        const targetSlot = clothingSlots.find((slot: any) => slot.id === data.toSlot);
        
        if (targetSlot?.acceptedItems && !targetSlot.acceptedItems.includes(data.itemId)) {
            return false;
        }
    }

    if (data.toInventory.includes('backpack-')) {
        if (data.itemId === 'bag' || data.itemId === 'Backpack' || ItemList[data.itemId]?.name === 'Backpack') {
            console.log('Prevented placing a backpack inside another backpack');
            TriggerClientEvent('DoLongHudText', source, 'You cannot place a backpack inside another backpack.', 2);
            return false;
        }
    }
}

async function checkWeightLimits(source: number, data: any, fetchedItem: any) {
    if (data.fromInventory === data.toInventory) return true;
    
    const inventoriesToCheck = [
        'body-', 'backpack-', 'trunk-', 'glovebox-', 
        'pockets-', 'apartment-', 'wallet'
    ];
    
    const shouldCheckWeight = inventoriesToCheck.some(invType => 
        data.toInventory.includes(invType)
    );
    
    if (!shouldCheckWeight) return true;
    
    try {
        const itemQuantity = parseInt(fetchedItem.quantity || 1, 10);
        
        const destItem = await global.exports['oxmysql'].query_async(`
            SELECT * FROM user_inventory2 
            WHERE slot = @Slot AND name = @Name
        `, {
            '@Slot': data.toSlot,
            '@Name': data.toInventory
        });
        
        if (destItem && destItem[0]) {
            if (destItem[0].item_id === data.itemId && ItemList[data.itemId]?.stackable) {
                return true;
            }
            
            const sourceItemWeight = (ItemList[data.itemId]?.weight || 0) * itemQuantity;
            const destItemWeight = (ItemList[destItem[0].item_id]?.weight || 0) * 
                                 parseInt(destItem[0].quantity || 1, 10);
            
            if (sourceItemWeight <= destItemWeight) {
                return true;
            }
            
            const weightDifference = sourceItemWeight - destItemWeight;
            
            const inventoryItems = await global.exports.oxmysql.query_async(`
                SELECT * FROM user_inventory2 
                WHERE name = @Name AND NOT (slot = @ExcludeSlot)
            `, {
                '@Name': data.toInventory,
                '@ExcludeSlot': data.toSlot
            });
            
            let currentWeight = 0;
            for (const item of inventoryItems) {
                currentWeight += (ItemList[item.item_id]?.weight || 0) * parseInt(item.quantity || 1, 10);
            }
            
            const maxWeight = getMaxWeightForInventory(data.toInventory);
            
            if ((currentWeight + weightDifference) > maxWeight) {
                TriggerClientEvent('DoLongHudText', source, 'This would exceed the weight limit of this inventory.', 2);
                return false;
            }
        } else {
            return !(await wouldExceedWeightLimit(
                data.toInventory, 
                data.itemId, 
                itemQuantity
            ));
        }
        
        return true;
    } catch (error) {
        console.error('Error checking weight limits:', error);
        return false;
    }
}

function getMaxWeightForInventory(inventoryName: string): number {
    if (inventoryName.includes('body-')) 
        return InventoryConfig.PersonalInventory.MaxWeight;
    if (inventoryName.includes('backpack-')) 
        return InventoryConfig.Backpack.MaxWeight;
    if (inventoryName.includes('trunk-')) 
        return InventoryConfig.Trunk.MaxWeight;
    if (inventoryName.includes('glovebox-')) 
        return InventoryConfig.Glovebox.MaxWeight || 100;
    if (inventoryName.includes('pockets-')) 
        return InventoryConfig.Pockets.MaxWeight || 10;
    if (inventoryName.includes('apartment-')) 
        return InventoryConfig.ApartmentStash.MaxWeight || 500;
    if (inventoryName.includes('wallet')) 
        return InventoryConfig.Wallet.MaxWeight || 5;
    
    return 100;
}

RPC.register('inventory:splitItem', async(source: any, data: any) => {
    if (!data.toSlot || !data.toInventory || !data.amount || data.amount <= 0) {
        console.error('Invalid split item data');
        return;
    }

    const splitAmount = parseInt(data.amount, 10);
    
    const wouldExceed = await wouldExceedWeightLimit(
        data.toInventory, 
        data.itemId, 
        splitAmount
    );
    
    if (wouldExceed) {
        TriggerClientEvent('DoLongHudText', source, 'This would exceed the weight limit of the destination.', 2);
        return;
    }
    
    if (data.toInventory.includes('pockets')) {
        if (!Inventory.Pockets.Slots[data.toSlot - 1].acceptedItems.includes(ItemList[data.itemId].name)) {
            TriggerClientEvent('DoLongHudText', source, 'This item cannot be stored in this pocket slot.', 2);
            return;
        }
    }
    
    if (data.toInventory.includes('wallet')) {
        const isAccepted = InventoryConfig.Wallet.acceptedItems && 
                          Array.isArray(InventoryConfig.Wallet.acceptedItems) && 
                          InventoryConfig.Wallet.acceptedItems.includes(ItemList[data.itemId].name);
        
        if (!isAccepted) {
            TriggerClientEvent('DoLongHudText', source, 'This item cannot be stored in a wallet.', 2);
            return;
        }
    }
    
    let sourceQuery = '';
    let sourceParams = {};
    
    if (data.fromInventory.includes('ground::')) {
        sourceQuery = `
            SELECT * FROM user_inventory2 
            WHERE name LIKE @NamePattern AND slot = @Slot AND item_id = @ItemId
        `;
        sourceParams = {
            '@NamePattern': data.fromInventory,
            '@Slot': data.fromSlot,
            '@ItemId': data.itemId
        };
    } else {
        sourceQuery = `
            SELECT * FROM user_inventory2 
            WHERE name = @Name AND slot = @Slot AND item_id = @ItemId
        `;
        sourceParams = {
            '@Name': data.fromInventory,
            '@Slot': data.fromSlot,
            '@ItemId': data.itemId
        };
    }
    
    const sourceItem = await global.exports.oxmysql.query_async(sourceQuery, sourceParams);
    
    if (!sourceItem || !sourceItem[0]) {
        console.error('Source item not found for splitting');
        return;
    }
    
    const currentQuantity = parseInt(sourceItem[0].quantity || 1, 10);
    
    if (currentQuantity <= splitAmount) {
        TriggerClientEvent('DoLongHudText', source, 'You cannot split more items than available.', 2);
        return;
    }
    
    const destinationItem = await global.exports.oxmysql.query_async(`
        SELECT * FROM user_inventory2 
        WHERE name = @Name AND slot = @Slot
    `, {
        '@Name': data.toInventory,
        '@Slot': data.toSlot
    });
    
    if (destinationItem && destinationItem[0]) {
        if (destinationItem[0].item_id === data.itemId && ItemList[data.itemId].stackable) {
            const destQuantity = parseInt(destinationItem[0].quantity || 1, 10);
            const newDestQuantity = destQuantity + splitAmount;
            
            await global.exports['oxmysql'].query_async(`
                UPDATE user_inventory2 
                SET quantity = @Quantity 
                WHERE id = @Id
            `, {
                '@Id': destinationItem[0].id,
                '@Quantity': newDestQuantity
            });
            
            const newSourceQuantity = currentQuantity - splitAmount;
            
            await global.exports['oxmysql'].query_async(`
                UPDATE user_inventory2 
                SET quantity = @Quantity 
                WHERE id = @Id
            `, {
                '@Id': sourceItem[0].id,
                '@Quantity': newSourceQuantity
            });
            
            if (data.fromInventory.includes('ground::') && newSourceQuantity <= 0) {
                emit('np-objects:inv:DeleteObject', sourceItem[0].id, true);
            }
            
        } else {
            TriggerClientEvent('DoLongHudText', source, 'Cannot split into a slot with a different item.', 2);
            return;
        }
    } else {
        let insertQuery = `
            INSERT INTO user_inventory2 (item_id, name, slot, quantity) 
            VALUES (@ItemId, @Name, @Slot, @Quantity)
        `;
        
        if (sourceItem[0].information) {
            insertQuery = `
                INSERT INTO user_inventory2 (item_id, name, slot, quantity, information, quality) 
                VALUES (@ItemId, @Name, @Slot, @Quantity, @Information, @Quality)
            `;
        }
        
        await global.exports['oxmysql'].query_async(insertQuery, {
            '@ItemId': sourceItem[0].item_id,
            '@Name': data.toInventory,
            '@Slot': data.toSlot,
            '@Quantity': splitAmount,
            '@Information': sourceItem[0].information,
            '@Quality': sourceItem[0].quality
        });
        
        const newSourceQuantity = currentQuantity - splitAmount;
        
        await global.exports['oxmysql'].query_async(`
            UPDATE user_inventory2 
            SET quantity = @Quantity 
            WHERE id = @Id
        `, {
            '@Id': sourceItem[0].id,
            '@Quantity': newSourceQuantity
        });
        
        if (data.fromInventory.includes('ground::') && newSourceQuantity <= 0) {
            emit('np-objects:inv:DeleteObject', sourceItem[0].id, true);
        }
        
    }
    
    TriggerClientEvent('inventory:refreshInventory', source);
});

const equipSlots = {
    'id_card': 1,
    'phone': 2,
    'pixeltablet': 3,
    'key': 4,
    'wallet': 5,
    'hat': 6
}

RPC.register('inventory:equipItem', async(source: any, data: any) => {
    const character = global.exports['ghost-lib'].getCharacter(source)

    const foundItem = await global.exports.oxmysql.query_async('SELECT * FROM user_inventory2 WHERE name = @Name AND slot = @Slot', {
        ['@Name']: 'pockets-' + character.citizenid,
        ['@Slot']: equipSlots[data.ItemId]
    });

    if (!foundItem[0]) {
        const Item = await global.exports.oxmysql.query_async('SELECT * FROM user_inventory2 WHERE name = @Name AND slot = @Slot', {
            ['@Name']: data.Inventory,
            ['@Slot']: data.Slot
        });

        if (Item[0]) {
            await global.exports['oxmysql'].query_async('UPDATE user_inventory2 SET slot = @Slot, name = @Name WHERE id = @Id', {
                '@Id': Item[0].id,
                '@Slot': equipSlots[data.ItemId],
                '@Name': 'pockets-' + character.citizenid
            })    
        }
    }
})

RPC.register('inventory:unequipItem', async(source: any, data: any) => {
    const character = global.exports['ghost-lib'].getCharacter(source)

    const foundItem = await global.exports.oxmysql.query_async('SELECT * FROM user_inventory2 WHERE name = @Name AND slot = @Slot', {
        ['@Name']: 'pockets-' + character.citizenid,
        ['@Slot']: data.Slot
    });

    const newSlot = await findNextAvailableSlot(source, 'body-' + character.citizenid)

    if (foundItem[0] && newSlot) {
        await global.exports['oxmysql'].query_async('UPDATE user_inventory2 SET slot = @Slot, name = @Name WHERE id = @Id', {
            '@Id': foundItem[0].id,
            '@Slot': newSlot,
            '@Name': 'body-' + character.citizenid
        })    
    }
})

RPC.register('inventory:removeItem', async(source: any, data: any) => {
    const src = source
    await removeItem(src, data)
})