param([string]$Puerto, [switch]$EnSegundoPlano)

$ErrorActionPreference = 'Stop'
$config = Get-Content -LiteralPath (Join-Path $PSScriptRoot '.env')
if (-not $Puerto) {
    $registroPuerto = $config | Where-Object { $_ -match '^NANO_PORT=COM\d+$' } | Select-Object -First 1
    if ($registroPuerto) { $Puerto = ($registroPuerto -split '=', 2)[1] }
}
$registroToken = $config | Where-Object { $_ -match '^NANO_BRIDGE_TOKEN=[0-9a-f]{64}$' } | Select-Object -First 1
if ($Puerto -notmatch '^COM\d+$' -or -not $registroToken) {
    throw 'Configura NANO_PORT y NANO_BRIDGE_TOKEN en .env antes de iniciar el puente.'
}

if ($EnSegundoPlano) {
    $powershell = (Get-Process -Id $PID).Path
    Start-Process -FilePath $powershell -WindowStyle Hidden -ArgumentList @(
        '-NoProfile', '-File', ('"{0}"' -f $PSCommandPath), '-Puerto', $Puerto
    )
    return
}

$headers = @{ 'X-Nano-Token' = ($registroToken -split '=', 2)[1] }
$url = 'http://127.0.0.1:8000/api/hardware/puente'
$mutex = [Threading.Mutex]::new($false, "Local\SmartCoolingNano-$Puerto")
if (-not $mutex.WaitOne(0)) {
    $mutex.Dispose()
    return
}

try {
    while ($true) {
        $serial = [IO.Ports.SerialPort]::new($Puerto, 9600)
        try {
            $serial.WriteTimeout = 500
            $serial.Open()
            Write-Output "Nano conectado en $Puerto."
            $fragmento = ''
            $aviso = $false

            while ($true) {
                $fragmento += $serial.ReadExisting()
                $lineas = $fragmento -split "`n"
                $fragmento = $lineas[-1]
                if ($fragmento.Length -gt 512) { $fragmento = '' }
                $intercambio = @{}
                for ($i = 0; $i -lt $lineas.Count - 1; $i++) {
                    $linea = $lineas[$i].Trim()
                    if ($linea -match '^DATA,[^,]+,[^,]+,[^,]+,([01]),[01],AIR,(\d+),([012]),([01]),([01])(?:,([01]))?$') {
                        $intercambio.telemetria = @{
                            ventilador = [bool][int]$Matches[1]
                            angulo = [int]$Matches[2]
                            direccion = [int]$Matches[3]
                            manual = [bool][int]$Matches[4]
                            proteccion = [bool][int]$Matches[5]
                            servo_activo = $Matches[6] -ne '0'
                        }
                    } elseif ($linea -match '^ACK,([0-9a-f]{12}),([01]),(\d+),([01]),([01])(?:,([01]))?$') {
                        $intercambio.ack = @{
                            id = $Matches[1]
                            ventilador = [bool][int]$Matches[2]
                            angulo_objetivo = [int]$Matches[3]
                            manual = [bool][int]$Matches[4]
                            proteccion = [bool][int]$Matches[5]
                            servo_activo = $Matches[6] -ne '0'
                        }
                    }
                }

                try {
                    $respuesta = Invoke-RestMethod $url -NoProxy -Method Post -Headers $headers -TimeoutSec 2 `
                        -ContentType 'application/json' -Body ($intercambio | ConvertTo-Json -Depth 4 -Compress)
                    $aviso = $false
                } catch {
                    if (-not $aviso) { Write-Warning 'Esperando a la API local del Nano.' }
                    $aviso = $true
                    Start-Sleep -Milliseconds 800
                    continue
                }

                $orden = $respuesta.orden
                if ($orden -and $orden.id -match '^[0-9a-f]{12}$') {
                    if ($orden.modo -eq 'manual') {
                        $trama = 'CMD,{0},MANUAL,{1},{2}' -f $orden.id, [int]$orden.ventilador, $orden.angulo
                    } elseif ($orden.modo -eq 'pausa') {
                        $trama = "CMD,$($orden.id),PAUSA"
                    } else {
                        $trama = "CMD,$($orden.id),AUTO"
                    }
                    $serial.WriteLine($trama)
                }
                Start-Sleep -Milliseconds 350
            }
        } catch {
            Write-Warning "Puerto $Puerto temporalmente no disponible. Reintentando."
            Start-Sleep -Seconds 2
        } finally {
            $serial.Dispose()
        }
    }
} finally {
    $mutex.ReleaseMutex()
    $mutex.Dispose()
}
