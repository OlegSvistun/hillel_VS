global.exports("getItemListNames", async() => {
    const orderedItems = [];
    const itemList = await RPC.execute('inventory:getItemList');

    Object.keys(itemList).forEach((itemName, index) => {
        const data = itemList[itemName];
        orderedItems.push({
            id: itemName,
            name: data.name
        });
    });

    return orderedItems;
});

global.exports("GetItemList", async() => {
    const itemList = await RPC.execute('inventory:getItemList');
    return [true , itemList];
});

global.exports("HasItem", async(Item: any, Amount: any) => {
    // TODO
})

global.exports("OpenInventory", async() => {
    ExecuteCommand('+inventory')
})

global.exports("hasEnoughOfItem", async(itemid: any, amount: number, shouldReturnText = false, checkQuality = false, metaInformation = false) => {
    return await hasEnoughOfItem(itemid, amount, shouldReturnText, checkQuality, metaInformation)
})

export async function hasEnoughOfItem(itemId, amount, shouldReturnText, checkQuality, metaInformation){
    if(shouldReturnText === undefined) shouldReturnText = true;
    if(itemId === undefined || itemId === 0 || amount === undefined || amount === 0){
        if(shouldReturnText) emit('DoLongHudText','I dont seem to have ' + itemId + ' in my packets.',2);
        return false
    }
    amount = Number(amount)
    let slot = 0
    let found = false
    const itemQuantity = await getQuantity(itemId, checkQuality, metaInformation)
    if(itemQuantity >= amount) return true;
    return false
}

let clientInventory: any

export async function setClientInventory(inventory: any) {
    clientInventory = inventory
}

// onNet('inventory:client:updateInv', async (inventory: any) => {
//   await setClientInventory(inventory)
// })

export function getClientInventory() {
    return clientInventory
}

export function getQuantity(itemid: string | number, checkQuality: boolean = false, metaInformation: any = null): number {
    let totalAmount = 0
    const clientInventory = getClientInventory()
    
    if (!clientInventory || !clientInventory[0]) {
      console.debug('Client inventory not found or empty');
      return 0;
    }
    
    if (clientInventory[0].ClothingSlots) {
      for (const slot of clientInventory[0].ClothingSlots) {
        if (slot.item && slot.item.itemId === itemid) {
          totalAmount += parseInt(slot.item.amount || 1, 10);
        }
      }
    }
    
    if (clientInventory[0].Pockets && clientInventory[0].Pockets.Slots) {
      for (const slot of clientInventory[0].Pockets.Slots) {
        if (slot.item && slot.item.itemId === itemid) {
          const amount = parseInt(slot.item.amount || 1, 10);
          totalAmount += amount;
        }
      }
    }
    
    if (clientInventory[0].PersonalInventory && clientInventory[0].PersonalInventory.slots) {
      for (const slot of clientInventory[0].PersonalInventory.slots) {
        if (slot.item && slot.item.itemId === itemid) {
          if (checkQuality && slot.item.durability <= 0) {
            continue;
          }
          
          if (metaInformation && slot.item.information) {
            let itemMeta;
            try {
              itemMeta = typeof slot.item.information === 'string' 
                ? JSON.parse(slot.item.information) 
                : slot.item.information;
              
              let metaMatches = true;
              for (const key in metaInformation) {
                if (itemMeta[key] !== metaInformation[key]) {
                  metaMatches = false;
                  break;
                }
              }
              
              if (!metaMatches) continue;
            } catch (e) {
              console.error('Error parsing item metadata:', e);
              continue;
            }
          }
          
          const amount = parseInt(slot.item.amount || 1, 10);
          totalAmount += amount;
        }
      }
    }
    
    if (clientInventory[0].PersonalBackpack && clientInventory[0].PersonalBackpack.slots) {
      for (const slot of clientInventory[0].PersonalBackpack.slots) {
        if (slot.item && slot.item.itemId === itemid) {
          if (checkQuality && slot.item.durability <= 0) continue;
          
          if (metaInformation && slot.item.information) {
            let itemMeta;
            try {
              itemMeta = typeof slot.item.information === 'string' 
                ? JSON.parse(slot.item.information) 
                : slot.item.information;
              
              let metaMatches = true;
              for (const key in metaInformation) {
                if (itemMeta[key] !== metaInformation[key]) {
                  metaMatches = false;
                  break;
                }
              }
              
              if (!metaMatches) continue;
            } catch (e) {
              console.error('Error parsing item metadata:', e);
              continue;
            }
          }
          
          const amount = parseInt(slot.item.amount || 1, 10);
          totalAmount += amount;
        }
      }
    }
    
    if (clientInventory[0].AdditionalInventories && Array.isArray(clientInventory[0].AdditionalInventories)) {
      for (const inventory of clientInventory[0].AdditionalInventories) {
        if (inventory.slots) {
          for (const slot of inventory.slots) {
            if (slot.item && slot.item.itemId === itemid) {

              if (checkQuality && slot.item.durability <= 0) continue;
              
              if (metaInformation && slot.item.information) {
                let itemMeta;
                try {
                  itemMeta = typeof slot.item.information === 'string' 
                    ? JSON.parse(slot.item.information) 
                    : slot.item.information;
                  
                  let metaMatches = true;
                  for (const key in metaInformation) {
                    if (itemMeta[key] !== metaInformation[key]) {
                      metaMatches = false;
                      break;
                    }
                  }
                  
                  if (!metaMatches) continue;
                } catch (e) {
                  console.error('Error parsing item metadata:', e);
                  continue;
                }
              }
              
              const amount = parseInt(slot.item.amount || 1, 10);
              totalAmount += amount;
            }
          }
        }
      }
    }
    
    if (clientInventory[0].PrimarySecondaryInventory && clientInventory[0].PrimarySecondaryInventory.slots) {
      for (const slot of clientInventory[0].PrimarySecondaryInventory.slots) {
        if (slot.item && slot.item.itemId === itemid) {

          if (checkQuality && slot.item.durability <= 0) continue;
          
          if (metaInformation && slot.item.information) {
            let itemMeta;
            try {
              itemMeta = typeof slot.item.information === 'string' 
                ? JSON.parse(slot.item.information) 
                : slot.item.information;
              
              let metaMatches = true;
              for (const key in metaInformation) {
                if (itemMeta[key] !== metaInformation[key]) {
                  metaMatches = false;
                  break;
                }
              }
              
              if (!metaMatches) continue;
            } catch (e) {
              console.error('Error parsing item metadata:', e);
              continue;
            }
          }
          
          const amount = parseInt(slot.item.amount || 1, 10);
          totalAmount += amount;
        }
      }
    }
    
    return totalAmount;
  }