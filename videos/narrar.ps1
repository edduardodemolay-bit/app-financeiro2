# Grava a narração de cada cena com a voz "Maria" do Windows e anota a duração de cada uma.
# Uso: powershell -File ferramentas\narrar.ps1
$ErrorActionPreference = 'Stop'
$raiz = Split-Path $PSScriptRoot -Parent
$roteiros = Get-Content (Join-Path $PSScriptRoot 'roteiros.json') -Raw -Encoding UTF8 | ConvertFrom-Json
Add-Type -AssemblyName System.Speech
$voz = New-Object System.Speech.Synthesis.SpeechSynthesizer
$voz.SelectVoice('Microsoft Maria Desktop')
$voz.Rate = 0
$duracoes = @{}
foreach ($video in 'apresentacao', 'tutorial') {
  $pasta = Join-Path $raiz "assets\voz\$video"
  New-Item -ItemType Directory -Force $pasta | Out-Null
  $voz.Rate = if ($video -eq 'apresentacao') { 1 } else { 0 }
  foreach ($cena in $roteiros.$video) {
    $wav = Join-Path $pasta ($cena.id + '.wav')
    $voz.SetOutputToWaveFile($wav)
    $voz.Speak($cena.fala)
    $voz.SetOutputToNull()
    $seg = [double](& ffprobe -v error -show_entries format=duration -of csv=p=0 $wav)
    $duracoes["$video/$($cena.id)"] = [Math]::Round($seg, 2)
  }
}
$voz.Dispose()
$duracoes | ConvertTo-Json | Out-File (Join-Path $PSScriptRoot 'duracoes.json') -Encoding utf8
$duracoes.GetEnumerator() | Sort-Object Name | ForEach-Object { "$($_.Name) = $($_.Value)s" }
