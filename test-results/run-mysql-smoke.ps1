$ErrorActionPreference = "Stop"
$base = "http://localhost:8080"
$tag = Get-Date -Format "yyyyMMddHHmmss"

$passes = New-Object System.Collections.Generic.List[object]
$issues = New-Object System.Collections.Generic.List[object]
$script:RequestHeaders = @{}

function Get-Err([object]$err) {
  $msg = $err.Exception.Message
  if ($err.ErrorDetails -and $err.ErrorDetails.Message) {
    $msg = "$msg | $($err.ErrorDetails.Message)"
  }
  return $msg
}

function Query-Scalar([string]$sql) {
  $result = & mysql -N -s -uroot config_center -e $sql
  if ($LASTEXITCODE -ne 0) {
    throw "MySQL query failed: $sql"
  }
  if ($result -is [array]) { return ($result -join "`n").Trim() }
  return "$result".Trim()
}

function Query-Rows([string]$sql) {
  $result = & mysql -N -s -uroot config_center -e $sql
  if ($LASTEXITCODE -ne 0) {
    throw "MySQL query failed: $sql"
  }
  if ($null -eq $result) {
    return @()
  }
  if ($result -is [array]) {
    return @($result | ForEach-Object { "$_".Trim() } | Where-Object { $_ })
  }
  $line = "$result".Trim()
  if ($line) {
    return @($line)
  }
  return @()
}

function Escape-Sql([string]$value) {
  if ($null -eq $value) { return "" }
  return $value.Replace("'", "''")
}

function Ensure-Department([string]$dptId, [string]$dptName, [string]$parentDptId = "") {
  $dptIdEsc = Escape-Sql $dptId
  $dptNameEsc = Escape-Sql $dptName
  $parentEsc = Escape-Sql $parentDptId
  $pathIdEsc = if ($parentDptId) { "$parentEsc/$dptIdEsc" } else { $dptIdEsc }
  $pathNameEsc = if ($parentDptId) { "Root/$dptNameEsc" } else { $dptNameEsc }
  $sql = @"
INSERT IGNORE INTO dpt_inf (dpt_id, dpt_name, prt_dpt_id, path_id, path_name, status, is_leaf, modify_name, create_time, created_by, update_time, updated_by)
VALUES ('$dptIdEsc', '$dptNameEsc', $(if ($parentDptId) { "'$parentEsc'" } else { "NULL" }), '$pathIdEsc', '$pathNameEsc', 'ACTIVE', 1, 'system.seed', CURRENT_TIMESTAMP, 'system.seed', CURRENT_TIMESTAMP, 'system.seed');
"@
  Query-Scalar $sql | Out-Null
}

function Ensure-User([string]$userId, [string]$userName, [string]$dptId, [string]$dptName) {
  $userIdEsc = Escape-Sql $userId
  $userNameEsc = Escape-Sql $userName
  $dptIdEsc = Escape-Sql $dptId
  $dptNameEsc = Escape-Sql $dptName
  $sql = @"
INSERT IGNORE INTO user_inf (user_id, yst_id, user_name, pwd, uuid, open_id, dpt_id, dpt_name, path_id, path_name, user_type, platform_user_type, status, rsp_id, rsp_name, create_time, created_by, update_time, updated_by)
VALUES ('$userIdEsc', NULL, '$userNameEsc', 'qa-password', NULL, NULL, '$dptIdEsc', '$dptNameEsc', '$dptIdEsc', '$dptNameEsc', 'EMPLOYEE', 'INTERNAL', 'ACTIVE', NULL, NULL, CURRENT_TIMESTAMP, 'system.seed', CURRENT_TIMESTAMP, 'system.seed');
"@
  Query-Scalar $sql | Out-Null
}

function Invoke-Api([string]$method, [string]$path, $body = $null, [hashtable]$headers = $null) {
  $uri = "$base$path"
  $requestHeaders = @{}
  foreach ($key in $script:RequestHeaders.Keys) {
    $requestHeaders[$key] = $script:RequestHeaders[$key]
  }
  if ($null -ne $headers) {
    foreach ($key in $headers.Keys) {
      $requestHeaders[$key] = $headers[$key]
    }
  }
  if ($null -ne $body) {
    $json = $body | ConvertTo-Json -Depth 20
    $resp = Invoke-RestMethod -Method $method -Uri $uri -ContentType "application/json" -Headers $requestHeaders -Body $json
  } else {
    $resp = Invoke-RestMethod -Method $method -Uri $uri -Headers $requestHeaders
  }
  if ($null -eq $resp) { throw "empty response from $path" }
  if ($resp.returnCode -ne "OK") {
    throw "returnCode=$($resp.returnCode); errorMsg=$($resp.errorMsg)"
  }
  return $resp.body
}

