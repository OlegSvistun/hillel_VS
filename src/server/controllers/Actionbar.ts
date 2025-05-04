RPC.register('inventory:getActionbarItems', async (source: number) => {
    const character = global.exports['ghost-lib'].getCharacter(source);
    if (!character || !character.citizenid) {
        console.warn('Character not found when fetching actionbar items')
        return Array(5).fill(null)
    }

    const items = await global.exports['oxmysql'].query_async('SELECT * FROM user_inventory2 WHERE name = @Name AND slot IN (1, 2, 3, 4, 5)', {
        '@Name': 'body-' + character.citizenid,
    }) || []

    const actionbarItems = Array(5).fill(null)

    items.forEach(item => {
        const slotIndex = item.slot - 1;
        actionbarItems[slotIndex] = item;
    })

    return actionbarItems
})

RPC.register('inventory:getItemInActionbarSlot', async(source: number, slot: any) => {
    const character = global.exports['ghost-lib'].getCharacter(source)
    
    if (!character || !character.citizenid) {
        console.warn('Character not found when fetching actionbar slot item')
        return []
    }

    const items = await global.exports['oxmysql'].query_async('SELECT * FROM user_inventory2 WHERE name = @Name AND slot = @Slot', {
        '@Name': 'body-' + character.citizenid,
        '@Slot': slot
    }) || []

    return items
})