# Patching fetch-sparql-endpoint with comunica

npm install

mouaif, faire  :
```
cp SparqlEndpointFetcher-patched.js node_modules/fetch-sparql-endpoint/lib/SparqlEndpointFetcher.js
```

un sorte de patch... on peut faire mieux avec `npm patch`, mais bon...

Launch Proxy:
```
node proxy.js
```

Proxy lancé sur http://localhost:3000/sparql → https://dbpedia.org/sparql

ARGHHH : comunica detecte les sources en fonction de la tête de l'URL. Si le proxy n'est pas lancé avec /sparql -> n'utilise plus SparqlEndpointFetcher mais autre chose... (je sais pas quoi...)
donc le proxy doit écouter sur !! `localhost:3000/sparql` !!

puis:
```
export export ACCESS_TOKEN=tagada 
node index.js
```

we see :
- in the client: ajout de l'access token dans le header:tagada
- in proxy : `authorization: 'Bearer tagada'`,`Body : query=%0A++++SELECT+%3Fs+%3Fp+%3Fo+WHERE+%7B%0A++++++%3Fs+%3Fp+%3Fo%0A++++%7D+LIMIT+1`


## commandes utiles
```
npm list fetch-sparql-endpoint
npm explain fetch-sparql-endpoint
```

# testing for real with a real federated query