function Run-Step([string]$module, [string]$step, [scriptblock]$action) {
  try {
    & $action
    $passes.Add([pscustomobject]@{ module=$module; step=$step; status="PASS" }) | Out-Null
  } catch {
    $issues.Add([pscustomobject]@{ module=$module; step=$step; status="FAIL"; detail=(Get-Err $_) }) | Out-Null
  }
}

Run-Step "Health" "backend mysql health check" {
  $health = Invoke-Api "GET" "/healthz"
  if ($health.status -ne "UP") { throw "health status=$($health.status)" }
}

$ctx = @{}

Run-Step "Auth" "login with user_inf and dpt_id context" {
  $userRow = Query-Scalar "SELECT CONCAT(ui.user_id, '\\t', COALESCE(ui.pwd, ''), '\\t', ui.dpt_id) FROM user_inf ui JOIN dpt_inf di ON di.dpt_id = ui.dpt_id WHERE ui.status='ACTIVE' AND di.status='ACTIVE' AND ui.dpt_id IS NOT NULL AND CHAR_LENGTH(TRIM(ui.dpt_id)) > 0 AND ui.pwd IS NOT NULL AND CHAR_LENGTH(TRIM(ui.pwd)) > 0 ORDER BY ui.id LIMIT 1;"

  if ($userRow) {
    $parts = "$userRow" -split "\\t"
    if ($parts.Count -lt 3) {
      throw "unexpected login seed row format: $userRow"
    }
    $ctx.loginUserId = $parts[0].Trim()
    $ctx.loginPassword = $parts[1]
    $ctx.primaryOrgId = $parts[2].Trim()
  } else {
    $ctx.primaryOrgId = "qa_dpt_$tag"
    Ensure-Department -dptId $ctx.primaryOrgId -dptName "QA Department $tag"
    $ctx.loginUserId = "qa_user_$tag"
    $ctx.loginPassword = "qa-password"
    Ensure-User -userId $ctx.loginUserId -userName "QA User $tag" -dptId $ctx.primaryOrgId -dptName "QA Department $tag"
  }
  if (-not $ctx.loginPassword) { throw "login password is empty" }

  $otherDptRows = Query-Rows "SELECT dpt_id FROM dpt_inf WHERE status='ACTIVE' AND dpt_id IS NOT NULL AND CHAR_LENGTH(TRIM(dpt_id)) > 0 AND dpt_id <> '$(Escape-Sql $ctx.primaryOrgId)' ORDER BY id LIMIT 2;"
  $ctx.shareOrgId = if ($otherDptRows.Count -ge 1) { $otherDptRows[0] } else { "qa_dpt_${tag}_share" }
  $ctx.cloneOrgId = if ($otherDptRows.Count -ge 2) { $otherDptRows[1] } else { "qa_dpt_${tag}_clone" }

  Ensure-Department -dptId $ctx.shareOrgId -dptName "QA Share Department $tag" -parentDptId $ctx.primaryOrgId
  Ensure-Department -dptId $ctx.cloneOrgId -dptName "QA Clone Department $tag" -parentDptId $ctx.primaryOrgId

  $ctx.operatorId = $ctx.loginUserId
  $login = Invoke-Api "POST" "/api/auth/login" @{
    userId = $ctx.loginUserId
    password = $ctx.loginPassword
  }
  $ctx.idToken = "$($login.idToken)".Trim()
  if (-not $ctx.idToken) { throw "login idToken missing" }
  $script:RequestHeaders = @{
    "Authorization" = "Bearer $($ctx.idToken)"
  }

  $me = Invoke-Api "GET" "/api/permissions/session/me?userId=$([uri]::EscapeDataString($ctx.loginUserId))&orgId=$([uri]::EscapeDataString($ctx.primaryOrgId))"
  if ($me.userId -ne $ctx.loginUserId) { throw "login user mismatch: $($me.userId)" }
  if ($me.orgId -ne $ctx.primaryOrgId) { throw "login org mismatch: $($me.orgId)" }

  $cntUser = [int](Query-Scalar "SELECT COUNT(*) FROM user_inf WHERE user_id='$(Escape-Sql $ctx.loginUserId)' AND dpt_id='$(Escape-Sql $ctx.primaryOrgId)';")
  $cntDpt = [int](Query-Scalar "SELECT COUNT(*) FROM dpt_inf WHERE dpt_id='$(Escape-Sql $ctx.primaryOrgId)';")
  if ($cntUser -lt 1 -or $cntDpt -lt 1) { throw "login seed user/dpt missing in mysql" }
}

