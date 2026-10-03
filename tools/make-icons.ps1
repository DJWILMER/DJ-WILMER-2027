Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $root 'assets\icons'
if (-not (Test-Path -LiteralPath $outDir)) { New-Item -ItemType Directory -Path $outDir -Force | Out-Null }

$fontName = $null
foreach ($cand in @('Segoe UI Black', 'Arial Black', 'Impact')) {
    try { $f = New-Object System.Drawing.Font($cand, 10, [System.Drawing.FontStyle]::Bold); $fontName = $cand; $f.Dispose(); break } catch { }
}
if (-not $fontName) { $fontName = 'Arial' }
$fontSmall = $null
foreach ($cand in @('Segoe UI Semibold', 'Segoe UI', 'Arial')) {
    try { $f = New-Object System.Drawing.Font($cand, 10, [System.Drawing.FontStyle]::Bold); $fontSmall = $cand; $f.Dispose(); break } catch { }
}
if (-not $fontSmall) { $fontSmall = 'Arial' }

function New-RoundedPath([System.Drawing.RectangleF]$r, [double]$radius) {
    $p = New-Object System.Drawing.Drawing2D.GraphicsPath
    $d = $radius * 2
    if ($d -le 0) { $p.AddRectangle($r); return $p }
    $p.AddArc($r.X, $r.Y, $d, $d, 180, 90)
    $p.AddArc($r.Right - $d, $r.Y, $d, $d, 270, 90)
    $p.AddArc($r.Right - $d, $r.Bottom - $d, $d, $d, 0, 90)
    $p.AddArc($r.X, $r.Bottom - $d, $d, $d, 90, 90)
    $p.CloseFigure()
    return $p
}

function New-Icon([int]$size, [string]$file, [bool]$maskable) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $g.Clear([System.Drawing.Color]::FromArgb(0, 0, 0, 0))

    $rect = New-Object System.Drawing.RectangleF(0, 0, $size, $size)
    # Azul caribe -> verde -> morado
    $c1 = [System.Drawing.Color]::FromArgb(255, 4, 40, 66)
    $c2 = [System.Drawing.Color]::FromArgb(255, 14, 138, 168)
    $c3 = [System.Drawing.Color]::FromArgb(255, 122, 61, 224)
    $br = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $c1, $c2, 55.0)
    $br.GammaCorrection = $true

    if ($maskable) {
        $g.FillRectangle($br, $rect)
    } else {
        $path = New-RoundedPath $rect ($size * 0.225)
        $g.FillPath($br, $path)
        $g.SetClip($path)
    }

    $halo = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(42, 255, 255, 255))
    $hr = New-Object System.Drawing.RectangleF((-0.35 * $size), (-0.55 * $size), (1.7 * $size), (1.1 * $size))
    $g.FillEllipse($halo, $hr)

    $accent = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        (New-Object System.Drawing.RectangleF(0, ($size * 0.30), $size, ($size * 0.42))),
        [System.Drawing.Color]::FromArgb(255, 46, 230, 196),
        [System.Drawing.Color]::FromArgb(255, 34, 132, 255), 90.0)

    if (-not $maskable) { $g.ResetClip() }

    $ringPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(70, 255, 255, 255)), ([Math]::Max(1.0, $size * 0.011))
    $inset = if ($maskable) { $size * 0.30 } else { $size * 0.075 }
    $g.DrawEllipse($ringPen, $inset, $inset, $size - (2 * $inset), $size - (2 * $inset))

    $scale = if ($maskable) { 0.56 } else { 0.78 }
    $cw = $size * $scale
    $cx = ($size - $cw) / 2.0
    $cy = ($size - $cw) / 2.0 - ($size * 0.035)

    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center

    $fDJ = New-Object System.Drawing.Font($fontName, [float]($cw * 0.50), [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $brDJ = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
    $g.DrawString('DJ', $fDJ, $brDJ, (New-Object System.Drawing.RectangleF($cx, $cy, $cw, $cw * 0.62)), $sf)

    $fW = New-Object System.Drawing.Font($fontSmall, [float]($cw * 0.155), [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $brW = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(238, 255, 255, 255))
    $wy = $cy + ($cw * 0.60)
    $label = 'WILMER'
    $spacing = $cw * 0.055
    $fmt = [System.Drawing.StringFormat]::GenericTypographic.Clone()
    $fmt.Alignment = [System.Drawing.StringAlignment]::Center
    $chars = $label.ToCharArray()
    $widths = @()
    foreach ($ch in $chars) { $widths += $g.MeasureString($ch, $fW, [System.Drawing.PointF]::new(0, 0), $fmt).Width }
    $total = ($widths | Measure-Object -Sum).Sum + ($spacing * ($chars.Length - 1))
    $x = $cx + (($cw - $total) / 2.0)
    for ($i = 0; $i -lt $chars.Length; $i++) {
        $g.DrawString([string]$chars[$i], $fW, $brW, (New-Object System.Drawing.PointF($x, $wy)), $fmt)
        $x += $widths[$i] + $spacing
    }

    $dot = $size * 0.045
    $edge = if ($maskable) { 0.30 } else { 0.20 }
    $dotBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(240, 255, 255, 255))
    $g.FillEllipse($dotBrush, ($size - ($size * $edge)), ($size - ($size * $edge)), $dot, $dot)

    if ($path) { $path.Dispose() }
    $br.Dispose(); $accent.Dispose(); $halo.Dispose(); $ringPen.Dispose()
    $sf.Dispose(); $fmt.Dispose()
    $fDJ.Dispose(); $fW.Dispose(); $brDJ.Dispose(); $brW.Dispose(); $dotBrush.Dispose()
    $g.Dispose()

    $filePath = Join-Path $outDir $file
    $bmp.Save($filePath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Output ("OK  {0,-28} {1,5} KB" -f $file, [math]::Round((Get-Item -LiteralPath $filePath).Length / 1KB, 1))
}

Write-Output "Fuente: $fontName / $fontSmall"
New-Icon 192 'icon-192.png'           $false
New-Icon 512 'icon-512.png'           $false
New-Icon 512 'icon-maskable-512.png'  $true
New-Icon 180 'apple-touch-180.png'    $true
New-Icon 64  'favicon-64.png'         $false