This query comes from the [FedX documentation](https://rdf4j.org/documentation/programming/federation/). It works with comunica
```
npx comunica-sparql \
  https://dbpedia.org/sparql https://query.wikidata.org/sparql \
  --httpRetryCount 3 \
  --httpRetryDelayFallback 5000 \
  "PREFIX yago: <http://dbpedia.org/class/yago/>
   PREFIX owl: <http://www.w3.org/2002/07/owl#>
   PREFIX wdt: <http://www.wikidata.org/prop/direct/>

   SELECT * WHERE {
     ?country a yago:WikicatMemberStatesOfTheEuropeanUnion .
     ?country owl:sameAs ?countrySameAs .
     ?countrySameAs wdt:P2131 ?gdp .
   }
   LIMIT 5"
```

Now launch 2 proxies:
```
node proxy.js --port=4000 --target=https://query.wikidata.org/sparql
node proxy.js --port=3000 --target=https://dbpedia.org/sparql
``` 

setup the access_token `export ACCESS_TOKEN=tagada`, and run comunica through proxies
```
npx comunica-sparql \
  http://localhost:3000/sparql http://localhost:4000/sparql \
  --httpRetryCount 3 \
  --httpRetryDelayFallback 5000 \
  "PREFIX yago: <http://dbpedia.org/class/yago/>
   PREFIX owl: <http://www.w3.org/2002/07/owl#>
   PREFIX wdt: <http://www.wikidata.org/prop/direct/>

   SELECT * WHERE {
     ?country a yago:WikicatMemberStatesOfTheEuropeanUnion .
     ?country owl:sameAs ?countrySameAs .
     ?countrySameAs wdt:P2131 ?gdp .
   }
   LIMIT 5"
```

Almost Good... Wikidata and DBpedia have restriction with quotas, requiring retry policy with delays... Should run SPARQL endpoint locally to get rid of that...

# Comunica as SPARQL server

`comunica-sparql-http -help`

- Start the server for serving one file (default localhost:3000):
`comunica-sparql-file-http -p 3001 ./data/vendor1.ttl`
`comunica-sparql-file-http -p 4001 ./data/vendor2.ttl`
query it:
`comunica-sparql http://localhost:3001/sparql http://localhost:4001/sparql -f queries/vendor.sparql`

# ok now same thing with proxies

Start sparql endpoints:
```
comunica-sparql-file-http -p 3001 ./data/vendor1.ttl
comunica-sparql-file-http -p 4001 ./data/vendor2.ttl
```

Start proxies:
```
node proxy.js --port=4000 --target=http://localhost:4001
node proxy.js --port=3000 --target=http://localhost:3001
```

Launch query:
`comunica-sparql http://localhost:3000/sparql http://localhost:4000/sparql -f queries/vendor.sparql`

The script `run_test.sh` make it all...

# Well other comunica stuf...

For federated query processsing just put several sources... `--explain logical` allow to understand what comunica do with the query. 

`npx comunica-sparql -help`

A federated query that works:
```
molli-p@mac-molli-2022 ~ % npx comunica-sparql \
  https://dbpedia.org/sparql https://query.wikidata.org/sparql \
  --httpRetryCount 3 \
  --httpRetryDelayFallback 5000 \
  "PREFIX yago: <http://dbpedia.org/class/yago/>
   PREFIX owl: <http://www.w3.org/2002/07/owl#>
   PREFIX wdt: <http://www.wikidata.org/prop/direct/>

   SELECT * WHERE {
     ?country a yago:WikicatMemberStatesOfTheEuropeanUnion .
     ?country owl:sameAs ?countrySameAs .
     ?countrySameAs wdt:P2131 ?gdp .
   }
   LIMIT 10"
[
{"countrySameAs":"http://www.wikidata.org/entity/Q218","gdp":"\"285404683025\"^^http://www.w3.org/2001/XMLSchema#decimal","country":"http://dbpedia.org/resource/Romania"},
{"countrySameAs":"http://www.wikidata.org/entity/Q218","gdp":"\"301261582924\"^^http://www.w3.org/2001/XMLSchema#decimal","country":"http://dbpedia.org/resource/Romania"},
{"countrySameAs":"http://www.wikidata.org/entity/Q31","gdp":"\"599880000000\"^^http://www.w3.org/2001/XMLSchema#decimal","country":"http://dbpedia.org/resource/Belgium"},
{"countrySameAs":"http://www.wikidata.org/entity/Q35","gdp":"\"395403906582\"^^http://www.w3.org/2001/XMLSchema#decimal","country":"http://dbpedia.org/resource/Denmark"},
{"countrySameAs":"http://www.wikidata.org/entity/Q35","gdp":"\"398303272764\"^^http://www.w3.org/2001/XMLSchema#decimal","country":"http://dbpedia.org/resource/Denmark"},
{"countrySameAs":"http://www.wikidata.org/entity/Q28","gdp":"\"181848022230\"^^http://www.w3.org/2001/XMLSchema#decimal","country":"http://dbpedia.org/resource/Hungary"},
{"countrySameAs":"http://www.wikidata.org/entity/Q37","gdp":"\"70334299008\"^^http://www.w3.org/2001/XMLSchema#decimal","country":"http://dbpedia.org/resource/Lithuania"},
{"countrySameAs":"http://www.wikidata.org/entity/Q27","gdp":"\"504182603276\"^^http://www.w3.org/2001/XMLSchema#decimal","country":"http://dbpedia.org/resource/Republic_of_Ireland"},
{"countrySameAs":"http://www.wikidata.org/entity/Q27","gdp":"\"529244870223\"^^http://www.w3.org/2001/XMLSchema#decimal","country":"http://dbpedia.org/resource/Republic_of_Ireland"},
{"countrySameAs":"http://www.wikidata.org/entity/Q145","gdp":"\"3070667732359\"^^http://www.w3.org/2001/XMLSchema#decimal","country":"http://dbpedia.org/resource/United_Kingdom"}
]
```

```
npx comunica-sparql \
  https://dbpedia.org/sparql https://query.wikidata.org/sparql \
  --httpRetryCount 3 \
  --httpRetryDelayFallback 5000 \
  "PREFIX yago: <http://dbpedia.org/class/yago/>
   PREFIX owl: <http://www.w3.org/2002/07/owl#>
   PREFIX wdt: <http://www.wikidata.org/prop/direct/>

   SELECT * WHERE {
     ?x owl:sameAs ?y .
   }
   LIMIT 10"
```

some wikidata results...


```
npx comunica-sparql \
  https://dbpedia.org/sparql https://query.wikidata.org/sparql \
  --httpRetryCount 3 \
  --httpRetryDelayFallback 5000 \
  "PREFIX dbr: <http://dbpedia.org/resource/>
   PREFIX dbo: <http://dbpedia.org/ontology/>
   PREFIX owl: <http://www.w3.org/2002/07/owl#>
   PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
   PREFIX wdt: <http://www.wikidata.org/prop/direct/>

   SELECT * WHERE {
     dbr:Intracranial_aneurysm dbo:medicalCause ?xx.
#     ?xx rdfs:label ?cause .
     ?xx owl:sameAs ?wikidataEntity .
#     FILTER(LANG(?cause) = 'en')

     ?wikidataEntity wdt:P2293 ?yy.
#     ?yy rdfs:label ?gene .
#     FILTER(LANG(?gene) = 'en')
   } limit 1"
```

This one works, but if labels are uncommented not working...


```
npx comunica-sparql \
  https://dbpedia.org/sparql https://query.wikidata.org/sparql \
  --httpRetryCount 3 \
  --httpRetryDelayFallback 5000 \
  "PREFIX dbr: <http://dbpedia.org/resource/>
   PREFIX dbo: <http://dbpedia.org/ontology/>
   PREFIX owl: <http://www.w3.org/2002/07/owl#>
   PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
   PREFIX wdt: <http://www.wikidata.org/prop/direct/>

   SELECT ?cause ?gene WHERE {
     service <https://dbpedia.org/sparql> {
      dbr:Intracranial_aneurysm dbo:medicalCause ?xx.
      ?xx rdfs:label ?cause .
      ?xx owl:sameAs ?wikidataEntity .
      FILTER(LANG(?cause) = 'en')
     }
     service <https://query.wikidata.org/sparql> {
       ?wikidataEntity wdt:P2293 ?yy.
       ?yy rdfs:label ?gene .
       FILTER(LANG(?gene) = 'en')
     }
   } limit 1"
```

This one works


## Launching Keycloack

Start the keycloack server

```
docker run --rm \
  -p 8080:8080 \
  -e KEYCLOAK_ADMIN=admin \
  -e KEYCLOAK_ADMIN_PASSWORD=admin \
  -v "$(pwd)/keycloak/config/sparql/realm-export.json:/opt/keycloak/data/import/realm-export.json" \
  quay.io/keycloak/keycloak:24.0.1 \
  start-dev --import-realm
```

Create the policy for alice.

```
python create_uma_policy.py 
```

Get an access_token (curl):
```
export TOKEN=$(curl -s -X POST "http://localhost:8080/realms/sparql/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password" \
  -d "client_id=sparql-client" \
  -d "client_secret=secret123" \
  -d "username=alice" \
  -d "password=alicepwd" | jq -r .access_token)
```



Get an access_token:
```
python test_sparql_proxy.py 
🔐 token for : alice
eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJ3S09XeWRaV3pjY1BLYkUwZENXdWM3bm9HOHhUYkVLRmJNRmgxTFFtNE9RIn0.eyJleHAiOjE3NDQzOTU3ODAsImlhdCI6MTc0NDM5MjE4MCwianRpIjoiOGM5MDY5YzItYWFhMC00MTM4LWJjMWUtZTI5NzljNzA3ZDhhIiwiaXNzIjoiaHR0cDovL2xvY2FsaG9zdDo4MDgwL3JlYWxtcy9zcGFycWwiLCJzdWIiOiJhOTZlNzgzNC00MDU2LTQ5MWYtYmExNS0xNmRhMWI2ZTNiNzAiLCJ0eXAiOiJCZWFyZXIiLCJhenAiOiJzcGFycWwtY2xpZW50Iiwic2Vzc2lvbl9zdGF0ZSI6ImQ2OTBkNmQyLWIwODktNGM3ZC05YTM5LWFiYjk0YzAyYWU3ZiIsImFjciI6IjEiLCJyZWFsbV9hY2Nlc3MiOnsicm9sZXMiOlsiZG9jdG9yIl19LCJzY29wZSI6ImVtYWlsIHByb2ZpbGUiLCJzaWQiOiJkNjkwZDZkMi1iMDg5LTRjN2QtOWEzOS1hYmI5NGMwMmFlN2YiLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwibmFtZSI6IkFsaWNlIFRlc3RlciIsInByZWZlcnJlZF91c2VybmFtZSI6ImFsaWNlIiwiZ2l2ZW5fbmFtZSI6IkFsaWNlIiwiZmFtaWx5X25hbWUiOiJUZXN0ZXIiLCJlbWFpbCI6ImFsaWNlQGV4YW1wbGUub3JnIn0.T1RT2YY5mHNPPSt0Zpu59U3JwY7mQslb9bMBAunR3-DJaaBLf12XQtELurxXb_oh-ax6TfWO93qUJPn6rXFrTJPv43eFBqtYQh1J1HgoKDTCOtBN0LeEeh8cnl4In9QQK__k9Q_Mj0xEI2i0K_n6TTEFlh-42SEi3CiFSztfDKi33ZupCbxc3mDWkLYBzt22OfX9fMY-M3m2pvbHWDIVjqcVhru66Sv9ihhxqOxjglW3Lc6we2sJ_WVnlJqEB1X-pLlf2VGsFXuiINJ6U6awnaeNU1Ux39Ktrn7GcVQT-YY43Nr2N2QBAUMII3IGh8_QSMogEjnHig4j6bKFSjTHYQ
🔐 token for : bob
❌ Token request failed for bob: {"error":"invalid_grant","error_description":"Invalid user credentials"}
None
```

```
export ACCESS_TOKEN=eyJl...
```
