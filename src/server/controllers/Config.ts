export const InventoryConfig = {
    PersonalInventory: {
        Slots: 15,
        MaxWeight: 150
    },

    Backpack: {
        Slots: 25,
        MaxWeight: 250
    },

    Drop: {
        Slots: 50,
        MaxWeight: 1000
    },

    Phone: {
        Slots: 1,
        MaxWeight: 80,
        acceptedItems: [
            'phone'
        ]
    },

    Simcard: {
        Slots: 1,
        MaxWeight: 80,
        acceptedItems: [
            'Sim Card',
            'simcard'
        ]
    },

    Wallet: {
        Slots: 5,
        acceptedItems: [
            'Cash' // By .name in itemList config.
        ],
        MaxWeight: 5
    },

    ApartmentStash: {
        Slots: 50,
        MaxWeight: 1000,
    },

    Pockets: {
        Slots: 5,
        MaxWeight: 125
    },

    Glovebox: {
        Slots: 7,
        MaxWeight: 150
    },

    Trunk: {
        Slots: 50,
        MaxWeight: 600
    }
}