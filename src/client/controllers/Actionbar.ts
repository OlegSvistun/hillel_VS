import { Inventory } from './../modules/inventory/index';
import { hasEnoughOfItem , getQuantity } from './../controllers/Exports'
import { Streaming } from '../../client/modules/streaming/streaming';
import { Vector3 } from "../../shared/classes/vector";
import { Vector2 } from "../../shared/classes/vector2";
import '@citizenfx/client'
import { getClientInventory } from './Exports';
import { trunkState } from "./Trunk"

declare interface CitizenInterface {
    Wait: (ms: number) => void
}

declare const Citizen: CitizenInterface

let actionBarTimeout: any


async function getActionbarItems() {
    const items = await RPC.execute('inventory:getActionbarItems');
    
    SendNUIMessage({
        actionBarItems: items
    });
}

async function displayActionbar(state: any) {
    await getActionbarItems()
    SendNUIMessage({
        event: 'inventory:toggleActionbar'
    });

    TriggerEvent('np-weapons:client:openActionBar')
}

RegisterCommand('+actionBar', async () => {
    await displayActionbar(true);
}, false);

RegisterCommand('-actionBar', async () => {
    await displayActionbar(false);
}, false);

RegisterCommand('hideactionbar', () => {
    SendNUIMessage({
        event: 'inventory:toggleActionbar'
    });
}, false)


let actionbarTimeout = false
const actionBarSlots = [1, 2, 3, 4, 5];

global.exports['qb-keybinds'].registerKeyMapping('ActionBar', 'Inventory', 'Show actionbar', '+actionBar', '-actionBar', 'TAB');

actionBarSlots.forEach(slot => {
    global.exports['qb-keybinds'].registerKeyMapping('inventory', 'Inventory', `Actionbar Slot ${slot}`, `+useActionbar_${slot}`, '', slot, true);

    RegisterCommand(`+useActionbar_${slot}`, async () => {
        const Item = await RPC.execute('inventory:getItemInActionbarSlot', slot)

        if (!Item[0]) return

        if (Item[0].item_id && !actionbarTimeout) {
            const currentItemData = Item[0]
            emit('inventory:sendNotification', Item[0].item_id, 1, 'Used')

            useItem(currentItemData.item_id, slot , currentItemData.name, currentItemData, 1)

            actionbarTimeout = true

            setTimeout(() => {
                actionbarTimeout = false
            }, 2500)
        }

    }, false);
});

let customMarketItems = {
    ["customfooditem"] : true,
    ["customwateritem"] : true,
    ["customcoffeeitem"] : true,
    ["customjointitem"] : true,
    ["custommerchitem"] : true,
}

export async function useItem(itemid: any , slotusing: number, PlayerInventoryName: any, itemData: any, amount:number) {
    const [success, itemList] = await Inventory.GetItemList();
    let itemUsuable: boolean = itemList[itemid]?.context.useItem ?? false;
    let WeaponData = itemList[itemid]?.weaponHash ?? false;
    if (!itemUsuable) return
    
    const inventoryUsedName: string = PlayerInventoryName;
    const itemUsageDetails = {
        id : itemData.id,
        usedName : inventoryUsedName,
        ItemId: itemid,
        SlotUsing: slotusing,
        IsWeapon: WeaponData,
        ItemData: itemData,
        information: JSON.stringify({
            cartridge : null
        }),
    };

    emit('RunUseItem', itemid, slotusing, inventoryUsedName, WeaponData, itemUsageDetails);
}
const stolenItems = {
    ["stolentv"] : true,
}
const waterItemsAttached = {
    ["water"] : true,
    ["poisonedwater"] : true,
    ["cola"] : true,
    ["vodka"] : true,
    ["whiskey"] : true,
    ["beer"] : true,
    ["coffee"] : true,
    ["bscoffee"] : true,
    ["softdrink"] : true,
    ["fries"] : true,
    ["roostertea"] : true,
    ["customwateritem"] : true,
    ["customcoffeeitem"] : true,
    ["kdragonwater"] : true,
    ["qdrpepper"] : true,
}
const sandwichItems = {
    ["sandwich"] : true,
    ["hamburger"] : true,
    ["poisonedsandwich"] : true,
    ["customfooditem"] : true,
    ["panini"] : true,
    ["qspam"] : true,
}
const fruits: string[] = [
    "apple",
    "banana",
    "cherry",
    "coconut",
    "grapes",
    "kiwi",
    "lemon",
    "peach",
    "strawberry",
    "watermelon"
];

