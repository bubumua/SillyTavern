#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SillyTavern 角色卡深度分析器
专门检查 extensions、lorebook 和隐藏数据
"""

import json
import sys


def analyze_character_file(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # 处理 V2/V3 包装
    if 'data' in data:
        print("包装格式: V2/V3 标准")
        char_data = data['data']
        meta = {k: v for k, v in data.items() if k != 'data'}
        if meta:
            print(f"元数据: {meta}")
    else:
        char_data = data

    print(f"\n基础字段检查:")
    basic_fields = ['name', 'description', 'personality',
                    'scenario', 'first_mes', 'mes_example', 'creator']
    for field in basic_fields:
        value = char_data.get(field, '【缺失】')
        if value and str(value).strip():
            print(f"  ✓ {field}: {str(value)[:80]}...")
        else:
            print(f"  ✗ {field}: 空或未设置")

    # 关键：检查 extensions
    print(f"\n{'='*60}")
    print("【Extensions 扩展数据深度检查】")
    print(f"{'='*60}")

    extensions = char_data.get('extensions', {})
    if not extensions:
        print("没有 extensions 数据")
        return

    print(f"发现 {len(extensions)} 个扩展项:")

    for key, value in extensions.items():
        print(f"\n  ▶ {key}:")

        # 处理 lorebook / character_book
        if key in ['lorebook', 'character_book'] and isinstance(value, dict):
            entries = value.get('entries', [])
            print(f"    包含 {len(entries)} 个 lorebook 条目")
            for i, entry in enumerate(entries[:3]):  # 只显示前3个
                print(
                    f"      [{i}] {entry.get('name', '未命名')}: {str(entry.get('content', ''))[:50]}...")
            if len(entries) > 3:
                print(f"      ... 还有 {len(entries)-3} 个条目")

        # 处理 depth_prompt (V3 深度提示词)
        elif key == 'depth_prompt' and isinstance(value, dict):
            print(f"    深度提示词: {value.get('prompt', '')[:100]}...")

        # 处理 regex (正则替换脚本)
        elif key == 'regex' and isinstance(value, list):
            print(f"    包含 {len(value)} 个正则脚本")

        # 其他扩展
        else:
            # 尝试显示内容类型
            if isinstance(value, str):
                print(f"    字符串 ({len(value)} 字符): {value[:100]}...")
            elif isinstance(value, (list, dict)):
                print(f"    复杂数据 ({len(str(value))} 字符)")
                # 如果是列表，显示结构
                if isinstance(value, list) and value:
                    print(f"    类型: 列表，首项: {type(value[0]).__name__}")
            else:
                print(f"    值: {value}")

    # 检查是否有 V3 特有的 world_info
    if 'character_book' in extensions:
        print(f"\n{'='*60}")
        print("【Character Book (World Info) 详情】")
        book = extensions['character_book']

        # 递归显示结构
        def show_structure(obj, indent=4):
            prefix = " " * indent
            if isinstance(obj, dict):
                for k, v in obj.items():
                    if isinstance(v, (dict, list)) and v:
                        print(f"{prefix}{k}:")
                        show_structure(v, indent+2)
                    else:
                        print(
                            f"{prefix}{k}: {v if not isinstance(v, str) or len(v) < 50 else v[:50]+'...'}")
            elif isinstance(obj, list) and obj:
                print(f"{prefix}[列表，共 {len(obj)} 项]")
                for i, item in enumerate(obj[:2]):
                    print(f"{prefix}  [{i}]:")
                    show_structure(item, indent+4)

        show_structure(book)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("用法: python deep_check.py <原图像文件名_extract_v2.json 或 原图像文件名_extract_v3.json>")
        sys.exit(1)

    analyze_character_file(sys.argv[1])
