#!/bin/bash

export ACCESS_TOKEN="tagada" 

# Lancer les endpoints SPARQL
comunica-sparql-file-http -p 3001 ./data/vendor1.ttl > logs/endpoint1.log 2>&1 &
PID1=$!
comunica-sparql-file-http -p 4001 ./data/vendor2.ttl > logs/endpoint2.log 2>&1 &
PID2=$!

# Lancer les proxies
node proxy.js 3000 http://localhost:3001 > logs/proxy1.log 2>&1 &
PID3=$!
node proxy.js 4000 http://localhost:4001 > logs/proxy2.log 2>&1 &
PID4=$!

# Attendre un peu pour que tout démarre
sleep 5

# Lancer la requête
echo "Lancement de la requête SPARQL..."
npx comunica-sparql http://localhost:3000/sparql http://localhost:4000/sparql -f queries/vendor.sparql

# Nettoyage : tuer les processus
echo "Arrêt des serveurs..."
kill $PID1 $PID2 $PID3 $PID4
