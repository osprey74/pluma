# HANDOFF: Pluma — 不可視文字インスペクター機能

**作成日:** 2026-04-03  
**対象リポジトリ:** `pluma`  
**ベースブランチ:** `main`  
**実装ブランチ（推奨）:** `feature/invisible-inspector`  
**優先度:** 中  
**工数目安:** 2〜3時間

---

## 概要

Plumaのエディター上に「不可視文字インスペクター」パネルを追加する。  
ペーストされたテキストに含まれるゼロ幅スペース（ZWSP）・BOM・双方向制御文字などを検出し、
位置をグラフィカルに明示、ワンクリックで除去できる機能を提供する。

**背景:** kazahanaのApp Store審査においてテストアカウント文字列に混入した不可視文字が
原因でリジェクトが繰り返された。同様の問題はパスワード・APIキー・設定値など
あらゆるコピー&ペースト運用で発生しうるため、Plumaの付加価値機能として実装する。

---

## 完成形イメージ

```
┌─ Pluma ──────────────────────────────────────────────────────┐
│  [ファイル] [編集] [表示]           [インスペクター: ON/OFF]  │
├──────────────────────────────────────────────────────────────┤
│  CodeMirrorエディター（メイン）                               │
│  test[ZWSP]user[ZWNJ]@example.com[BOM]                       │
│                                                               │
├── 不可視文字インスペクター ─────────────────────────────────┤
│  総文字数: 35  可視: 32  不可視: 3                           │
│  ─────────────────────────────────────────────────────────  │
│  [ZWSP] U+200B  Zero Width Space    1個  @ [4]               │
│  [ZWNJ] U+200C  ZW Non-Joiner       1個  @ [9]               │
│  [BOM]  U+FEFF  Byte Order Mark     1個  @ [26]              │
│  ─────────────────────────────────────────────────────────  │
│  [不可視文字を全削除]  [クリーン版をクリップボードにコピー]   │
└──────────────────────────────────────────────────────────────┘
```

---

## 検出仕様

### 検出対象の不可視文字

| 略称 | Unicode | 名称 | リスク |
|------|---------|------|--------|
| NBSP | U+00A0 | No-Break Space | 中 |
| SHY | U+00AD | Soft Hyphen | 低 |
| ZWSP | U+200B | Zero Width Space | 高 |
| ZWNJ | U+200C | Zero Width Non-Joiner | 高 |
| ZWJ | U+200D | Zero Width Joiner | 中（絵文字内は警告のみ） |
| LRM | U+200E | Left-to-Right Mark | 高 |
| RLM | U+200F | Right-to-Left Mark | 高 |
| LS | U+2028 | Line Separator | 高 |
| PS | U+2029 | Paragraph Separator | 高 |
| LRE | U+202A | LTR Embedding | 高 |
| RLE | U+202B | RTL Embedding | 高 |
| PDF | U+202C | Pop Directional Formatting | 高 |
| LRO | U+202D | LTR Override | 高 |
| RLO | U+202E | RTL Override | 高 |
| NNBS | U+202F | Narrow No-Break Space | 中 |
| WJ | U+2060 | Word Joiner | 中 |
| FA | U+2061 | Function Application | 低 |
| ITMS | U+2062 | Invisible Times | 低 |
| ISEP | U+2063 | Invisible Separator | 低 |
| IPLS | U+2064 | Invisible Plus | 低 |
| BOM | U+FEFF | Byte Order Mark / ZWNBS | 高 |
| CTRL | U+0000–U+001F | 制御文字（TAB/LF/CR除く） | 高 |
| DEL | U+007F | Delete | 高 |
| C1 | U+0080–U+009F | C1制御文字 | 高 |
| VS | U+FE00–U+FE0F | Variation Selectors | 低 |

### 検出ロジック（TypeScript）

