import { Interface } from './../modules/interface';
import { Inventory } from './../modules/inventory/index';
import { Thread } from '../../shared/classes/thread';
import { Streaming } from '../../client/modules/streaming/streaming';
import { Vector3 } from './../../shared/classes/vector';
import { setClientInventory } from './../controllers/Exports'
import { GetGroundLevel } from "../../client/controllers/Drops";
import { inTrunk, trunkPlate } from "./Trunk";

const InventoryWeaponsList = {
    np_ak74: {
      weapon: "weapon_assaultrifle",
      ammoType: "762",
      maxAmmo: {
        normal: 30,
        extended: 60
      },
      magazines: ["np_ak74_magazine"],
      attachments: {
        weapon_silencer_assault: {
          label: "Silencer",
          bone: "gun_muzzle",
          component: "COMPONENT_AT_AR_SUPP_02"
        },
        weapon_magazine_assault: {
          label: "Extended Magazine",
          bone: "WAPClip",
          component: "COMPONENT_AT_AR_CLIP_02"
        }
      }
    },
    np_colt: {
      weapon: "weapon_pistol",
      ammoType: "45",
      maxAmmo: {
        normal: 12,
        extended: 16
      },
      magazines: ["np_colt_magazine", "np_colt_magazine_extended"],
      attachments: {},
      extendedComponent: "COMPONENT_PISTOL_CLIP_02"
    },
    np_deagle: {
      weapon: "weapon_pistol50",
      ammoType: "50cal",
      maxAmmo: {
        normal: 9,
        extended: 12
      },
      magazines: ["np_deagle_magazine", "np_deagle_magazine_extended"],
      attachments: {},
      extendedComponent: "COMPONENT_PISTOL50_CLIP_02"
    },
    np_glock: {
      weapon: "weapon_glocksand",
      ammoType: "9mm",
      maxAmmo: {
        normal: 12,
        extended: 32
      },
      magazines: ["np_glock_magazine", "np_glock_magazine_extended"],
      attachments: {
        np_glock_silencer: {
          label: "Silencer",
          bone: "gun_muzzle",
          component: "COMPONENT_AT_PI_SUPP_01"
        },
        np_glock_flash: {
          label: "Lasersight",
          bone: "WAPFlshLasr",
          component: "COMPONENT_GLOCK_PI_FLSH"
        }
      },
      extendedComponent: "COMPONENT_GLOCKSAND_CLIP_02"
    },
    np_glock_pd: {
      weapon: "weapon_glockblack",
      ammoType: "9mm",
      maxAmmo: {
        normal: 12,
        extended: 32
      },
      magazines: ["np_glock_magazine", "np_glock_magazine_extended"],
      attachments: {
        np_glock_silencer: {
          label: "Silencer",
          bone: "gun_muzzle",
          component: "COMPONENT_AT_PI_SUPP_01"
        },
        np_glock_flash: {
          label: "Lasersight",
          bone: "WAPFlshLasr",
          component: "COMPONENT_GLOCK_PI_FLSH"
        }
      },
      extendedComponent: "COMPONENT_GLOCKSAND_CLIP_02"
    },
    np_glock_smg: {
      weapon: "weapon_glock_fc",
      ammoType: "9mm",
      maxAmmo: {
        normal: 12,
        extended: 32
      },
      magazines: ["np_glock_magazine", "np_glock_magazine_extended"],
      attachments: {
        np_glock_silencer: {
          label: "Silencer",
          bone: "gun_muzzle",
          component: "COMPONENT_AT_PI_SUPP_01"
        },
        np_glock_scope: {
          label: "Scope",
          bone: "WAPScop",
          component: "COMPONENT_AT_SCOPE_SMALL"
        },
        np_glock_grip: {
          label: "Grip",
          bone: "WAPFlshLasr",
          component: "COMPONENT_AT_PI_AFGRIP"
        }
      },
      extendedComponent: "COMPONENT_GLOCKSAND_CLIP_02"
    },
    np_m4: {
      weapon: "weapon_carbinerifle",
      ammoType: "556",
      maxAmmo: {
        normal: 30,
        extended: 60
      },
      magazines: ["np_m4_magazine", "np_m4_magazine_extended"],
      attachments: {
        np_m4_silencer: {
          label: "Silencer",
          bone: "WAPSupp",
          component: "COMPONENT_AT_AR_SUPP"
        },
        np_m4_grip: {
          label: "Grip",
          bone: "WAPGrip",
          component: "COMPONENT_AT_AR_AFGRIP"
        },
        np_m4_flash: {
          label: "Flashlight",
          bone: "WAPFlshLasr",
          component: "COMPONENT_AT_AR_FLSH"
        },
        np_m4_scope: {
          label: "Scope",
          bone: "WAPScop",
          component: "COMPONENT_AT_SCOPE_MEDIUM"
        }
      },
      extendedComponent: "COMPONENT_CARBINERIFLE_CLIP_02"
    },
    np_ak_12: {
      weapon: "weapon_ak_12",
      ammoType: "556",
      maxAmmo: {
        normal: 30
      },
      magazines: ["np_ak_12_magazine"],
      attachments: {
        np_ak_12_silencer: {
          label: "Silencer",
          bone: "WAPSupp",
          component: "COMPONENT_AT_AR_SUPP"
        },
        np_ak_12_scope: {
          label: "Scope",
          bone: "WAPScop",
          component: "COMPONENT_AK_12_SCOPE_MEDIUM"
        }
      }
    },
    np_hunting_rifle: {
      weapon: "weapon_sniperrifle2",
      ammoType: "762",
      maxAmmo: {
        normal: 10
      },
      magazines: ["np_hunting_rifle_magazine"],
      attachments: {}
    },
    np_mac10: {
      weapon: "weapon_mac_10",
      ammoType: "9mm",
      maxAmmo: {
        normal: 30
      },
      magazines: ["np_mac10_magazine"],
      attachments: {
        np_mac10_silencer: {
          label: "Silencer",
          bone: "WAPSupp",
          component: "COMPONENT_AT_AR_SUPP"
        }
      }
    },
    np_mac10_compact: {
      weapon: "weapon_mac_10_compact",
      ammoType: "9mm",
      maxAmmo: {
        normal: 30
      },
      magazines: ["np_mac10_magazine"],
      attachments: {
        np_mac10_silencer: {
          label: "Silencer",
          bone: "WAPSupp",
          component: "COMPONENT_AT_AR_SUPP"
        }
      }
    },
    np_taser: {
      weapon: "weapon_taser",
      ammoType: "taser_dart",
      maxAmmo: {
        normal: 3
      },
      magazines: ["np_taser_magazine"],
      attachments: {}
    },
    np_flashlight: {
      weapon: "weapon_flashlight",
      ammoType: "",
      maxAmmo: {
        normal: 0
      },
      magazines: [],
      attachments: {}
    },
    np_dagger: {
      weapon: "weapon_dagger",
      ammoType: "",
      maxAmmo: {
        normal: 0
      },
      magazines: [],
      attachments: {}
    },
    np_bat: {
      weapon: "weapon_bat",
      ammoType: "",
      maxAmmo: {
        normal: 0
      },
      magazines: [],
      attachments: {}
    },
    np_bottle: {
      weapon: "weapon_bottle",
      ammoType: "",
      maxAmmo: {
        normal: 0
      },
      magazines: [],
      attachments: {}
    },
    np_crowbar: {
      weapon: "weapon_crowbar",
      ammoType: "",
      maxAmmo: {
        normal: 0
      },
      magazines: [],
      attachments: {}
    },
    np_golfclub: {
      weapon: "weapon_golfclub",
      ammoType: "",
      maxAmmo: {
        normal: 0
      },
      magazines: [],
      attachments: {}
    },
    np_hammer: {
      weapon: "weapon_hammer",
      ammoType: "",
      maxAmmo: {
        normal: 0
      },
      magazines: [],
      attachments: {}
    },
    np_hatchet: {
      weapon: "weapon_hatchet",
      ammoType: "",
      maxAmmo: {
        normal: 0
      },
      magazines: [],
      attachments: {}
    },
    np_knuckle: {
      weapon: "weapon_knuckle",
      ammoType: "",
      maxAmmo: {
        normal: 0
      },
      magazines: [],
      attachments: {}
    },
    np_knife: {
      weapon: "weapon_knife",
      ammoType: "",
      maxAmmo: {
        normal: 0
      },
      magazines: [],
      attachments: {}
    },
    np_machete: {
      weapon: "weapon_machete",
      ammoType: "",
      maxAmmo: {
        normal: 0
      },
      magazines: [],
      attachments: {}
    },
    np_switchblade: {
      weapon: "weapon_switchblade",
      ammoType: "",
      maxAmmo: {
        normal: 0
      },
      magazines: [],
      attachments: {}
    },
    np_nightstick: {
      weapon: "weapon_nightstick",
      ammoType: "",
      maxAmmo: {
        normal: 0
      },
      magazines: [],
      attachments: {}
    },
    np_wrench: {
      weapon: "weapon_wrench",
      ammoType: "",
      maxAmmo: {
        normal: 0
      },
      magazines: [],
      attachments: {}
    },
    np_kfr: {
      weapon: "weapon_digiscanner",
      ammoType: "",
      maxAmmo: {
        normal: 0
      },
      magazines: [],
      attachments: {},
      ignoreAlert: true
    },
    np_battleaxe: {
      weapon: "weapon_battleaxe",
      ammoType: "",
      maxAmmo: {
        normal: 0
      },
      magazines: [],
      attachments: {}
    },
    np_poolcue: {
      weapon: "weapon_poolcue",
      ammoType: "",
      maxAmmo: {
        normal: 0
      },
      magazines: [],
      attachments: {}
    },
    np_fireextinguisher: {
      weapon: "WEAPON_FIREEXTINGUISHER",
      ammoType: "",
      maxAmmo: {
        normal: 0
      },
      magazines: [],
      attachments: {},
      unlimitedAmmo: true,
      ignoreAlert: true
    }
  };