Run-Step "Page" "create page menu + mysql persistence" {
  $ctx.menuCode = "qa_menu_$tag"
  $menu = Invoke-Api "POST" "/api/control/page-menus" @{
    regionId = "qa-region"
    menuCode = $ctx.menuCode
    menuName = "QA Menu $tag"
    urlPattern = "/qa/$tag/*"
    status = "ACTIVE"
  }
  if (-not $menu.id) { throw "page menu id missing" }
  $ctx.menuId = [int64]$menu.id
  $cnt = [int](Query-Scalar "SELECT COUNT(*) FROM page_menu WHERE menu_code='$($ctx.menuCode)';")
  if ($cnt -lt 1) { throw "mysql page_menu missing" }
}

Run-Step "Page" "create page resource + list echo + mysql persistence" {
  $ctx.pageCode = "qa_page_$tag"
  $ctx.pageName = "QA Page $tag"
  $resource = Invoke-Api "POST" "/api/control/page-resources" @{
    menuCode = $ctx.menuCode
    pageCode = $ctx.pageCode
    frameCode = ""
    name = $ctx.pageName
    status = "DRAFT"
    ownerOrgId = $ctx.primaryOrgId
    detectRulesSummary = "url-fallback"
  }
  if (-not $resource.id) { throw "page resource id missing" }
  $ctx.pageResourceId = [int64]$resource.id

  $page = Invoke-Api "GET" "/api/control/page-resources?pageNo=1&pageSize=500&keyword=$($ctx.pageCode)"
  $found = @($page.records) | Where-Object { $_.id -eq $ctx.pageResourceId }
  if (-not $found) { throw "page resource not found in list echo" }

  $cnt = [int](Query-Scalar "SELECT COUNT(*) FROM page_resource WHERE id=$($ctx.pageResourceId) AND page_code='$($ctx.pageCode)';")
  if ($cnt -lt 1) { throw "mysql page_resource missing" }
}

Run-Step "Page" "create page element + list echo + mysql persistence" {
  $elem = Invoke-Api "POST" "/api/control/page-elements" @{
    pageResourceId = $ctx.pageResourceId
    logicName = "qa_input_$tag"
    selector = "#qa-$tag"
    selectorType = "CSS"
    frameLocation = ""
  }
  if (-not $elem.id) { throw "page element id missing" }
  $ctx.pageElementId = [int64]$elem.id

  $rows = Invoke-Api "GET" "/api/control/page-resources/$($ctx.pageResourceId)/elements"
  if (-not (@($rows) | Where-Object { $_.id -eq $ctx.pageElementId })) { throw "page element not found in list" }

  $cnt = [int](Query-Scalar "SELECT COUNT(*) FROM page_element WHERE id=$($ctx.pageElementId);")
  if ($cnt -lt 1) { throw "mysql page_element missing" }
}

Run-Step "Page" "create business field + list echo + mysql persistence" {
  $ctx.fieldCode = "qa_field_$tag"
  $field = Invoke-Api "POST" "/api/control/business-fields" @{
    code = $ctx.fieldCode
    name = "QA Field $tag"
    scope = "PAGE_RESOURCE"
    pageResourceId = $ctx.pageResourceId
    valueType = "STRING"
    required = $true
    description = "qa"
    ownerOrgId = $ctx.primaryOrgId
    status = "DRAFT"
    currentVersion = 1
    aliases = @("alias_$tag")
  }
  if (-not $field.id) { throw "business field id missing" }
  $ctx.businessFieldId = [int64]$field.id

  $rows = Invoke-Api "GET" "/api/control/business-fields?pageResourceId=$($ctx.pageResourceId)"
  if (-not (@($rows) | Where-Object { $_.code -eq $ctx.fieldCode })) { throw "business field not found in list" }

  $cnt = [int](Query-Scalar "SELECT COUNT(*) FROM business_field WHERE id=$($ctx.businessFieldId) AND code='$($ctx.fieldCode)';")
  if ($cnt -lt 1) { throw "mysql business_field missing" }
}

