import { Resource } from "./modules";
import './controllers/Inventory'
import './controllers/Callbacks'
import './controllers/Notifications'
import './controllers/Actionbar'
import './controllers/Exports'
import './controllers/Drops';
import { initTrunk } from "./controllers/Trunk";

new Resource(GetCurrentResourceName());

global.exports.focusmanager.RegisterFocusHandler(function (Focus: any, state: any) {
    if (state) {
        SetCursorLocation(0.5, 0.5);
    }

    SetNuiFocus(state, state);
});

initTrunk()

RegisterNuiCallbackType('getWoundState');
on('__cfx_nui:getWoundState', async (data, cb) => {
    try {
        const woundState = await RPC.execute('fm-wounds:playerState:get');
        cb(woundState);
    } catch (error) {
        console.error('Error in getWoundState NUI callback:', error);
        cb({
            headHealth: 0,
            bodyHealth: 0,
            leftArmHealth: 0,
            rightArmHealth: 0,
            leftLegHealth: 0,
            rightLegHealth: 0
        });
    }
});