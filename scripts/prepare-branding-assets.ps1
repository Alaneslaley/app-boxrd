Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

$projectRoot = Split-Path -Parent $PSScriptRoot
$assetsRoot = Join-Path $projectRoot 'assets'
$brandingRoot = Join-Path $assetsRoot 'branding'

New-Item -ItemType Directory -Force -Path $brandingRoot | Out-Null

function Copy-BrandingAsset {
  param(
    [Parameter(Mandatory = $true)][string]$Source,
    [Parameter(Mandatory = $true)][string]$Destination
  )

  Copy-Item -LiteralPath (Join-Path $assetsRoot $Source) -Destination (Join-Path $brandingRoot $Destination) -Force
}

function Resize-Png {
  param(
    [Parameter(Mandatory = $true)][string]$Source,
    [Parameter(Mandatory = $true)][string]$Destination,
    [Parameter(Mandatory = $true)][int]$CanvasSize,
    [Parameter(Mandatory = $true)][int]$ContentSize
  )

  $sourcePath = Join-Path $assetsRoot $Source
  $destinationPath = Join-Path $brandingRoot $Destination
  $image = [System.Drawing.Image]::FromFile($sourcePath)
  $canvas = [System.Drawing.Bitmap]::new($CanvasSize, $CanvasSize, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($canvas)

  try {
    $graphics.Clear([System.Drawing.Color]::Transparent)
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality

    $scale = [Math]::Min($ContentSize / $image.Width, $ContentSize / $image.Height)
    $width = [int][Math]::Round($image.Width * $scale)
    $height = [int][Math]::Round($image.Height * $scale)
    $x = [int][Math]::Round(($CanvasSize - $width) / 2)
    $y = [int][Math]::Round(($CanvasSize - $height) / 2)
    $graphics.DrawImage($image, $x, $y, $width, $height)
    $canvas.Save($destinationPath, [System.Drawing.Imaging.ImageFormat]::Png)
  }
  finally {
    $graphics.Dispose()
    $canvas.Dispose()
    $image.Dispose()
  }
}

# Fuentes del propietario: cuadrado.png (launcher), circular.png (splash/fav) y
# "transparente para fondo negro.png" (foreground adaptativo y splash oscuro).
Copy-BrandingAsset -Source 'cuadrado.png' -Destination 'app-icon-square.png'
Copy-BrandingAsset -Source 'cuadrado.png' -Destination 'app-icon-legacy-android.png'
Copy-BrandingAsset -Source 'circular.png' -Destination 'splash-logo-light.png'
Copy-BrandingAsset -Source 'transparente para fondo negro.png' -Destination 'splash-logo-dark.png'
Resize-Png -Source 'circular.png' -Destination 'favicon.png' -CanvasSize 48 -ContentSize 46
# La zona segura amplia evita que las máscaras de Android recorten el emblema.
Resize-Png -Source 'transparente para fondo negro.png' -Destination 'adaptive-icon-foreground.png' -CanvasSize 512 -ContentSize 320

Write-Output 'Branding derivado preparado en assets/branding.'
