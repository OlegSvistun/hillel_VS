import { getClientInventory } from './Exports';


export async function getItemQuality(itemId: string, slot: number, inventoryName: string): Promise<number> {
    const clientInventory = await getClientInventory();

    if (!clientInventory || !clientInventory[0]) return 0;
    
    const inventories = [
        clientInventory[0].PersonalInventory,
        clientInventory[0].PersonalBackpack,
        ...(clientInventory[0].AdditionalInventories || []),
        clientInventory[0].PrimarySecondaryInventory
    ];
    
    for (const inv of inventories) {
        if (!inv || !inv.slots) continue;
        
        for (const invSlot of inv.slots) {
            if (inv.name === inventoryName && invSlot.id === slot && invSlot.item && invSlot.item.itemId === itemId) {
                return invSlot.item.durability || 0;
            }
        }
    }
    
    return 0;
}

RegisterCommand('checkquality', async(source, args) => {
    const itemId = args[0];
    const slotNum = parseInt(args[1] || "1");
    const invName = args[2] || "body";
    
    if (!itemId) {
        emit('DoLongHudText', 'Usage: /checkquality [itemId] [slot] [inventory]', 2);
        return;
    }
    
    const quality = getItemQuality(itemId, slotNum, invName);
    emit('DoLongHudText', `Item ${itemId} quality: ${quality}%`, 1);
}, false);