onNet('RunUseItem', async function (itemid: any, slot: number, inventoryName: string, WeaponHash: any, passedItemInfo: any) {
    if (!itemid) return;

    const player = PlayerPedId();
    let ItemInfo = passedItemInfo;
    const currentVehicle = GetVehiclePedIsUsing(player);
    let remove = false
    let justUsed = false;
    let useCounter = 0;
    let lastCounter = 0;
    let isKatanaEquipped = false;
    let wheelChair: number | null = null;
    const playerVeh = GetVehiclePedIsIn(player, false);

    if (!ItemInfo) {
        console.warn('[DEBUG] ItemInfo is false');
        return;
    };
    let CurItemQuality = 
    ItemInfo.quality !== undefined ? ItemInfo.quality : 
    (ItemInfo.ItemData?.quality !== undefined ? ItemInfo.ItemData.quality : 
    (ItemInfo.durability !== undefined ? ItemInfo.durability : false));

    if (CurItemQuality === false) {
        if (ItemInfo.ItemData) {
            if (ItemInfo.ItemData.quality !== undefined) {
                CurItemQuality = ItemInfo.ItemData.quality;
            } else if (ItemInfo.ItemData.durability) {
                CurItemQuality = ItemInfo.ItemData.durability;
            } else {
                console.error('[DEBUG] ItemInfo.quality and ItemInfo.ItemData.quality are both undefined');
                return;
            }
        } else {
            console.error('[DEBUG] ItemInfo.quality and ItemInfo.ItemData.quality are both undefined');
            return;
        }
    }
    
    if (CurItemQuality < 1) {
        TriggerEvent('DoLongHudText', 'Item is too worn.', 2);
        if (WeaponHash) TriggerEvent('brokenWeapon');
        return;
    };

    if (justUsed) {
        useCounter++;
        if (useCounter > 10 && useCounter > lastCounter + 5) {
            lastCounter = useCounter;
            TriggerServerEvent('exploiter', `Tried using ${useCounter} items in < 500ms`);
        };
        return;
    };


    justUsed = true;

    if (!await hasEnoughOfItem(itemid, 1, false, false , false)) {
        TriggerEvent('DoLongHudText', "You don't appear to have this item on you?", 2);
        justUsed = false;
        useCounter = 0;
        lastCounter = 0;
        return;
    }

    if (!isValidUseCase(itemid, WeaponHash)) {
        justUsed = false;
        useCounter = 0;
        lastCounter = 0;
        return;
    }

    if (itemid === '185608774') {
        if (CurItemQuality > 0) {
            const katanaInfo = JSON.parse(ItemInfo.information);
            katanaInfo.componentVariant = '1';
            katanaInfo._hideKeys = katanaInfo._hideKeys || [];
            katanaInfo._hideKeys.push('componentVariant');
            TriggerEvent('equipWeaponID', '171789620', JSON.stringify(katanaInfo), ItemInfo.id);

                setTimeout(async () => {
                    while (GetSelectedPedWeapon(PlayerPedId()) !== 171789620) {
                        await new Promise(resolve => setTimeout(resolve, 200));
                }
                GiveWeaponComponentToPed(player, 171789620, 0xE2EB1958);
                GiveWeaponComponentToPed(player, 171789620, 0xB7B26BA9);
                GiveWeaponComponentToPed(player, 171789620, 0x993DB2BE);
                GiveWeaponComponentToPed(player, 171789620, 0x41065670);
                SetPedWeaponTintIndex(player, 171789620, katanaInfo.weaponTint);
            }, 1000);

            justUsed = false;
            useCounter = 0;
            lastCounter = 0;
            setTimeout(() => {
                TriggerEvent('AttachWeapons');
            }, 2000);
            return;
        }
    }

    if (WeaponHash) {
        if (CurItemQuality > 0) {
            console.log(`[DEBUG] Equip WeaponHash: ${JSON.stringify(WeaponHash)}`);
            TriggerEvent('equipWeaponID', WeaponHash, ItemInfo.information, ItemInfo.id);
        }
        justUsed = false;
        useCounter = 0;
        lastCounter = 0;
        setTimeout(() => {
            TriggerEvent('AttachWeapons');
            TriggerEvent('np-hud:armed', 100);
        }, 1500);
        return;
    }

    if (itemid == "cola" || itemid == "water") {
        // attachPropsToAnimation(itemid, 6000)
        // TaskItem("amb@world_human_drinking@coffee@male@idle_a", "idle_c", 49,6000,"Drink","changethirst",true,itemid)
        AttachPropAndPlayAnimation("amb@world_human_drinking@beer@female@idle_a", "idle_e", 49,4500,"Drink","ChangeThirst",true,itemid,playerVeh)
        TriggerEvent('playerstate:changeThirst', 30)
        TriggerEvent('thirstbuff')
    }

    if (itemid === "pistolammoPD") {
        const finished = await exports["fm-taskbar"].taskBar(2500, "Reloading", false, false, playerVeh);
        if (finished === 100) {
            TriggerEvent("actionbar:ammo", 1950175060, 50, true);
            remove = true;
        }
    }

    if (itemid == "huntingknife")  {
        TriggerEvent("np-hunting:skinAnimal")
    }
    
    if (itemid === 'murdermeal') {
        const finished = exports['fm-taskbar'].taskBar(1000, 'Unwrapping');
        if (finished === 100) {
            TriggerEvent('server-inventory-open', '1', `murdermeal-${ItemInfo.id}`);
        }
    }

    if (itemid == "murdermeal") {
        const finished = await exports['fm-taskbar'].taskBar(1000, 'Unwrapping');
        const cid = exports["isPed"].isPed("cid");
        TriggerEvent("InteractSound_CL:PlayOnOne", "unwrap", 1.0);
        if (finished == 100) {
            TriggerEvent("server-inventory-open", "1", `murdermeal-${ItemInfo.id}`);
        }
    }
    
    if (itemid == "bentobox") {
        const finished = await exports['fm-taskbar'].taskBar(1000, 'Unwrapping');
        const cid = exports["isPed"].isPed("cid");
        TriggerEvent("InteractSound_CL:PlayOnOne", "unwrap", 1.0);
        if (finished == 100) {
            TriggerEvent("server-inventory-open", "1", `bentobox-${ItemInfo.id}`);
        }
    }
    
    if (itemid == "bstoy") {
        TriggerEvent('np-burgershot:gettoy');
        TriggerEvent('inventory:removeItem', 'bstoy', 1);
    }
    
    if (itemid == "smokegrenadeswat" || itemid == "smokegrenadenpa") {
        if (Number(CurItemQuality) > 0) {
            TriggerEvent("equipWeaponID", -37975472, ItemInfo.information, ItemInfo.id, itemid);
        }
        justUsed = false;
        useCounter = 0;
        lastCounter = 0;
        return;
    }
    
    if (itemid == "cursedkatanaweapon") {
        if (GetEntityModel(PlayerPedId()) == GetHashKey("Mr_kebun")) {
            if (Number(CurItemQuality) > 0) {
                if (!isKatanaEquipped) {
                    isKatanaEquipped = true;
                    setTimeout(() => {
                        TriggerServerEvent("np-katana:cursedKatanaEquip", GetEntityCoords(PlayerPedId()));
                        TriggerEvent("np-katana:cursedKatanaEquipC");
                    }, 1000);
                } else {
                    isKatanaEquipped = false;
                }
                const katanaInfo = JSON.parse(ItemInfo.information);
                katanaInfo.componentVariant = "3";
                const hiddenKeys = katanaInfo._hideKeys || [];
                hiddenKeys.push("componentVariant");
                katanaInfo._hideKeys = hiddenKeys;
                TriggerEvent("equipWeaponID", "1692590063", JSON.stringify(katanaInfo), ItemInfo.id);
            }
        } else {
            TriggerEvent("DoLongHudText", "You don't feel comfortable touching this.", 2);
        }
        justUsed = false;
        useCounter = 0;
        lastCounter = 0;
        return;
    }
    
    if (itemid == "talonweapon") {
        if (GetEntityModel(PlayerPedId()) == GetHashKey("ig_buddha")) {
            if (Number(CurItemQuality) > 0) {
                const katanaInfo = JSON.parse(ItemInfo.information);
                katanaInfo.componentVariant = "5";
                const hiddenKeys = katanaInfo._hideKeys || [];
                hiddenKeys.push("componentVariant");
                katanaInfo._hideKeys = hiddenKeys;
                TriggerEvent("equipWeaponID", "1692590063", JSON.stringify(katanaInfo), ItemInfo.id);
            }
        } else {
            TriggerEvent("DoLongHudText", 'You hear a voice in your head: You are not Shadow?', 2);
        }
        justUsed = false;
        useCounter = 0;
        lastCounter = 0;
        return;
    }
    
    if (itemid == "knuckle_chain") {
        if (Number(CurItemQuality) > 0) {
            const katanaInfo = JSON.parse(ItemInfo.information);
            katanaInfo.componentVariant = "2";
            const hiddenKeys = katanaInfo._hideKeys || [];
            hiddenKeys.push("componentVariant");
            katanaInfo._hideKeys = hiddenKeys;
            TriggerEvent("equipWeaponID", "3638508604", JSON.stringify(katanaInfo), ItemInfo.id);
        }
        justUsed = false;
        useCounter = 0;
        lastCounter = 0;
        return;
    }
    
    if (itemid == "gepard") {
        if (Number(CurItemQuality) > 0) {
            const katanaInfo = JSON.parse(ItemInfo.information);
            katanaInfo.componentVariant = "1";
            const hiddenKeys = katanaInfo._hideKeys || [];
            hiddenKeys.push("componentVariant");
            katanaInfo._hideKeys = hiddenKeys;
            TriggerEvent("equipWeaponID", "1649403952", JSON.stringify(katanaInfo), ItemInfo.id);
            
            setTimeout(async () => {
                while (GetSelectedPedWeapon(PlayerPedId()) != 1649403952) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
                GiveWeaponComponentToPed(PlayerPedId(), 1649403952, 0xF605986F);
                GiveWeaponComponentToPed(PlayerPedId(), 1649403952, 0xCDCEC991);
                GiveWeaponComponentToPed(PlayerPedId(), 1649403952, 0xF07EECC4);
                GiveWeaponComponentToPed(PlayerPedId(), 1649403952, 0xA3BCB36E);
            }, 0);
        }
        justUsed = false;
        useCounter = 0;
        lastCounter = 0;
        return;
    }
    
    if (itemid == "gavel") {
        if (Number(CurItemQuality) > 0) {
            const katanaInfo = JSON.parse(ItemInfo.information);
            katanaInfo.componentVariant = "1";
            const hiddenKeys = katanaInfo._hideKeys || [];
            hiddenKeys.push("componentVariant");
            katanaInfo._hideKeys = hiddenKeys;
            TriggerEvent("equipWeaponID", "1317494643", JSON.stringify(katanaInfo), ItemInfo.id);
        }
        justUsed = false;
        useCounter = 0;
        lastCounter = 0;
        return;
    }
    
    if (itemid == "buddhamedalion") {
        // buddhaMedalion()
    }
    
    if (stolenItems[itemid] && exports["np-npcs"].isCloseToPawnPed()) {
        justUsed = false;
        useCounter = 0;
        lastCounter = 0;
        return;
    }
    
    TriggerEvent("hud-display-item", itemid, "Used");

    
    // Citizen.Wait(800);
    await new Promise(resolve => setTimeout(resolve, 800));

    
    if (!IsPedInAnyVehicle(player, true)) {
        if (itemid == "Suitcase") {
            TriggerEvent('attach:suitcase');
        }
    
        if (itemid == "Boombox") {
            TriggerEvent('attach:boombox');
        }
        
        // if (itemid == "Box") {
        //     if (!boxAttached) {
        //         TriggerEvent('attach:box');
        //         boxAttached = true;
        //     } else {
        //         TriggerEvent("animation:carry", "none");
        //         boxAttached = false;
        //     }
        // }
        
        if (itemid == "DuffelBag") {
            TriggerEvent('attach:blackDuffelBag');
        }
        
        if (itemid == "MedicalBag") {
            TriggerEvent('attach:medicalBag');
        }
        
        if (itemid == "SecurityCase") {
            TriggerEvent('attach:securityCase');
        }
        
        if (itemid == "Toolbox") {
            TriggerEvent('attach:toolbox');
        }
        
        if (itemid == "wheelchair") {
            if (!DoesEntityExist(wheelChair)) {
                const wheelChairModel = GetHashKey("npwheelchair");
                RequestModel(wheelChairModel);
                while (!HasModelLoaded(wheelChairModel)) {
                    // Citizen.Wait(0);
                    await new Promise(resolve => setTimeout(resolve, 0));
                }
                
                const [x, y, z] = GetEntityCoords(PlayerPedId(), false);
                wheelChair = CreateVehicle(wheelChairModel, x, y, z, GetEntityHeading(PlayerPedId()), true, false);
                SetVehicleOnGroundProperly(wheelChair);
                SetVehicleNumberPlateText(wheelChair, `PILLBOX${Math.random() * 9 | 0}`);
                SetPedIntoVehicle(PlayerPedId(), wheelChair, -1);
                SetModelAsNoLongerNeeded(wheelChairModel);
                
                const wheelChairPlate = GetVehicleNumberPlateText(wheelChair);
                TriggerServerEvent('garages:addJobPlate', wheelChairPlate);
                TriggerEvent("keys:addNew", wheelChair, wheelChairPlate);
            } else if (DoesEntityExist(wheelChair)) {
                const [x1, y1, z1] = GetEntityCoords(wheelChair, false);
                const [x2, y2, z2] = GetEntityCoords(PlayerPedId(), false);
                if (GetDistanceBetweenCoords(x1, y1, z1, x2, y2, z2, true) < 3.0 && GetPedInVehicleSeat(wheelChair, -1) == 0) {
                    // Sync.DeleteVehicle(wheelChair); (np-sync idk the name do later if needed)
                    wheelChair = null;
                } else {
                    TriggerEvent("DoLongHudText", "Too far away from the wheelchair or someone is sitting in it!", 1);
                }
            }
        }
    }

    let removeId: string | null = null;
    let itemreturn: boolean = false;
    let drugitem: boolean = false;
    let fooditem: boolean = false;
    let drinkitem: boolean = false;
    let healitem: boolean = false;

    // if (ItemCallbacks[itemid] && typeof ItemCallbacks[itemid] === 'function') { # Doesn't seem to be used or useful..
    //     const options = { remove: false };

    //     ItemCallbacks[itemid](itemid, itemInfo, options);

    //     if (options.remove) {
    //         remove = true;
    //     }
    // }

    if (itemid === "spellbook-flame" && currentVehicle === 0) {
        TriggerEvent("fx:spellcast", "FireRay");
    }

    if (itemid === "spellbook-roar" && currentVehicle === 0) {
        TriggerEvent("fx:spellcast", "FireRoar");
    }

    if (itemid === "spellbook-heal" && currentVehicle === 0) {
        TriggerEvent("fx:spellcast", "AOEheal");
    }

    if (itemid === "spellbook-slow" && currentVehicle === 0) {
        TriggerEvent("fx:spellcast", "AOEslow");
    }

    if (itemid === "spellbook-shock" && currentVehicle === 0) {
        TriggerEvent("fx:spellcast", "AOEshock");
    }

    if (itemid === "spellbook-test" && currentVehicle === 0) {
        TriggerEvent("fx:spellcast", "AOEtest");
    }

    if (itemid === "spellbook-blink" && currentVehicle === 0) {
        TriggerEvent("fx:spellcast", "blink");
    }

    if (itemid === "spellbook-speed" && currentVehicle === 0) {
        TriggerEvent("fx:spellcast", "AOEspeed");
    }

    if (itemid === "spellbook-buff" && currentVehicle === 0) {
        TriggerEvent("fx:spellcast", "AOEbuff");
    }

    if (itemid === "spellbook-mana" && currentVehicle === 0) {
        remove = true;
        TriggerEvent("fx:spellmana");
    }

    if (itemid === "spellbook-poop" && currentVehicle === 0) {
        TriggerEvent("fx:spellcast", "AOEpoop");
    }

    if (itemid === "spikes") {
        TriggerEvent('c_setSpike');
        remove = true;
    }

    if (itemid === "grapplegun" || itemid === "grapplegunpd") {
        TriggerEvent('Ghost:UseGrappleGun');
        const degenAmountRandom = Math.floor(Math.random() * (43 - 23 + 1)) + 23;
        TriggerEvent("inventory:DegenLastUsedItem", degenAmountRandom);
    }

    if (itemid === "francisdice" && currentVehicle === 0) {
        TriggerEvent("francisroll");
    }

    if (itemid === "key1") {
        TriggerEvent('np-doors:unlockContainer1');
    }

    if (itemid === "key2") {
        TriggerEvent('np-doors:unlockContainer2');
    }

    if (itemid === "pdbadge") {
        TriggerServerEvent("np-policeBadge:showBadge");
    }

    if (itemid === "joint" || itemid === "weed5oz" || itemid === "weedq" || itemid === "beer" || 
        itemid === "vodka" || itemid === "whiskey" || itemid === "lsdtab" || itemid === 'winemilkshake' || 
        itemid === 'honestwineglass' || itemid === "customjointitem") {
        drugitem = true;
    }

    if (itemid === "burnerphone") {
        OpenBurnerPhone({
            source_number: JSON.parse(ItemInfo.information).Number,
            isOwner: true
        });
    }

    if (itemid === "electronickit" || itemid === "lockpick") {
        TriggerServerEvent("robbery:triggerItemUsedServer", itemid);
    }

    if (itemid === "locksystem") {
        TriggerServerEvent("robbery:triggerItemUsedServer", itemid);
    }

    if (itemid === "thermitecharge") {
        TriggerServerEvent("robbery:triggerItemUsedServer", itemid);
    }

    if (itemid === "thermitecharge") {
        TriggerEvent("paletogate:door");
    }

    if (itemid === "thermitecharge") {
        TriggerEvent("dark-vaultrob:upper:thermitedoors");
    }

    if (itemid === "thermitecharge") {
        TriggerEvent("dark-jewelry:jewelry:OpenMinigame");
    }

    if (itemid === "heistlaptop4") {
        TriggerEvent("dark-vaultrob:upper:heistlaptop4");
    }

    if (itemid === "heistlaptop1") {
        TriggerEvent("dark-vaultrob:lower:firstdoor");
    }

    if (itemid === "heistlaptop3") {
        TriggerEvent('np-robbery:usb');
    }

    if (itemid === "heistlaptop2") {
        TriggerEvent('np-paleto:UseBlueLapTop');
    }

    if (itemid === "evidencebag") {
        TriggerEvent("evidence:startCollect", itemid, slot);
        const itemInfo = await GetItemInfo(slot);
        const data = itemInfo !== "No information stored" ? itemInfo.information : '{}';
        if (data === '{}') {
            TriggerEvent("DoLongHudText", "Start collecting evidence!", 1);
            TriggerEvent("inventory:updateItem", itemid, slot, '{"used": "true"}');
        } else {
            const dataDecoded = JSON.parse(data);
            if(dataDecoded.used) {
                console.log('YOURE ALREADY COLLECTING EVIDENCE YOU STUPID FUCK');
            }
        }
    }

    if (itemid === "lsdtab" || itemid === "badlsdtab") {
        TriggerEvent("animation:PlayAnimation", "pill");
        const finished = exports["fm-taskbar"].taskBar(3000, "Placing LSD Strip on 👅", false, false, playerVeh);
        if (finished === 100) {
            TriggerEvent("Evidence:StateSet", 2, 1200);
            TriggerEvent("Evidence:StateSet", 24, 1200);
            TriggerEvent("fx:run", "lsd", 180, -1, (itemid === "badlsdtab" ? true : false));
            remove = true;
        }
    }

    if (itemid === "decryptersess" || itemid === "decrypterfv2" || itemid === "decrypterenzo") {
        if (GetDistanceBetweenCoords(GetEntityCoords(player)[0], GetEntityCoords(player)[1], GetEntityCoords(player)[2], 1275.49, -1710.39, 54.78, true) < 3.0) {
            const finished = exports["fm-taskbar"].taskBar(25000, "Decrypting Data", false, false, playerVeh);
            if (finished === 100) {
                TriggerEvent("phone:crypto:use", 1, 3, "robbery:decrypt", true);
            }
        }

        if (GetDistanceBetweenCoords(GetEntityCoords(player)[0], GetEntityCoords(player)[1], GetEntityCoords(player)[2], 2328.94, 2571.4, 46.71, true) < 3.0) {
            const finished = exports["fm-taskbar"].taskBar(25000, "Decrypting Data", false, false, playerVeh);
            if (finished === 100) {
                TriggerEvent("phone:crypto:use", 1, 3, "robbery:decrypt2", true);
            }
        }

        if (GetDistanceBetweenCoords(GetEntityCoords(player)[0], GetEntityCoords(player)[1], GetEntityCoords(player)[2], 1208.73, -3115.29, 5.55, true) < 3.0) {
            const finished = exports["fm-taskbar"].taskBar(25000, "Decrypting Data", false, false, playerVeh);
            if (finished === 100) {
                TriggerEvent("phone:crypto:use", 1, 3, "robbery:decrypt3", true);
            }
        }
    }

    if (itemid === "pix1") {
        if (GetDistanceBetweenCoords(GetEntityCoords(player)[0], GetEntityCoords(player)[1], GetEntityCoords(player)[2], 1275.49, -1710.39, 54.78, true) < 3.0) {
            const finished = exports["fm-taskbar"].taskBar(25000, "Decrypting Data", false, false, playerVeh);
            if (finished === 100) {
                TriggerEvent("phone:crypto:add", 1, Math.floor(Math.random() * 2) + 1);
                remove = true;
            }
        }
    }

    if (itemid === "pix2") {
        if (GetDistanceBetweenCoords(GetEntityCoords(player)[0], GetEntityCoords(player)[1], GetEntityCoords(player)[2], 1275.49, -1710.39, 54.78, true) < 3.0) {
            const finished = exports["fm-taskbar"].taskBar(25000, "Decrypting Data", false, false, playerVeh);
            if (finished === 100) {
                TriggerEvent("phone:crypto:add", 1, Math.floor(Math.random() * 8) + 5);
                remove = true;
            }
        }
    }

    if (itemid === "femaleseed") {
        TriggerEvent("Evidence:StateSet", 4, 1600);
        TriggerEvent("np-weed:plantSeed", itemid);
    }

    if (itemid === "maleseed") {
        TriggerEvent("Evidence:StateSet", 4, 1600);
        TriggerEvent("np-weed:plantSeed", itemid);
    }

    if (itemid === "highgrademaleseed") {
        TriggerEvent("Evidence:StateSet", 4, 1600);
        TriggerEvent("np-weed:plantSeed", itemid);
    }

    if (itemid === "smallbud" && hasEnoughOfItem("qualityscales", 1, false, false, false)) {
        const finished = exports["fm-taskbar"].taskBar(1000, "Packing Joint", false, false, playerVeh);
        if (finished === 100) {
        }
    }

    if (itemid === "weedq") {
        const finished = exports["fm-taskbar"].taskBar(1000, "Rolling Joints", false, false, playerVeh);
        if (finished === 100) {
        }
    }

    if (itemid === "bborchids" || itemid === "bbsunflowers" || itemid === "bbroses" || 
        itemid === "bbvarious" || itemid === "bbtulip" || itemid === "bbcarnations" || 
        itemid === "bbrainbowrose") {
        TaskItem("amb@code_human_wander_idles@male@idle_a", "idle_b_rubnose", 49, 2800, "Smelling flowers", "", false, itemid, playerVeh, false, '', null);
        // Citizen.Wait(4000);
        await new Promise(resolve => setTimeout(resolve, 4000));
        TriggerEvent("client:newStress", false, Math.floor(Math.random() * 151) + 250);
        TriggerEvent("DoShortHudText", 'The smell of fresh Flowers comforts you and brightens your mood');
    }

    if (itemid === "qtakis") {
        AttachPropAndPlayAnimation("mp_player_inteat@burger", "mp_player_int_eat_burger", 49, 6000, "Eating Takis", "changehunger", true, itemid, playerVeh);
        TriggerEvent('playerstate:changeHunger', 30);
    }

    if (itemid === "qspam") {
        AttachPropAndPlayAnimation("mp_player_inteat@burger", "mp_player_int_eat_burger", 49, 6000, "Eating Spam", "changehunger", true, itemid, playerVeh);
        TriggerEvent('playerstate:changeHunger', 30);
    }

    if (itemid === "qbloodstew") {
        AttachPropAndPlayAnimation("mp_player_inteat@burger", "mp_player_int_eat_burger", 49, 6000, "Eating Blood Stew", "changehunger", true, itemid, playerVeh);
        TriggerEvent('playerstate:changeHunger', 30);
    }

    if (itemid === "qdrpepper") {
        AttachPropAndPlayAnimation("amb@world_human_drinking@beer@female@idle_a", "idle_e", 49, 6000, "Drinking Dr Pepper", "changethirst", true, itemid, playerVeh);
        TriggerEvent('playerstate:changeThirst', 30);
    }

    if (itemid === "qfruity") {
        AttachPropAndPlayAnimation("mp_player_inteat@burger", "mp_player_int_eat_burger", 49, 6000, "Eating Fruity Pebbles", "changehunger", true, itemid, playerVeh);
        TriggerEvent('playerstate:changeHunger', 30);
    }

    if (itemid === "lighter") {
        TriggerEvent("animation:PlayAnimation", "lighter");
        const finished = await exports["fm-taskbar"].taskBar(2000, "Starting Fire", false, false, playerVeh);
        if (finished === 100) {
            // Empty implementation
        }
    }
    
    if (itemid === "joint" || itemid === "joint2" || itemid === "customjointitem") {
        const finished = await exports["fm-taskbar"].taskBar(2000, "Smoking Joint", false, false, playerVeh);
        let smoking = false;
        if (finished === 100) {
            remove = true;
            smoking = true;
    
            // Citizen.Wait(200);
            await new Promise(resolve => setTimeout(resolve, 200));
    
            if (Math.random() * 100 === 69) {
                TriggerEvent("player:receiveItem", "femaleseed", 1);
            }
    
            if (Math.random() * 600 === 69) {
                TriggerEvent("player:receiveItem", "maleseed", 1);
            }
    
            if (itemid === "customjointitem") {
                // processStressBlock();
            }
    
            setTimeout(async function() {
                while (smoking) {
                    // Citizen.Wait(1000);
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    SetPlayerMaxArmour(PlayerPedId(), 100);
                    SetPedArmour(PlayerPedId(), GetPedArmour(PlayerPedId()) + 5);
                    TriggerEvent("client:newStress", false, 50);
                }
            });
    
            TriggerEvent("animation:PlayAnimation", "weed");
            TriggerEvent("addiction:drugTaken", "weed");
            TriggerEvent("Evidence:StateSet", 3, 600);
            TriggerEvent("Evidence:StateSet", 4, 600);
            TriggerEvent("client:newStress", false, Math.floor(Math.random() * 16) + 15);
            TriggerEvent("stress:timed2", 5000, "WORLD_HUMAN_SMOKING_POT");
            // Citizen.Wait(5000);
            await new Promise(resolve => setTimeout(resolve, 5000));
            smoking = false;
        }
    }
    
    if (itemid === "clotion" || itemid === "cabsinthe") {
        remove = true;
        const finished = await exports["fm-taskbar"].taskBar(2500, "Consuming Lotion");
        if (finished === 100) {
            SetPlayerMaxArmour(PlayerPedId(), 100);
            SetPedArmour(PlayerPedId(), 100);
        }
    }
    
    if (itemid === "vodka" ||
        itemid === "beer" ||
        itemid === "whiskey" ||
        itemid === "absinthe" ||
        itemid === "drink1" ||
        itemid === "drink2" ||
        itemid === "drink3" ||
        itemid === "drink4" ||
        itemid === "drink5" ||
        itemid === "drink6" ||
        itemid === "drink7" ||
        itemid === "drink8" ||
        itemid === "drink9" ||
        itemid === "drink10" ||
        itemid === "shot1" ||
        itemid === "shot2" ||
        itemid === "shot3" ||
        itemid === "shot4" ||
        itemid === "shot5" ||
        itemid === "shot6" ||
        itemid === "winemilkshake" ||
        itemid === "shot7" ||
        itemid === "shot8" ||
        itemid === "shot9" ||
        itemid === "shot10" ||
        itemid === "moonshine" ||
        itemid === "poisonedcocktail" ||
        itemid === "mead_watermelon" ||
        itemid === "mead_strawberry" ||
        itemid === "mead_potato" ||
        itemid === "mead_peach" ||
        itemid === "mead_orange" ||
        itemid === "mead_lime" ||
        itemid === "mead_lemon" ||
        itemid === "mead_kiwi" ||
        itemid === "mead_grape" ||
        itemid === "mead_coconut" ||
        itemid === "mead_cherry" ||
        itemid === "mead_banana" ||
        itemid === "mead_apple") {
        
        const success = itemid === "winemilkshake" ? true : 
            await AttachPropAndPlayAnimation("amb@world_human_drinking@coffee@male@idle_a", "idle_c", 49, 6000, "Drink", "changethirst", true, itemid, playerVeh);
        
        if (success) {
            TriggerEvent("Evidence:StateSet", 8, 600);
            let alcoholStrength = 0.5;
            
            if (itemid === "vodka" || itemid === "whiskey") alcoholStrength = 1.0;
            if (itemid === "absinthe") alcoholStrength = 2.5;
            if (itemid === "moonshine") alcoholStrength = 4.0;
            
            if (["drink1", "drink2", "drink3", "drink4", "drink5", "drink6", 
                 "drink7", "drink8", "drink9", "drink10"].includes(itemid)) {
                alcoholStrength = 0.6;
            }
            
            if (["shot1", "shot2", "shot3", "shot4", "shot5", "shot6",
                 "shot7", "shot8", "shot9", "shot10"].includes(itemid)) {
                alcoholStrength = 0.8;
            }
            
            if (["mead_watermelon", "mead_strawberry", "mead_potato", 
                 "mead_peach", "mead_orange", "mead_lime", "mead_lemon", 
                 "mead_kiwi", "mead_grape", "mead_coconut", "mead_cherry", 
                 "mead_banana", "mead_apple"].includes(itemid)) {
                
                alcoholStrength = 1.0;
                TriggerEvent("inv:slushy");
                
                if (Math.floor(Math.random() * 10) + 1 <= 3) {
                    TriggerEvent("player:receiveItem", "bottle_cap", 1);
                    if (Math.random() < 0.30) {
                        TriggerServerEvent("fx:puke");
                    }
                }
            }
            
            TriggerEvent("fx:run", "alcohol", 180, alcoholStrength, -1, (itemid === "absinthe"));
        }
    }
    
    if (itemid === "coffee" || itemid === "frappuccino" || itemid === "latte" || itemid === "customcoffeeitem") {
        await AttachPropAndPlayAnimation(
            "amb@world_human_drinking@coffee@male@idle_a",
            "idle_c",
            49,
            6000,
            "Drink",
            "coffee:drink",
            !customMarketItems[itemid],
            itemid === "customcoffeeitem" ? "coffee" : itemid,
            playerVeh
        );
        remove = customMarketItems[itemid];
    }
    
    if (itemid === "fishtaco") {
        await AttachPropAndPlayAnimation("mp_player_inteat@burger", "mp_player_int_eat_burger", 49, 6000, "Eating", "food:FishTaco", true, itemid, playerVeh);
    }
    
    if (itemid === "taco" || itemid === "burrito") {
        await AttachPropAndPlayAnimation("mp_player_inteat@burger", "mp_player_int_eat_burger", 49, 6000, "Eating", "food:Taco", true, itemid, playerVeh);
    }
    
    if (itemid === "churro" || itemid === "hotdog" || itemid === "chocobar") {
        await TaskItem("mp_player_inteat@burger", "mp_player_int_eat_burger", 49, 6000, "Eating", "food:Condiment", true, itemid, playerVeh, false, '', null);
        TriggerEvent('playerstate:changeHunger', 30);
    }
    
    if (itemid === "greencow" || itemid === "franksmonster") {
        const fmMsg = itemid === "greencow" ? "Drink" : "Shotgunning";
        const fmTimer = itemid === "greencow" ? 6000 : 2000;
        await AttachPropAndPlayAnimation("amb@world_human_drinking@coffee@male@idle_a", "idle_c", 49, fmTimer, fmMsg, "food:Condiment", true, itemid, playerVeh);
    }
    
    if (itemid === "donut" || itemid === "applepie" || itemid === "eggsbacon" || itemid === "cookie" || itemid === "muffin") {
        await AttachPropAndPlayAnimation("mp_player_inteat@burger", "mp_player_int_eat_burger", 49, 6000, "Eating", "food:Condiment", true, itemid, playerVeh);
    }
    
    if (itemid === "icecream" || itemid === "mshake" || itemid === "winemilkshake") {
        await TaskItem("mp_player_inteat@burger", "mp_player_int_eat_burger", 49, 6000, "Eating", "food:IceCream", true, itemid, playerVeh, false, '', null);
    }
    
    if (["redgball", "bluegball", "purplegball", "yellowgball", "greengball", 
         "pinkgball", "orangegball", "crackedgball"].includes(itemid)) {
        remove = true;
        TriggerEvent("animation:PlayAnimation", "pill");
    }
    
    if (itemid === "advlockpick") {
        TriggerEvent("lockpick:event");
        TriggerEvent("inventory:DegenLastUsedItem", 3);
    }

    if (itemid === "Gruppe6Card") {
        const coordA = GetEntityCoords(GetPlayerPed(-1), false);
        const coordB = GetOffsetFromEntityInWorldCoords(GetPlayerPed(-1), 0.0, 100.0, 0.0);
        const targetVehicle = getVehicleInDirection({ x: coordA[0], y: coordA[1], z: coordA[2] }, { x: coordB[0], y: coordB[1], z: coordB[2] });
        const Police = exports['isPed'].isPed('copcount');
        
        if (Police >= 4) {
            if (targetVehicle !== 0 && GetHashKey("stockade") === GetEntityModel(targetVehicle)) {
                const entityCreatePoint = GetOffsetFromEntityInWorldCoords(targetVehicle, 0.0, -4.0, 0.0);
                const coords = GetEntityCoords(GetPlayerPed(-1));
                const aDist = GetDistanceBetweenCoords(
                    coords["x"], coords["y"], coords["z"], 
                    entityCreatePoint["x"], entityCreatePoint["y"], entityCreatePoint["z"], false
                );
                
                // Alta street train station
                const cityCenter = new Vector3(-204.92, -1010.13, 29.55);
                let timeToOpen = 45000;
                const distToCityCenter = getDistanceBetweenCoords([coords[0], coords[1], coords[2]], [cityCenter.x, cityCenter.y, cityCenter.z]);
                
                if (distToCityCenter > 1000) {
                    const multi = Math.floor(distToCityCenter / 1000);
                    timeToOpen = timeToOpen + (30000 * multi);
                }
                
                if (aDist < 2.0) {
                    FreezeEntityPosition(GetPlayerPed(-1), true);
                    TriggerServerEvent('np-heists:bankTruckLog');
                    TriggerEvent('np-dispatch:bank_truck_robbery');
                    
                    const finished = exports["fm-taskbar"].taskBar(timeToOpen, "Unlocking Vehicle", false, false, playerVeh);
                    if (finished === 100) {
                        TriggerEvent('np-hud:show_hackerman');
                        exports['np-thermite'].OpenThermiteGame((success: boolean) => {
                            if (success) {
                                TriggerEvent('np-hud:hide_hackerman');
                                TriggerEvent('inventory:removeItem', 'Gruppe6Card', 1);
                                TriggerEvent("np-heists:start_hitting_truck", targetVehicle);
                            } else {
                                TriggerEvent('np-hud:hide_hackerman');
                                TriggerEvent('inventory:removeItem', 'Gruppe6Card', 1);
                            }
                        });
                        FreezeEntityPosition(PlayerPedId(), false);
                    } else {
                        TriggerEvent("evidence:bleeding");
                        FreezeEntityPosition(PlayerPedId(), false);
                    }
                } else {
                    TriggerEvent("DoLongHudText", "You need to do this from behind the vehicle.");
                }
            }
        } else {
            TriggerEvent('DoLongHudText', 'Not enough police', 2);
        }
    }

    // TODO: Unused?
    // if (itemid === "weed12oz") {
    //     TriggerEvent("inv:weedPacking");
    //     remove = true;
    // }

    if (itemid === "heavyammo") {
        const finished = await exports["fm-taskbar"].taskBar(5000, "Reloading", false, false, playerVeh);
        if (finished === 100) {
            TriggerEvent("actionbar:ammo", 1788949567, 50, true);
            remove = true;
        }
    }

    if (itemid === "pistolammo") {
        const finished = await exports["fm-taskbar"].taskBar(2500, "Reloading", false, false, playerVeh);
        if (finished === 100) {
            TriggerEvent("actionbar:ammo", 1950175060, 50, true);
            remove = true;
        }
    }

    if (itemid === "pistolammoPD") {
        const finished = await exports["fm-taskbar"].taskBar(2500, "Reloading", false, false, playerVeh);
        if (finished === 100) {
            TriggerEvent("actionbar:ammo", 1950175060, 50, true);
            remove = true;
        }
    }

    if (itemid === "rifleammoPD") {
        const finished = await exports["fm-taskbar"].taskBar(5000, "Reloading", false, false, playerVeh);
        if (finished === 100) {
            TriggerEvent("actionbar:ammo", 218444191, 50, true);
            remove = true;
        }
    }

    if (itemid === "shotgunammoPD") {
        const finished = await exports["fm-taskbar"].taskBar(5000, "Reloading", false, false, playerVeh);
        if (finished === 100) {
            TriggerEvent("actionbar:ammo", 218444191, 50, true);
            remove = true;
        }
    }

    if (itemid === "subammoPD") {
        const finished = await exports["fm-taskbar"].taskBar(5000, "Reloading", false, false, playerVeh);
        if (finished === 100) {
            TriggerEvent("actionbar:ammo", 1820140472, 50, true);
            remove = true;
        }
    }

    if (itemid === "flamethrowerammo") {
        const finished = await exports["fm-taskbar"].taskBar(20000, "Reloading flamethrower", false, false, playerVeh);
        if (finished === 100) {
            TriggerEvent("actionbar:ammo", 1970280428, 15000, true);
            remove = true;
        }
    }

    if (itemid === "rifleammo") {
        const finished = await exports["fm-taskbar"].taskBar(5000, "Reloading", false, false, playerVeh);
        if (finished === 100) {
            TriggerEvent("actionbar:ammo", 218444191, 50, true);
            remove = true;
        }
    }

    if (itemid === "sniperammo") {
        const finished = await exports["fm-taskbar"].taskBar(5000, "Reloading", false, false, playerVeh);
        if (finished === 100) {
            TriggerEvent("actionbar:ammo", 1285032059, 25, true);
            remove = true;
        }
    }

    if (itemid === "huntingammo") {
        const finished = await exports["fm-taskbar"].taskBar(10000, "Reloading", false, false, playerVeh);
        if (finished === 100) {
            TriggerEvent("actionbar:ammo", 1285032059, 10, true);
            remove = true;
        }
    }

    if (itemid === "widowmakerammo") {
        const finished = await exports["fm-taskbar"].taskBar(10000, "Reloading", false, false, playerVeh);
        if (finished === 100) {
            TriggerEvent("actionbar:ammo", -1614428030, 15000, true);
            remove = true;
        }
    }

    if (itemid === "rpgammo") {
        const finished = await exports["fm-taskbar"].taskBar(25000, "Reloading", false, false, playerVeh);
        if (finished === 100) {
            TriggerEvent("actionbar:ammo", 1742569970, 1, true);
            remove = true;
        }
    }

    if (itemid === "shotgunammo") {
        const finished = await exports["fm-taskbar"].taskBar(5000, "Reloading", false, false, playerVeh);
        if (finished === 100) {
            TriggerEvent("actionbar:ammo", -1878508229, 50, true);
            remove = true;
        }
    }

    if (itemid === "subammo") {
        const finished = await exports["fm-taskbar"].taskBar(5000, "Reloading", false, false, playerVeh);
        if (finished === 100) {
            TriggerEvent("actionbar:ammo", 1820140472, 50, true);
            remove = true;
        }
    }

    if (itemid === "nails") {
        const finished = await exports["fm-taskbar"].taskBar(5000, "Reloading", false, false, playerVeh);
        if (finished === 100) {
            TriggerEvent("actionbar:ammo", 965225813, 50, true);
            remove = true;
        }
    }

    if (itemid === "paintballs") {
        const finished = await exports["fm-taskbar"].taskBar(5000, "Reloading", false, false, playerVeh);
        if (finished === 100) {
            TriggerEvent("actionbar:ammo", 1916856719, 100, true);
            remove = true;
        }
    }

    if (itemid === "rubberslugs") {
        const finished = await exports["fm-taskbar"].taskBar(5000, "Reloading", false, false, playerVeh);
        if (finished === 100) {
            TriggerEvent("actionbar:ammo", 1517835987, 10, true);
            remove = true;
        }
    }

    if (itemid === "taserammo") {
        const finished = await exports["fm-taskbar"].taskBar(2000, "Reloading", false, false, playerVeh);
        if (finished === 100) {
            TriggerEvent("actionbar:ammo", -1575030772, 3, true);
            remove = true;
        }
    }

    if (itemid === "empammo") {
        const finished = await exports["fm-taskbar"].taskBar(30000, "Recharging EMP", false, false, playerVeh);
        if (finished === 100) {
            TriggerEvent("actionbar:ammo", 2034517757, 2, true);
            remove = true;
        }
    }

    if (itemid === "armor" || itemid === "pdarmor") {
        const finished = await exports["fm-taskbar"].taskBar(4500, "Putting on Armor", true, false, playerVeh);
        if (finished === 100) {
            StopAnimTask(PlayerPedId(), 'clothingshirt', 'try_shirt_positive_d', 1.0);
            SetPlayerMaxArmour(PlayerId(), 100);
            SetPedArmour(player, 100);
            TriggerEvent("UseBodyArmor"); // Save later.
            remove = true;
        }
    }

    if (itemid === 'radio') {
        TriggerEvent('radioGui');
    }

    if (itemid === 'civradio') {
        TriggerEvent('radioGui');
    }

    if (itemid === 'repairkit') {
        TriggerEvent('veh:repairing',inventoryName,slot,itemid)
    }

    if (itemid === 'advrepairkit') {
        TriggerEvent('veh:repairing',inventoryName,slot,itemid)
    }

    if (itemid === "nitrous") {
        const player = PlayerPedId();
        const currentVehicle = GetVehiclePedIsIn(player, false);
    
        if (!currentVehicle || currentVehicle === 0) return;
    
        let finished = 0;
        let cancelNos = false;
    
        setTick(() => {
            if (finished !== 100 && !cancelNos) {
                setTimeout(() => {
                    if (GetEntitySpeed(GetVehiclePedIsIn(player, false)) > 11) {
                        exports["fm-taskbar"].closeGuiFail();
                        cancelNos = true;
                    }
                }, 100);
            }
        });
    
        (async () => {
            finished = await exports["fm-taskbar"].taskBar(20000, "Nitrous");
            if (finished === 100 && !cancelNos) {
                TriggerEvent("vehicle:addNos", currentVehicle, 100);
                remove = true;
            } else {
                TriggerEvent("DoLongHudText", "You can't drive and hook up NOS at the same time.", 2);
            }
        })();
    }

    if (itemid === "lockpick") {
        TriggerEvent("lockpick:event");
        TriggerEvent("inventory:DegenLastUsedItem", 5);
        TriggerEvent('houseRobberies:attempt');
    }

    if (itemid == "hackingdevice") {
        const myJob = exports["isPed"].isPed("myJob")
        if (myJob !== "news") {
            TriggerEvent("inv:lockPick", false, inventoryName, slot, "hackingdevice")
        } else {
            TriggerEvent("DoLongHudText","Nice news reporting, you shit lord idiot.")
        }
    }
    
    const securityItems = ["securityblue", "securityblack", "securitygreen", "securitygold", "securityred"];
    const gruppe6Items = ["Gruppe6Card2", "Gruppe6Card222"];
    const ciggyItems = ["ciggypack", "customciggyitem"];
    
    if (securityItems.includes(itemid)) {
        TriggerEvent("robbery:scanLock", false, itemid);
    }
    
    if (gruppe6Items.includes(itemid)) {
        TriggerServerEvent("robbery:triggerItemUsedServer", itemid);
    }
    
    if (ciggyItems.includes(itemid)) {
        TriggerEvent("player:receiveItem", "ciggy", 1);
        TriggerEvent("inventory:DegenLastUsedItem", 8);
    }

    if (itemid == "bandage" || itemid == "custombandageitem") {
        await TaskItem("amb@world_human_clipboard@male@idle_a", "idle_c", 49, 10000, "Healing", "wounds:healed:minors", true, itemid, playerVeh, false, '', null)
        remove = true
    }

    if (remove) {
        // const info = JSON.parse(passedItemInfo);
        // if (info && info._remove_id) {
            // TriggerEvent('inventory:removeItemByMetaKV', itemid, 1, '_remove_id', info._remove_id);
        // } else {
            RPC.execute('inventory:removeItem' , {Item: itemid, Amount: 1});
            TriggerEvent('inventory:removeItem', itemid, 1);
        // }
    }

    justUsed = false;
    useCounter = 0;
    lastCounter = 0;
});