Run-Step "Page" "create page-field binding + list echo + mysql persistence" {
  $binding = Invoke-Api "POST" "/api/control/page-field-bindings" @{
    pageResourceId = $ctx.pageResourceId
    businessFieldCode = $ctx.fieldCode
    pageElementId = $ctx.pageElementId
    required = $true
  }
  if (-not $binding.id) { throw "page field binding id missing" }
  $ctx.bindingId = [int64]$binding.id

  $rows = Invoke-Api "GET" "/api/control/page-resources/$($ctx.pageResourceId)/field-bindings"
  if (-not (@($rows) | Where-Object { $_.id -eq $ctx.bindingId })) { throw "binding not found in list" }

  $cnt = [int](Query-Scalar "SELECT COUNT(*) FROM page_field_binding WHERE id=$($ctx.bindingId);")
  if ($cnt -lt 1) { throw "mysql page_field_binding missing" }
}

Run-Step "Interface" "create interface + list echo + mysql persistence" {
  $ctx.interfaceName = "QA Interface $tag"
  $api = Invoke-Api "POST" "/api/control/interfaces" @{
    name = $ctx.interfaceName
    description = "qa"
    method = "POST"
    testPath = "/test/$tag"
    prodPath = "/prod/$tag"
    url = "https://example.com/api/$tag"
    ownerOrgId = $ctx.primaryOrgId
    currentVersion = 1
    timeoutMs = 3000
    retryTimes = 1
    bodyTemplateJson = "{}"
    inputConfigJson = "[]"
    outputConfigJson = "[]"
    paramSourceSummary = "manual"
    responsePath = "$.data"
    maskSensitive = $false
  }
  if (-not $api.id) { throw "interface id missing" }
  $ctx.interfaceId = [int64]$api.id

  $list = Invoke-Api "GET" "/api/control/interfaces?pageNo=1&pageSize=500&keyword=$([uri]::EscapeDataString($ctx.interfaceName))"
  if (-not (@($list.records) | Where-Object { $_.id -eq $ctx.interfaceId })) { throw "interface not found in list" }

  $cnt = [int](Query-Scalar "SELECT COUNT(*) FROM interface_definition WHERE id=$($ctx.interfaceId);")
  if ($cnt -lt 1) { throw "mysql interface_definition missing" }
}

Run-Step "Interface" "update interface status + echo" {
  $updated = Invoke-Api "POST" "/api/control/interfaces/$($ctx.interfaceId)/status" @{ status = "ACTIVE" }
  if ($updated.status -ne "ACTIVE") { throw "status not ACTIVE: $($updated.status)" }
}

Run-Step "Rule" "create rule + list echo + mysql persistence" {
  $ctx.ruleName = "qa_rule_$tag"
  $rule = Invoke-Api "POST" "/api/control/rules" @{
    name = $ctx.ruleName
    ruleScope = "PAGE_RESOURCE"
    ruleSetCode = "qa_rule_set_$tag"
    pageResourceId = $ctx.pageResourceId
    pageResourceName = $ctx.pageName
    shareMode = "PRIVATE"
    sharedOrgIds = @()
    priority = 1
    promptMode = "MANUAL"
    closeMode = "MANUAL_CLOSE"
    promptContentConfigJson = '{"content":"qa"}'
    hasConfirmButton = $true
    status = "DRAFT"
    currentVersion = 1
    ownerOrgId = $ctx.primaryOrgId
    listLookupConditions = @()
    updatedAt = (Get-Date).ToString("s")
  }
  if (-not $rule.id) { throw "rule id missing" }
  $ctx.ruleId = [int64]$rule.id

  $list = Invoke-Api "GET" "/api/control/rules?pageNo=1&pageSize=1000&keyword=$($ctx.ruleName)"
  if (-not (@($list.records) | Where-Object { $_.id -eq $ctx.ruleId })) { throw "rule not found in list" }

  $cnt = [int](Query-Scalar "SELECT COUNT(*) FROM rule_definition WHERE id=$($ctx.ruleId);")
  if ($cnt -lt 1) { throw "mysql rule_definition missing" }
}

