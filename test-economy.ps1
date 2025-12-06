# Economy System Test Script
# Tests Energy and Diamond endpoints

$baseUrl = "http://localhost:3000"
$userId = 1

Write-Host "=== QUIZ APP ECONOMY SYSTEM TEST ===" -ForegroundColor Cyan
Write-Host ""

# Test 1: Get Energy Status
Write-Host "Test 1: Get Energy Status" -ForegroundColor Yellow
$response = Invoke-RestMethod -Uri "$baseUrl/energy" -Method Get
Write-Host "Energy: $($response.energy)/$($response.maxEnergy)" -ForegroundColor Green
Write-Host "Next Refill: $($response.nextRefillAt)" -ForegroundColor Green
Write-Host ""

# Test 2: Get Diamond Balance
Write-Host "Test 2: Get Diamond Balance" -ForegroundColor Yellow
$response = Invoke-RestMethod -Uri "$baseUrl/diamonds/balance" -Method Get
Write-Host "Diamonds: $($response.diamonds)" -ForegroundColor Green
Write-Host ""

# Test 3: Purchase Diamonds
Write-Host "Test 3: Purchase Diamonds (100)" -ForegroundColor Yellow
$body = @{
    amount = 100
    receiptId = "test_receipt_$(Get-Date -Format 'yyyyMMddHHmmss')"
    provider = "test"
    idempotencyKey = "test_purchase_$(Get-Date -Format 'yyyyMMddHHmmss')"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/diamonds/purchase" -Method Post -Body $body -ContentType "application/json"
    Write-Host "New Diamond Balance: $($response.diamonds)" -ForegroundColor Green
    Write-Host "Transaction ID: $($response.transactionId)" -ForegroundColor Green
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 4: Get Energy Pricing
Write-Host "Test 4: Get Energy Pricing" -ForegroundColor Yellow
$response = Invoke-RestMethod -Uri "$baseUrl/energy/pricing" -Method Get
Write-Host "Cost per Energy: $($response.costPerEnergy) diamonds" -ForegroundColor Green
Write-Host "Refill Rate: $($response.refillRate) minutes" -ForegroundColor Green
Write-Host ""

# Test 5: Refill Energy with Diamonds
Write-Host "Test 5: Refill Energy with Diamonds (5 energy)" -ForegroundColor Yellow
$body = @{
    amount = 5
    idempotencyKey = "test_refill_$(Get-Date -Format 'yyyyMMddHHmmss')"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/energy/refill" -Method Post -Body $body -ContentType "application/json"
    Write-Host "New Energy: $($response.energy)/$($response.maxEnergy)" -ForegroundColor Green
    Write-Host "Diamonds Spent: $($response.diamondsSpent)" -ForegroundColor Green
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 6: Consume Energy
Write-Host "Test 6: Consume Energy (1 energy for quiz)" -ForegroundColor Yellow
$body = @{
    amount = 1
    reason = "quiz_play"
    metadata = @{
        quizId = 1
    }
    idempotencyKey = "test_consume_$(Get-Date -Format 'yyyyMMddHHmmss')"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/energy/consume" -Method Post -Body $body -ContentType "application/json"
    Write-Host "New Energy: $($response.energy)/$($response.maxEnergy)" -ForegroundColor Green
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 7: Get Energy Transaction History
Write-Host "Test 7: Get Energy Transaction History (last 5)" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/energy/transactions?limit=5&offset=0" -Method Get
    Write-Host "Found $($response.Count) transactions:" -ForegroundColor Green
    foreach ($tx in $response) {
        Write-Host "  - $($tx.type): $($tx.amount) ($($tx.balanceBefore) -> $($tx.balanceAfter))" -ForegroundColor Gray
    }
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 8: Get Diamond Transaction History
Write-Host "Test 8: Get Diamond Transaction History (last 5)" -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/diamonds/transactions?limit=5&offset=0" -Method Get
    Write-Host "Found $($response.Count) transactions:" -ForegroundColor Green
    foreach ($tx in $response) {
        Write-Host "  - $($tx.type): $($tx.amount) ($($tx.balanceBefore) -> $($tx.balanceAfter))" -ForegroundColor Gray
    }
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 9: Final Status Check
Write-Host "Test 9: Final Status Check" -ForegroundColor Yellow
$energy = Invoke-RestMethod -Uri "$baseUrl/energy" -Method Get
$diamonds = Invoke-RestMethod -Uri "$baseUrl/diamonds/balance" -Method Get
Write-Host "Final Energy: $($energy.energy)/$($energy.maxEnergy)" -ForegroundColor Green
Write-Host "Final Diamonds: $($diamonds.diamonds)" -ForegroundColor Green
Write-Host ""

Write-Host "=== TEST COMPLETE ===" -ForegroundColor Cyan