const ENTITY_RADIUS = 100;

const droppedItemsMap = new Map();
const newDropsMap = new Map();
const activeEntitiesMap = new Map();

export async function fetchItemList() {
    let itemList;
    try {
        itemList = await Inventory.GetItemList();
        if (!itemList || Object.keys(itemList).length === 0) {
            return [false, {}];
        }
        return [true, itemList];
    } catch (error) {
        console.error('Failed to fetch item list:', error);
        return [false, {}];
    }
}

function updateNearbyEntities(): Promise<void> {
    return new Promise<void>((resolve) => {
        const coords = GetEntityCoords(PlayerPedId());

        const currentPos = new Vector3(coords[0], coords[1], coords[2]);

        const nearbyEntities = getEntitiesWithinRadius(currentPos, newDropsMap.values(), ENTITY_RADIUS);

        const entitiesToRemove = getEntitiesToRemove(droppedItemsMap.values(), nearbyEntities);

        addNewEntities(nearbyEntities);
        removeEntities(entitiesToRemove);

        resolve();
    });
}

const startThread = () => {
    const threadInstance = new Thread(updateNearbyEntities, 1000);
    threadInstance.start();
};

startThread()

function getEntitiesWithinRadius(position: any, entities: Iterable<any>, radius: number) {
  const entityArray = Array.from(entities);
  const entitiesWithinRadius = entityArray.filter(entity => {
    const x = entity.x !== undefined ? entity.x : (entity[0] || entity.data.x);
    const y = entity.y !== undefined ? entity.y : (entity[1] || entity.data.y);
    const z = entity.z !== undefined ? entity.z : (entity[2] || entity.data.z);
    // issues ?
    return position.getDistance(new Vector3(x, y, z)) < radius;
  });
  entitiesWithinRadius.forEach(entity => {
    // console.log(`Entity ID: ${JSON.stringify(entity)}`);
  });
  return entitiesWithinRadius;
}


