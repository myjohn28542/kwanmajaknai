export function Footer({ updatedAt }: { updatedAt?: string }) {
  return (
    <footer className="footer">
      <h3>วิธีคำนวณ</h3>
      <p>
        ทุกชั่วโมง ระบบปล่อย "อนุภาคอากาศ" 60 ตัวจากกลางตำบล แล้วย้อนเส้นทางลมกลับไป 48 ชั่วโมง
        (ใช้ลมระดับ 10 ม. / 100 ม. / 850 hPa ตามความสูงชั้นผสมอากาศ) จากนั้นนับจุดความร้อนจากดาวเทียม
        VIIRS ที่อยู่ใกล้เส้นทางนั้นในช่วงเวลาใกล้กัน ถ่วงน้ำหนักด้วยความแรงของไฟ (FRP) ความมั่นใจ
        และระยะเวลาที่ผ่านไป แล้วรวมเป็นสัดส่วนตามอำเภอ/ประเทศ
      </p>
      <p className="disclaimer">
        ผลทั้งหมดเป็น<strong>การประมาณการ</strong>จากแบบจำลอง มีความไม่แน่นอนสูง
        ไม่ใช่หลักฐานกล่าวโทษบุคคล ชุมชน หรือพื้นที่ใด และไม่ระบุหมู่บ้านหรือแปลงที่ดิน
        ค่า PM2.5 เป็นค่าจากแบบจำลอง ไม่ใช่ค่าจากเครื่องวัด
      </p>
      <h3>แหล่งข้อมูล</h3>
      <ul className="small">
        <li>
          จุดความร้อน: NASA FIRMS (VIIRS S-NPP / NOAA-20 / NOAA-21 NRT) —{" "}
          <a href="https://firms.modaps.eosdis.nasa.gov/" target="_blank" rel="noopener">
            NASA LANCE FIRMS
          </a>
        </li>
        <li>
          ลมและ PM2.5:{" "}
          <a href="https://open-meteo.com/" target="_blank" rel="noopener">
            Open-Meteo.com
          </a>{" "}
          (CC BY 4.0) รวมถึงข้อมูล CAMS ของ Copernicus
        </li>
        <li>
          ขอบเขตการปกครอง:{" "}
          <a href="https://gadm.org/" target="_blank" rel="noopener">
            GADM
          </a>
          ,{" "}
          <a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener">
            Natural Earth
          </a>
          , OCHA/RTSD ผ่าน{" "}
          <a href="https://data.humdata.org/dataset/cod-ab-tha" target="_blank" rel="noopener">
            HDX
          </a>{" "}
          (CC BY-IGO)
        </li>
        <li>แผนที่: OpenFreeMap / OpenMapTiles © OpenStreetMap contributors</li>
        <li>
          ความสูงภูมิประเทศ (3D):{" "}
          <a href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md" target="_blank" rel="noopener">
            Mapzen / Tilezen Terrain Tiles
          </a>{" "}
          บน AWS Open Data
        </li>
      </ul>
      {updatedAt && <p className="small muted">อัปเดตล่าสุด {updatedAt.replace("T", " ").slice(0, 16)} น.</p>}
    </footer>
  );
}
