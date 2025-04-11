import requests
import json

# Configuration
KEYCLOAK_URL = "http://localhost:8080"
REALM = "sparql"
ADMIN_USER = "admin"
ADMIN_PASSWORD = "admin"
CLIENT_ID = "sparql-client"
UMA_POLICY_NAME = "doctor-only-policy"
UMA_RESOURCE_NAME = "query-dataset-x"
UMA_SCOPE = "query"
UMA_PERMISSION_NAME = "doctor-can-query"

# Authentification admin
token_resp = requests.post(
    f"{KEYCLOAK_URL}/realms/master/protocol/openid-connect/token",
    data={
        "grant_type": "password",
        "client_id": "admin-cli",
        "username": ADMIN_USER,
        "password": ADMIN_PASSWORD,
    },
    headers={"Content-Type": "application/x-www-form-urlencoded"},
)

if token_resp.status_code != 200:
    raise Exception("❌ Admin login failed:", token_resp.text)

access_token = token_resp.json()["access_token"]
headers = {
    "Authorization": f"Bearer {access_token}",
    "Content-Type": "application/json"
}

# Obtenir l'ID client
client_resp = requests.get(
    f"{KEYCLOAK_URL}/admin/realms/{REALM}/clients?clientId={CLIENT_ID}",
    headers=headers
)
client_uuid = client_resp.json()[0]["id"]

# Obtenir l'ID du rôle doctor
role_resp = requests.get(
    f"{KEYCLOAK_URL}/admin/realms/{REALM}/roles/doctor",
    headers=headers
)
role_id = role_resp.json()["id"]

# Créer la ressource UMA
resource_payload = {
    "name": UMA_RESOURCE_NAME,
    "uri": "/ds/query",
    "scopes": [UMA_SCOPE],
    "type": "SPARQL Dataset"
}
res = requests.post(
    f"{KEYCLOAK_URL}/admin/realms/{REALM}/clients/{client_uuid}/authz/resource-server/resource",
    headers=headers,
    json=resource_payload
)
if res.status_code not in [201, 204]:
    print("❌ Failed to create resource:", res.text)

# Créer la policy UMA basée sur le rôle doctor (avec "roles" directement)
policy_payload = {
    "name": UMA_POLICY_NAME,
    "type": "role",
    "logic": "POSITIVE",
    "decisionStrategy": "UNANIMOUS",
    "roles": [{
        "id": role_id,
        "required": False
    }]
}
res = requests.post(
    f"{KEYCLOAK_URL}/admin/realms/{REALM}/clients/{client_uuid}/authz/resource-server/policy/role",
    headers=headers,
    json=policy_payload
)
if res.status_code not in [201, 204]:
    print("❌ Failed to create policy:", res.text)

# Créer la permission liée à la policy
permission_payload = {
    "name": UMA_PERMISSION_NAME,
    "resources": [UMA_RESOURCE_NAME],
    "scopes": [UMA_SCOPE],
    "policies": [UMA_POLICY_NAME]
}
res = requests.post(
    f"{KEYCLOAK_URL}/admin/realms/{REALM}/clients/{client_uuid}/authz/resource-server/permission/resource",
    headers=headers,
    json=permission_payload
)
if res.status_code not in [201, 204]:
    print("❌ Failed to create permission:", res.text)
else:
    print("✅ UMA policy, resource and permission created successfully.")
