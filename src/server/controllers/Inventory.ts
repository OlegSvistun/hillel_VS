import { type } from 'os';
import { AdditionalInventories, getAdditionalInventories } from './AdditionalInventories';
import { InventoryConfig } from './Config';
import { calculateInventoryWeight, getInventory, getItemInSlot, getInvDropNameByID } from './Functions';

export let Inventory: any = [];

RPC.register('inventory:getInventories', async (source: any, inVehicle: any, licensePlate: any, isTrunk: any, TrunkPlate: any, GroundInv: any, cid: number) => {
    const character = global.exports['ghost-lib'].getCharacter(source);

    try {
        const generateClothingSlots = async () => {
            const clothingSlots = [
                { id: 1, acceptedItems: ['hat', 'Hat'], name : 'hat' },
                { id: 2, acceptedItems: ['mask', 'Mask'], name : 'mask' },
                { id: 3, acceptedItems: ['glasses', 'Glasses'], name : 'glasses' },
                { id: 4, acceptedItems: ['armor', 'Chest Armor'], name : 'armor' },
                { id: 5, acceptedItems: ['bag', 'backpack', 'Backpack'], name : 'bag' }
            ];
            return await Promise.all(clothingSlots.map(async slot => ({
                id: slot.id,
                icon: slot.name,
                item: await getItemInSlot(source, 'clothing-' + character.citizenid, slot.id),
                acceptedItems: slot.acceptedItems
            })));
        };
        
        const generatePocketSlots = async () => {
            const pocketSlots = [
                { id: 1, icon: 'idcard', acceptedItems: ['ID Card'] },
                { id: 2, icon: 'phone', acceptedItems: ['Mobile Phone'] },
                { id: 3, icon: 'tablet', acceptedItems: ['Pixel Tablet'] },
                { id: 4, icon: 'key', acceptedItems: ['House Key'] },
                { id: 5, icon: 'wallet', acceptedItems: ['Wallet'] }
            ];
            return await Promise.all(pocketSlots.map(async slot => ({
                id: slot.id,
                icon: slot.icon,
                item: await getItemInSlot(source, 'pockets-' + character.citizenid, slot.id),
                acceptedItems: slot.acceptedItems
            })));
        };

        Inventory = {
            ClothingSlots: await generateClothingSlots(),

            Pockets: {
                name: 'pockets-' + character.citizenid,
                Slots: await generatePocketSlots(),
                maxWeight: InventoryConfig.Pockets.MaxWeight,
                Weight: await calculateInventoryWeight('pockets-' + character.citizenid)
            },

            PersonalInventory: {
                maxWeight: InventoryConfig.PersonalInventory.MaxWeight,
                Weight: await calculateInventoryWeight('body-' + character.citizenid),
                inventoryName: 'body-' + character.citizenid,
                slots: await getInventory(source,'body-' + character.citizenid, InventoryConfig.PersonalInventory.Slots, true)
            },

            PersonalBackpack: {
                maxWeight: InventoryConfig.Backpack.MaxWeight,
                Weight: await calculateInventoryWeight('backpack-' + character.citizenid),
                inventoryName: 'backpack-' + character.citizenid,
                slots: await getInventory(source,'backpack-' + character.citizenid, InventoryConfig.Backpack.Slots, false)
            },

            AdditionalInventories: await getAdditionalInventories(source)
        };

        if (!inVehicle) {
            if (typeof GroundInv === "string") {
                Inventory.PrimarySecondaryInventory = {
                    maxWeight: InventoryConfig.Drop.MaxWeight,
                    Weight: await calculateInventoryWeight(GroundInv),
                    inventoryName: GroundInv,
                    inventoryLabel: 'Ground',
                    slots: await getInventory(source, GroundInv, InventoryConfig.Drop.Slots, false)
                };
            } else {
                console.error('No ground inventory found with name: ' , GroundInv)
            }
        }

        if (inVehicle && !isTrunk) {
            console.log(`Somehow opened the inventory of a vehicle without a trunk. License Plate: ${licensePlate}`);
            Inventory.PrimarySecondaryInventory = {
                maxWeight: InventoryConfig.Glovebox.MaxWeight,
                Weight: await calculateInventoryWeight('glovebox::' + licensePlate),
                inventoryName: 'glovebox::' + licensePlate,
                inventoryLabel: 'Glovebox',
                slots: await getInventory(source, 'glovebox::' + licensePlate, InventoryConfig.Glovebox.Slots, false)
            };
        }

        if (isTrunk) {
            Inventory.PrimarySecondaryInventory = {
                maxWeight: InventoryConfig.Trunk.MaxWeight,
                Weight: await calculateInventoryWeight('trunk::' + TrunkPlate),
                inventoryName: 'trunk::' + TrunkPlate,
                inventoryLabel: 'Trunk',
                slots: await getInventory(source, 'trunk::' + TrunkPlate, InventoryConfig.Trunk.Slots, false)
            };
        }
    } catch (error) {
        console.error('Error in inventory:getInventories:', error)
    }

    return Inventory;
});
