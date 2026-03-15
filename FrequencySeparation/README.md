# Frequency Separation - Architectural Retouching

A Photoshop UXP plugin for frequency separation tailored to architectural photography retouching.

## Features

- **8-bit and 16-bit support** — Automatically detects bit depth and uses the correct Apply Image method (Subtract for 8-bit, Add+Invert for 16-bit)
- **Gaussian Blur** — Standard frequency separation with adjustable radius
- **Surface Blur** — Edge-aware separation that preserves architectural lines and edges (radius + threshold controls)
- **Architectural Presets** — One-click presets tuned for common architectural surfaces:
  - **Facade** (R:6) — Building exteriors, brick, stone
  - **Concrete** (Surface R:12, T:20) — Concrete walls and floors
  - **Glass** (R:20) — Windows, reflections, glass facades
  - **Sky/BG** (R:40) — Sky replacement zones, backgrounds
  - **Fine Detail** (R:3) — Small texture work, fine patterns
  - **Broad Tone** (R:60) — Large tonal adjustments, gradients
- **Layer Masks** — Optional empty masks on HF & LF layers for selective retouching
- **Layer Grouping** — Keeps separation organized in a "Frequency Separation" group
- **Stamp Visible** — Option to flatten visible layers before separating
- **Flatten Separation** — One-click merge of the frequency separation group

## Installation

### Method 1: UXP Developer Tool (Development)

1. Open Adobe UXP Developer Tool
2. Click **Add Plugin** → select the `FrequencySeparation` folder
3. Click **Load** to load the plugin into Photoshop
4. The panel appears under **Plugins → Freq Separation**

### Method 2: Manual Install (Production)

1. Package the `FrequencySeparation` folder as a `.ccx` file using UXP Packager
2. Double-click the `.ccx` file to install via Creative Cloud
3. Restart Photoshop
4. Enable the plugin under **Plugins → Freq Separation**

### Method 3: Direct Folder (Quick Test)

1. Copy the `FrequencySeparation` folder to your Photoshop UXP plugins directory:
   - **macOS:** `~/Library/Application Support/Adobe/UXP/PluginsStorage/PHSP/Internal/`
   - **Windows:** `%APPDATA%\Adobe\UXP\PluginsStorage\PHSP\Internal\`
2. Restart Photoshop

## Usage

1. Open an image in Photoshop
2. Open the **Freq Separation** panel (Plugins menu)
3. Choose **Gaussian** or **Surface** blur mode
4. Adjust the radius (and threshold for Surface mode)
5. Or click an **Architectural Preset** for quick settings
6. Click **Separate Frequencies**
7. Retouch on the HF layer (texture/detail) or LF layer (color/tone)
8. When done, click **Flatten Separation** to merge

## How It Works

### 8-bit Mode
- Low Frequency: Blur applied to duplicate layer
- High Frequency: Apply Image → Subtract, Scale 2, Offset 128
- Blend Mode: Linear Light

### 16-bit Mode
- Low Frequency: Blur applied to duplicate layer
- High Frequency: Apply Image → Add with Invert, Scale 2, Offset 0
- Blend Mode: Linear Light

### Surface Blur Mode
Surface blur preserves hard edges while smoothing flat areas. This is ideal for architectural retouching where you need to clean surfaces without softening edges of windows, trim, and structural elements.

## Requirements

- Adobe Photoshop 2023 (v24.0) or later
- UXP API support (included in all modern Photoshop versions)
