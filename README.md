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