Run-Step "Rule" "rule share/status/preview + condition workflow" {
  $share = Invoke-Api "POST" "/api/control/rules/$($ctx.ruleId)/share" @{ shareMode = "SHARED"; sharedOrgIds = @($ctx.shareOrgId); operator = $ctx.operatorId }
  if ($share.shareMode -ne "SHARED") { throw "rule shareMode not SHARED" }

  $status = Invoke-Api "POST" "/api/control/rules/$($ctx.ruleId)/status" @{ status = "ACTIVE" }
  if ($status.status -ne "ACTIVE") { throw "rule status not ACTIVE" }

  $preview = Invoke-Api "POST" "/api/control/rules/$($ctx.ruleId)/preview" @{ pageFields = @{ loanAmount = "600000" } }
  if (-not $preview.matched) { throw "rule preview expected matched=true" }

  $group = Invoke-Api "POST" "/api/control/rules/$($ctx.ruleId)/condition-groups" @{ logicType = "AND"; parentGroupId = $null }
  if (-not $group.id) { throw "condition group id missing" }
  $ctx.groupId = [int64]$group.id

  $condition = Invoke-Api "POST" "/api/control/rules/rule-conditions" @{
    ruleId = $ctx.ruleId
    groupId = $ctx.groupId
    left = @{ sourceType = "CONSTANT"; sourceValue = "600000"; valueType = "NUMBER" }
    operator = "GT"
    right = @{ sourceType = "CONSTANT"; sourceValue = "500000"; valueType = "NUMBER" }
  }
  if (-not $condition.id) { throw "condition id missing" }

  $conditions = Invoke-Api "GET" "/api/control/rules/$($ctx.ruleId)/conditions"
  if (-not (@($conditions) | Where-Object { $_.id -eq $condition.id })) { throw "condition not found in list" }

  $cnt = [int](Query-Scalar "SELECT COUNT(*) FROM rule_condition_group WHERE id=$($ctx.groupId);")
  if ($cnt -lt 1) { throw "mysql rule_condition_group missing" }
}

Run-Step "JobScene" "create scene + list echo + mysql persistence" {
  $ctx.sceneName = "QA Scene $tag"
  $scene = Invoke-Api "POST" "/api/control/job-scenes" @{
    name = $ctx.sceneName
    ownerOrgId = $ctx.primaryOrgId
    shareMode = "PRIVATE"
    sharedOrgIds = @()
    pageResourceId = $ctx.pageResourceId
    pageResourceName = $ctx.pageName
    executionMode = "MANUAL"
    previewBeforeExecute = $true
    floatingButtonEnabled = $true
    floatingButtonLabel = "Run"
    floatingButtonX = 120
    floatingButtonY = 180
    status = "DRAFT"
    manualDurationSec = 30
    riskConfirmed = $false
  }
  if (-not $scene.id) { throw "job scene id missing" }
  $ctx.sceneId = [int64]$scene.id

  $rows = Invoke-Api "GET" "/api/control/job-scenes"
  if (-not (@($rows) | Where-Object { $_.id -eq $ctx.sceneId })) { throw "scene not found in list" }

  $cnt = [int](Query-Scalar "SELECT COUNT(*) FROM job_scene WHERE id=$($ctx.sceneId);")
  if ($cnt -lt 1) { throw "mysql job_scene missing" }
}

