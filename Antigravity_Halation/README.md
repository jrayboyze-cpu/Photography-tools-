# Antigravity Halation for DaVinci Resolve

A single-node DCTL (DaVinci Color Transform Language) plugin designed to bring authentic film halation effects to your footage directly inside DaVinci Resolve’s color page.

## What it does
Halation naturally occurs in analog film when intense light sources scatter off the base of the film stock, creating a localized red/orange glow around high-contrast details. 

This plugin mathematically mimics this process by:
1. Utilizing a luma threshold to isolate specular highlights.
2. Generating a spatial convolution blur specifically weighted toward the red channel to simulate emulsion glow.
3. Compositing the effect back onto the original image seamlessly via a Screen blend mode.

## Why a DCTL?
Instead of stringing together multiple nodes (lum keys, blurs, and layer mixers) in a compound structure, this pure DCTL evaluates the math directly on the GPU in a single drop-in node, giving you immediate sliders for Threshold, Blur Radius, Intensity, and RGB color bias. 

## Installation
1. Navigate to your DaVinci Resolve LUT directory:
   * **Windows:** `%PROGRAMDATA%\Blackmagic Design\DaVinci Resolve\Support\LUT` or `%APPDATA%\Blackmagic Design\DaVinci Resolve\Support\LUT`
   * **macOS:** `/Library/Application Support/Blackmagic Design/DaVinci Resolve/LUT`
2. Drop the `Antigravity_Halation.dctl` file inside.
3. Restart Resolve (or refresh your LUT list).
4. On the Color Page, search for "DCTL" in your Effects Library, apply it to a node, and select "Antigravity Halation" from the drop-down menu!
