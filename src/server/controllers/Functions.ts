import { runInNewContext } from "vm";
import { InventoryConfig } from "./Config";
import { ItemList } from "./ItemList";

interface Item {
    id: number
    name: string
    item_id: string
    amount?: number
}
  
interface InventoryItem {
    itemId: string
    durability: number
    amount: number
}

interface Item {
    id: number
    name: string
    item_id: string
    slot: number
    quantity: number
    quality?: string | number
}

export async function getItemInSlot(source: number, inventory: string, slot: number): Promise<InventoryItem | null> {
    try {
      const item = await getItem(source, inventory, slot)

      if (!item) return null
  
      return {
        itemId: item.item_id,
        durability: item.quality !== undefined ? parseInt(item.quality.toString()) : 100,
        amount: item.quantity || 1,
      }
    } catch (error) {
      console.error("Error in getItemInSlot:", error)
      return null
    }
}


async function getItem(source: number, inventoryName: any, slot: number): Promise<Item | null> {

  if (typeof inventoryName === 'number') { // assume a inventory ID is being supplied since this will only ever be a number (deprecated not to be used)
    const actualName = await getInvDropNameByID(inventoryName)
    console.warn(`This is deprecated and should not be used, please use the string version of the inventory name. ${actualName}`)
    inventoryName = actualName
  }

  if (inventoryName.startsWith('ground::')) {
    return getGroundItem(inventoryName, slot)
  }

  const itemData = await global.exports.oxmysql.query_async('SELECT * FROM user_inventory2 WHERE name = @Name AND slot = @Slot', {
    ['@Name']: inventoryName,
    ['@Slot']: slot
  });

  return itemData.length > 0 ? itemData[0] : null
}
  

async function getGroundItem(inventory: string, slot: number): Promise<Item | null> {
  const inventoryParts = inventory.split('::')

  if (inventoryParts.length <= 1) {
    console.warn("Invalid Inventory format.")
    return null
  }

  const coords = inventoryParts[1].split(',').map(parseFloat)
  if (coords.length !== 3) {
    console.warn("Invalid coordinates format in Inventory name.");
    return null
  }

  const [x, y, z] = coords

  const closestDrop = await findClosestDrop(x, y, z, 2)

  if (closestDrop != null && closestDrop.slot === slot) {
    return closestDrop
  }
  
  return null
}

export async function findNextAvailableSlot(source: number, Inventory: any) {
    const itemData = await global.exports.oxmysql.query_async('SELECT MAX(slot) AS maxSlot FROM user_inventory2 WHERE name = @Name', {
        '@Name': Inventory,
    })

    const highestSlot = itemData.length > 0 ? itemData[0].maxSlot : 0

    for (let slot = 1; slot <= highestSlot + 1; slot++) {
        const slotCheck = await global.exports.oxmysql.query_async('SELECT COUNT(*) AS count FROM user_inventory2 WHERE name = @Name AND slot = @Slot', {
            '@Name': Inventory,
            '@Slot': slot
        })

        if (slot > 15) {
            emitNet('DoLongHudText', source, 'No available slots.', 2)
            return
        }

        if (slotCheck[0].count === 0) {
            return slot
        }
    }

    return '[ERROR] NO AVAILABLE SLOTS';
}

