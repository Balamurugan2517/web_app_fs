-- Demo catalogue (safe to re-run). Real products: use Admin > Products > Import CSV instead.
INSERT INTO products (sku, slug, name, description, department, category, size_set, mrp, price, cost_price, gst_rate, hsn_code, weight_kg, is_new_arrival) VALUES
('LT-KNZ-001','kanchipuram-neo-zari-silk-saree','Kanchipuram Neo-Zari Silk Saree','Pure mulberry silk from Tamil Nadu with liquid-metal zari pleating and a sculpted, architectural drape.','women','Sarees','free',320000,285000,190000,18,'5007',0.9,true),
('LT-KMB-002','kasavu-mundu-bandhgala-set','Kasavu Mundu & Bandhgala Set','Kerala Kasavu mundu paired with a sharply tailored obsidian bandhgala with gold-edge detailing.','men','Ethnic Sets','apparel',210000,195000,120000,18,'6203',1.4,true),
('LT-PVT-003','liquid-viscose-pleated-trousers','Liquid Viscose Pleated Trousers','High-waisted double-pleated cut with weighted hems for a fluid, confident stride.','women','Trousers','apparel',89000,81000,42000,18,'6204',0.6,false),
('LT-TCB-004','titanium-clad-combat-boot','Titanium-Clad Combat Boot','Full-grain box calf leather with a hand-milled titanium heel spine. Sizes are UK/India.','men','Footwear','footwear',125000,112000,70000,18,'6403',1.8,true),
('LT-IOP-005','iridescent-tech-organza-parka','Iridescent Tech-Organza Parka','Multi-layer dichroic weave that shifts colour with the light, with taped, water-tight seams.','women','Outerwear','apparel',175000,159000,95000,18,'6201',1.2,false),
('LT-MOV-006','matte-obsidian-modular-vest','Matte Obsidian Modular Vest','Bonded wool shell with detachable cargo quadrants and magnetic fastenings.','men','Outerwear','apparel',99000,95000,55000,18,'6211',0.8,false),
('LT-KDS-007','kids-silk-kurta-set','Kids Silk Kurta Set','Soft silk-blend kurta and pyjama set for festive days, with gentle hand finishing.','kids','Ethnic Sets','kids',6500,5500,2800,5,'6211',0.4,true)
ON CONFLICT (sku) DO NOTHING;

INSERT INTO product_images (product_id, url, alt, sort_order)
SELECT p.id, v.url, p.name, 0 FROM products p JOIN (VALUES
 ('LT-KNZ-001','/images/zari.jpg'),('LT-KMB-002','/images/kasavu.jpg'),('LT-PVT-003','/images/trouser.jpg'),
 ('LT-TCB-004','/images/boot.jpg'),('LT-IOP-005','/images/parka.jpg'),('LT-MOV-006','/images/vest.jpg'),('LT-KDS-007','/images/hero.jpg')
) AS v(sku,url) ON v.sku = p.sku
WHERE NOT EXISTS (SELECT 1 FROM product_images i WHERE i.product_id = p.id);

INSERT INTO product_variants (product_id, size, sku, stock)
SELECT p.id, s.size, UPPER(p.sku || '-' || REPLACE(s.size,' ','')), s.stock
FROM products p JOIN (VALUES
 ('LT-KNZ-001','Free Size',3),
 ('LT-KMB-002','S',4),('LT-KMB-002','M',6),('LT-KMB-002','L',5),('LT-KMB-002','XL',2),('LT-KMB-002','XXL',0),
 ('LT-PVT-003','XS',2),('LT-PVT-003','S',8),('LT-PVT-003','M',10),('LT-PVT-003','L',6),('LT-PVT-003','XL',3),
 ('LT-TCB-004','6',2),('LT-TCB-004','7',4),('LT-TCB-004','8',5),('LT-TCB-004','9',3),('LT-TCB-004','10',1),
 ('LT-IOP-005','S',3),('LT-IOP-005','M',5),('LT-IOP-005','L',4),('LT-IOP-005','XL',0),
 ('LT-MOV-006','S',6),('LT-MOV-006','M',8),('LT-MOV-006','L',7),('LT-MOV-006','XL',4),('LT-MOV-006','XXL',2),
 ('LT-KDS-007','2-3Y',5),('LT-KDS-007','4-5Y',6),('LT-KDS-007','6-7Y',6),('LT-KDS-007','8-9Y',4)
) AS s(sku,size,stock) ON s.sku = p.sku
ON CONFLICT (sku) DO NOTHING;

INSERT INTO coupons (code, kind, value, min_order, max_discount, is_active) VALUES ('WELCOME10','percent',10,5000,5000,true) ON CONFLICT DO NOTHING;

-- Opening stock is recorded in the stock diary too, so "stock = sum of movements" always holds.
INSERT INTO stock_movements (variant_id, delta, balance_after, reason, actor)
SELECT v.id, v.stock, v.stock, 'initial', 'seed' FROM product_variants v
WHERE v.stock > 0 AND NOT EXISTS (SELECT 1 FROM stock_movements m WHERE m.variant_id = v.id);