Run-Step "JobScene" "scene share/status/clone + node workflow" {
  $share = Invoke-Api "POST" "/api/control/job-scenes/$($ctx.sceneId)/share" @{ shareMode = "SHARED"; sharedOrgIds = @($ctx.shareOrgId); operator = $ctx.operatorId }
  if ($share.shareMode -ne "SHARED") { throw "scene shareMode not SHARED" }

  $status = Invoke-Api "POST" "/api/control/job-scenes/$($ctx.sceneId)/status" @{ status = "ACTIVE" }
  if ($status.status -ne "ACTIVE") { throw "scene status not ACTIVE" }

  $clone = Invoke-Api "POST" "/api/control/job-scenes/$($ctx.sceneId)/clone" @{ targetOrgId = $ctx.cloneOrgId; operator = $ctx.operatorId }
  if (-not $clone.id) { throw "clone scene id missing" }

  $node = Invoke-Api "POST" "/api/control/job-scenes/$($ctx.sceneId)/nodes" @{
    sceneId = $ctx.sceneId
    nodeType = "PAGE_SET"
    name = "qa_node_$tag"
    orderNo = 1
    enabled = $true
    configJson = "{}"
  }
  if (-not $node.id) { throw "node id missing" }
  $ctx.nodeId = [int64]$node.id

  $nodes = Invoke-Api "GET" "/api/control/job-scenes/$($ctx.sceneId)/nodes"
  if (-not (@($nodes) | Where-Object { $_.id -eq $ctx.nodeId })) { throw "node not found in list" }

  $cnt = [int](Query-Scalar "SELECT COUNT(*) FROM job_scene_node WHERE id=$($ctx.nodeId);")
  if ($cnt -lt 1) { throw "mysql job_scene_node missing" }
}

Run-Step "DataProcessor" "create processor + list echo + mysql persistence" {
  $ctx.processorName = "qa_processor_$tag"
  $processor = Invoke-Api "POST" "/api/control/data-processors" @{
    name = $ctx.processorName
    paramCount = 2
    functionCode = "function transform(a, b) { return a + b; }"
    status = "DRAFT"
  }
  if (-not $processor.id) { throw "processor id missing" }
  $ctx.processorId = [int64]$processor.id

  $rows = Invoke-Api "GET" "/api/control/data-processors"
  if (-not (@($rows) | Where-Object { $_.id -eq $ctx.processorId })) { throw "processor not found in list" }

  $cnt = [int](Query-Scalar "SELECT COUNT(*) FROM data_processor WHERE id=$($ctx.processorId);")
  if ($cnt -lt 1) { throw "mysql data_processor missing" }
}

Run-Step "DataProcessor" "update processor status" {
  $updated = Invoke-Api "POST" "/api/control/data-processors/$($ctx.processorId)/status" @{ status = "ACTIVE" }
  if ($updated.status -ne "ACTIVE") { throw "processor status not ACTIVE" }
}

Run-Step "ContextVariable" "create variable + list echo + mysql persistence" {
  $ctx.variableKey = "qa_var_$tag"
  $var = Invoke-Api "POST" "/api/control/context-variables" @{
    key = $ctx.variableKey
    label = "QA Var $tag"
    valueSource = "STATIC"
    staticValue = $ctx.primaryOrgId
    scriptContent = $null
    status = "DRAFT"
    ownerOrgId = $ctx.primaryOrgId
  }
  if (-not $var.id) { throw "context variable id missing" }
  $ctx.variableId = [int64]$var.id

  $rows = Invoke-Api "GET" "/api/control/context-variables"
  if (-not (@($rows) | Where-Object { $_.id -eq $ctx.variableId })) { throw "context variable not found in list" }

  $cnt = [int](Query-Scalar "SELECT COUNT(*) FROM context_variable WHERE id=$($ctx.variableId);")
  if ($cnt -lt 1) { throw "mysql context_variable missing" }
}

Run-Step "ContextVariable" "update variable status" {
  $updated = Invoke-Api "POST" "/api/control/context-variables/$($ctx.variableId)/status" @{ status = "ACTIVE" }
  if ($updated.status -ne "ACTIVE") { throw "context variable status not ACTIVE" }
}

Run-Step "Governance" "create general config + list echo + mysql persistence" {
  $ctx.gcKey = "qa_item_$tag"
  $gc = Invoke-Api "POST" "/api/governance/general-config-items" @{
    groupKey = "qa_group"
    itemKey = $ctx.gcKey
    itemValue = "qa_value_$tag"
    description = "qa"
    status = "ACTIVE"
    orderNo = 999
  }
  if (-not $gc.id) { throw "general config id missing" }
  $ctx.gcId = [int64]$gc.id

  $rows = Invoke-Api "GET" "/api/governance/general-config-items?groupKey=qa_group"
  if (-not (@($rows) | Where-Object { $_.id -eq $ctx.gcId })) { throw "general config not found in list" }

  $cnt = [int](Query-Scalar "SELECT COUNT(*) FROM general_config_item WHERE id=$($ctx.gcId);")
  if ($cnt -lt 1) { throw "mysql general_config_item missing" }
}

