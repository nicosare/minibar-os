import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PRODUCTS = [
  { name: 'Heineken 0.33', price: 450.00, volume: 0.33, unit: 'шт', emoji: '🍺', bgColor: 'amber', hasExpiry: true },
  { name: 'Chianti Classico 0.75', price: 1800.00, volume: 0.75, unit: 'шт', emoji: '🍷', bgColor: 'red', hasExpiry: true },
  { name: 'Evian 0.5', price: 220.00, volume: 0.5, unit: 'шт', emoji: '💧', bgColor: 'blue', hasExpiry: true },
  { name: 'Lindt Excellence 85%', price: 380.00, volume: 100, unit: 'г', emoji: '🍫', bgColor: 'yellow', hasExpiry: true },
  { name: "Jack Daniel's 0.05", price: 1200.00, volume: 0.05, unit: 'шт', emoji: '🥃', bgColor: 'purple', hasExpiry: true },
  { name: 'Coca-Cola 0.33', price: 220.00, volume: 0.33, unit: 'шт', emoji: '🥤', bgColor: 'rose', hasExpiry: true },
  { name: 'Pringles Original', price: 350.00, volume: 40, unit: 'г', emoji: '🥔', bgColor: 'orange', hasExpiry: true }
];

const SETTINGS = [
  { key: 'hotel_name', value: 'Grand Palace Hotel' },
  { key: 'currency', value: 'RUB' },
  { key: 'ui_language', value: 'ru' }
];

const ROOM_NUMBERS = [
  500,502,504,506,508,509,510,512,514,516,518,520,522,524,526,528,530,532,534,
  600,602,604,606,608,609,610,612,614,616,618,620,622,624,626,628,630,632,634,
  700,702,704,706,708,709,710,712,714,716,717,718,720,722,724,725,726,728,730,732,734,
  800,802,804,806,808,809,810,812,814,816,817,818,820,822,824,825,826,828,830,832,834,
  900,902,904,906,908,909,910,912,914,916,917,918,920,922,924,925,926,928,930,932,934,
  1000,1002,1004,1006,1008,1009,1010,1012,1014,1016,1017,1018,1020,1022,1024,1025,1026,1028,1030,1032,1034,
  1100,1102,1104,1106,1108,1109,1110,1112,1114,1116,1117,1118,1120,1122,1124,1125,1126,1128,1130,1132,1134,
  1200,1202,1204,1206,1208,1209,1210,1212,1214,1216,1217,1218,1220,1222,1224,1225,1226,1228,1230,1232,1234,
  1300,1302,1304,1306,1308,1309,1310,1312,1314,1316,1317,1318,1320,1322,1324,1325,1326,1328,1330,1332,1334,
  1400,1402,1404,1406,1408,1409,1410,1412,1414,1416,1417,1418,1420,1422,1424,1425,1426,1428,1430,1432,1434,
  1500,1502,1504,1506,1508,1509,1510,1512,1514,1516,1517,1518,1520,1522,1524,1525,1526,1528,1530,1532,1534,
  1600,1602,1604,1606,1608,1609,1610,1612,1614,1616,1617,1618,1620,1622,1624,1625,1626,1628,1630,1632,1634,
  1700,1702,1704,1706,1708,1709,1710,1712,1714,1716,1717,1718,1720,1722,1724,1725,1726,1728,1730,1732,1734,
  1800,1802,1804,1806,1807,1808,1810,1811,1812,1814,1816,1818,
  1902,1904,1906,1908,1910,1911,1912,1914,1916,1918,1919,1920
];

