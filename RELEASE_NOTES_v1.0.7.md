# Pluma v1.0.7 リリースノート

**リリース日:** 2026-04-16

エクスプローラーの右クリックメニューから Pluma を直接呼び出せるようになりました。あわせて Windows の配布形式を NSIS インストーラーに一本化しています。

---

## 新機能

### エクスプローラー右クリックメニュー「Plumaで編集」

Windows エクスプローラーで対象ファイルを右クリックし、**「Plumaで編集」** を選ぶだけで Pluma が起動してそのファイルを開きます。事前に「プログラムから開く」で関連付けを設定する必要はありません。

- **対象拡張子**: `.txt` / `.csv` / `.tsv` / `.tab` / `.md` / `.htm` / `.html`
- **自動登録**: インストーラー (`-setup.exe`) が登録、アンインストーラーが解除します
- **ユーザー単位の登録**: HKCU スコープのため管理者権限は不要です
- **既存の関連付けに影響しません**: 各拡張子のデフォルトアプリ設定とは独立して動作するため、既定のアプリは変えずに「Plumaでも開く」選択肢を追加できます

---

## 変更点

### Windows 配布形式を NSIS インストーラーに一本化

これまで MSI (`.msi`) と NSIS (`-setup.exe`) の両方を配布していましたが、今後は **NSIS インストーラー (`-setup.exe`) のみ** を配布します。右クリックメニュー登録の保守性向上のための判断です。MSI をご利用だった方は、新規インストール時に `-setup.exe` をご利用ください。

---

## 動作環境

- Windows 10 / 11（WebView2 ランタイム必須）
- macOS（Apple Silicon）

## 更新方法

GitHub Releases から最新のインストーラ（`-setup.exe` / `.dmg`）をダウンロードしてください。Windows をご利用中で旧バージョンがインストールされている場合、新バージョンを上書きインストールすれば右クリックメニューが自動的に登録されます。

## Support / 開発を応援する

Pluma を気に入っていただけたら、開発の継続を応援してください ☕

[![GitHub Sponsors](https://img.shields.io/badge/Sponsor-GitHub-ea4aaa?logo=github)](https://github.com/sponsors/osprey74)
[![Ko-fi](https://img.shields.io/badge/Ko--fi-Support-ff5e5b?logo=ko-fi)](https://ko-fi.com/osprey74)

---

# Pluma v1.0.7 Release Notes

**Release date:** 2026-04-16

Pluma can now be launched directly from the Windows Explorer right-click menu. The Windows distribution format has also been consolidated to the NSIS installer.

---

## New Features

### Explorer Right-Click Menu "Plumaで編集"

Right-click a supported file in Windows Explorer and choose **"Plumaで編集"** to launch Pluma with that file. No need to set up a file association via "Open with" beforehand.

- **Target extensions**: `.txt` / `.csv` / `.tsv` / `.tab` / `.md` / `.htm` / `.html`
- **Automatic registration**: The installer (`-setup.exe`) registers the menu; the uninstaller removes it
- **Per-user scope**: Registered under HKCU — no administrator privileges required
- **Coexists with existing associations**: Operates independently from each extension's default application setting, so you can add the "open in Pluma" option without changing your defaults

---

## Changes

### Windows Distribution Consolidated to NSIS Installer

Previously both MSI (`.msi`) and NSIS (`-setup.exe`) installers were distributed. Going forward, **only the NSIS installer (`-setup.exe`)** will be provided. This decision was made to simplify maintenance of the right-click menu registration. If you were using the MSI, please use `-setup.exe` for new installs.

---

## System Requirements

- Windows 10 / 11 (WebView2 runtime required)
- macOS (Apple Silicon)

## How to Update

Download the latest installer (`-setup.exe` / `.dmg`) from GitHub Releases. On Windows, installing the new version over an existing one will automatically register the right-click menu.

## Support

If you find Pluma useful, please consider supporting ongoing development ☕

[![GitHub Sponsors](https://img.shields.io/badge/Sponsor-GitHub-ea4aaa?logo=github)](https://github.com/sponsors/osprey74)
[![Ko-fi](https://img.shields.io/badge/Ko--fi-Support-ff5e5b?logo=ko-fi)](https://ko-fi.com/osprey74)
