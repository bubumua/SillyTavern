#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SillyTavern 角色卡完整提取器 (V1/V2/V3)
"""

import struct
import zlib
import json
import base64
import sys
import os


def extract_png_text_chunks(filename):
    """提取所有文本类型的 PNG chunks"""
    SIGNATURE = b'\x89PNG\r\n\x1a\n'
    texts = {}

    with open(filename, 'rb') as f:
        header = f.read(8)
        if header != SIGNATURE:
            return None

        while True:
            length_bytes = f.read(4)
            if len(length_bytes) < 4:
                break

            length = struct.unpack('>I', length_bytes)[0]
            chunk_type = f.read(4)

            if len(chunk_type) < 4:
                break

            data = f.read(length)
            f.read(4)  # 跳过 CRC

            chunk_name = chunk_type.decode('ascii', errors='ignore')

            # 解析文本 chunks
            if chunk_name == 'tEXt':
                null_pos = data.find(b'\x00')
                if null_pos != -1:
                    key = data[:null_pos].decode('latin-1')
                    value = data[null_pos+1:].decode('latin-1')
                    texts[key] = value

            elif chunk_name == 'zTXt':
                try:
                    null_pos = data.find(b'\x00')
                    if null_pos != -1:
                        key = data[:null_pos].decode('latin-1')
                        # 跳过分隔符和压缩方法字节
                        compressed = data[null_pos+2:]
                        value = zlib.decompress(compressed).decode('utf-8')
                        texts[key] = value
                except:
                    pass

            if chunk_type == b'IEND':
                break

    return texts


def decode_character_data(text):
    """解码角色卡数据"""
    try:
        # 先尝试 base64
        decoded = base64.b64decode(text)
        return json.loads(decoded)
    except:
        # 再尝试直接 JSON
        return json.loads(text)


def build_output_path(image_path, version_tag):
    """根据原图文件名生成输出 JSON 文件名"""
    image_dir = os.path.dirname(image_path)
    image_name = os.path.splitext(os.path.basename(image_path))[0]
    return os.path.join(image_dir, f"{image_name}_extract_{version_tag}.json")


def analyze_card(filename):
    texts = extract_png_text_chunks(filename)

    if not texts:
        print("未找到文本数据")
        return

    print(f"发现 {len(texts)} 个文本字段: {list(texts.keys())}\n")

    # 1. 解析 chara (V1/V2 标准)
    if 'chara' in texts:
        print("=" * 60)
        print("【chara 字段 - 基础角色数据】")
        print("=" * 60)

        try:
            data = decode_character_data(texts['chara'])
            raw_output_path = build_output_path(filename, 'v2')

            # 保存原始数据
            with open(raw_output_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            print(f"原始数据已保存至: {raw_output_path}\n")

            # 判断版本并显示
            if 'data' in data:
                print("格式版本: V2")
                char_data = data['data']
                spec_version = data.get('spec_version', 'unknown')
                print(f"规范版本: {spec_version}")
            else:
                print("格式版本: V1")
                char_data = data

            # 显示关键信息
            key_fields = [
                ('name', '角色名'),
                ('creator', '创建者'),
                ('character_version', '版本'),
                ('description', '角色描述'),
                ('personality', '性格'),
                ('scenario', '场景'),
                ('first_mes', '首条消息'),
                ('mes_example', '示例对话'),
            ]

            for key, label in key_fields:
                value = char_data.get(key, '')
                if value:
                    if isinstance(value, str) and len(value) > 300:
                        print(f"\n【{label}】({len(value)}字符):")
                        print(f"{value[:300]}...")
                    else:
                        print(f"\n【{label}】: {value}")
                else:
                    print(f"\n【{label}】: (空)")

            # 检查是否有加密或特殊标记
            if 'extensions' in data or 'extensions' in char_data:
                print("\n【扩展数据】: 存在 (可能包含 lorebook 等)")

        except Exception as e:
            print(f"解析 chara 失败: {e}")

    # 2. 解析 ccv3 (V3 格式扩展)
    if 'ccv3' in texts:
        print("\n" + "=" * 60)
        print("【ccv3 字段 - V3 扩展数据】")
        print("=" * 60)

        try:
            v3_data = decode_character_data(texts['ccv3'])
            v3_output_path = build_output_path(filename, 'v3')

            with open(v3_output_path, 'w', encoding='utf-8') as f:
                json.dump(v3_data, f, ensure_ascii=False, indent=2)
            print(f"V3数据已保存至: {v3_output_path}")

            # V3 特有字段
            if 'entries' in v3_data:
                print(f"\n发现 {len(v3_data['entries'])} 个 lorebook 条目")
            if 'prompt' in v3_data:
                print(f"\n主提示词长度: {len(v3_data['prompt'])} 字符")

        except Exception as e:
            print(f"解析 ccv3 失败: {e}")

    # 3. 检查其他可能的字段
    other_keys = [k for k in texts.keys() if k not in ['chara', 'ccv3']]
    if other_keys:
        print("\n【其他元数据字段】:")
        for key in other_keys:
            value = texts[key]
            preview = value[:100] + "..." if len(value) > 100 else value
            print(f"  {key}: {preview}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("用法: python card_extractor.py <图片路径>")
        sys.exit(1)

    analyze_card(sys.argv[1])
