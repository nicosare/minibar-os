TRUNCATE TABLE list_rooms, active_lists, gih_items, checks, replacement_items,
             room_customs, rooms, template_items, fill_templates, products, excises, settings
RESTART IDENTITY CASCADE;

INSERT INTO products (name, price, volume, unit, emoji, bg_color, has_expiry, created_at) VALUES
('Heineken 0.33', 450.00, 0.33, 'шт', '🍺', 'amber', TRUE, NOW()),
('Chianti Classico 0.75', 1800.00, 0.75, 'шт', '🍷', 'red', TRUE, NOW()),
('Evian 0.5', 220.00, 0.5, 'шт', '💧', 'blue', TRUE, NOW()),
('Lindt Excellence 85%', 380.00, 100, 'г', '🍫', 'yellow', TRUE, NOW()),
('Jack Daniel''s 0.05', 1200.00, 0.05, 'шт', '🥃', 'purple', TRUE, NOW()),
('Coca-Cola 0.33', 220.00, 0.33, 'шт', '🥤', 'rose', TRUE, NOW()),
('Pringles Original', 350.00, 40, 'г', '🥔', 'orange', TRUE, NOW());

INSERT INTO fill_templates (name, category, is_default, created_at) VALUES
('Стандарт (базовый)', 'standard', TRUE, NOW()),
('Люкс (базовый)', 'lux', TRUE, NOW());

INSERT INTO template_items (template_id, product_id, qty)
SELECT t.id, p.id, CASE p.name
    WHEN 'Heineken 0.33' THEN 4
    WHEN 'Evian 0.5' THEN 4
    WHEN 'Coca-Cola 0.33' THEN 4
    WHEN 'Lindt Excellence 85%' THEN 2
    ELSE 2
END
FROM fill_templates t CROSS JOIN products p
WHERE t.category = 'standard'
  AND p.name IN ('Heineken 0.33','Evian 0.5','Coca-Cola 0.33','Lindt Excellence 85%','Pringles Original');

INSERT INTO template_items (template_id, product_id, qty)
SELECT t.id, p.id, CASE p.name
    WHEN 'Chianti Classico 0.75' THEN 2
    WHEN 'Jack Daniel''s 0.05' THEN 3
    WHEN 'Heineken 0.33' THEN 6
    WHEN 'Evian 0.5' THEN 6
    ELSE 3
END
FROM fill_templates t CROSS JOIN products p
WHERE t.category = 'lux'
  AND p.name IN ('Chianti Classico 0.75','Jack Daniel''s 0.05','Heineken 0.33','Evian 0.5','Coca-Cola 0.33','Lindt Excellence 85%');

INSERT INTO rooms (number, floor, category, expiry_status, updated_at)
SELECT
    n AS number,
    (n / 100)::SMALLINT AS floor,
    CASE
        WHEN n = 1818 THEN 'lux'::"RoomCategory"
        WHEN (n % 100) = 0 THEN 'lux'::"RoomCategory"
        WHEN (n % 100) = 34 THEN 'lux'::"RoomCategory"
        WHEN n % 2 = 0 THEN 'standard'::"RoomCategory"
        ELSE 'lux'::"RoomCategory"
    END AS category,
    'valid'::"ExpiryStatus",
    NOW()
FROM unnest(ARRAY[
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
]) AS n;

UPDATE rooms SET template_id = (
    SELECT id FROM fill_templates
    WHERE category = rooms.category AND is_default = TRUE LIMIT 1
);

INSERT INTO settings (key, value, updated_at) VALUES
('hotel_name', 'Grand Palace Hotel', NOW()),
('currency', 'RUB', NOW()),
('ui_language', 'ru', NOW());