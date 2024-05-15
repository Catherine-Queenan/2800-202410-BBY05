// auth.js
const msal = require('@azure/msal-node');

const msalConfig = {
  auth: {
    clientId: 'YOUR_CLIENT_ID',
    authority: 'https://login.microsoftonline.com/YOUR_TENANT_ID',
    clientSecret: 'YOUR_CLIENT_SECRET'
  }
};

const cca = new msal.ConfidentialClientApplication(msalConfig);

function getAuthUrl() {
  const authCodeUrlParameters = {
    scopes: ["https://graph.microsoft.com/.default"],
    redirectUri: "http://localhost:3000/redirect",
  };

  return cca.getAuthCodeUrl(authCodeUrlParameters);
}

async function getToken(authCode) {
  const tokenRequest = {
    code: authCode,
    scopes: ["https://graph.microsoft.com/.default"],
    redirectUri: "http://localhost:3000/redirect",
  };

  const response = await cca.acquireTokenByCode(tokenRequest);
  return response.accessToken;
}

module.exports = {
  getAuthUrl,
  getToken,
};