async function main() {
  console.log('Truncating and seeding database...');
  try {
    // Clear old data in correct dependency order
    await prisma.listRoom.deleteMany({});
    await prisma.activeList.deleteMany({});
    await prisma.gihItem.deleteMany({});
    await prisma.check.deleteMany({});
    await prisma.roomProductStatus.deleteMany({});
    await prisma.roomCustom.deleteMany({});
    await prisma.replacementItem.deleteMany({});
    await prisma.productMonthCheck.deleteMany({});
    await prisma.templateItem.deleteMany({});
    await prisma.room.deleteMany({});
    await prisma.fillTemplate.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.setting.deleteMany({});

    console.log('Database cleared. Starting seed...');

    // 1. Seed Products
    const createdProducts = [];
    for (const p of PRODUCTS) {
      const created = await prisma.product.create({ data: p });
      createdProducts.push(created);
    }
    console.log(`Seeded ${createdProducts.length} products.`);

    // 2. Seed Templates
    const standardTemplate = await prisma.fillTemplate.create({
      data: {
        name: 'Стандарт (базовый)',
        category: 'standard',
        isDefault: true
      }
    });

    const luxTemplate = await prisma.fillTemplate.create({
      data: {
        name: 'Люкс (базовый)',
        category: 'lux',
        isDefault: true
      }
    });
    console.log('Seeded templates.');

    // 3. Seed Template Items
    const standardProductNames = ['Heineken 0.33', 'Evian 0.5', 'Coca-Cola 0.33', 'Lindt Excellence 85%', 'Pringles Original'];
    for (const p of createdProducts) {
      if (standardProductNames.includes(p.name)) {
        let qty = 2;
        if (p.name === 'Heineken 0.33' || p.name === 'Evian 0.5' || p.name === 'Coca-Cola 0.33') {
          qty = 4;
        }
        await prisma.templateItem.create({
          data: {
            templateId: standardTemplate.id,
            productId: p.id,
            qty
          }
        });
      }
    }

    const luxProductNames = ['Chianti Classico 0.75', "Jack Daniel's 0.05", 'Heineken 0.33', 'Evian 0.5', 'Coca-Cola 0.33', 'Lindt Excellence 85%'];
    for (const p of createdProducts) {
      if (luxProductNames.includes(p.name)) {
        let qty = 3;
        if (p.name === 'Chianti Classico 0.75') qty = 2;
        if (p.name === 'Heineken 0.33' || p.name === 'Evian 0.5') qty = 6;
        await prisma.templateItem.create({
          data: {
            templateId: luxTemplate.id,
            productId: p.id,
            qty
          }
        });
      }
    }
    console.log('Seeded template items.');

    // 4. Seed Settings
    for (const s of SETTINGS) {
      await prisma.setting.create({ data: s });
    }
    console.log('Seeded settings.');

    // 5. Seed Rooms
    console.log(`Seeding ${ROOM_NUMBERS.length} rooms...`);
    const roomsData = ROOM_NUMBERS.map(n => {
      const floor = Math.floor(n / 100);
      let category = 'lux';
      if (n === 1818) {
        category = 'lux';
      } else if ((n % 100) === 0) {
        category = 'lux';
      } else if ((n % 100) === 34) {
        category = 'lux';
      } else if (n % 2 === 0) {
        category = 'standard';
      }

      const templateId = category === 'standard' ? standardTemplate.id : luxTemplate.id;

      return {
        number: n,
        floor,
        category,
        expiryStatus: 'valid',
        templateId
      };
    });

    // In SQLite/Prisma we can use createMany or a simple transaction.
    // Let's use a batch loop to avoid SQLite max variables limit if too large, or just map them.
    const batchSize = 100;
    for (let i = 0; i < roomsData.length; i += batchSize) {
      const batch = roomsData.slice(i, i + batchSize);
      await Promise.all(batch.map(room => prisma.room.create({ data: room })));
    }

    console.log('Seeded all rooms successfully!');

    // 6. Seed Active Lists (Arrivals, Departures, GIH)
    console.log('Seeding active lists and list rooms...');
    const roomsFromDb = await prisma.room.findMany();
    
    const arrivalsList = await prisma.activeList.create({
      data: { name: 'Заезды на сегодня', listType: 'arrivals' }
    });
    const departuresList = await prisma.activeList.create({
      data: { name: 'Выезды на сегодня', listType: 'departures' }
    });
    const gihList = await prisma.activeList.create({
      data: { name: 'GIH проверка', listType: 'gih' }
    });

    const arrivalsRooms = roomsFromDb.filter(r => [500, 504, 508, 512, 516, 520, 524, 528, 600, 604, 608, 612, 616, 620, 700].includes(r.number));
    const departuresRooms = roomsFromDb.filter(r => [502, 506, 510, 514, 518, 522, 526, 530, 602, 606, 610, 614].includes(r.number));
    const gihRooms = roomsFromDb.filter(r => [702, 704, 706, 708, 710, 712, 714, 716, 800, 802, 804, 806].includes(r.number));

    for (const r of arrivalsRooms) {
      await prisma.listRoom.create({ data: { listId: arrivalsList.id, roomId: r.id } });
    }
    for (const r of departuresRooms) {
      await prisma.listRoom.create({ data: { listId: departuresList.id, roomId: r.id } });
    }
    for (const r of gihRooms) {
      await prisma.listRoom.create({ data: { listId: gihList.id, roomId: r.id } });
    }

    // 7. Seed room product statuses (to make some rooms empty or need replacement)
    console.log('Seeding some empty and needs_replacement room statuses...');
    const heineken = createdProducts.find(p => p.name === 'Heineken 0.33');
    const evian = createdProducts.find(p => p.name === 'Evian 0.5');
    const coke = createdProducts.find(p => p.name === 'Coca-Cola 0.33');

    // Empty rooms (e.g. 514, 616)
    const emptyRoom1 = roomsFromDb.find(r => r.number === 514);
    const emptyRoom2 = roomsFromDb.find(r => r.number === 616);
    if (emptyRoom1) {
      await prisma.room.update({ where: { id: emptyRoom1.id }, data: { expiryStatus: 'empty' } });
      await prisma.roomProductStatus.create({
        data: { roomId: emptyRoom1.id, productId: heineken.id, expiryStatus: 'empty', qtyToReplace: 4 }
      });
      await prisma.roomProductStatus.create({
        data: { roomId: emptyRoom1.id, productId: evian.id, expiryStatus: 'empty', qtyToReplace: 4 }
      });
    }
    if (emptyRoom2) {
      await prisma.room.update({ where: { id: emptyRoom2.id }, data: { expiryStatus: 'empty' } });
      await prisma.roomProductStatus.create({
        data: { roomId: emptyRoom2.id, productId: heineken.id, expiryStatus: 'empty', qtyToReplace: 4 }
      });
    }

    // Needs replacement rooms (e.g. 812, 916)
    const replaceRoom1 = roomsFromDb.find(r => r.number === 812);
    const replaceRoom2 = roomsFromDb.find(r => r.number === 916);
    if (replaceRoom1) {
      await prisma.room.update({ where: { id: replaceRoom1.id }, data: { expiryStatus: 'needs_replacement' } });
      await prisma.roomProductStatus.create({
        data: { roomId: replaceRoom1.id, productId: coke.id, expiryStatus: 'needs_replacement', qtyToReplace: 2 }
      });
    }
    if (replaceRoom2) {
      await prisma.room.update({ where: { id: replaceRoom2.id }, data: { expiryStatus: 'needs_replacement' } });
      await prisma.roomProductStatus.create({
        data: { roomId: replaceRoom2.id, productId: evian.id, expiryStatus: 'needs_replacement', qtyToReplace: 3 }
      });
    }

    // 8. Seed check history logs
    console.log('Seeding check history...');
    const check1 = await prisma.check.create({
      data: {
        roomId: roomsFromDb[0].id,
        type: 'checked',
        inspectorName: 'Анна',
        notes: 'Проверка плановая, всё в порядке',
        checkDate: new Date(Date.now() - 4 * 3600000) // 4 hours ago
      }
    });

    const check2 = await prisma.check.create({
      data: {
        roomId: emptyRoom1 ? emptyRoom1.id : roomsFromDb[1].id,
        type: 'emptied',
        inspectorName: 'Анна',
        notes: 'Минибар полностью опустошён гостем при выезде',
        checkDate: new Date(Date.now() - 10 * 3600000) // 10 hours ago
      }
    });

    const check3 = await prisma.check.create({
      data: {
        roomId: replaceRoom1 ? replaceRoom1.id : roomsFromDb[2].id,
        type: 'gih',
        gihRoomStatus: 'all_in_place',
        inspectorName: 'Анна',
        notes: 'GIH проверка. Все напитки на месте.',
        checkDate: new Date(Date.now() - 24 * 3600000) // 24 hours ago
      }
    });

    console.log('Seeded all additional records successfully!');
  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