export async function calculateInventoryWeight(Inventory: string): Promise<number> { 
  let totalWeight = 0

  if (Inventory.startsWith("ground::")) {
      const inventoryParts = Inventory.split('::')
      if (inventoryParts.length <= 1) {
          console.warn("Invalid Inventory format for ground drop.");
          return totalWeight
      }

      const coords = inventoryParts[1].split(',').map(parseFloat)
      if (coords.length !== 3) {
          console.warn("Invalid coordinates format in Inventory name for ground drop.");
          return totalWeight
      }

      const [x, y, z] = coords

      const closestDrop = await findClosestDrop(x, y, z, 2)

      if (!closestDrop) {
          return totalWeight
      }
      
      const itemData = await global.exports.oxmysql.query_async('SELECT * FROM user_inventory2 WHERE name = @Name', {
          ['@Name']: closestDrop.name,
      })

      for (const item of itemData) {
          const itemWeight = ItemList[item.item_id]?.weight ?? 0;
          
          const quantity = parseInt(item.quantity || 1, 10);
          
          totalWeight += itemWeight * quantity;
      }

  } else {
      const itemData = await global.exports.oxmysql.query_async('SELECT * FROM user_inventory2 WHERE name = @Name', {
          ['@Name']: Inventory,
      })

      for (const item of itemData) {
          const itemWeight = ItemList[item.item_id]?.weight ?? 0;
          
          const quantity = parseInt(item.quantity || 1, 10);
          
          totalWeight += itemWeight * quantity;
      }
  }

  return totalWeight
}

function checkIfHotbar(id: number) {
    if (id >= 1 && id <= 5) {
        return true
    } else {
        return false
    }
}

export async function getInventory(src: number, savedName: any, Slots: any, checkHotbar: any) {
    const Inventory = [];

    if (typeof savedName === 'string' && savedName.startsWith('ground::')) {
        for (let i = 0; i < Slots; i++) {
            Inventory.push({
                id: i + 1,
                hotBar: checkHotbar ? checkIfHotbar(i + 1) : false,
                item: null,
            });
        }

        try {
            const items = await global.exports.oxmysql.query_async(`
                SELECT id, item_id, name, slot, information, quality, quantity
                FROM user_inventory2 
                WHERE name = ? AND dropped = 1
            `, [savedName]);

            if (items && items.length > 0) {
                for (const item of items) {
                    const slot = parseInt(item.slot);
                    if (slot > 0 && slot <= Slots) {
                        let information = {};
                        try {
                            information = item.information ? JSON.parse(item.information) : {};
                        } catch (e) {
                            console.error(`Failed to parse information for item ${item.id}:`, e);
                        }

                        Inventory[slot - 1].item = {
                            itemId: item.item_id,
                            dbId: item.id,
                            durability: parseInt(item.durability || item.quality || 100),
                            amount: parseInt(item.quantity || 1),
                            ...information
                        };
                    }
                }
            }

            return Inventory;
        } catch (error) {
            console.error(`Error fetching ground inventory (${savedName}):`, error);
            return Inventory;
        }
    }
    
    for (let i = 0; i < Slots; i++) {
        Inventory.push({
            id: i + 1,
            hotBar: checkHotbar ? checkIfHotbar(i + 1) : false,
            item: await getItemInSlot(src, savedName, i + 1),
        });
    }

    return Inventory;
}

export async function getInvDropNameByID (inventoryID: any = false) {
  if (!inventoryID) return console.warn('No Inventory ID provided could not determine name..')

  const itemData = await global.exports.oxmysql.query_async('SELECT * FROM user_inventory2 WHERE id = @Id', {
    ['@Id']: inventoryID,
  })

  return itemData[0].name
}

export async function getInvDropIDByID (inventoryID: any = false) {
  if (!inventoryID) return console.warn('No Inventory ID provided could not determine name..')

  const itemData = await global.exports.oxmysql.query_async('SELECT * FROM user_inventory2 WHERE id = @Id', {
    ['@Id']: inventoryID,
  })

  return itemData[0].id
}