```typescript
// src/lib/invisibleChars.ts

export interface CharInfo {
  name: string;
  abbr: string;
  cat: 'control' | 'format' | 'space' | 'bidi' | 'separator';
}

export type CharType =
  | 'visible'
  | 'space'
  | 'tab'
  | 'newline'
  | 'cr'
  | 'invisible';

export const CHAR_DB: Record<number, CharInfo> = {
  0x00a0: { name: 'No-Break Space',         abbr: 'NBSP', cat: 'space'     },
  0x00ad: { name: 'Soft Hyphen',            abbr: 'SHY',  cat: 'format'    },
  0x200b: { name: 'Zero Width Space',       abbr: 'ZWSP', cat: 'format'    },
  0x200c: { name: 'ZW Non-Joiner',          abbr: 'ZWNJ', cat: 'format'    },
  0x200d: { name: 'ZW Joiner',              abbr: 'ZWJ',  cat: 'format'    },
  0x200e: { name: 'LTR Mark',               abbr: 'LRM',  cat: 'bidi'      },
  0x200f: { name: 'RTL Mark',               abbr: 'RLM',  cat: 'bidi'      },
  0x2028: { name: 'Line Separator',         abbr: 'LS',   cat: 'separator' },
  0x2029: { name: 'Paragraph Separator',    abbr: 'PS',   cat: 'separator' },
  0x202a: { name: 'LTR Embedding',          abbr: 'LRE',  cat: 'bidi'      },
  0x202b: { name: 'RTL Embedding',          abbr: 'RLE',  cat: 'bidi'      },
  0x202c: { name: 'Pop Dir. Formatting',    abbr: 'PDF',  cat: 'bidi'      },
  0x202d: { name: 'LTR Override',           abbr: 'LRO',  cat: 'bidi'      },
  0x202e: { name: 'RTL Override',           abbr: 'RLO',  cat: 'bidi'      },
  0x202f: { name: 'Narrow NBSP',            abbr: 'NNBS', cat: 'space'     },
  0x2060: { name: 'Word Joiner',            abbr: 'WJ',   cat: 'format'    },
  0x2061: { name: 'Function Application',   abbr: 'FA',   cat: 'format'    },
  0x2062: { name: 'Invisible Times',        abbr: 'ITMS', cat: 'format'    },
  0x2063: { name: 'Invisible Separator',    abbr: 'ISEP', cat: 'format'    },
  0x2064: { name: 'Invisible Plus',         abbr: 'IPLS', cat: 'format'    },
  0xfeff: { name: 'Byte Order Mark',        abbr: 'BOM',  cat: 'format'    },
};

export function getCharInfo(cp: number): CharInfo {
  if (CHAR_DB[cp]) return CHAR_DB[cp];
  if (cp < 0x20)
    return { name: `Control U+${cp.toString(16).toUpperCase().padStart(4,'0')}`, abbr: 'CTRL', cat: 'control' };
  if (cp === 0x7f)
    return { name: 'Delete', abbr: 'DEL', cat: 'control' };
  if (cp >= 0x80 && cp <= 0x9f)
    return { name: `C1 Control U+${cp.toString(16).toUpperCase().padStart(4,'0')}`, abbr: 'C1', cat: 'control' };
  if (cp >= 0xfe00 && cp <= 0xfe0f)
    return { name: `Variation Selector ${cp - 0xfe00 + 1}`, abbr: 'VS', cat: 'format' };
  return { name: `Unknown U+${cp.toString(16).toUpperCase().padStart(4,'0')}`, abbr: '???', cat: 'format' };
}

export function classifyCodePoint(cp: number): CharType {
  if (cp === 0x09) return 'tab';
  if (cp === 0x0a) return 'newline';
  if (cp === 0x0d) return 'cr';
  if (cp === 0x20) return 'space';
  if (
    (cp < 0x20) ||
    cp === 0x7f ||
    (cp >= 0x80 && cp <= 0x9f) ||
    cp === 0x00a0 ||
    cp === 0x00ad ||
    (cp >= 0x200b && cp <= 0x200f) ||
    (cp >= 0x2028 && cp <= 0x202f) ||
    (cp >= 0x2060 && cp <= 0x206f) ||
    cp === 0xfeff ||
    (cp >= 0xfe00 && cp <= 0xfe0f)
  ) return 'invisible';
  return 'visible';
}

export interface AnalyzedChar {
  char: string;
  cp: number;
  index: number;
  type: CharType;
  hex: string;
  info?: CharInfo;
}

export interface InspectorResult {
  chars: AnalyzedChar[];
  totalCount: number;
  visibleCount: number;
  invisibleCount: number;
  invisibleByType: Record<string, { info: CharInfo; hex: string; positions: number[] }>;
  cleanText: string;
}

export function analyzeText(text: string): InspectorResult {
  const units = Array.from(text);
  const chars: AnalyzedChar[] = units.map((char, index) => {
    const cp = char.codePointAt(0)!;
    const type = classifyCodePoint(cp);
    const hex = `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`;
    return { char, cp, index, type, hex, info: type === 'invisible' ? getCharInfo(cp) : undefined };
  });

  const invisibleItems = chars.filter(c => c.type === 'invisible');
  const invisibleByType: InspectorResult['invisibleByType'] = {};
  invisibleItems.forEach(({ hex, info, index }) => {
    if (!invisibleByType[hex]) invisibleByType[hex] = { info: info!, hex, positions: [] };
    invisibleByType[hex].positions.push(index);
  });

  const cleanText = chars
    .filter(c => c.type !== 'invisible')
    .map(c => c.char)
    .join('');

  return {
    chars,
    totalCount: chars.length,
    visibleCount: chars.length - invisibleItems.length,
    invisibleCount: invisibleItems.length,
    invisibleByType,
    cleanText,
  };
}
```

