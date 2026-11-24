// Creates realm, client, roles and users in a fresh Keycloak (bootstrap admin tmp/p).
const tokRes = await fetch(`${KC}/realms/master/protocol/openid-connect/token`, {
  method: 'POST',
  body: new URLSearchParams({ grant_type: 'password', client_id: 'admin-cli', username: 'tmp', password: 'p' }),
});
const { access_token } = await tokRes.json();
const call = async (method, path, body) => {
  const res = await fetch(`${KC}/admin/realms${path}`, {
    method,
    headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  console.log(method, path, res.status);
  return text ? JSON.parse(text) : undefined;
};
await call('POST', '', { realm: 'javascript', enabled: true, accessTokenLifespan: 1800, ssoSessionIdleTimeout: 3600 });
await call('POST', '/javascript/clients', {
  clientId: 'javascript-client', name: 'JavaScript Client', enabled: true, publicClient: false,
  standardFlowEnabled: true, directAccessGrantsEnabled: true, serviceAccountsEnabled: true,
  redirectUris: ['*'], webOrigins: ['+'], rootUrl: 'https://localhost:3000', fullScopeAllowed: true,
});
const [{ id: cid }] = await call('GET', '/javascript/clients?clientId=javascript-client');
for (const r of ['admin', 'user']) await call('POST', `/javascript/clients/${cid}/roles`, { name: r });
for (const u of ['admin', 'user']) {
  await call('POST', '/javascript/users', {
    username: u, email: `${u}@acme.com`, firstName: 'Keycloak', lastName: u, enabled: true, emailVerified: true,
    credentials: [{ type: 'password', value: 'p', temporary: false }],
  });
  const [{ id: uid }] = await call('GET', `/javascript/users?username=${u}&exact=true`);
  const role = await call('GET', `/javascript/clients/${cid}/roles/${u}`);
  await call('POST', `/javascript/users/${uid}/role-mappings/clients/${cid}`, [role]);
}
