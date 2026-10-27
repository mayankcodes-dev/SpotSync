#!/usr/bin/env pwsh
# =============================================================================
# SpotSync — OCI Always Free Deployment Orchestrator (PowerShell)
# Runs all 4 phases: Verify → Network → Compute → Provision
#
# Prerequisites (run ONCE before this script):
#   1. oci setup config    ← follow interactive prompts
#   2. Place this file anywhere, then: pwsh deploy_oci.ps1
# =============================================================================

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ─── Colour helpers ────────────────────────────────────────────────
function Info  { param($m) Write-Host "  $m" -ForegroundColor Cyan }
function OK    { param($m) Write-Host "  ✅ $m" -ForegroundColor Green }
function Warn  { param($m) Write-Host "  ⚠️  $m" -ForegroundColor Yellow }
function Die   { param($m) Write-Host "`n  ❌ $m`n" -ForegroundColor Red; exit 1 }
function Step  { param($n,$t) Write-Host "`n━━━ Phase $n — $t ━━━" -ForegroundColor Magenta }

# ─── Utility: run OCI CLI and return parsed JSON ───────────────────
function Oci {
    param([string[]]$Args)
    $out = & oci @Args 2>&1
    if ($LASTEXITCODE -ne 0) { Die "OCI CLI failed: $out" }
    return $out | ConvertFrom-Json
}

function OciRaw {
    param([string[]]$Args)
    $out = & oci @Args 2>&1
    if ($LASTEXITCODE -ne 0) { Die "OCI CLI failed: $out" }
    return ($out | Out-String).Trim()
}

# =============================================================================
# PHASE 1 — Verify CLI & gather base info
# =============================================================================
Step 1 "Verify OCI CLI & gather identifiers"

if (-not (Get-Command oci -ErrorAction SilentlyContinue)) {
    Die "OCI CLI not found. Run:  pip install oci-cli  then  oci setup config"
}
Info "OCI CLI found: $(oci --version 2>&1 | Select-Object -First 1)"

$configPath = "$env:USERPROFILE\.oci\config"
if (-not (Test-Path $configPath)) {
    Die ".oci/config not found. Run:  oci setup config"
}
OK "OCI config found at $configPath"

# Read tenancy OCID from config
$tenancy = (Get-Content $configPath | Where-Object { $_ -match '^tenancy=' } | Select-Object -First 1) -replace 'tenancy=',''
if (-not $tenancy) { Die "Cannot find tenancy= in $configPath" }
$COMPARTMENT_ID = $tenancy.Trim()
OK "Compartment (tenancy root): $COMPARTMENT_ID"

# Verify connectivity
Info "Verifying OCI connectivity..."
$null = OciRaw @('iam','region','list','--all','--output','table') 2>&1
OK "OCI API reachable."

# Availability Domain
$AD = OciRaw @('iam','availability-domain','list','--compartment-id',$COMPARTMENT_ID,'--query','data[0].name','--raw-output')
OK "Availability Domain: $AD"

# =============================================================================
# PHASE 2 — Provision VCN, IGW, Route Table, Security List, Subnet
# =============================================================================
Step 2 "Network infrastructure (VCN · IGW · Security List · Subnet)"

# ── VCN ──────────────────────────────────────────────────────────────
Info "Creating VCN 'spotsync-vcn'..."
$vcnJson = Oci @('network','vcn','create',
    '--compartment-id', $COMPARTMENT_ID,
    '--cidr-block',     '10.0.0.0/16',
    '--display-name',   'spotsync-vcn',
    '--dns-label',      'spotsyncvcn',
    '--wait-for-state', 'AVAILABLE')
$VCN_ID          = $vcnJson.data.id
$DEFAULT_RT_ID   = $vcnJson.data.'default-route-table-id'
$DEFAULT_SL_ID   = $vcnJson.data.'default-security-list-id'
$DEFAULT_DHCP_ID = $vcnJson.data.'default-dhcp-options-id'
OK "VCN created: $VCN_ID"

# ── Internet Gateway ─────────────────────────────────────────────────
Info "Creating Internet Gateway 'spotsync-igw'..."
$igwJson = Oci @('network','internet-gateway','create',
    '--compartment-id', $COMPARTMENT_ID,
    '--vcn-id',         $VCN_ID,
    '--is-enabled',     'true',
    '--display-name',   'spotsync-igw',
    '--wait-for-state', 'AVAILABLE')
