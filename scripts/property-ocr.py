"""Run installed RapidOCR with explicit local models; emit only bounded JSON to stdout."""

import json
import re
import sys
from pathlib import Path

from PIL import Image
from rapidocr import RapidOCR


def render_rows(lines) -> str:
    """Preserve reading order while joining OCR boxes on the same visual row."""
    lines.sort(key=lambda item: (item[1], item[0]))
    rows = []
    for line in lines:
        if rows and abs(line[1] - rows[-1][0]) <= max(12, line[2] * 0.55):
            rows[-1][1].append(line)
        else:
            rows.append((line[1], [line]))
    return "\n".join(
        " ".join(item[3] for item in sorted(row, key=lambda item: item[0]))
        for _, row in rows
    )


def listing_text(lines, width: int) -> str:
    """On listing screenshots, read the fact card and overview, not floor-plan room sizes."""
    labels = {
        name: next((line for line in lines if line[3].strip() == name), None)
        for name in ("售价", "房型", "建筑面积")
    }
    if (
        not all(labels.values())
        or max(label[1] for label in labels.values())
        - min(label[1] for label in labels.values())
        > width * 0.08
        or not labels["售价"][0] < labels["房型"][0] < labels["建筑面积"][0]
    ):
        return render_rows(lines)

    def value_above(label, pattern):
        candidates = [
            line
            for line in lines
            if 0 < label[1] - line[1] < width * 0.18
            and abs(label[0] - line[0]) < width * 0.14
            and re.fullmatch(pattern, line[3].strip())
        ]
        return min(candidates, key=lambda line: label[1] - line[1], default=None)

    values = {
        "售价": value_above(labels["售价"], r"(?:约)?\d+(?:\.\d+)?\s*[+＋]?\s*[万亿元]"),
        "房型": value_above(labels["房型"], r"[1-9][房室][1-9]厅(?:[1-9]卫)?"),
        "建筑面积": value_above(labels["建筑面积"], r"\d+(?:\.\d+)?(?:㎡|m²|m2|m)?"),
    }
    price_y = labels["售价"][1]
    badge = [
        line[1]
        for line in lines
        if price_y - width * 0.35 < line[1] < price_y
        and ("必看小区" in line[3] or line[3].strip() in ("满五", "满二"))
    ]
    card_top = min(badge, default=price_y - width * 0.3)
    overview = next(
        (line[1] for line in lines if line[1] > price_y and line[3].strip() == "概览"),
        None,
    )
    contact = min(
        (
            line[1]
            for line in lines
            if line[1] > price_y and line[3].strip() in ("打电话", "在线问")
        ),
        default=float("inf"),
    )
    selected = []
    for line in lines:
        x, y, height, content = line
        if y < card_top or y >= contact - width * 0.07:
            continue
        if line in values.values() or line in labels.values():
            continue
        if "小区榜" in content or content.strip() == "必看小区":
            continue
        if overview is not None:
            if price_y < y <= overview:
                continue
            if y > overview and (
                y < overview + width * 0.08
                or content.strip() in ("概览", "动态", "评价", "推荐", "费用", ">")
                or any(word in content for word in ("咨询", "暂无", "首付", "委托找房"))
            ):
                continue
        selected.append((x, y, height, content))

    facts = []
    for name, value in values.items():
        if value is None:
            continue
        content = value[3].strip()
        if name == "建筑面积":
            content = re.sub(r"(?:㎡|m²|m2|m)$", "", content) + "㎡"
        facts.append(f"{name}：{content}")
    if not facts:
        return render_rows(selected)
    card = [line for line in selected if line[1] < price_y]
    details = [line for line in selected if line[1] > price_y]
    return "\n".join(filter(None, (render_rows(card), *facts, render_rows(details))))


def recognize(model_dir: Path, image_path: Path) -> str:
    """Keep matching PP-OCRv6 small detection/recognition and the official mobile classifier."""
    engine = RapidOCR(
        params={
            "Det.model_path": str(model_dir / "PP-OCRv6_det_small.onnx"),
            "Cls.model_path": str(model_dir / "ch_ppocr_mobile_v2.0_cls_mobile.onnx"),
            "Rec.model_path": str(model_dir / "PP-OCRv6_rec_small.onnx"),
            "EngineConfig.onnxruntime.intra_op_num_threads": 2,
            "EngineConfig.onnxruntime.inter_op_num_threads": 1,
            "Global.log_level": "error",
        }
    )
    lines = []
    # Long mobile screenshots must be tiled; shrinking an entire page makes small prices unreadable.
    with Image.open(image_path) as image:
        tops = [0]
        while tops[-1] + 2000 < image.height:
            tops.append(tops[-1] + 1600)
        for top in tops:
            tile = image.crop((0, top, image.width, min(top + 2000, image.height)))
            result = engine(tile)
            if result.boxes is None:
                continue
            for box, content, score in zip(result.boxes, result.txts, result.scores):
                if score < 0.45 or not content.strip():
                    continue
                x = min(point[0] for point in box)
                y = min(point[1] for point in box)
                height = max(point[1] for point in box) - y
                center = y + height / 2
                # The 400px overlap gives each boundary line one complete view.
                if (top and center < 200) or (
                    top + 2000 < image.height and center >= 1800
                ):
                    continue
                lines.append((x, y + top, height, content.strip()))
    return listing_text(lines, image.width)[:12000]


if __name__ == "__main__":
    if len(sys.argv) != 4 or sys.argv[1] != "recognize":
        raise SystemExit("usage: property-ocr.py recognize MODEL_DIR IMAGE")
    print(
        json.dumps(
            {"text": recognize(Path(sys.argv[2]), Path(sys.argv[3]))},
            ensure_ascii=False,
        )
    )
