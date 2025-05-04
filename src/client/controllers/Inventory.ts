import { inTrunk, trunkPlate } from "./Trunk";
import { GetGroundLevel } from "../../client/controllers/Drops";
import { setClientInventory } from './../controllers/Exports'

RegisterCommand('giveitem', async(source,args) => { // example /giveitem [AMOUNT] phone (REMOVE BEFORE RELEASE THIS IS FOR TESTING)
    let data = {
        Item : args[0].toString(),
        Amount : args[1] || 1,
    }
    TriggerEvent('inventory:addItem', data)
} , false)

RegisterCommand('+inventory', async() => {
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

    let formattedPhoneNum = "N/A";
    if (phoneNumber !== "N/A") {
        formattedPhoneNum = `+1 (${phoneNumber.substring(0, 3)})-${phoneNumber.substring(3, 6)}-${phoneNumber.substring(6)}`;
    }

    RPC.execute('inventory:additionalInventoriesClear')

    const Inventory = await RPC.execute('inventory:getInventories', IsPedInVehicle(PlayerPedId(), GetVehiclePedIsIn(PlayerPedId(), false), false), GetVehicleNumberPlateText(GetVehiclePedIsIn(PlayerPedId(), false)), inTrunk, trunkPlate, await GetGroundLevel(GetEntityCoords(PlayerPedId()), "default"))

    setClientInventory(Array.isArray(Inventory) ? Inventory : [Inventory]);

    SendNUIMessage({
        Inventory: Inventory,
    });

    SendNUIMessage({
        show: true,
        PlayerData: {
            character: {
                id: characterId,
                name: fullname,
                cash: cash,
                personalVehicle: "Unknown", // You can add a vehicle here if you have a vehicle system.
                home: 'Unknown', // You can add a home here if you have a housing system.
                phone: formattedPhoneNum
            },
    
            settings: {
                holdToDrag: GetResourceKvpInt('inventory:holdToDrag'),
                shiftQuickMove: GetResourceKvpInt('inventory:shiftQuickMove')
            }
        }
    });

    global.exports.focusmanager.SetUIFocus(true, true)
}, false)

RegisterCommand('-inventory', async() => {}, false)

global.exports['qb-keybinds'].registerKeyMapping('inventory', 'Inventory', 'Open Inventory', '+inventory', '-inventory', 'K', true);

onNet('inventory:addItem', async(data: any) => {
    emit('inventory:sendNotification', data.Item, data.Amount, 'Added')
    RPC.execute('inventory:addItem', data)
})