$IGW_ID = $igwJson.data.id
OK "Internet Gateway: $IGW_ID"

# ── Default Route Table — add 0.0.0.0/0 → IGW ───────────────────────
Info "Updating default route table (0.0.0.0/0 → IGW)..."
$routeRules = @(
    @{ cidrBlock = '0.0.0.0/0'; networkEntityId = $IGW_ID }
) | ConvertTo-Json -Compress
$null = OciRaw @('network','route-table','update',
    '--rt-id',       $DEFAULT_RT_ID,
    '--route-rules', $routeRules,
    '--force',
    '--wait-for-state','AVAILABLE')
OK "Route table updated."

# ── Default Security List — allow 22, 80, 443, 3000 inbound ──────────
Info "Updating default security list (ports 22, 80, 443, 3000)..."
$ingressRules = @(
    @{ source='0.0.0.0/0'; protocol='6'; isStateless=$false;
       tcpOptions=@{ destinationPortRange=@{ min=22;  max=22  } } },
    @{ source='0.0.0.0/0'; protocol='6'; isStateless=$false;
       tcpOptions=@{ destinationPortRange=@{ min=80;  max=80  } } },
    @{ source='0.0.0.0/0'; protocol='6'; isStateless=$false;
       tcpOptions=@{ destinationPortRange=@{ min=443; max=443 } } },
    @{ source='0.0.0.0/0'; protocol='6'; isStateless=$false;
       tcpOptions=@{ destinationPortRange=@{ min=3000;max=3000} } },
    @{ source='0.0.0.0/0'; protocol='1'; isStateless=$false;
       icmpOptions=@{ type=3; code=4 } }   # ICMP type 3 code 4 (fragmentation needed)
) | ConvertTo-Json -Compress -Depth 6

$egressRules = @(
    @{ destination='0.0.0.0/0'; protocol='all'; isStateless=$false }
) | ConvertTo-Json -Compress

$null = OciRaw @('network','security-list','update',
    '--security-list-id', $DEFAULT_SL_ID,
    '--ingress-security-rules', $ingressRules,
    '--egress-security-rules',  $egressRules,
    '--force',
    '--wait-for-state','AVAILABLE')
OK "Security list updated (ports 22, 80, 443, 3000 open)."

# ── Public Subnet ────────────────────────────────────────────────────
Info "Creating public subnet 'spotsync-subnet'..."
$subnetJson = Oci @('network','subnet','create',
    '--compartment-id',         $COMPARTMENT_ID,
    '--vcn-id',                 $VCN_ID,
    '--cidr-block',             '10.0.0.0/24',
    '--display-name',           'spotsync-subnet',
    '--prohibit-public-ip-on-vnic', 'false',
    '--route-table-id',         $DEFAULT_RT_ID,
    '--security-list-ids',      "[$([char]34)$DEFAULT_SL_ID$([char]34)]",
    '--dhcp-options-id',        $DEFAULT_DHCP_ID,
    '--wait-for-state',         'AVAILABLE')
$SUBNET_ID = $subnetJson.data.id
OK "Subnet created: $SUBNET_ID"

# =============================================================================
# PHASE 3 — SSH Keys + Compute Instance
# =============================================================================
Step 3 "SSH key generation + Always Free compute instance"

# ── SSH Key ──────────────────────────────────────────────────────────
$sshKeyPath    = "$env:USERPROFILE\.ssh\oci_spotsync"
$sshPubKeyPath = "$sshKeyPath.pub"

if (-not (Test-Path $sshKeyPath)) {
    Info "Generating SSH key pair at $sshKeyPath..."
    New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.ssh" | Out-Null
    ssh-keygen -t ed25519 -f $sshKeyPath -N '""' 2>&1 | Out-Null
    OK "SSH key generated."
} else {
    OK "SSH key already exists at $sshKeyPath."
}

# ── Shape selection — try A1.Flex first, fall back to E2.1.Micro ────
$SHAPE        = 'VM.Standard.A1.Flex'
$SHAPE_CONFIG = '{"ocpus":1,"memoryInGBs":6}'
$SHAPE_TYPE   = 'a1flex'
$IMG_OS_VER   = 'Canonical Ubuntu'

