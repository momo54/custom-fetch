import requests

KEYCLOAK_URL = "http://localhost:8080"
REALM = "sparql"
CLIENT_ID = "sparql-client"
CLIENT_SECRET = "secret123"
PROXY_URL = "http://localhost:4000/"

USERS = {
    "alice": "alicepwd",
    "bob": "bobpwd"
}

def get_token(username, password):
    resp = requests.post(
        f"{KEYCLOAK_URL}/realms/{REALM}/protocol/openid-connect/token",
        data={
            "grant_type": "password",
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
            "username": username,
            "password": password
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    if resp.status_code == 200:
        return resp.json()["access_token"]
    else:
        print(f"❌ Token request failed for {username}: {resp.text}")
        return None

def test_sparql_query(token):
    query = 'SELECT * WHERE { ?s ?p ?o } LIMIT 5'
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/sparql-query"
    }
    resp = requests.post(PROXY_URL, data=query, headers=headers)
    return resp.status_code, resp.text

for user, pwd in USERS.items():
    print(f"🔐 token for : {user}")
    token = get_token(user, pwd)
    print(token)

