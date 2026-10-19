# Prompt ภาพเกาะลอยฟ้า 18 อำเภอ (สำหรับ Nano Banana)

## วิธีใช้

1. **สร้างภาพแรกก่อน** (`5701` เมืองเชียงราย) จนได้ภาพที่ชอบ
2. **ภาพที่ 2–18:** แนบภาพ `5701` ที่ได้เป็นภาพอ้างอิงทุกครั้ง แล้วพิมพ์ prompt ของอำเภอนั้น
   (ตอนท้ายของแต่ละ prompt สั่งให้ทำตามสไตล์ของภาพอ้างอิงไว้แล้ว) ทั้ง 18 ภาพจะได้มุมกล้อง ขนาด และแสงเหมือนกัน
3. **ตั้งค่า:** สัดส่วน **1:1** และความละเอียดสูงสุดที่มีให้เลือก
4. **บันทึกไฟล์ตามรหัสอำเภอ** เช่น `5701.png` แล้ววางไว้ในโฟลเดอร์
   `e:\projects\kwanmajaknai\web\public\islands\` (ผมจะย่อขนาดไฟล์ให้เอง)
5. **ตรวจสถานที่สำคัญ:** AI วาดสถานที่จริงเพี้ยนได้บ่อย ถ้าภาพไหนดูผิด เช่น วัดร่องขุ่นผิดรูป
   ให้สร้างใหม่ หรือตัดชื่อสถานที่ออกให้เหลือแต่ลักษณะทั่วไป

**เรื่องที่สำคัญมาก:** ภาพต้องเป็น **พื้นหลังสีขาวล้วน ไม่มีฟ้า เมฆ หมอก ควัน หรือตัวหนังสือ**
เพราะท้องฟ้า หมอกควันตามค่าฝุ่นจริง ตัวการ์ตูนเมฆ และตัวเลข ระบบจะใส่ทับด้วยโค้ดทุกชั่วโมง
ถ้าภาพมีเมฆหรือหมอกติดมาตั้งแต่แรก วันที่อากาศดีภาพก็จะยังดูขมุกขมัว

---

## Prompt ทั้ง 18 อำเภอ

ทุก prompt ขึ้นต้นด้วยส่วนกำหนดสไตล์เดียวกัน ตามด้วยฉากของแต่ละอำเภอ คัดลอกทั้งบล็อกไปใช้ได้เลย

### 5701 — เมืองเชียงราย

```
A cute, highly detailed 3D miniature diorama of a single floating island, isometric three-quarter view from slightly above, centered horizontally, the island fills about 70% of the image width and sits in the lower two-thirds of the frame. The top surface is lush green grass; the sides show a cross-section of brown soil and rock with small dangling roots underneath. Soft clay-toy 3D render style like a Pixar or Blender miniature: smooth rounded shapes, warm clear daylight from the upper left, soft ambient occlusion, vivid but natural colors. Plain solid pure white background (#FFFFFF). No sky, no clouds, no fog, no haze, no smoke, no fire, no rain, no text, no letters, no logos, no watermark, no people. The top third of the image above the island must be empty white space. Square 1:1.
Scene on the island: Wat Rong Khun, the White Temple of Chiang Rai, as the centerpiece — an intricate pure-white Lanna temple decorated with small silver mirror mosaics; a small ornate golden clock tower; the Kok River curving along one edge with a little long-tail boat; a few rain trees and palm trees.
```

### 5702 — เวียงชัย

```
A cute, highly detailed 3D miniature diorama of a single floating island, isometric three-quarter view from slightly above, centered horizontally, the island fills about 70% of the image width and sits in the lower two-thirds of the frame. The top surface is lush green grass; the sides show a cross-section of brown soil and rock with small dangling roots underneath. Soft clay-toy 3D render style like a Pixar or Blender miniature: smooth rounded shapes, warm clear daylight from the upper left, soft ambient occlusion, vivid but natural colors. Plain solid pure white background (#FFFFFF). No sky, no clouds, no fog, no haze, no smoke, no fire, no rain, no text, no letters, no logos, no watermark, no people. The top third of the image above the island must be empty white space. Square 1:1.
Scene on the island: bright green rice paddies divided by small earth dikes, a wooden Lanna-style farmhouse on stilts, a small white-and-gold village temple, a narrow irrigation canal, banana trees. Match the exact style, camera angle, island size, island shape proportions and lighting of the attached reference image.
```

### 5703 — เชียงของ

```
A cute, highly detailed 3D miniature diorama of a single floating island, isometric three-quarter view from slightly above, centered horizontally, the island fills about 70% of the image width and sits in the lower two-thirds of the frame. The top surface is lush green grass; the sides show a cross-section of brown soil and rock with small dangling roots underneath. Soft clay-toy 3D render style like a Pixar or Blender miniature: smooth rounded shapes, warm clear daylight from the upper left, soft ambient occlusion, vivid but natural colors. Plain solid pure white background (#FFFFFF). No sky, no clouds, no fog, no haze, no smoke, no fire, no rain, no text, no letters, no logos, no watermark, no people. The top third of the image above the island must be empty white space. Square 1:1.
Scene on the island: the wide Mekong River running along one side of the island, a long modern concrete bridge crossing the river, a small riverside town of old wooden Lanna shophouses, small fishing boats, gentle green hills on the far bank. Match the exact style, camera angle, island size, island shape proportions and lighting of the attached reference image.
```

### 5704 — เทิง

```
A cute, highly detailed 3D miniature diorama of a single floating island, isometric three-quarter view from slightly above, centered horizontally, the island fills about 70% of the image width and sits in the lower two-thirds of the frame. The top surface is lush green grass; the sides show a cross-section of brown soil and rock with small dangling roots underneath. Soft clay-toy 3D render style like a Pixar or Blender miniature: smooth rounded shapes, warm clear daylight from the upper left, soft ambient occlusion, vivid but natural colors. Plain solid pure white background (#FFFFFF). No sky, no clouds, no fog, no haze, no smoke, no fire, no rain, no text, no letters, no logos, no watermark, no people. The top third of the image above the island must be empty white space. Square 1:1.
Scene on the island: Phu Chi Fa — a dramatic grassy cliff peak that points out like a finger over the island edge, small pine trees along the ridge, layered green mountain ridges behind it, rubber tree rows and a small rice field at the foot of the mountain. Match the exact style, camera angle, island size, island shape proportions and lighting of the attached reference image.
```

### 5705 — พาน

```
A cute, highly detailed 3D miniature diorama of a single floating island, isometric three-quarter view from slightly above, centered horizontally, the island fills about 70% of the image width and sits in the lower two-thirds of the frame. The top surface is lush green grass; the sides show a cross-section of brown soil and rock with small dangling roots underneath. Soft clay-toy 3D render style like a Pixar or Blender miniature: smooth rounded shapes, warm clear daylight from the upper left, soft ambient occlusion, vivid but natural colors. Plain solid pure white background (#FFFFFF). No sky, no clouds, no fog, no haze, no smoke, no fire, no rain, no text, no letters, no logos, no watermark, no people. The top third of the image above the island must be empty white space. Square 1:1.
Scene on the island: a multi-tiered limestone waterfall (Pu Kaeng waterfall) cascading into turquoise pools surrounded by jungle, a corner of green rice paddies, a small white temple with a golden spire. Match the exact style, camera angle, island size, island shape proportions and lighting of the attached reference image.
```

### 5706 — ป่าแดด

```
A cute, highly detailed 3D miniature diorama of a single floating island, isometric three-quarter view from slightly above, centered horizontally, the island fills about 70% of the image width and sits in the lower two-thirds of the frame. The top surface is lush green grass; the sides show a cross-section of brown soil and rock with small dangling roots underneath. Soft clay-toy 3D render style like a Pixar or Blender miniature: smooth rounded shapes, warm clear daylight from the upper left, soft ambient occlusion, vivid but natural colors. Plain solid pure white background (#FFFFFF). No sky, no clouds, no fog, no haze, no smoke, no fire, no rain, no text, no letters, no logos, no watermark, no people. The top third of the image above the island must be empty white space. Square 1:1.
Scene on the island: golden ripening rice fields, a small wooden rice barn, two water buffalo, a little village temple with a golden chedi, a quiet country road lined with trees. Match the exact style, camera angle, island size, island shape proportions and lighting of the attached reference image.
```

### 5707 — แม่จัน

```
A cute, highly detailed 3D miniature diorama of a single floating island, isometric three-quarter view from slightly above, centered horizontally, the island fills about 70% of the image width and sits in the lower two-thirds of the frame. The top surface is lush green grass; the sides show a cross-section of brown soil and rock with small dangling roots underneath. Soft clay-toy 3D render style like a Pixar or Blender miniature: smooth rounded shapes, warm clear daylight from the upper left, soft ambient occlusion, vivid but natural colors. Plain solid pure white background (#FFFFFF). No sky, no clouds, no fog, no haze, no smoke, no fire, no rain, no text, no letters, no logos, no watermark, no people. The top third of the image above the island must be empty white space. Square 1:1.
Scene on the island: rolling green hills with fruit orchards, a small open-air fresh market with colorful umbrellas, a small blue lake, a winding road climbing toward forested mountains. Match the exact style, camera angle, island size, island shape proportions and lighting of the attached reference image.
```

### 5708 — เชียงแสน

```
A cute, highly detailed 3D miniature diorama of a single floating island, isometric three-quarter view from slightly above, centered horizontally, the island fills about 70% of the image width and sits in the lower two-thirds of the frame. The top surface is lush green grass; the sides show a cross-section of brown soil and rock with small dangling roots underneath. Soft clay-toy 3D render style like a Pixar or Blender miniature: smooth rounded shapes, warm clear daylight from the upper left, soft ambient occlusion, vivid but natural colors. Plain solid pure white background (#FFFFFF). No sky, no clouds, no fog, no haze, no smoke, no fire, no rain, no text, no letters, no logos, no watermark, no people. The top third of the image above the island must be empty white space. Square 1:1.
Scene on the island: the Golden Triangle — a large seated golden Buddha statue on a boat-shaped platform beside the Mekong River where two rivers meet, an ancient red-brick chedi ruin with moss, a few long-tail boats on the river. Match the exact style, camera angle, island size, island shape proportions and lighting of the attached reference image.
```

### 5709 — แม่สาย

```
A cute, highly detailed 3D miniature diorama of a single floating island, isometric three-quarter view from slightly above, centered horizontally, the island fills about 70% of the image width and sits in the lower two-thirds of the frame. The top surface is lush green grass; the sides show a cross-section of brown soil and rock with small dangling roots underneath. Soft clay-toy 3D render style like a Pixar or Blender miniature: smooth rounded shapes, warm clear daylight from the upper left, soft ambient occlusion, vivid but natural colors. Plain solid pure white background (#FFFFFF). No sky, no clouds, no fog, no haze, no smoke, no fire, no rain, no text, no letters, no logos, no watermark, no people. The top third of the image above the island must be empty white space. Square 1:1.
Scene on the island: a tall jungle-covered limestone mountain with a cave entrance at its base, a hilltop golden chedi reached by a staircase lined with naga serpent balustrades, a small river crossed by a border bridge, and a lively little market street. Match the exact style, camera angle, island size, island shape proportions and lighting of the attached reference image.
```

### 5710 — แม่สรวย

```
A cute, highly detailed 3D miniature diorama of a single floating island, isometric three-quarter view from slightly above, centered horizontally, the island fills about 70% of the image width and sits in the lower two-thirds of the frame. The top surface is lush green grass; the sides show a cross-section of brown soil and rock with small dangling roots underneath. Soft clay-toy 3D render style like a Pixar or Blender miniature: smooth rounded shapes, warm clear daylight from the upper left, soft ambient occlusion, vivid but natural colors. Plain solid pure white background (#FFFFFF). No sky, no clouds, no fog, no haze, no smoke, no fire, no rain, no text, no letters, no logos, no watermark, no people. The top third of the image above the island must be empty white space. Square 1:1.
Scene on the island: coffee plantations on terraced green hills with bright red coffee cherries (Doi Chang coffee), a small wooden coffee house with a deck, a calm blue reservoir held by a small dam. Match the exact style, camera angle, island size, island shape proportions and lighting of the attached reference image.
```

### 5711 — เวียงป่าเป้า

```
A cute, highly detailed 3D miniature diorama of a single floating island, isometric three-quarter view from slightly above, centered horizontally, the island fills about 70% of the image width and sits in the lower two-thirds of the frame. The top surface is lush green grass; the sides show a cross-section of brown soil and rock with small dangling roots underneath. Soft clay-toy 3D render style like a Pixar or Blender miniature: smooth rounded shapes, warm clear daylight from the upper left, soft ambient occlusion, vivid but natural colors. Plain solid pure white background (#FFFFFF). No sky, no clouds, no fog, no haze, no smoke, no fire, no rain, no text, no letters, no logos, no watermark, no people. The top third of the image above the island must be empty white space. Square 1:1.
Scene on the island: natural hot spring pools of turquoise water among smooth rocks, neat rows of green tea bushes on a hillside, a small jungle waterfall, a wooden sala pavilion. Match the exact style, camera angle, island size, island shape proportions and lighting of the attached reference image.
```

### 5712 — พญาเม็งราย

```
A cute, highly detailed 3D miniature diorama of a single floating island, isometric three-quarter view from slightly above, centered horizontally, the island fills about 70% of the image width and sits in the lower two-thirds of the frame. The top surface is lush green grass; the sides show a cross-section of brown soil and rock with small dangling roots underneath. Soft clay-toy 3D render style like a Pixar or Blender miniature: smooth rounded shapes, warm clear daylight from the upper left, soft ambient occlusion, vivid but natural colors. Plain solid pure white background (#FFFFFF). No sky, no clouds, no fog, no haze, no smoke, no fire, no rain, no text, no letters, no logos, no watermark, no people. The top third of the image above the island must be empty white space. Square 1:1.
Scene on the island: wide green rice paddies next to golden corn fields, a small market-town crossroads with low shophouses, a modest Lanna temple with a tiered red-and-gold roof, a small river with reeds. Match the exact style, camera angle, island size, island shape proportions and lighting of the attached reference image.
```

### 5713 — เวียงแก่น

```
A cute, highly detailed 3D miniature diorama of a single floating island, isometric three-quarter view from slightly above, centered horizontally, the island fills about 70% of the image width and sits in the lower two-thirds of the frame. The top surface is lush green grass; the sides show a cross-section of brown soil and rock with small dangling roots underneath. Soft clay-toy 3D render style like a Pixar or Blender miniature: smooth rounded shapes, warm clear daylight from the upper left, soft ambient occlusion, vivid but natural colors. Plain solid pure white background (#FFFFFF). No sky, no clouds, no fog, no haze, no smoke, no fire, no rain, no text, no letters, no logos, no watermark, no people. The top third of the image above the island must be empty white space. Square 1:1.
Scene on the island: the Mekong River with rocky rapids along one edge, a steep green mountain peak with a small wooden lookout deck on top, orchards of orange trees heavy with fruit. Match the exact style, camera angle, island size, island shape proportions and lighting of the attached reference image.
```

### 5714 — ขุนตาล

```
A cute, highly detailed 3D miniature diorama of a single floating island, isometric three-quarter view from slightly above, centered horizontally, the island fills about 70% of the image width and sits in the lower two-thirds of the frame. The top surface is lush green grass; the sides show a cross-section of brown soil and rock with small dangling roots underneath. Soft clay-toy 3D render style like a Pixar or Blender miniature: smooth rounded shapes, warm clear daylight from the upper left, soft ambient occlusion, vivid but natural colors. Plain solid pure white background (#FFFFFF). No sky, no clouds, no fog, no haze, no smoke, no fire, no rain, no text, no letters, no logos, no watermark, no people. The top third of the image above the island must be empty white space. Square 1:1.
Scene on the island: a green valley with neat rows of rubber trees, rice paddies, a small reservoir with a little dam, a forested ridge along the back edge. Match the exact style, camera angle, island size, island shape proportions and lighting of the attached reference image.
```

### 5715 — แม่ฟ้าหลวง

```
A cute, highly detailed 3D miniature diorama of a single floating island, isometric three-quarter view from slightly above, centered horizontally, the island fills about 70% of the image width and sits in the lower two-thirds of the frame. The top surface is lush green grass; the sides show a cross-section of brown soil and rock with small dangling roots underneath. Soft clay-toy 3D render style like a Pixar or Blender miniature: smooth rounded shapes, warm clear daylight from the upper left, soft ambient occlusion, vivid but natural colors. Plain solid pure white background (#FFFFFF). No sky, no clouds, no fog, no haze, no smoke, no fire, no rain, no text, no letters, no logos, no watermark, no people. The top third of the image above the island must be empty white space. Square 1:1.
Scene on the island: mountaintop tea terraces in neat curving rows (Doi Mae Salong), a formal flower garden with colorful flower beds, a wooden Lanna-and-Swiss-chalet style villa (Doi Tung), tall pine trees. Match the exact style, camera angle, island size, island shape proportions and lighting of the attached reference image.
```

### 5716 — แม่ลาว

```
A cute, highly detailed 3D miniature diorama of a single floating island, isometric three-quarter view from slightly above, centered horizontally, the island fills about 70% of the image width and sits in the lower two-thirds of the frame. The top surface is lush green grass; the sides show a cross-section of brown soil and rock with small dangling roots underneath. Soft clay-toy 3D render style like a Pixar or Blender miniature: smooth rounded shapes, warm clear daylight from the upper left, soft ambient occlusion, vivid but natural colors. Plain solid pure white background (#FFFFFF). No sky, no clouds, no fog, no haze, no smoke, no fire, no rain, no text, no letters, no logos, no watermark, no people. The top third of the image above the island must be empty white space. Square 1:1.
Scene on the island: rice paddies along a gentle river, a small temple with a red tiered roof, mango and longan orchards, a wooden footbridge over the river. Match the exact style, camera angle, island size, island shape proportions and lighting of the attached reference image.
```

### 5717 — เวียงเชียงรุ้ง

```
A cute, highly detailed 3D miniature diorama of a single floating island, isometric three-quarter view from slightly above, centered horizontally, the island fills about 70% of the image width and sits in the lower two-thirds of the frame. The top surface is lush green grass; the sides show a cross-section of brown soil and rock with small dangling roots underneath. Soft clay-toy 3D render style like a Pixar or Blender miniature: smooth rounded shapes, warm clear daylight from the upper left, soft ambient occlusion, vivid but natural colors. Plain solid pure white background (#FFFFFF). No sky, no clouds, no fog, no haze, no smoke, no fire, no rain, no text, no letters, no logos, no watermark, no people. The top third of the image above the island must be empty white space. Square 1:1.
Scene on the island: flat fertile farmland in a patchwork of rice and vegetable plots, a small pond with pink lotus flowers, a wooden farmhouse, a little village temple. Match the exact style, camera angle, island size, island shape proportions and lighting of the attached reference image.
```

### 5718 — ดอยหลวง

```
A cute, highly detailed 3D miniature diorama of a single floating island, isometric three-quarter view from slightly above, centered horizontally, the island fills about 70% of the image width and sits in the lower two-thirds of the frame. The top surface is lush green grass; the sides show a cross-section of brown soil and rock with small dangling roots underneath. Soft clay-toy 3D render style like a Pixar or Blender miniature: smooth rounded shapes, warm clear daylight from the upper left, soft ambient occlusion, vivid but natural colors. Plain solid pure white background (#FFFFFF). No sky, no clouds, no fog, no haze, no smoke, no fire, no rain, no text, no letters, no logos, no watermark, no people. The top third of the image above the island must be empty white space. Square 1:1.
Scene on the island: a big forested mountain with a small waterfall, rice paddies at its foot, a mountain village of wooden houses, a winding road. Match the exact style, camera angle, island size, island shape proportions and lighting of the attached reference image.
```

---

## (ไม่บังคับ) ตัวการ์ตูนเมฆ 5 อารมณ์ตามระดับฝุ่น

ถ้าไม่ทำ ผมจะวาดตัวการ์ตูนด้วยโค้ดให้แทน แต่ถ้าสร้างด้วย AI สไตล์จะเข้ากับภาพเกาะมากกว่า
สร้างภาพแรก (`cloud-1`) ก่อน แล้วแนบเป็นภาพอ้างอิงตอนสร้างอีก 4 ภาพ
บันทึกเป็น `cloud-1.png` ถึง `cloud-5.png` ไว้ในโฟลเดอร์เดียวกัน

ส่วนต้นของทุก prompt (คัดลอกแล้วต่อด้วยบรรทัดของแต่ละอารมณ์):

```
A single cute chubby 3D cartoon cloud character with a simple face, soft clay-toy 3D render style matching a Pixar miniature, centered, plain solid pure white background (#FFFFFF), no text, no other objects, square 1:1.
```

- `cloud-1` ดีมาก: `Pure fluffy white cloud, big happy smile, sparkling eyes, a tiny sun peeking behind it.`
- `cloud-2` ดี: `White cloud with a calm gentle smile, relaxed eyes.`
- `cloud-3` ปานกลาง: `Light grey cloud with a slightly worried face, small frown, one sweat drop.`
- `cloud-4` เริ่มมีผลกระทบ: `Grey dusty cloud wearing a white N95 face mask, worried eyes.`
- `cloud-5` มีผลกระทบ: `Dark brownish-grey smoky cloud, coughing with eyes squeezed shut, wearing a face mask, tiny dust particles around it.`
