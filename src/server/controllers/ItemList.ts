//import { WeaponHash } from "fivem-js"

async function createImage(Item: any) {
    return `https://assets.nopixel.net/dev/images/inventory/icons/${Item}.png`
}

export const ItemList = {
    'knife': {
        name: 'Knife',
        description: 'A very interesting way to cut things?',
        stackable: false,
        image: createImage('np_knife'),
        weapon: true,
        weaponHash : GetHashKey('WEAPON_KNIFE'),
        weight: 7.0,
        decayrate: 2.0,
        context: {
            useItem: true,
        }
    },
    'phone': {
        name: 'Mobile Phone',
        description: 'It does phone things.',
        stackable: false,
        image: createImage('phone_1'),
        weight: 7.0,
        decayrate: 0.0,
        context: {
            useItem: true,
            equipItem: true,
            openItem: 'Open Sim Slot',
            action: 'openSimSlot'
        }
    },
    'id_card': {
        name: 'ID Card',
        description: 'ID Card',
        stackable: false,
        image: createImage('np_idcard'),
        weight: 1.0,
        decayrate: 0.0,
        context: {
            useItem: true,
            equipItem: true,
        }
    },
    'pixeltablet': {
        name: 'Pixel Tablet',
        description: 'Tablet',
        stackable: false,
        image: createImage('np_tablet'),
        weight: 1.0,
        decayrate: 0.0,
        context: {
            useItem: true,
            equipItem: true,
        }
    },
    'wallet': {
        name: 'Wallet',
        description: 'Wallet',
        stackable: false,
        image: createImage('np_wallet'),
        weight: 1.0,
        decayrate: 0.0,
        context: {
            equipItem: true,
            openItem: 'Open Wallet',
            action: 'openWallet'
        }
    },
    'water': {
        name: 'Water',
        description: 'Water Bottle.',
        stackable: true,
        image: createImage('water'),
        weight: 1.0,
        decayrate: 1.0,
        context: {
            useItem: true,
        }
    },
    'cash': {
        name: 'Cash',
        description: 'Cash Money',
        stackable: true,
        image: createImage('np_cash'),
        weight: 1.0,
        decayrate: 0.0,
        context: {
            useItem: false,
        }
    },
    'glock': {
        name: 'Glock 22',
        description: 'Government (PD/EMS/DOC) Issued Equipment',
        stackable: false,
        image: createImage('np_glock'),
        weaponHash : -120179019,
        weapon: true,
        weight: 5.0,
        decayrate: 2.0,
        context: {
            useItem: true,
        }
    },
    'hotdog': {
        name: 'Hot Dog',
        description: 'Hot Dog A Very Tasty Snack',
        stackable: true,
        image: createImage('hotdog'),
        weight: 1.0,
        decayrate: 3.0,
        context: {
            useItem: true,
        }
    },
    'simcard': {
        name: 'Sim Card',
        description: '',
        stackable: false,
        image: createImage('np_simcard'),
        weight: 1.0,
        decayrate: 0.0,
        context: {
            useItem: true,
        }
    },
    'hat': {
        name: 'Hat',
        description: '',
        stackable: false,
        image: createImage('np_hat'),
        weight: 1.0,
        decayrate: 0.0,
        context: {
            useItem: true,
        }
    },
    'glasses': {
        name: 'Glasses',
        description: '',
        stackable: false,
        image: createImage('np_glasses'),
        weight: 1.0,
        decayrate: 0.1,
        context: {
            useItem: true,
        }
    },
    'mask': {
        name: 'Mask',
        description: '',
        stackable: false,
        weight: 1.0,
        decayrate: 0.0,
        context: {
            useItem: true,
        }
    },
    'pistolammoPD': {
        name: 'Pistol Ammo (PD)',
        description: '',
        stackable: false,
        image: createImage('np_pistol-ammo'),
        weight: 37,
        decayrate: 2.0,
        context: {
            useItem: true,
        }
    },
    'armor': {
        name: 'Chest Armor',
        description: 'Protects you from bleeding and stumbling on injuries.',
        stackable: false,
        image: createImage('np_chest-armor'),
        weight: 1.0,
        decayrate: 1.0,
        context: {
            useItem: true,
            equipItem: true,
        }
    },
    'bandage': {
        name: 'Bandage',
        description: 'Heals Wounds and Reduces Bleeding',
        stackable: true,
        image: createImage('np_bandage'),
        weight: 3,
        decayrate: 2.0,
        fullyDegrades: true,
        context: {
            useItem: true,
        }
    },
    'flashlight': {
        name: 'Flashlight',
        description: 'Helps to see in the dark.',
        stackable: false,
        weaponHash: GetHashKey('WEAPON_FLASHLIGHT'),
        weapon: true,
        weight: 1.0,
        decayrate: 0.2,
        fullyDegrades: true,
        context: {
            useItem: true,
        }
    },
    'bag': {
        name: 'Backpack',
        description: 'Do you even lift bro?',
        stackable: false,
        weight: 4.0,
        decayrate: 0.0,
        context: {
            useItem: true,
        }
    },
    'housekey': {
        name: 'House Key',
        description: '',
        stackable: false,
        weight: 1.0,
        decayrate: 0.0,
        context: {
            useItem: true,
        }
    },
    'radio': {
        name: 'PD Radio',
        description: 'Encrypted - Used to chat with other people on PD radio channels.',
        stackable: false,
        weight: 2.0,
        decayrate: 0.5,
        context: {
            useItem: true,
        }
    },
    'civradio': {
        name: 'Standard Radio',
        description: 'Non-encrypted - Used to chat with other people on private radio channels. Will be seized in crime.',
        stackable: false,
        weight: 1.0,
        decayrate: 0.4,
        context: {
            useItem: true,
        }
    },
}

RPC.register('inventory:getItemList', async() => {
    return ItemList
})