function getEntitiesToRemove(currentEntities: Iterable<any>, nearbyEntities: any[]) {
    return Array.from(currentEntities).filter(entity => 
        !nearbyEntities.some(fmdevelpoment => fmdevelpoment.id === entity.data.id)
    );
}

function addNewEntities(entities: any[]) {
    for (const entity of entities) {
        if (!droppedItemsMap.has(entity.id)) {
            createEntity(entity);
        }
    }
}

function removeEntities(entities: any[]) {
    for (const entity of entities) {
        removeEntity(entity.data.id);
    }
}

function cleanUpRemovedEntities() {
    for (const [entity, dropId] of activeEntitiesMap.entries()) {
        if (!droppedItemsMap.has(dropId)) {
            SetEntityAsMissionEntity(entity, true, true);
            DeleteEntity(entity);
            Interface.removeInteraction(`pickup_${entity}`);
            activeEntitiesMap.delete(entity);
        }
    }
}

function removeEntity(dropId: string) {
    const drop = droppedItemsMap.get(dropId);
    if (!drop) return;
    for (const [key, entity] of Object.entries(drop.attachedEntities)) {
        if (entity && typeof entity === 'object' && 'handle' in entity) {
            const attachedEntity = entity as { handle: number }
            SetEntityAsMissionEntity(attachedEntity.handle, true, true);
            DeleteEntity(attachedEntity.handle);
            Interface.removeInteraction(`pickup_${attachedEntity.handle}`);
            activeEntitiesMap.delete(attachedEntity.handle);
        } else {
            console.warn(`Entity with key ${key} does not have the expected structure.`);
        }
    }
    cleanUpRemovedEntities();
    droppedItemsMap.delete(dropId);
}