export async function handleGroundInventory(data: any, fetchedItem: any): Promise<boolean> {
    if (data.toInventory.includes('ground::')) {
        try {
            await global.exports['oxmysql'].query_async(`
                UPDATE user_inventory2 
                SET slot = ?, name = ?, dropped = 1, createdAt = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [
                data.toSlot,
                data.toInventory,
                fetchedItem.id
            ]);
            
            const coordsMatch = data.toInventory.match(/ground::(-?\d+\.\d+),(-?\d+\.\d+),(-?\d+\.\d+)::/);
            if (coordsMatch) {
                const [x, y, z] = coordsMatch.slice(1).map(parseFloat);
                
                emit('np-objects:inv:prepareObject', fetchedItem.item_id, x, y, z, 0, {
                    inventoryDrop: true,
                    itemId: fetchedItem.item_id
                }, fetchedItem.id);
                
                console.log(`Created ground item: ${data.toInventory} with ID: ${fetchedItem.id}`);
            }
            
            return true;
        } catch (error) {
            console.error('Error dropping item to ground:', error);
            return false;
        }
    }
    
    return false;
}

export async function findClosestDrop(x: number, y: number, z: number, radius: number = 2.0): Promise<any> {
    const drops = await global.exports['oxmysql'].query_async(`
        SELECT id, name, item_id, slot, quantity, dropped
        FROM user_inventory2 
        WHERE dropped = 1
    `);
  
    if (!drops || drops.length === 0) return null;
    
    let closestDrop = null;
    let closestDistance = Infinity;
    
    for (const drop of drops) {
        if (!drop.name || typeof drop.name !== 'string') continue;
        
        const dropMatch = drop.name.match(/ground::(-?\d+\.\d+),(-?\d+\.\d+),(-?\d+\.\d+)::/);
        if (dropMatch) {
            const [dx, dy, dz] = dropMatch.slice(1).map(parseFloat);
            
            const distance = Math.sqrt(
                Math.pow(dx - x, 2) + Math.pow(dy - y, 2) + Math.pow(dz - z, 2)
            );
            
            if (distance < closestDistance && distance <= radius) {
                closestDistance = distance;
                closestDrop = drop;
            }
        }
    }
    
    return closestDrop;
}

export async function removeItem(source:number, data:any){
  const character = global.exports['ghost-lib'].getCharacter(source);

  const isStackable = ItemList[data.Item] && ItemList[data.Item].stackable;
  const amount = parseInt(data.Amount, 10) || 1;
  
  const inventories = [
      { name: `body-${character.citizenid}`, displayName: "Inventory" },
      { name: `backpack-${character.citizenid}`, displayName: "Backpack" },
      { name: `clothing-${character.citizenid}`, displayName: "Clothing" },
      { name: `pockets-${character.citizenid}`, displayName: "Pockets" }
  ];
  
  let inventoryItems = [];
  
  for (const inv of inventories) {
      const foundItems = await global.exports.oxmysql.query_async(
          'SELECT * FROM user_inventory2 WHERE name = @Name AND item_id = @ItemId ORDER BY quantity DESC', {
              ['@Name']: inv.name,
              ['@ItemId']: data.Item
          }
      );
      
      if (foundItems && foundItems.length > 0) {
          foundItems.forEach(item => {
              inventoryItems.push({
                  ...item,
                  inventoryType: inv.name,
                  displayName: inv.displayName
              });
          });
      }
  }
  
  if (inventoryItems.length === 0) {
      console.log(`No ${data.Item} found in any inventory to remove`);
      return false;
  }
  
  let remainingToRemove = amount;
  let removedTotal = 0;
  
  if (isStackable) {
      for (const item of inventoryItems) {
          if (remainingToRemove <= 0) break;
          
          const itemQuantity = parseInt(item.quantity || 1, 10);
          
          if (itemQuantity <= remainingToRemove) {
              await global.exports.oxmysql.query_async(
                  'DELETE FROM user_inventory2 WHERE id = @Id', {
                      ['@Id']: item.id
                  }
              );
              remainingToRemove -= itemQuantity;
              removedTotal += itemQuantity;
          } else {
              const newQuantity = itemQuantity - remainingToRemove;
              await global.exports.oxmysql.query_async(
                  'UPDATE user_inventory2 SET quantity = @Quantity WHERE id = @Id', {
                      ['@Id']: item.id,
                      ['@Quantity']: newQuantity
                  }
              );
              removedTotal += remainingToRemove;
              remainingToRemove = 0;
          }
      }
  } else {
      for (let i = 0; i < Math.min(amount, inventoryItems.length); i++) {
          await global.exports.oxmysql.query_async(
              'DELETE FROM user_inventory2 WHERE id = @Id', {
                  ['@Id']: inventoryItems[i].id
              }
          );
          removedTotal++;
      }
  }
  
  if (removedTotal > 0) {
      emitNet('inventory:sendNotification', source, data.Item, removedTotal, 'Removed');
      TriggerClientEvent('inventory:refreshInventory', source);
    //   console.log(`Removed ${removedTotal} ${data.Item} for player ${character.citizenid}`);
      return true;
  }
  
  return false;
}

export async function wouldExceedWeightLimit(
  inventoryName: string, 
  itemId: string, 
  quantity: number,
  excludeItemId?: string,
  excludeSlot?: number
): Promise<boolean> {
  let maxWeight = 0;
  
  if (inventoryName.includes('body-')) {
    maxWeight = InventoryConfig.PersonalInventory.MaxWeight;
  } else if (inventoryName.includes('backpack-')) {
    maxWeight = InventoryConfig.Backpack.MaxWeight;
  } else if (inventoryName.includes('trunk-')) {
    maxWeight = InventoryConfig.Trunk.MaxWeight;
  } else if (inventoryName.includes('glovebox-')) {
    maxWeight = InventoryConfig.Glovebox.MaxWeight;
  } else if (inventoryName.includes('apartment-')) {
    maxWeight = InventoryConfig.ApartmentStash.MaxWeight;
  } else if (inventoryName.includes('pockets-')) {
    maxWeight = InventoryConfig.Pockets.MaxWeight;
  } else if (inventoryName.includes('ground::')) {
    maxWeight = InventoryConfig.Drop.MaxWeight;
  } else if (inventoryName.includes('wallet')) {
    maxWeight = InventoryConfig.Wallet.MaxWeight;
  } else {
    console.log(`Using default weight for unknown inventory type: ${inventoryName}`);
    maxWeight = 50;
  }
  
  const query = excludeSlot !== undefined ? 
    'SELECT * FROM user_inventory2 WHERE name = @Name AND NOT (slot = @ExcludeSlot AND item_id = @ExcludeItemId)' :
    'SELECT * FROM user_inventory2 WHERE name = @Name';
  
  const params = excludeSlot !== undefined ? 
    { '@Name': inventoryName, '@ExcludeSlot': excludeSlot, '@ExcludeItemId': excludeItemId } :
    { '@Name': inventoryName };
    
  const inventoryItems = await global.exports.oxmysql.query_async(query, params);
  
  let currentWeight = 0;
  if (inventoryItems && inventoryItems.length > 0) {
    for (const item of inventoryItems) {
      const itemWeight = ItemList[item.item_id]?.weight || 0;
      const itemQuantity = parseInt(item.quantity || 1, 10);
      currentWeight += itemWeight * itemQuantity;
    }
  }
  
  const addingItemWeight = (ItemList[itemId]?.weight || 0) * quantity;
  const totalWeight = currentWeight + addingItemWeight;
  
  
  return totalWeight > maxWeight;
}

export async function deleteGroundObject(itemId: number): Promise<boolean> {
    try {
        const itemCheck = await global.exports['oxmysql'].query_async(
            'SELECT * FROM user_inventory2 WHERE id = ? AND dropped = 1 LIMIT 1', [itemId]
        );
        
        if (!itemCheck || itemCheck.length === 0) {
            console.log(`Item ID ${itemId} not found or not marked as dropped, skipping deletion`);
            return false;
        }
        
        console.log(`Attempting to delete ground object for item ID ${itemId}`);
        
        emit('np-objects:inv:DeleteObject', itemId, true);
        
        return true;
    } catch (error) {
        console.error(`Error deleting ground object ID ${itemId}:`, error);
        return false;
    }
}