const validWaterItem: Record<string, boolean> = {
    oxygentank: true,
    water: true,
    poisonedwater: true,
    vodka: true,
    beer: true,
    whiskey: true,
    coffee: true,
    fishtaco: true,
    taco: true,
    burrito: true,
    churro: true,
    hotdog: true,
    greencow: true,
    donut: true,
    applepie: true,
    eggsbacon: true,
    icecream: true,
    mshake: true,
    winemilkshake: true,
    sandwich: true,
    customfooditem: true,
    customwateritem: true,
    customcoffeeitem: true,
    poisonedsandwich: true,
    hamburger: true,
    cola: true,
    jailfood: true,
    bleederburger: true,
    heartstopper: true,
    torpedo: true,
    meatfree: true,
    moneyshot: true,
    fries: true,
    slushy: true,
    frappuccino: true,
    latte: true,
    cookie: true,
    muffin: true,
    chocolate: true,
    softdrink: true,
    franksmonster: true,
    roostertea: true,
    buddhamedalion: true,
    buddhashovel: true,
    gemanjicompass: true,
    qdrpepper: true,
    qfruity: true,
};

export async function isValidUseCase(itemID: string, isWeapon: boolean): Promise<boolean> {
    const player = PlayerPedId();
    const playerVeh = GetVehiclePedIsIn(player, false);

    if (playerVeh !== 0) {
        const model = GetEntityModel(playerVeh);

        if (IsThisModelACar(model) || IsThisModelABike(model) || IsThisModelAQuadbike(model)) {
            if (IsEntityInAir(playerVeh)) {
                // Citizen.Wait(1000);
                await new Promise(resolve => setTimeout(resolve, 1000));
                if (IsEntityInAir(playerVeh)) {
                    TriggerEvent("DoLongHudText", "You appear to be flying through the air", 2);
                    return false;
                }
            }
        }
    }

    if (!validWaterItem[itemID] && !isWeapon) {
        if (IsPedSwimming(player)) {
            const targetCoords = GetEntityCoords(player, false);
            // Citizen.Wait(700);
            await new Promise(resolve => setTimeout(resolve, 700));
            const plyCoords = GetEntityCoords(player, false);

            if (getDistanceBetweenCoords(targetCoords, plyCoords) > 1.3) {
                TriggerEvent("DoLongHudText", "Cannot be moving while swimming to use this.", 2);
                return false;
            }
        }

        if (IsPedSwimmingUnderWater(player)) {
            TriggerEvent("DoLongHudText", "Cannot be underwater to use this.", 2);
            return false;
        }
    }

    return true;
}

