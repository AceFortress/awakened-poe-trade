import { ParsedItem, ItemRarity, ItemCategory } from '@/parser'
import { SPECIAL_SUPPORT_GEM } from '../filters/create-item-filters'
import { ACCESSORY, ARMOUR, WEAPON } from '@/parser/meta'

export function isValuableBasetype (item: ParsedItem): boolean {
  if (
    !(item.rarity === ItemRarity.Normal || item.rarity === ItemRarity.Magic || item.rarity === ItemRarity.Rare) ||
    !item.category
  ) return false

  return (
    ACCESSORY.has(item.category) ||
    ARMOUR.has(item.category) ||
    WEAPON.has(item.category) ||
    item.category === ItemCategory.Quiver
  )
}

export function getDetailsId (item: ParsedItem) {
  const ns = item.info.namespace
  if (item.category === ItemCategory.Gem) {
    return forSkillGem(item)
  }
  if (item.category === ItemCategory.Map) {
    if (item.rarity === ItemRarity.Unique) {
      return `${ns}::${item.info.refName} // T${item.mapTier}`
    } else {
      return `${ns}::${item.mapBlighted ? `${item.mapBlighted} ` : ''}${item.info.refName} // T${item.mapTier}`
    }
  }
  if (item.rarity === ItemRarity.Unique) {
    return forUniqueItem(item)
  }
  if (isValuableBasetype(item)) {
    return forBasetype(item)
  }
  return `${ns}::${item.info.refName}`
}

function forSkillGem (item: ParsedItem) {
  let id = item.gemAltQuality === 'Superior'
    ? `${item.info.namespace}::${item.info.refName}`
    : `${item.info.namespace}::${item.gemAltQuality} ${item.info.refName}`

  if (
    SPECIAL_SUPPORT_GEM.includes(item.info.refName) ||
    item.info.refName === 'Portal' ||
    item.info.refName === 'Brand Recall' ||
    item.info.refName === 'Blood and Sand' ||
    item.gemLevel! >= 20
  ) {
    id += ` // ${item.gemLevel}`
  } else {
    id += ' // 1'
  }
  if (
    item.quality &&
    !SPECIAL_SUPPORT_GEM.includes(item.info.refName) &&
    !(item.info.refName === 'Brand Recall' && item.isCorrupted)
    // @TODO(poe.ninja blocking): !(item.info.refName === 'Blood and Sand' && item.isCorrupted)
  ) {
    // Gem Q20 with up to 4xGCP (TODO: should this rule apply to corrupted gems?)
    const q = (item.quality >= 16 && item.quality <= 20) ? 20 : item.quality
    id += ` // ${q}%`
  } else {
    id += ' // 0%'
  }
  if (item.isCorrupted && item.info.refName !== 'Portal') {
    id += ' // Corrupted'
  }
  return id
}

function forBasetype (item: ParsedItem) {
  let id = `${item.info.namespace}::${item.info.refName}`

  id += ` // ${Math.min(item.itemLevel!, 86)}`

  if (item.influences.length === 1) {
    id += ` // ${item.influences[0]}`
    return id
  } else if (item.influences.length > 1) {
    return undefined
  }
}

function forUniqueItem (item: ParsedItem) {
  if (!item.info.unique) return

  let id = `${item.info.namespace}::${item.info.refName} // ${item.info.unique.base}`
  const variant = getUniqueVariant(item)
  if (variant) {
    id += ` // ${variant}`
  }
  if (item.sockets?.linked) {
    id += ` // ${item.sockets.linked}L`
  }

  return id
}

