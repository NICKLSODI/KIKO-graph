# Generate a custom multi-size .ico for SN-Desk (gradient + "SN" + chart bars)
Add-Type -AssemblyName System.Drawing

$out = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "sndesk.ico"
$sizes = 256,128,64,48,32,16

function New-Frame([int]$S) {
    $bmp = New-Object System.Drawing.Bitmap($S, $S, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = 'AntiAlias'
    $g.InterpolationMode = 'HighQualityBicubic'
    $g.Clear([System.Drawing.Color]::Transparent)

    $pad = [Math]::Max(1, [int]($S * 0.06))
    $rect = New-Object System.Drawing.Rectangle($pad, $pad, ($S - 2*$pad), ($S - 2*$pad))
    $radius = [int]($S * 0.22)

    # rounded-rect path
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $d = $radius * 2
    $path.AddArc($rect.X, $rect.Y, $d, $d, 180, 90)
    $path.AddArc($rect.Right - $d, $rect.Y, $d, $d, 270, 90)
    $path.AddArc($rect.Right - $d, $rect.Bottom - $d, $d, $d, 0, 90)
    $path.AddArc($rect.X, $rect.Bottom - $d, $d, $d, 90, 90)
    $path.CloseFigure()

    # diagonal gradient (indigo -> violet)
    $c1 = [System.Drawing.Color]::FromArgb(255, 37, 99, 235)    # blue-600
    $c2 = [System.Drawing.Color]::FromArgb(255, 124, 58, 237)   # violet-600
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $c1, $c2, 55.0)
    $g.FillPath($brush, $path)

    # chart bars (bottom), semi-transparent white
    $barBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(200, 255, 255, 255))
    $bw = [Math]::Max(1, [int]($S * 0.09))
    $gap = [Math]::Max(1, [int]($S * 0.05))
    $baseY = [int]($S * 0.80)
    $x = [int]($S * 0.20)
    $heights = 0.14, 0.24, 0.18, 0.32
    foreach ($h in $heights) {
        $bh = [int]($S * $h)
        $g.FillRectangle($barBrush, $x, ($baseY - $bh), $bw, $bh)
        $x += $bw + $gap
    }

    # "SN" text
    $fontSize = [single]($S * 0.30)
    $font = New-Object System.Drawing.Font("Segoe UI", $fontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = 'Center'; $sf.LineAlignment = 'Center'
    $txtRect = New-Object System.Drawing.RectangleF(0, [single]($S * 0.04), [single]$S, [single]($S * 0.62))
    $g.DrawString("SN", $font, [System.Drawing.Brushes]::White, $txtRect, $sf)

    $g.Dispose()
    return $bmp
}

# encode each frame as PNG bytes
$pngs = @()
foreach ($s in $sizes) {
    $bmp = New-Frame $s
    $ms = New-Object System.IO.MemoryStream
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $pngs += ,($ms.ToArray())
    $bmp.Dispose(); $ms.Dispose()
}

# assemble ICO (PNG-embedded)
$fs = New-Object System.IO.FileStream($out, [System.IO.FileMode]::Create)
$bw = New-Object System.IO.BinaryWriter($fs)
$bw.Write([UInt16]0)          # reserved
$bw.Write([UInt16]1)          # type = icon
$bw.Write([UInt16]$sizes.Count)

$offset = 6 + (16 * $sizes.Count)
for ($i = 0; $i -lt $sizes.Count; $i++) {
    $s = $sizes[$i]
    $len = $pngs[$i].Length
    $bw.Write([Byte]($(if ($s -ge 256) {0} else {$s})))   # width
    $bw.Write([Byte]($(if ($s -ge 256) {0} else {$s})))   # height
    $bw.Write([Byte]0)        # palette
    $bw.Write([Byte]0)        # reserved
    $bw.Write([UInt16]1)      # planes
    $bw.Write([UInt16]32)     # bpp
    $bw.Write([UInt32]$len)   # bytes in res
    $bw.Write([UInt32]$offset)
    $offset += $len
}
foreach ($p in $pngs) { $bw.Write($p) }
$bw.Flush(); $bw.Close(); $fs.Close()

Write-Host "Icon written: $out"