function getDistanceBetweenCoords(coords1: number[], coords2: number[]): number {
    return Math.sqrt(
        Math.pow(coords2[0] - coords1[0], 2) +
        Math.pow(coords2[1] - coords1[1], 2) +
        Math.pow(coords2[2] - coords1[2], 2)
    );
}

function has_value<T>(tab: T[], val: T): boolean {
    for (const value of tab) {
        if (value === val) {
            return true;
        }
    }
    return false;
}

async function TaskItem(
    dictionary: string,
    animation: string,
    typeAnim: number,
    timer: number,
    message: string,
    func: string,
    remove: boolean,
    itemid: string,
    playerVeh: any,
    itemreturn: boolean,
    itemreturnid: string,
    quality: any
): Promise<boolean> {
    await Streaming.loadAnim(dictionary)
    TaskPlayAnim(PlayerPedId(), dictionary, animation, 8.0, 1.0, -1, typeAnim, 0, false, false, false)
    const timerNum = Number(timer)
    if (timerNum > 0) {
        const finished = await exports["fm-taskbar"].taskBar(timerNum, message, true, false, playerVeh)
        if (finished === 100 || timerNum === 0) {
            TriggerEvent(func, quality ?? -1, itemid)
            if (remove) {
                TriggerEvent("inventory:removeItem", itemid, 1)
            }
            if (itemreturn) {
                TriggerEvent("player:receiveItem", itemreturnid, 1)
            }

            TriggerServerEvent("player:itemTaskCompleted", itemid, timerNum)

            ClearPedSecondaryTask(PlayerPedId())
            return true;
        } else {
            ClearPedSecondaryTask(PlayerPedId())
            return false
        }
    } else {
        TriggerEvent(func, quality ?? -1, itemid)
        ClearPedSecondaryTask(PlayerPedId())
        return true
    }
}

