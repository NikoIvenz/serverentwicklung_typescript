#!/usr/bin/env bash
# Demo of the REST interface against a running server (`make run`).
# Every step prints the request and checks the result. The vehicle created by the demo is
# removed at the end (there is no DELETE); with a terminal it waits so that the new row can
# be shown in Drizzle Studio first.
set -u
cd "$(dirname "$0")/.."

BASE=https://localhost:3000
REST=$BASE/rest
KEYCLOAK=http://localhost:8880/realms/javascript/protocol/openid-connect/token
FIN="TST$(date +%s%N | tail -c 15)"
FAILED=0

[ -f .env ] || { echo "Missing .env (copy .env.example and set CLIENT_SECRET)"; exit 1; }
CLIENT_SECRET=$(grep '^CLIENT_SECRET=' .env | cut -d= -f2)
[ -n "$CLIENT_SECRET" ] || { echo "CLIENT_SECRET is empty in .env"; exit 1; }
[ "$(curl -sk --http2 -o /dev/null -w '%{http_code}' $BASE/health)" = 200 ] ||
    { echo "The server does not answer on $BASE. Start it first: make run"; exit 1; }

section() { printf '\n== %s\n' "$1"; }
request() { printf '   $ %s\n' "$*"; }
status_of() { printf '%s' "$1" | head -1 | awk '{print $2}'; }
header_of() { printf '%s' "$1" | grep -i "^$2:" | head -1 | cut -d' ' -f2- | tr -d '\r'; }
check() { # name expected actual
    if [ "$3" = "$2" ]; then
        printf '   OK   %s: %s\n' "$1" "$3"
    else
        printf '   FAIL %s: expected %s, got %s\n' "$1" "$2" "$3"
        FAILED=1
    fi
}
token() {
    curl -s -d grant_type=password -d client_id=javascript-client \
        -d client_secret="$CLIENT_SECRET" -d username="$1" -d password=p "$KEYCLOAK" |
        sed 's/.*"access_token":"\([^"]*\)".*/\1/'
}
call() { curl -ski --http2 "$@"; }

ADMIN=$(token admin)
USER_TOKEN=$(token user)
BODY="{\"fin\":\"$FIN\",\"marke\":\"TESLA\",\"modell\":\"Model 3\",\"farbe\":\"WEISS\",\"kennzeichen\":{\"kombination\":\"KA-TS 123\",\"ausstellungsdatum\":\"2026-02-01\"},\"wartungen\":[{\"beschreibung\":\"Inspektion\",\"kosten\":\"99.90\"}]}"
JSON='Content-Type: application/json'

section "HTTP/2 and TLS"
request "curl -k --http2 -I $BASE/health"
R=$(call -I $BASE/health)
check "protocol" "HTTP/2" "$(printf '%s' "$R" | head -1 | awk '{print $1}')"

section "GET"
request "GET /rest/1"
R=$(call $REST/1)
check "status" 200 "$(status_of "$R")"
check "ETag" '"0"' "$(header_of "$R" etag)"
request "GET /rest/1 with If-None-Match: \"0\""
check "conditional GET" 304 "$(status_of "$(call -H 'If-None-Match: "0"' $REST/1)")"
request "GET /rest?marke=bmw"
check "search by brand" BMW "$(curl -sk --http2 "$REST?marke=bmw" | grep -o '"marke":"[A-Z]*"' | head -1 | cut -d'"' -f4)"
request "GET /rest/999999"
R=$(call $REST/999999)
check "unknown id" 404 "$(status_of "$R")"
check "problem details" application/problem+json "$(header_of "$R" content-type)"

section "POST (role admin required)"
request "POST /rest without token"
check "no token" 401 "$(status_of "$(call -X POST -H "$JSON" -d "$BODY" $REST)")"
request "POST /rest as user"
check "role user" 403 "$(status_of "$(call -X POST -H "$JSON" -H "Authorization: Bearer $USER_TOKEN" -d "$BODY" $REST)")"
request "POST /rest as admin"
R=$(call -X POST -H "$JSON" -H "Authorization: Bearer $ADMIN" -d "$BODY" $REST)
check "role admin" 201 "$(status_of "$R")"
LOCATION=$(header_of "$R" location)
ID=${LOCATION##*/}
check "Location" "$REST/$ID" "$LOCATION"
request "POST /rest with an invalid FIN"
check "validation" 422 "$(status_of "$(call -X POST -H "$JSON" -H "Authorization: Bearer $ADMIN" -d '{"fin":"too-short"}' $REST)")"
request "POST /rest with the same FIN again"
check "duplicate FIN" 422 "$(status_of "$(call -X POST -H "$JSON" -H "Authorization: Bearer $ADMIN" -d "$BODY" $REST)")"

section "PUT (lost updates)"
UPDATE="{\"fin\":\"$FIN\",\"marke\":\"TESLA\",\"modell\":\"Model Y\",\"farbe\":\"WEISS\"}"
request "PUT /rest/$ID without If-Match"
check "no If-Match" 428 "$(status_of "$(call -X PUT -H "$JSON" -d "$UPDATE" $REST/"$ID")")"
request "PUT /rest/$ID with If-Match: \"0\""
R=$(call -X PUT -H "$JSON" -H 'If-Match: "0"' -d "$UPDATE" $REST/"$ID")
check "current version" 204 "$(status_of "$R")"
check "new ETag" '"1"' "$(header_of "$R" etag)"
request "PUT /rest/$ID with If-Match: \"0\" again"
check "outdated version" 412 "$(status_of "$(call -X PUT -H "$JSON" -H 'If-Match: "0"' -d "$UPDATE" $REST/"$ID")")"

section "Result"
if [ "$FAILED" = 0 ]; then echo "   All checks passed."; else echo "   Some checks failed."; fi
echo "   Created vehicle: id $ID, FIN $FIN"

if [ -t 0 ]; then
    read -r -p "   Press Enter to remove the demo vehicle (show it in Drizzle Studio first) " _
fi
docker compose -f postgres-setup/compose.yml exec -T -e PGPASSWORD=p postgres \
    psql -U auto -d auto -q -c "delete from auto where id = $ID" >/dev/null && echo "   Demo vehicle $ID removed."
exit "$FAILED"
