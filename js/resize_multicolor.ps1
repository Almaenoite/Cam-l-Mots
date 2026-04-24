Add-Type -AssemblyName System.Drawing
$source = 'C:\Users\Alma\.gemini\antigravity\brain\37918699-d08c-4ed6-942e-c24940072ee7\camelemots_multicolor_logo_1777041746359.png'
$targetDir = 'C:\Users\Alma\Documents\Lecture par syllabes\CaméléMots\icons'

function Resize-Image($size, $name) {
    $img = [System.Drawing.Image]::FromFile($source)
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.DrawImage($img, 0, 0, $size, $size)
    $bmp.Save("$targetDir\$name", [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    $img.Dispose()
}

Resize-Image 128 'icon128.png'
Resize-Image 48 'icon48.png'
Resize-Image 16 'icon16.png'