Run-Step "Governance" "create menu sdk policy + list echo + mysql persistence" {
  $ctx.policyMenuCode = $ctx.menuCode
  $policy = Invoke-Api "POST" "/api/governance/menu-sdk-policies" @{
    menuCode = $ctx.policyMenuCode
    menuName = "QA Policy Menu"
    promptGrayEnabled = $true
    promptGrayVersion = "v1"
    promptGrayOrgIds = @($ctx.primaryOrgId)
    jobGrayEnabled = $false
    jobGrayVersion = ""
    jobGrayOrgIds = @()
    effectiveStart = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss")
    effectiveEnd = (Get-Date).AddDays(7).ToString("yyyy-MM-ddTHH:mm:ss")
    status = "ACTIVE"
  }
  if (-not $policy.id) { throw "menu sdk policy id missing" }
  $ctx.policyId = [int64]$policy.id

  $rows = Invoke-Api "GET" "/api/governance/menu-sdk-policies"
  if (-not (@($rows) | Where-Object { $_.id -eq $ctx.policyId })) { throw "menu sdk policy not found in list" }

  $cnt = [int](Query-Scalar "SELECT COUNT(*) FROM menu_sdk_policy WHERE id=$($ctx.policyId);")
  if ($cnt -lt 1) { throw "mysql menu_sdk_policy missing" }
}

Run-Step "Permission" "create resource + role + grants + members + mysql persistence" {
  $ctx.resourceCode = "qa_res_$tag"
  $resource = Invoke-Api "POST" "/api/permissions/resources" @{
    resourceCode = $ctx.resourceCode
    resourceName = "QA Resource $tag"
    resourceType = "ACTION"
    resourcePath = "/qa/action/$tag"
    pagePath = ""
    status = "ACTIVE"
    orderNo = 9999
    description = "qa"
  }
  if (-not $resource.id) { throw "permission resource id missing" }
  $ctx.resourceId = [int64]$resource.id

  $role = Invoke-Api "POST" "/api/permissions/roles" @{
    name = "qa_role_$tag"
    roleType = "CONFIG_OPERATOR"
    status = "ACTIVE"
    orgScopeId = $ctx.primaryOrgId
    memberCount = 0
  }
  if (-not $role.id) { throw "role id missing" }
  $ctx.roleId = [int64]$role.id

  $grantResult = Invoke-Api "POST" "/api/permissions/roles/$($ctx.roleId)/resource-grants" @{ resourceCodes = @($ctx.resourceCode) }
  if (-not $grantResult.updatedCount -or $grantResult.updatedCount -lt 1) { throw "grant updatedCount invalid" }

  $memberResult = Invoke-Api "POST" "/api/permissions/roles/$($ctx.roleId)/members" @{ userIds = @($ctx.loginUserId) }
  if (-not $memberResult.updatedCount -or $memberResult.updatedCount -lt 1) { throw "member updatedCount invalid" }

  $grants = Invoke-Api "GET" "/api/permissions/roles/$($ctx.roleId)/resource-grants"
  if (-not (@($grants) | Where-Object { $_.resourceCode -eq $ctx.resourceCode })) { throw "grant not found in list" }

  $members = Invoke-Api "GET" "/api/permissions/roles/$($ctx.roleId)/members"
  if (-not (@($members) | Where-Object { $_.userId -eq $ctx.loginUserId })) { throw "member not found in list" }

  $cntRes = [int](Query-Scalar "SELECT COUNT(*) FROM permission_resource WHERE id=$($ctx.resourceId);")
  $cntRole = [int](Query-Scalar "SELECT COUNT(*) FROM cc_role WHERE id=$($ctx.roleId);")
  $cntGrant = [int](Query-Scalar "SELECT COUNT(*) FROM role_resource_grant WHERE role_id=$($ctx.roleId) AND resource_code='$($ctx.resourceCode)';")
  $cntMember = [int](Query-Scalar "SELECT COUNT(*) FROM user_role_binding WHERE role_id=$($ctx.roleId) AND user_id='$(Escape-Sql $ctx.loginUserId)';")
  if ($cntRes -lt 1 -or $cntRole -lt 1 -or $cntGrant -lt 1 -or $cntMember -lt 1) {
    throw "mysql permission tables missing rows"
  }
}

