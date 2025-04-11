# Running a secure federation of 2 SPARQL endpoints

# launching/configuring servers

We have 2 endpoints storing products:
- vendor1 (localhost:3001) : `comunica-sparql-file-http -p 3001 ./data/vendor1.ttl`
- vendor1 (localhost:4001) : `comunica-sparql-file-http -p 4001 ./data/vendor2.ttl`

Require : `npm install -g @comunica/query-sparql-file` (long)

We have 2 proxies protecting the endpoints with a single keycloack server (class 1):
- `node proxy.js 3000 http://localhost:3001`
- `node proxy.js 4000 http://localhost:4001`

Require  `npm install`

We have keycloack server (started in the main directory):
```
docker run --rm -p 8080:8080 -e KEYCLOAK_ADMIN=admin -e KEYCLOAK_ADMIN_PASSWORD=admin -v "$(pwd)/keycloak/config/sparql/realm-export.json:/opt/keycloak/data/import/realm-export.json" quay.io/keycloak/keycloak:24.0.1 start-dev --import-realm 
```

We configure it to declare alice with `password=alicepwd` and realm to protect sparql endpoint.
We set up the security policy with:
```
python create_uma_policy.py
```

## launching the federated query

# patching brutally comunica-sparql
```
cp SparqlEndpointFetcher-patched.js node_modules/fetch-sparql-endpoint/lib/SparqlEndpointFetcher.js
```

# getting the access token for alice
```
export ACCESS_TOKEN=$(curl -s -X POST "http://localhost:8080/realms/sparql/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password" \
  -d "client_id=sparql-client" \
  -d "client_secret=secret123" \
  -d "username=alice" \
  -d "password=alicepwd" | jq -r .access_token)
  ```

# Launch the federated query

npx is required to 'activate' the dirty patch.
```
npx comunica-sparql http://localhost:3000/sparql http://localhost:4000/sparql -f queries/vendor.sparql
```

Should give 2 results.

to try without login:
```
export ACCESS_TOKEN=tagada
npx comunica-sparql http://localhost:3000/sparql http://localhost:4000/sparql -f queries/vendor.sparql
```

Should return `forbidden`

# All-in-one testing

```
./run_test.sh
```

Start everything and run the federated query with the right token.
