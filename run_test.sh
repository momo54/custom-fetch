#!/bin/bash

export ACCESS_TOKEN="tagada" 

# launch keycloack
echo "launching keycloack..."

docker run --rm -p 8080:8080 -e KEYCLOAK_ADMIN=admin -e KEYCLOAK_ADMIN_PASSWORD=admin -v "$(pwd)/keycloak/config/sparql/realm-export.json:/opt/keycloak/data/import/realm-export.json" quay.io/keycloak/keycloak:24.0.1 start-dev --import-realm & PID0=$!
sleep 50
# configure policy for alice
echo "Create Policy for alice..."
python create_uma_policy.py

# Lancer les endpoints SPARQL
echo "launching endpoints..."
comunica-sparql-file-http -p 3001 ./data/vendor1.ttl > logs/endpoint1.log 2>&1 &
PID1=$!
comunica-sparql-file-http -p 4001 ./data/vendor2.ttl > logs/endpoint2.log 2>&1 &
PID2=$!

# Lancer les proxies
echo "launching proxies..."
node proxy.js 3000 http://localhost:3001 > logs/proxy1.log 2>&1 &
PID3=$!
node proxy.js 4000 http://localhost:4001 > logs/proxy2.log 2>&1 &
PID4=$!

# Attendre un peu pour que tout démarre
sleep 10

# Lancer la requête
echo "patching Sparl Endpoint Fetcher..."
cp SparqlEndpointFetcher-patched.js node_modules/fetch-sparql-endpoint/lib/SparqlEndpointFetcher.js

# getting the access token for alice
export ACCESS_TOKEN=$(curl -s -X POST "http://localhost:8080/realms/sparql/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password" \
  -d "client_id=sparql-client" \
  -d "client_secret=secret123" \
  -d "username=alice" \
  -d "password=alicepwd" | jq -r .access_token)

# Lancer la requête SPARQL
echo "Launching a federated SPARQL query (should work)"
npx comunica-sparql -l debug http://localhost:3000/sparql http://localhost:4000/sparql -f queries/vendor.sparql

echo "retry with : npx comunica-sparql -l debug http://localhost:3000/sparql http://localhost:4000/sparql -f queries/vendor.sparql"


while true; do
  read -n 1 -s -r -p "press 'q' for stopping all processes: " key
  echo ""
  if [[ "$key" == "q" ]]; then
    echo "Sortie."
    break
  fi
done

# Nettoyage : tuer les processus
echo "killing servers"
kill $PID0 $PID1 $PID2 $PID3 $PID4