async function getGroundLevel(coords: any, groundType: string) {
    if (droppedItemsMap.size > 0) {
        const closestAttachment = findClosestAttachment(coords);
        
        if (closestAttachment) {
          const dropData = droppedItemsMap.get(closestAttachment.dropId)?.data;
          if (dropData) {
            const InventoryName = dropData.data.metadata.dropName ? dropData.data.metadata.dropName : dropData.dropName
            return InventoryName;
          }
        }

        const closestDrop = findClosestDrop(coords);

        if (closestDrop && closestDrop.distance < 1.5) {
            const dropData = droppedItemsMap.get(closestDrop.dropId)?.data;
            if (dropData) {
                console.warn(`Returning a ground drop by ID.. deprecated please contact FMDev if you see this message.`);
                return dropData.data.metadata.inventoryId;
            }
        }

    }

    const coordsObj = {
      x: typeof coords.x !== 'undefined' ? coords.x : coords[0],
      y: typeof coords.y !== 'undefined' ? coords.y : coords[1],
      z: typeof coords.z !== 'undefined' ? coords.z : coords[2]
    };

    const [success, groundZ] = GetGroundZFor_3dCoord(coordsObj.x, coordsObj.y, coordsObj.z, true);
    
    let finalZ = coordsObj.z;
    if (success && groundZ !== null && !isNaN(groundZ)) {
        finalZ = groundZ; // Maybe use later
        // console.log(`Found ground Z: ${groundZ}`);
    } else {
        console.log(`Failed to find ground Z, using current Z: ${coordsObj.z}`);
    }
    return `ground::${formatCoordinates(coords[0], coords[1], coords[2])}::${groundType}`;
}

function findClosestAttachment(coords: any) {
  const nearbyDrops = Array.from(droppedItemsMap.values()).map(drop => {
      return {
          dropId: drop.data.id,
          attachments: drop.attachedEntities ? Object.values(drop.attachedEntities) as { handle: number }[] : []
      };
  });

  return nearbyDrops.map(drop => {
          const closestEntity = drop.attachments.map(att => ({
                  entity: (att as { handle: number }).handle,
                  distance: new Vector3(GetEntityCoords((att as { handle: number }).handle)).getDistance(coords.x || coords[0], coords.y || coords[1], coords.z || coords[2])
          })).filter(ent => ent.distance < 1.5).sort((a, b) => a.distance - b.distance)[0];

          return {
              dropId: drop.dropId,
              distance: closestEntity?.distance ?? 9999,
              entity: closestEntity?.entity ?? 0
          };
      }).filter(drop => drop.entity !== 0).sort((a, b) => a.distance - b.distance)[0];
}