---

## 実装手順

### Step 1: ライブラリ追加

```bash
# 追加パッケージなし（標準JSのみで実装可能）
```

### Step 2: ファイル構成

```
src/
├── lib/
│   └── invisibleChars.ts          # 新規: 検出ロジック（上記コード）
├── components/
│   └── InvisibleInspector/
│       ├── index.tsx              # 新規: パネルコンポーネント
│       └── InvisibleInspector.css # 新規: スタイル
└── App.tsx                        # 変更: パネルの表示切替を追加
```

### Step 3: InvisibleInspector コンポーネント

```tsx
// src/components/InvisibleInspector/index.tsx

import { useMemo } from 'react';
import { analyzeText, type InspectorResult } from '../../lib/invisibleChars';
import './InvisibleInspector.css';

interface Props {
  text: string;
  onClean: (cleanText: string) => void;
}

export function InvisibleInspector({ text, onClean }: Props) {
  const result: InspectorResult = useMemo(() => analyzeText(text), [text]);
  const invTypes = Object.values(result.invisibleByType);
  const isClean = result.totalCount > 0 && result.invisibleCount === 0;

  const copyClean = async () => {
    await navigator.clipboard.writeText(result.cleanText);
  };

  if (result.totalCount === 0) {
    return (
      <div className="inspector-empty">
        テキストを入力すると解析が始まります
      </div>
    );
  }

  return (
    <div className="inspector-panel">
      {/* 統計バー */}
      <div className="inspector-stats">
        <span>総文字数 <strong>{result.totalCount}</strong></span>
        <span className="stat-visible">可視 <strong>{result.visibleCount}</strong></span>
        <span className={result.invisibleCount > 0 ? 'stat-warn' : 'stat-ok'}>
          不可視 <strong>{result.invisibleCount}</strong>
        </span>
      </div>

      {/* ステータス */}
      <div className={`inspector-status ${isClean ? 'status-ok' : 'status-warn'}`}>
        {isClean
          ? '不可視文字は検出されませんでした'
          : `${result.invisibleCount} 個の不可視文字を検出 — ${invTypes.length} 種類`
        }
      </div>

      {/* 検出詳細 */}
      {invTypes.length > 0 && (
        <div className="inspector-details">
          {invTypes.map(({ info, hex, positions }) => (
            <div key={hex} className="detail-row">
              <span className="inv-badge">{info.abbr}</span>
              <span className="hex-code">{hex}</span>
              <span className="char-name">{info.name}</span>
              <span className="positions">
                {positions.length}個 @{' '}
                {positions.slice(0, 5).map(p => `[${p}]`).join(' ')}
                {positions.length > 5 && ` +${positions.length - 5}`}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* アクション */}
      {result.invisibleCount > 0 && (
        <div className="inspector-actions">
          <button onClick={copyClean}>クリーン版をコピー</button>
          <button onClick={() => onClean(result.cleanText)}>不可視文字を削除</button>
        </div>
      )}
    </div>
  );
}
```

### Step 4: App.tsx への組み込み

```tsx
// App.tsx — 差分イメージ

// 追加インポート
import { InvisibleInspector } from './components/InvisibleInspector';

// state追加
const [showInspector, setShowInspector] = useState(false);

// ツールバーに追加
<button
  onClick={() => setShowInspector(v => !v)}
  className={showInspector ? 'toolbar-btn active' : 'toolbar-btn'}
  title="不可視文字インスペクター"
>
  [?]
</button>

// エディター下部に追加
{showInspector && (
  <InvisibleInspector
    text={editorText}
    onClean={(clean) => setEditorText(clean)}
  />
)}
```