function getUniqueVariant (item: ParsedItem) {
  function hasStat (item: ParsedItem, stat: string) {
    return item.statsByType.some(m => m.stat.ref === stat)
  }

  const uniqueName = item.info.refName

  if (uniqueName === 'Vessel of Vinktar') {
    if (hasStat(item, 'Adds # to # Lightning Damage to Attacks during Flask effect')) {
      return 'Added Attacks'
    } else if (hasStat(item, 'Adds # to # Lightning Damage to Spells during Flask effect')) {
      return 'Added Spells'
    } else if (hasStat(item, 'Damage Penetrates #% Lightning Resistance during Flask effect')) {
      return 'Penetration'
    } else if (hasStat(item, '#% of Physical Damage Converted to Lightning during Flask effect')) {
      return 'Conversion'
    }
  } else if (uniqueName === "Atziri's Splendour") {
    if (hasStat(item, '#% increased Armour, Evasion and Energy Shield')) {
      return 'Armour/Evasion/ES'
    } else if (hasStat(item, '#% increased Evasion and Energy Shield') && hasStat(item, '+# to maximum Energy Shield')) {
      return 'Evasion/ES'
    } else if (hasStat(item, '#% increased Evasion and Energy Shield') && hasStat(item, '+# to maximum Life')) {
      return 'Evasion/ES/Life'
    } else if (hasStat(item, '#% increased Armour and Energy Shield') && hasStat(item, '+# to maximum Energy Shield')) {
      return 'Armour/ES'
    } else if (hasStat(item, '#% increased Armour and Energy Shield') && hasStat(item, '+# to maximum Life')) {
      return 'Armour/ES/Life'
    } else if (hasStat(item, '#% increased Armour and Evasion') && hasStat(item, '+# to maximum Life')) {
      return 'Armour/Evasion'
    } else if (hasStat(item, '+# to maximum Energy Shield') && hasStat(item, '#% increased Energy Shield')) {
      return 'ES'
    } else if (hasStat(item, '#% increased Evasion Rating') && hasStat(item, '+# to maximum Life')) {
      return 'Evasion'
    } else if (hasStat(item, '#% increased Armour') && hasStat(item, '+# to maximum Life')) {
      return 'Armour'
    }
  } else if (uniqueName === 'Bubonic Trail' || uniqueName === 'Lightpoacher' || uniqueName === 'Shroud of the Lightless' || uniqueName === 'Tombfist') {
    const sockets = item.statsByType.find(m => m.type === 'explicit' && m.stat.ref === 'Has # Abyssal Sockets')!
    const roll = sockets.sources[0].contributes!.value
    if (roll === 2) {
      return '2 Jewels'
    } else if (roll === 1) {
      return '1 Jewel'
    }
  } else if (uniqueName === "Volkuur's Guidance") {
    if (hasStat(item, 'Adds # to # Cold Damage to Spells and Attacks')) {
      return 'Cold'
    } else if (hasStat(item, 'Adds # to # Fire Damage to Spells and Attacks')) {
      return 'Fire'
    } else if (hasStat(item, 'Adds # to # Lightning Damage to Spells and Attacks')) {
      return 'Lightning'
    }
  } else if (uniqueName === "Yriel's Fostering") {
    if (hasStat(item, 'Projectiles from Attacks have #% chance to Maim on Hit while\nyou have a Bestial Minion')) {
      return 'Maim'
    } else if (hasStat(item, 'Projectiles from Attacks have #% chance to Poison on Hit while\nyou have a Bestial Minion')) {
      return 'Poison'
    } else if (hasStat(item, 'Projectiles from Attacks have #% chance to inflict Bleeding on Hit while\nyou have a Bestial Minion')) {
      return 'Bleeding'
    }
  } else if (uniqueName === "Doryani's Invitation") {
    if (hasStat(item, '#% increased Global Physical Damage')) {
      return 'Physical'
    } else if (hasStat(item, '#% increased Fire Damage')) {
      return 'Fire'
    } else if (hasStat(item, '#% increased Cold Damage')) {
      return 'Cold'
    } else if (hasStat(item, '#% increased Lightning Damage')) {
      return 'Lightning'
    }
  } else if (uniqueName === 'Impresence') {
    if (hasStat(item, 'Adds # to # Cold Damage')) {
      return 'Cold'
    } else if (hasStat(item, 'Adds # to # Chaos Damage')) {
      return 'Chaos'
    } else if (hasStat(item, 'Adds # to # Fire Damage')) {
      return 'Fire'
    } else if (hasStat(item, 'Adds # to # Lightning Damage')) {
      return 'Lightning'
    } else if (hasStat(item, 'Adds # to # Physical Damage')) {
      return 'Physical'
    }
  } else if (uniqueName === 'Voices') {
    const passives = item.statsByType.find(m => m.stat.ref === 'Adds # Small Passive Skills which grant nothing')!
    const roll = passives.sources[0].contributes!.value
    if (roll === 7) {
      return '7 passives'
    } else if (roll === 5) {
      return '5 passives'
    } else if (roll === 3) {
      return '3 passives'
    }
  }
}