function findClosestDrop(coords: any) {
    return Array.from(droppedItemsMap.values()).map(drop => {
      return {
        dropId: drop.data.id,
        distance: new Vector3(drop.data.x, drop.data.y, drop.data.z).getDistance(coords.x || coords[0] , coords.y || coords[1] , coords.z || coords[2])
    }
    }).sort((a, b) => a.distance - b.distance)[0];
}

function getValidModel(item: any, variant?: string) {
  const model = variant ? item?.variants?.[variant]?.model : null;
  const defaultModel = model ?? item?.model ?? "prop_paper_bag_01";
  return IsModelValid(defaultModel) ? defaultModel : "prop_paper_bag_01";
}

const createObject = async function (model: string, coords: any, options: any, useWeapon = false) {
  let weaponObject;
  if (options && !useWeapon) {
      const loadedWeapon = await Streaming.loadWeaponAsset(options.weapon, 31, 0);
      if (loadedWeapon) {
          return CreateWeaponObject(options.weapon, 0, coords.x, coords.y, coords.z, true, 1, 0);
      }
  }
  await Streaming.loadModel(model);
  weaponObject = CreateObjectNoOffset(model, coords.x, coords.y, coords.z, useWeapon, useWeapon, false);
  SetModelAsNoLongerNeeded(model);
  return weaponObject;
};
interface AttachedEntity {
  itemStacks: string[];
  handle: number;
}

interface DropData {
  ns: string;
  data: {
    metadata: {
      inventoryDrop: boolean;
      attachedObjects: { [key: string]: any };
    };
  };
  id: string;
}

interface AttachedEntity {
  itemStacks: string[];
  handle: number;
}

