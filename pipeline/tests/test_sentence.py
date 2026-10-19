from datetime import datetime

import sentence

T = {"name_th": "เม็งราย", "amphoe_th": "พญาเม็งราย"}
NOW = datetime(2026, 11, 20, 6, 30)


def test_sentence_matches_brief_format():
    s = sentence.build(
        T, datetime(2026, 11, 20, 6, 0), NOW,
        [("ท่าขี้เหล็ก (เมียนมา)", 61.0), ("เชียงของ", 23.0), ("แม่สาย", 4.0)], True,
    )
    assert s == (
        "ควันที่ต.เม็งราย อ.พญาเม็งราย 06:00 วันนี้ ราว 60% มาจากไฟในเขตท่าขี้เหล็ก (เมียนมา) "
        "25% จากเชียงของ 15% จากที่อื่น (ประมาณการ)"
    )


def test_single_dominant_source_has_no_other():
    s = sentence.build(T, datetime(2026, 11, 20, 6, 0), NOW, [("เชียงของ", 99.0)], True)
    assert s.endswith("ราว 100% มาจากไฟในเขตเชียงของ (ประมาณการ)")


def test_small_shares_are_folded_into_other():
    s = sentence.build(
        T, datetime(2026, 11, 20, 6, 0), NOW, [("a", 40.0), ("b", 8.0), ("c", 7.0)], True
    )
    assert "จากb" not in s and "40% มาจากไฟในเขตa 60% จากที่อื่น" in s


def test_no_significant_source():
    s = sentence.build(T, datetime(2026, 11, 19, 23, 0), NOW, [], False)
    assert s == (
        "ควันที่ต.เม็งราย อ.พญาเม็งราย 23:00 เมื่อวาน "
        "ไม่พบไฟที่มีนัยสำคัญตามเส้นทางลมย้อนหลัง 48 ชม. (ประมาณการ)"
    )


def test_older_dates_use_thai_month():
    assert sentence.day_label(datetime(2026, 11, 17, 1), NOW) == "17 พ.ย."