Info "Querying latest Ubuntu 22.04 image for shape $SHAPE (aarch64)..."
$IMAGE_ID = OciRaw @('compute','image','list',
    '--compartment-id',   $COMPARTMENT_ID,
    '--operating-system', $IMG_OS_VER,
    '--operating-system-version', '22.04',
    '--shape',            $SHAPE,
    '--sort-by',          'TIMECREATED',
    '--sort-order',       'DESC',
    '--query',            'data[0].id',
    '--raw-output') 2>&1

if (-not $IMAGE_ID -or $IMAGE_ID -match '^$') {
    Warn "No aarch64 Ubuntu image found — falling back to E2.1.Micro (x86_64)"
    $SHAPE        = 'VM.Standard.E2.1.Micro'
    $SHAPE_CONFIG = ''
    $SHAPE_TYPE   = 'e2micro'
    $IMAGE_ID = OciRaw @('compute','image','list',
        '--compartment-id',   $COMPARTMENT_ID,
        '--operating-system', $IMG_OS_VER,
        '--operating-system-version', '22.04',
        '--shape',            $SHAPE,
        '--sort-by',          'TIMECREATED',
        '--sort-order',       'DESC',
        '--query',            'data[0].id',
        '--raw-output')
}
OK "Image ID: $IMAGE_ID"
OK "Shape: $SHAPE"

# ── Launch Instance ──────────────────────────────────────────────────
Info "Launching instance 'spotsync-free-vm' (this may take 3–5 min)..."
$launchArgs = @(
    'compute','instance','launch',
    '--availability-domain',  $AD,
    '--compartment-id',       $COMPARTMENT_ID,
    '--shape',                $SHAPE,
    '--subnet-id',            $SUBNET_ID,
    '--image-id',             $IMAGE_ID,
    '--assign-public-ip',     'true',
    '--display-name',         'spotsync-free-vm',
    '--ssh-authorized-keys-file', $sshPubKeyPath,
    '--wait-for-state',       'RUNNING'
)

if ($SHAPE_CONFIG) {
    $launchArgs += @('--shape-config', $SHAPE_CONFIG)
}

# Attempt A1.Flex; if capacity error, retry with E2.1.Micro
try {
    $instanceJson = Oci $launchArgs
} catch {
    if ($_ -match 'Out of host capacity' -or $_ -match 'InternalError') {
        Warn "A1.Flex capacity error — falling back to VM.Standard.E2.1.Micro..."
        $SHAPE      = 'VM.Standard.E2.1.Micro'
        $SHAPE_TYPE = 'e2micro'
        $IMAGE_ID = OciRaw @('compute','image','list',
            '--compartment-id',   $COMPARTMENT_ID,
            '--operating-system', $IMG_OS_VER,
            '--operating-system-version', '22.04',
            '--shape',            $SHAPE,
            '--sort-by',          'TIMECREATED',
            '--sort-order',       'DESC',
            '--query',            'data[0].id',
            '--raw-output')
        $launchArgs = @(
            'compute','instance','launch',
            '--availability-domain',  $AD,
            '--compartment-id',       $COMPARTMENT_ID,
            '--shape',                $SHAPE,
            '--subnet-id',            $SUBNET_ID,
            '--image-id',             $IMAGE_ID,
            '--assign-public-ip',     'true',
            '--display-name',         'spotsync-free-vm',
            '--ssh-authorized-keys-file', $sshPubKeyPath,
            '--wait-for-state',       'RUNNING'
        )
        $instanceJson = Oci $launchArgs
    } else {
        throw
    }
}

$INSTANCE_ID = $instanceJson.data.id
OK "Instance running: $INSTANCE_ID"

# ── Get Public IP ────────────────────────────────────────────────────
Info "Fetching public IP..."
$PUBLIC_IP = OciRaw @('compute','instance','list-vnics',
    '--instance-id', $INSTANCE_ID,
    '--query',       'data[0]."public-ip"',
    '--raw-output')
OK "Public IP: $PUBLIC_IP"

# =============================================================================
# PHASE 4 — Remote provisioning via SSH
# =============================================================================
Step 4 "Remote server provisioning & app deployment"