async function AttachPropAndPlayAnimation(dictionary: string, animation: string, typeAnim: number, timer: number, message: string, func: string, remove: boolean, itemid: string, vehicle: number): Promise<boolean> {
    if (["hamburger", "heartstopper", "bleederburger", "moneyshot", "torpedo", "questionablemeatburger"].includes(itemid)) {
        TriggerEvent("attachItem", "hamburger")
    } else if (sandwichItems[itemid]) {
        TriggerEvent("attachItem", "sandwich");
    } else if (["donut", "applepie"].includes(itemid)) {
        TriggerEvent("attachItem", "donut")
    } else if (itemid === "qdrpepper") {
        TriggerEvent("attachItem", "cola")
    } else if (waterItemsAttached[itemid]) {
        TriggerEvent("attachItem", ["poisonedwater", "kdragonwater", "customwateritem"].includes(itemid) ? "water" : itemid)
    } else if (["drink1", "drink2", "drink3", "drink4", "drink5", "drink6", "drink7", "drink8", "drink9", "drink10", "absinthe", "moonshine"].includes(itemid)) {
        TriggerEvent("attachItem", "whiskeyglass")
    } else if (["shot1", "shot2", "shot3", "shot4", "shot5", "shot6", "shot7", "shot8", "shot9", "shot10"].includes(itemid)) {
        TriggerEvent("attachItem", "shotglass")
    } else if (["fishtaco", "taco"].includes(itemid)) {
        TriggerEvent("attachItem", "taco")
    } else if (["greencow", "franksmonster"].includes(itemid)) {
        TriggerEvent("attachItem", "energydrink")
    } else if (itemid === "slushy") {
        TriggerEvent("attachItem", "cup")
    } else if (["blue_rare_steak", "rare_steak", "medium_rare_steak", "medium_steak", "medium_well_steak", "well_done_steak"].includes(itemid)) {
        TriggerEvent("attachItem", "steak")
    } else if (has_value(fruits, itemid)) {
        TriggerEvent("attachItem", "fruit")
    }

    const success = await TaskItem(dictionary, animation, typeAnim, timer, message, func, remove, itemid, vehicle, false, '', null)
    TriggerEvent("destroyProp")
    return success
}

