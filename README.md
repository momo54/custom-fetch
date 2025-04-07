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
`comunica-sparql http://localhost:3001/sparql http://localhost:3001/sparql -f queries/vendor.sparql`

# ok now same thing with proxies

Start sparql endpoints:
```
comunica-sparql-file-http -p 3001 ./data/vendor1.ttl
comunica-sparql-file-http -p 4001 ./data/vendor2.ttl
```

Start proxies:
```
node proxy.js --port=4000 --target=http://localhost:3001
node proxy.js --port=3000 --target=http://localhost:4001
```

Launch query:
`comunica-sparql http://localhost:3001/sparql http://localhost:3001/sparql -f queries/vendor.sparql`

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