const createEntity = async (dropData: DropData) => {
  if (dropData.ns !== "inventory_drops" || !dropData.data.metadata.inventoryDrop) {
    return;
  }

  const attachedObjects = dropData.data.metadata.attachedObjects;
  const [success, itemList] = await fetchItemList();
  if (!success) return;
  let existingEntity = droppedItemsMap.get(dropData.id);

  if (!existingEntity) {
    existingEntity = { attachedEntities: {} };
    droppedItemsMap.set(dropData.id, existingEntity);
  }
  
  const objectGroups = Object.entries(attachedObjects).reduce((FMDevData: { [key: string]: any[] }, [key, value]: [string, any]) => {
    
    const coords = new Vector3(value.coords.x, value.coords.y, value.coords.z);
    const roundedCoords = new Vector3(Math.round(coords.x * 10) / 10, Math.round(coords.y * 10) / 10, Math.round(coords.z * 10) / 10);

    const itemWeapon = InventoryWeaponsList[value.itemId];

    const itemModel = itemWeapon ? itemWeapon.weapon : `${key}`;

    if (!FMDevData[itemModel]) {
      FMDevData[itemModel] = [];
    }

    FMDevData[itemModel].push({
      itemStackId: key,
      itemId: value.itemId,
      variant: value.variant,
      coords: value.coords,
      rotation: value.rotation,
      heading: value.heading,
      weapon: itemWeapon,
      model: getValidModel(itemList[value.itemId], value.variant)
    });

    return FMDevData;
  }, {});

  const updatedEntities: { [key: string]: AttachedEntity } = {};
  let hasError = false;
  let error: any;

  try {
    const checkAndRemoveEntities = () => {
      for (const [entityId, entityData] of Object.entries(existingEntity.attachedEntities)) {
        const itemData = objectGroups[entityId];
        const itemStacks = itemData ? itemData.map(item => item.itemStackId) : [];

        if (!itemData || !itemStacks.every((id, index) => id === (entityData as AttachedEntity).itemStacks[index])) {
          const entity = (entityData as AttachedEntity).handle;
          SetEntityAsMissionEntity(entity, true, true);
          DeleteEntity(entity);
          Interface.removeInteraction(`pickup_${entity}`);
          delete existingEntity.attachedEntities[entityId];
        }
      }
    };

    checkAndRemoveEntities();
  } catch (err) {
    hasError = true;
    error = err;
  } finally {
    if (hasError) {
      throw error;
    }
  }

  const promises = Object.entries(objectGroups).map(async ([model, items]) => {

    if (existingEntity.attachedEntities[model]) {
      updatedEntities[model] = existingEntity.attachedEntities[model];
      return;
    }

    const item = items[0];
    const coords = item.coords;
    const itemModel = items.length === 1 ? item.model : "prop_paper_bag_01";

    try {
      const entity = await createObject(itemModel, coords, item.weapon, false);
      SetEntityAsMissionEntity(entity, true, true);
      FreezeEntityPosition(entity, true);
      SetEntityCollision(entity, false, false);

      updatedEntities[model] = {
        itemStacks: items.map(i => i.itemStackId),
        handle: entity
      };
      activeEntitiesMap.set(entity, dropData.id);
      if (item.rotation) {
        SetEntityRotation(entity, item.rotation.x, item.rotation.y, item.rotation.z, 2, true);
      } else {
        SetEntityHeading(entity, item.heading);
        PlaceObjectOnGroundProperly_2(entity);

        const rotation = new Vector3(GetEntityRotation(entity, 2));
        if (item.weapon) {
          SetEntityRotation(entity, rotation.x + 90, rotation.y, rotation.z, 2, true);
          const minDim = new Vector3(-0.5, -0.5, -0.5); // Replace with actual min dimensions ?
          const maxDim = new Vector3(0.5, 0.5, 0.5);  // Replace with actual max dimensions ?
          const heightDiff = maxDim.z - minDim.z;
          const depthDiff = maxDim.y - minDim.y;
          const adjustedCoords = new Vector3(GetEntityCoords(entity)).sub(new Vector3(0, 0, heightDiff / 2 - depthDiff / 2));
          SetEntityCoordsNoOffset(entity, adjustedCoords.x, adjustedCoords.y, adjustedCoords.z, false, false, false);
        }
      }

      const position = new Vector3(GetEntityCoords(entity));
      Interface.addInteraction(`pickup_${entity}`, position, [{
        id: "pickup_object",
        label: "Pickup",
        eventSDK: "inventory:pickupObject",
        parameters: {
          entity,
          dropId: dropData.id
        }
      }], {
        flag: [""],
        isEnabled: () => !IsPedInAnyVehicle(PlayerPedId(), false),
        distance: {
          use: 2,
          draw: 2
        }
      });
    } catch (err) {
      throw err;
    }
  });

  Promise.all(promises).finally(() => {
    droppedItemsMap.set(dropData.id, {
      data: dropData,
      attachedEntities: updatedEntities
    });
  });
};

onNet("np:inventory:updateDroppedItems", (items:any) => {
    items.forEach(item => {
        newDropsMap.set(item.id, item);
    });
});

onNet("np:inventory:removeDroppedItems", (itemIds:any) => {
    itemIds.forEach(itemId => {
        newDropsMap.delete(itemId);
        removeEntity(itemId);
    });
});

on("np:inventory:addDrop", (drop:any) => {
    newDropsMap.set(drop.id, drop);
    createEntity(drop);
});

onNet("np:inventory:removeDrop", (dropId:any) => {
    newDropsMap.delete(dropId);
    removeEntity(dropId);
});

RegisterCommand("fixDrops", () => {
    newDropsMap.forEach(drop => createEntity(drop));
}, false);