function OpenBurnerPhone (info: any) {
    Streaming.loadAnim("cellphone@")
    TaskPlayAnim(PlayerPedId(), "cellphone@", "cellphone_text_read_base", 2.0, 3.0, -1, 49, 0, false, false, false)
    TriggerEvent("attachItemPhone", "phone01")
    exports["fm-ui"].openApplication("burner", info)
}

interface ItemInfo {
    information: string;
    id: number;
    quality: number;
    item_id: string;
    amount: number;
}

async function GetItemInfo(checkslot: number) {
    const clientInventory = await getClientInventory();
    for (const item of clientInventory) {
        if (Number(item.slot) === Number(checkslot)) {
        const info: ItemInfo = {
            information: item.information,
            id: item.id,
            quality: item.quality,
            item_id: item.item_id,
            amount: item.amount
        };
        return info;
        }
    }
    console.debug("No information stored");
    return "No information stored";
}

exports("GetItemInfo", GetItemInfo);

type Vector3 = { x: number, y: number, z: number };

function getVehicleInDirection(coordFrom: Vector3, coordTo: Vector3): number {
    let offset = 0;
    let rayHandle: number;
    let vehicle: number;

    for (let i = 0; i < 100; i++) {
        rayHandle = CastRayPointToPoint(
            coordFrom.x, coordFrom.y, coordFrom.z, 
            coordTo.x, coordTo.y, coordTo.z + offset, 
            10, PlayerPedId(), 0
        );
        
        const [a, b, c, d, veh] = GetRaycastResult(rayHandle);
        vehicle = veh;
        
        offset = offset - 1;

        if (vehicle !== 0) break;
    }
    
    const vehicleCoords = GetEntityCoords(vehicle);
    const distance = Vdist2(coordFrom.x, coordFrom.y, coordFrom.z, vehicleCoords[0], vehicleCoords[1], vehicleCoords[2]);
    
    if (distance > 25) vehicle = null;

    return vehicle !== null ? vehicle : 0;
}

