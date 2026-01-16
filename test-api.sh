#!/usr/bin/env bash

BASE="http://127.0.0.1:8787"
ADMIN_TOKEN="dev-secret"

PASS="✅ PASS"
FAIL="❌ FAIL"

echo ""
echo "Running backend API tests..."
echo "----------------------------------"

# helper: expect response contains string
assert_contains () {
  if [[ "$1" == *"$2"* ]]; then
    echo "$PASS - $3"
  else
    echo "$FAIL - $3"
    echo "  Expected to contain: $2"
    echo "  Got: $1"
  fi
}

# helper: expect exact HTTP code
assert_status () {
  if [[ "$1" == "$2" ]]; then
    echo "$PASS - $3"
  else
    echo "$FAIL - $3 (expected $2, got $1)"
  fi
}

# ---------------------------
# PUBLIC ROUTES
# ---------------------------

echo ""
echo "PUBLIC ROUTES"

status_resp=$(curl -s "$BASE/status")
assert_contains "$status_resp" "building" "GET /status works"

logs_resp=$(curl -s "$BASE/logs")
assert_contains "$logs_resp" "[" "GET /logs works"

# ---------------------------
# AUTH TESTS
# ---------------------------

echo ""
echo "AUTH TESTS"

unauth_code=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "$BASE/logs" \
  -H "Content-Type: application/json" \
  -d '{"type":"tech","message":"unauth"}')

assert_status "$unauth_code" "401" "POST /logs without token blocked"

# ---------------------------
# ADMIN LOG TESTS
# ---------------------------

echo ""
echo "ADMIN /logs"

log_create_resp=$(curl -s \
  -X POST "$BASE/logs" \
  -H "Content-Type: application/json" \
  -H "x-admin-token: $ADMIN_TOKEN" \
  -d '{"type":"tech","message":"Automated test log"}')

assert_contains "$log_create_resp" "success" "POST /logs creates log"

logs_after=$(curl -s "$BASE/logs")
assert_contains "$logs_after" "Automated test log" "GET /logs shows new log"

# ---------------------------
# ADMIN STATUS TESTS
# ---------------------------

echo ""
echo "ADMIN /status"

status_create=$(curl -s \
  -X POST "$BASE/status" \
  -H "Content-Type: application/json" \
  -H "x-admin-token: $ADMIN_TOKEN" \
  -d '{"section":"building","title":"Test Item","position":0}')

assert_contains "$status_create" "success" "POST /status create"

status_all=$(curl -s "$BASE/status")
assert_contains "$status_all" "Test Item" "GET /status shows item"

# ---------------------------
# PARTIAL UPDATE TEST
# ---------------------------

echo ""
echo "PARTIAL UPDATE"

update_resp=$(curl -s \
  -X POST "$BASE/status" \
  -H "Content-Type: application/json" \
  -H "x-admin-token: $ADMIN_TOKEN" \
  -d '{"id":1,"title":"Updated Title"}')

assert_contains "$update_resp" "success" "Partial update works"

# ---------------------------
# INVALID INPUT TESTS
# ---------------------------

echo ""
echo "INVALID INPUT"

invalid_section_code=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "$BASE/status" \
  -H "Content-Type: application/json" \
  -H "x-admin-token: $ADMIN_TOKEN" \
  -d '{"section":"random","title":"Bad"}')

assert_status "$invalid_section_code" "400" "Invalid section rejected"

unknown_code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/unknown")
assert_status "$unknown_code" "404" "Unknown route returns 404"

put_code=$(curl -s -o /dev/null -w "%{http_code}" -X PUT "$BASE/status")
assert_status "$put_code" "404" "Unsupported method returns 404"

echo ""
echo "----------------------------------"
echo "Tests completed."
echo ""