on("np-objects:objectCreated", (pData:any, entity:any) => {
  if (pData.ns !== "inventory_drops") {
    return;
  }

  if (!pData.data.metadata.inventoryDrop) {
    return;
  }

  SetEntityVisible(entity, false, false);

  newDropsMap.set(pData.id, pData);

  const distanceChecker = new Vector3(pData.x, pData.y, pData.z);
  const radius = 100;
  
  const playerCoords = GetEntityCoords(PlayerPedId());
  
  if (playerCoords.length >= 3) {
    const [playerX, playerY, playerZ] = playerCoords;
    if (distanceChecker.getDistance(playerX, playerY, playerZ) < radius) {
      createEntity(pData);
    }
  } else {
    console.error('Invalid player coordinates received.');
  }
});
onNet("np-objects:objectDeleted", function (dataa: any) {
  if (dataa.ns !== "inventory_drops") {
    return;
  }
  if (!dataa.data.metadata.inventoryDrop) {
    return;
  }

  if (newDropsMap.has(dataa.id)) {
    // console.log(`ID ${dataa.id} found in newDropsMap deleting`);
    newDropsMap.delete(dataa.id);
  } else {
    console.warn(`ID ${dataa.id} not found in newDropsMap`);
  }

  removeEntity(dataa.id);
});

on("inventory:pickupObject", async function (event: any) {
  const { dropId, entity } = event;
  
  if (!dropId || !DoesEntityExist(entity)) {
      return;
  }
  const drop = droppedItemsMap.get(dropId) as { attachedEntities: { [key: string]: any } } | undefined;
  
  if (!drop) {
    return;
  }
  
  const attachedEntities = drop.attachedEntities;
  const itemStacks = Object.values(attachedEntities).find((attachedEntity: any) => attachedEntity.handle === entity)?.itemStacks ?? [];
  
  if (!itemStacks.length) {
    return;
  }

  const itemList = await Inventory.GetItemList();

  RPC.execute("inventory:pickupItems", itemStacks , drop['data'].id, itemList);
});

onNet("inventory:pickupAnimation", async (animationName: string, position?: { x: number, y: number, z: number }) => {
  const ped = PlayerPedId();
  if (position) {
    const pedCoords = GetEntityCoords(ped, true) as [number, number, number];
    const zDiff = pedCoords[2] + 0.5 - position.z;

    if (zDiff < 0.75) {
      const animDict = "anim@amb@nightclub@mini@drinking@drinking_shots@ped_d@normal";
      await Streaming.loadAnim(animDict);
      TaskPlayAnim(ped, animDict, "pickup", 8, -8, -1, 48, 0, false, false, false);
      return;
    }
  }
  await Streaming.loadAnim("pickup_object");
  TaskPlayAnim(ped, "pickup_object", animationName, 8, 1, -1, 48, 0, false, false, false);
});

function formatCoordinates(x: number, y: number, z: number) {
    return `${x.toFixed(2)},${y.toFixed(2)},${z.toFixed(2)}`;
}

function isInventoryOpen(): boolean {
  return global.exports.focusmanager.HasUIFocus();
}

async function refreshInventoryDisplay(): Promise<void> {
  try {
    // console.log('Refreshing inventory display');
    const inVehicle = IsPedInVehicle(PlayerPedId(), GetVehiclePedIsIn(PlayerPedId(), false), false);
    const licensePlate = inVehicle ? GetVehicleNumberPlateText(GetVehiclePedIsIn(PlayerPedId(), false)) : "";
    
    const coords = GetEntityCoords(PlayerPedId());
    const groundInventory = await GetGroundLevel(coords, "default");
    
    const Inventory = await RPC.execute('inventory:getInventories', 
        inVehicle, 
        licensePlate, 
        inTrunk, 
        trunkPlate, 
        groundInventory
    );
    
    setClientInventory(Array.isArray(Inventory) ? Inventory : [Inventory]);
    
    SendNUIMessage({
      Inventory: Inventory
    });
    
    // console.log('Inventory display refreshed successfully with ground inventory: ', groundInventory);
  } catch (error) {
    console.error('Error refreshing inventory:', error);
  }
}
onNet('inventory:refreshInventory', () => {
  if (isInventoryOpen()) {
    refreshInventoryDisplay();
  }
});

export { getGroundLevel as GetGroundLevel, removeEntity as Tq, isInventoryOpen, refreshInventoryDisplay };