onNet('inventory:phoneNumber', (number)=> {
    const QBCore = exports['qb-core'].GetCoreObject()

    const playerData = QBCore.Functions.GetPlayerData();

    if (!playerData || !playerData.citizenid) {
        console.error("Critical Error: Player data not found!");
        return;
    }

    const characterId = playerData.citizenid;
    const fullname = `${playerData.charinfo.firstname} ${playerData.charinfo.lastname}`;
    const cash = playerData.money?.cash || 0;
    const phoneNumber = playerData.charinfo.phone || "N/A";
    // const ExampleFetchHome = exports['qb-houses'].GetPlayerHouseNumber()
    // const ExampleFetchPersonalVeh = exports['qb-vehicles'].GetPlayerVehicle()

    let PhoneNumber = number.Number
    SendNUIMessage({
        PlayerData: {
            character: {
                id: characterId,
                name: fullname,
                cash: cash,
                personalVehicle: 'N/A', // You can add a vehicle here if you have a vehicle system.
                home: 'N/A', // You can add a home here if you have a housing system.
                phone: PhoneNumber,
            },
    
            settings: {
                holdToDrag: GetResourceKvpInt('inventory:holdToDrag'),
                shiftQuickMove: GetResourceKvpInt('inventory:shiftQuickMove')
            }
        }
    });
})
