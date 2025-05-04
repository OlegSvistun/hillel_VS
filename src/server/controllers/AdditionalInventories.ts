import { InventoryConfig } from "./Config";
import { calculateInventoryWeight, getInventory, getItemInSlot } from "./Functions";

export let AdditionalInventories = {};

const OpenInventoryTypes = {};

RPC.register('inventory:additionalInventoriesClear', async (source: any) => {
    const character = global.exports['ghost-lib'].getCharacter(source);
    AdditionalInventories[character.citizenid] = [];

    if (OpenInventoryTypes[character.citizenid]) {
        OpenInventoryTypes[character.citizenid] = {};
    }
});

RPC.register('inventory:additionalInventoriesAdd', async (source: any, data: any) => {
    const character = global.exports['ghost-lib'].getCharacter(source);
    let invAdd: any = {}

    if (!OpenInventoryTypes[character.citizenid]) {
        OpenInventoryTypes[character.citizenid] = {};
    }

    const result = await global.exports['oxmysql'].query_async('SELECT id FROM user_inventory2 WHERE name = @name AND item_id = @item AND slot = @slot', {
        '@name': data.isSideSlot ? 'pockets-'+character.citizenid : data.fromInventory,
        '@item': data.ItemId,
        '@slot': data.slot
    });

    
    if (data.itemAction === "openSimSlot"){
        if (OpenInventoryTypes[character.citizenid]['simcard']) {
            return;
        }
        
        let customCid = data.fromInventory === null ? character.citizenid : extractNumber(data.fromInventory)
        invAdd = {
            name: 'simcard-'+ customCid,
            InvName: 'Mobile Phone',
            ConfigName: 'Simcard',
            MaxWeight: InventoryConfig['Simcard'].MaxWeight,
            Slots: [{
                id: 1,
                acceptedItems: InventoryConfig['Simcard'].acceptedItems
            }]
        }

        OpenInventoryTypes[character.citizenid]['simcard'] = true;
        }else if(data.itemAction === "openWallet"){
            if (OpenInventoryTypes[character.citizenid]['wallet']) {
                return;
            }
            let customCid = data.fromInventory === null ? character.citizenid : extractNumber(data.fromInventory)
            invAdd = {
                name: data.ItemId+'::'+result[0].id+'::'+customCid,
                InvName: 'Wallet',
                ConfigName: 'Wallet',
                Slots: InventoryConfig['Wallet'].Slots || 5
            }
        
            OpenInventoryTypes[character.citizenid]['wallet'] = true;
    }else if(data.itemAction === "apartment::stash"){
        invAdd = {
            name: 'apartment-'+character.citizenid,
            InvName: 'Stash',
            ConfigName: 'ApartmentStash'
        }
    }else if(data.itemAction === "openTrunk"){
        invAdd = {
            name: 'trunk-' + data.Plate,
            InvName: 'Trunk',
            ConfigName: 'Trunk'
        }
    }else if(data.itemAction === "robPlayer"){
        AdditionalInventories[character.citizenid] = [];
        AdditionalInventories[character.citizenid].push({
            id: AdditionalInventories[character.citizenid].length + 1,
            name: 'pockets-'+data.cid,
            inventoryName: 'Pockets',
            ConfigName: 'Pockets',
            MaxWeight: InventoryConfig['Pockets'].MaxWeight,
            Slots: [
                {
                    id: 1,
                    icon: 'idcard',
                    item: await getItemInSlot(source, 'pockets-' + data.cid, 1),
                    acceptedItems: [
                        'ID Card'
                    ]
                },
                {
                    id: 2,
                    icon: 'phone',
                    item: await getItemInSlot(source, 'pockets-' + data.cid, 2),
                    acceptedItems: [
                        'Mobile Phone'
                    ]
                },
                {
                    id: 3,
                    icon: 'tablet',
                    item: await getItemInSlot(source, 'pockets-' + data.cid, 3),
                    acceptedItems: [
                        'Pixel Tablet'
                    ]
                },
                {
                    id: 4,
                    icon: 'key',
                    item: await getItemInSlot(source, 'pockets-' + data.cid, 4),
                    acceptedItems: [
                        'housekey'
                    ]
                },
                {
                    id: 5,
                    icon: 'wallet',
                    item: await getItemInSlot(source, 'pockets-' + data.cid, 5),
                    acceptedItems: [
                        'Wallet'
                    ]
                }
            ]
        });
        AdditionalInventories[character.citizenid].push({
            id: AdditionalInventories[character.citizenid].length + 1,
            name: 'backpack-'+data.cid,
            inventoryName: 'Backpack',
            ConfigName: 'Backpack',
            MaxWeight: InventoryConfig['Backpack'].MaxWeight,
            Slots: InventoryConfig['Backpack'].Slots
        });

        AdditionalInventories[character.citizenid].push({
            id: AdditionalInventories[character.citizenid].length + 1,
            name: 'body-'+data.cid,
            inventoryName: 'Body',
            ConfigName: 'PersonalInventory',
            MaxWeight: InventoryConfig['PersonalInventory'].MaxWeight,
            Slots: InventoryConfig['PersonalInventory'].Slots
        });

    }
    
    if (!Array.isArray(AdditionalInventories[character.citizenid])) {
        AdditionalInventories[character.citizenid] = [];
    }
    
    if (invAdd.name && invAdd.InvName && invAdd.ConfigName) {
        AdditionalInventories[character.citizenid].push({
            id: AdditionalInventories[character.citizenid].length + 1,
            name: invAdd.name,
            inventoryName: invAdd.InvName,
            ConfigName: invAdd.ConfigName,
            MaxWeight: invAdd.MaxWeight || InventoryConfig[invAdd.ConfigName].MaxWeight,
            Slots: invAdd.Slots || InventoryConfig[invAdd.ConfigName].Slots,
            type: data.itemAction === "openSimSlot" ? "simcard" : 
                  data.itemAction === "openWallet" ? "wallet" : "other"
        });
    } else {
        console.error(`Failed to add inventory - missing required properties in invAdd: ${JSON.stringify(invAdd)}`);
    }
});

export async function getAdditionalInventories(source: any) {
    const character = global.exports['ghost-lib'].getCharacter(source);
    const AddedInventory = []

    AdditionalInventories[character.citizenid].map(async (data: any) => {
        AddedInventory.push({
            id: data.id,
            name: data.name,
            maxWeight: InventoryConfig[data.ConfigName].MaxWeight ? InventoryConfig[data.ConfigName].MaxWeight : 100,
            Weight: await calculateInventoryWeight(data.name),
            InventoryOpened: true,
            inventoryName: data.inventoryName,
            slots: await getInventory(source, data.name, InventoryConfig[data.ConfigName].Slots, false)
        })
    })

    return AddedInventory
}

function extractNumber(inputString: string): number | null {
    const parts = inputString.split('-')
    const numberString = parts[parts.length - 1]
    const number = parseInt(numberString, 10)
    return isNaN(number) ? null : number
}