Info "Waiting for SSH to become available on $PUBLIC_IP..."
$maxAttempts = 30
for ($i = 1; $i -le $maxAttempts; $i++) {
    $result = ssh -i $sshKeyPath -o StrictHostKeyChecking=no -o ConnectTimeout=5 `
              "ubuntu@$PUBLIC_IP" "echo OK" 2>&1
    if ($result -match 'OK') { break }
    if ($i -eq $maxAttempts) { Die "SSH unreachable after $maxAttempts attempts. Check OCI console." }
    Info "  Attempt $i/$maxAttempts — retrying in 10s..."
    Start-Sleep 10
}
OK "SSH reachable."

# ── Copy provisioning script ─────────────────────────────────────────
$scriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$scriptName = 'provision_server.sh'
$localScript = Join-Path $scriptDir $scriptName

if (-not (Test-Path $localScript)) {
    Die "provision_server.sh not found at $localScript. Keep it in the same folder as this script."
}

Info "Uploading provision_server.sh..."
scp -i $sshKeyPath -o StrictHostKeyChecking=no $localScript "ubuntu@${PUBLIC_IP}:/home/ubuntu/provision_server.sh" 2>&1
OK "Script uploaded."

# ── Copy .env (look for it in the SpotSync project root) ────────────
$envCandidates = @(
    (Join-Path $scriptDir '..' '.env'),
    (Join-Path $scriptDir '.env')
)
$envFile = $envCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1

if ($envFile) {
    Info "Copying .env to server..."
    scp -i $sshKeyPath -o StrictHostKeyChecking=no $envFile "ubuntu@${PUBLIC_IP}:/home/ubuntu/spotsync.env" 2>&1
    OK ".env copied. (will be moved to /home/ubuntu/SpotSync/.env by the script)"
    # Pre-place the env so provision script skips the prompt
    ssh -i $sshKeyPath -o StrictHostKeyChecking=no "ubuntu@$PUBLIC_IP" `
        "mkdir -p /home/ubuntu/SpotSync && mv /home/ubuntu/spotsync.env /home/ubuntu/SpotSync/.env"
} else {
    Warn "No local .env found. After provisioning, run:"
    Warn "  scp -i $sshKeyPath .env ubuntu@${PUBLIC_IP}:/home/ubuntu/SpotSync/.env"
    Warn "  then:  ssh -i $sshKeyPath ubuntu@$PUBLIC_IP 'pm2 restart spotsync'"
}

# ── Execute provisioning script on the server ─────────────────────
Info "Running provision_server.sh on the server (this takes ~5–8 min)..."
ssh -i $sshKeyPath -o StrictHostKeyChecking=no -t "ubuntu@$PUBLIC_IP" `
    "chmod +x /home/ubuntu/provision_server.sh && bash /home/ubuntu/provision_server.sh $SHAPE_TYPE"

# =============================================================================
# Summary
# =============================================================================
Write-Host ""
Write-Host "══════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  🎉  SpotSync is LIVE on Oracle Cloud!"       -ForegroundColor Green
Write-Host "══════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "  Live URL   : http://$PUBLIC_IP"              -ForegroundColor White
Write-Host "  Shape      : $SHAPE"                         -ForegroundColor White
Write-Host "  Instance   : $INSTANCE_ID"                   -ForegroundColor White
Write-Host ""
Write-Host "  SSH access : ssh -i $sshKeyPath ubuntu@$PUBLIC_IP" -ForegroundColor White
Write-Host "  PM2 logs   : ssh -i $sshKeyPath ubuntu@$PUBLIC_IP 'pm2 logs spotsync'" -ForegroundColor White
Write-Host ""
Write-Host "  Next: point a domain at $PUBLIC_IP and add free HTTPS:" -ForegroundColor Yellow
Write-Host "    sudo apt install certbot python3-certbot-nginx"    -ForegroundColor Gray
Write-Host "    sudo certbot --nginx -d yourdomain.com"            -ForegroundColor Gray
Write-Host ""

# Verify HTTP 200
try {
    $resp = Invoke-WebRequest "http://$PUBLIC_IP" -UseBasicParsing -TimeoutSec 15
    OK "HTTP Status: $($resp.StatusCode) — app is responding!"
} catch {
    Warn "Could not reach http://$PUBLIC_IP yet. App may still be starting."
    Warn "Check: ssh -i $sshKeyPath ubuntu@$PUBLIC_IP 'pm2 logs spotsync'"
}