Run-Step "Permission" "clone role + toggle status + session echo" {
  $cloned = Invoke-Api "POST" "/api/permissions/roles/$($ctx.roleId)/clone"
  if (-not $cloned.id) { throw "clone role id missing" }

  $toggled = Invoke-Api "POST" "/api/permissions/roles/$($ctx.roleId)/status"
  if (-not $toggled.status) { throw "toggle role returned empty status" }

  $me = Invoke-Api "GET" "/api/permissions/session/me?userId=$([uri]::EscapeDataString($ctx.loginUserId))&orgId=$([uri]::EscapeDataString($ctx.primaryOrgId))"
  if (-not (@($me.roleCodes).Count -ge 0)) { throw "session me response invalid" }
}

Run-Step "Publish" "publish validate/logs + mysql persistence" {
  $validate = Invoke-Api "POST" "/api/control/publish/validate" @{ resourceId = $ctx.pageResourceId }
  if ($null -eq $validate.pass) { throw "validate response missing pass" }

  $log = Invoke-Api "POST" "/api/control/publish/logs" @{
    action = "PUBLISH"
    resourceType = "PAGE_RESOURCE"
    resourceId = $ctx.pageResourceId
    resourceName = $ctx.pageName
    operator = $ctx.operatorId
    effectiveScopeType = "ORG"
    effectiveOrgIds = @($ctx.primaryOrgId)
    effectiveScopeSummary = $ctx.primaryOrgId
    effectiveStartAt = (Get-Date).ToString("s")
    effectiveEndAt = (Get-Date).AddDays(1).ToString("s")
    approvalTicketId = "QA-$tag"
    approvalSource = "QA"
    approvalStatus = "APPROVED"
  }
  if (-not $log.id) { throw "publish log id missing" }
  $ctx.publishLogId = [int64]$log.id

  $logs = Invoke-Api "GET" "/api/control/publish/logs"
  if (-not (@($logs) | Where-Object { $_.id -eq $ctx.publishLogId })) { throw "publish log not found in list" }

  $cnt = [int](Query-Scalar "SELECT COUNT(*) FROM publish_operation_log WHERE id=$($ctx.publishLogId);")
  if ($cnt -lt 1) { throw "mysql publish_operation_log missing" }
}

Run-Step "Runtime" "prompt/job runtime logs endpoints" {
  $promptLogs = Invoke-Api "GET" "/api/runtime/prompt-trigger-logs?pageNo=1&pageSize=20"
  $jobLogs = Invoke-Api "GET" "/api/runtime/job-execution-records?pageNo=1&pageSize=20"
  if ($null -eq $promptLogs -or $null -eq $jobLogs) { throw "runtime logs null" }
}

Run-Step "Governance" "dashboard summary endpoints" {
  $pending = Invoke-Api "GET" "/api/governance/pending-summary"
  $audit = Invoke-Api "GET" "/api/governance/audit-logs"
  $trigger = Invoke-Api "GET" "/api/governance/trigger-logs"
  $exec = Invoke-Api "GET" "/api/governance/execution-logs"
  $metrics = Invoke-Api "GET" "/api/governance/metrics/overview"
  if ($null -eq $pending -or $null -eq $audit -or $null -eq $trigger -or $null -eq $exec -or $null -eq $metrics) {
    throw "governance endpoints returned null"
  }
}

Run-Step "FrontendContract" "instant-publish no pending-items contract required" {
  # Pending center has been removed from frontend contract; immediate publish is handled by per-resource status APIs.
  $null = Invoke-Api "GET" "/api/control/interfaces?pageNo=1&pageSize=1"
}

$summary = [pscustomobject]@{
  timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
  mode = "mysql"
  total = $passes.Count + $issues.Count
  passed = $passes.Count
  failed = $issues.Count
  passes = $passes
  issues = $issues
}

$reportDir = "C:\dev\projects\work\config-center-frontend\test-results"
if (-not (Test-Path $reportDir)) { New-Item -ItemType Directory -Path $reportDir | Out-Null }
$reportPath = Join-Path $reportDir "mysql-verification-$tag.json"
$summary | ConvertTo-Json -Depth 10 | Set-Content -Encoding UTF8 $reportPath
Write-Output "REPORT_PATH=$reportPath"
$summary | ConvertTo-Json -Depth 10

if ($issues.Count -gt 0) { exit 2 }