> **注意:** `editorText` はCodeMirrorエディターの現在のテキスト取得方法に合わせること。  
> CodeMirror 6の場合: `view.state.doc.toString()`

### Step 5: キーボードショートカット追加（任意）

```typescript
// keybindings.ts に追加
{ key: 'Mod-Shift-i', run: () => { toggleInspector(); return true; } }
```

---

## スタイルガイドライン

既存Plumaのデザインシステムに合わせること。参考値：

```css
/* InvisibleInspector.css */

.inspector-panel {
  border-top: 1px solid var(--border-color);
  padding: 8px 12px;
  font-size: 13px;
  background: var(--panel-bg);
}

.inspector-stats {
  display: flex;
  gap: 16px;
  margin-bottom: 6px;
  font-family: var(--font-mono);
}

.stat-warn { color: var(--color-warning); }
.stat-ok   { color: var(--color-success); }

.inspector-status {
  padding: 6px 10px;
  border-radius: 4px;
  margin-bottom: 8px;
  font-size: 12px;
}

.status-warn {
  background: var(--color-warning-bg);
  color: var(--color-warning);
  border: 0.5px solid var(--color-warning-border);
}
.status-ok {
  background: var(--color-success-bg);
  color: var(--color-success);
  border: 0.5px solid var(--color-success-border);
}

.inv-badge {
  display: inline-block;
  background: var(--color-warning-bg);
  color: var(--color-warning);
  border: 0.5px solid var(--color-warning-border);
  border-radius: 3px;
  padding: 1px 5px;
  font-size: 10px;
  font-family: var(--font-mono);
  font-weight: 600;
  min-width: 38px;
  text-align: center;
}

.detail-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 8px;
  border-radius: 4px;
  margin-bottom: 4px;
  background: var(--row-hover-bg);
  font-family: var(--font-mono);
  font-size: 12px;
}

.hex-code  { color: var(--color-text-secondary); min-width: 60px; }
.char-name { flex: 1; font-family: var(--font-sans); font-size: 12px; }
.positions { color: var(--color-text-tertiary); font-size: 11px; }

.inspector-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
```

---

## テスト観点

| # | テストケース | 期待結果 |
|---|------------|---------|
| 1 | 通常テキスト（不可視なし）| 不可視0件、ステータス緑 |
| 2 | ZWSP（U+200B）を含む文字列 | 1件検出、位置インデックス正確 |
| 3 | BOM付きテキスト（`\uFEFF`で始まる）| 先頭[0]に BOM 検出 |
| 4 | NBSP（U+00A0）を含む文字列 | 1件検出（スペースと区別されること）|
| 5 | 複数種類の不可視文字 | 種類ごとに集計・表示 |
| 6 | 「不可視文字を削除」実行後 | エディター内容が cleanText に置換される |
| 7 | 「クリーン版をコピー」後ペースト | 不可視文字なしテキストがペーストされる |
| 8 | 絵文字含む文字列（ZWJ結合絵文字）| ZWJ検出されるが削除後に絵文字が崩れることを確認 |
| 9 | 10,000文字超のテキスト | UIが詰まらず、解析がブロックしないこと |
| 10 | インスペクターOFF/ON切替 | 状態が保持されること |

> テスト用サンプル文字列:
> ```
> const SAMPLE_ZWSP = 'test\u200Buser\u200C@example.com\uFEFF';
> const SAMPLE_NBSP = 'Apple\u00A0ID: user@example.com';
> const SAMPLE_BIDI = 'price: \u202E100\u202C USD';
> ```

---

## 将来の拡張候補

- **CodeMirrorデコレーション統合**: エディター本文内で不可視文字をインラインハイライト
- **文字種カラーリング**: アルファベット（黒）/ 数字（青）/ 記号（赤）の色分け表示（プロトタイプ実装済み）
- **ファイル保存時の警告**: 不可視文字が残ったままの保存に警告ダイアログ
- **種類別フィルター除去**: NBSP のみ残す、BOM のみ除去、など選択的クリーンアップ

---

## 参考

- プロトタイプ実装: Claude.ai チャット（2026-04-03 会話履歴）
- Unicode不可視文字仕様: https://www.unicode.org/reports/tr44/#General_Category_Values
- CodeMirror 6 ドキュメント: https://codemirror.net/docs/
- 既存HANDOFF: `HANDOFF_text-editor.md`（2026-03-06）
