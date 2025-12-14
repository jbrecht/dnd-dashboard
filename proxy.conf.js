const PROXY_CONFIG = {
  // ROUTE 1: Token Exchange (The one failing with 404)
  "/api/auth": {
    target: "https://auth-service.dndbeyond.com",
    secure: true,
    changeOrigin: true,
    // We remove the polite "pathRewrite" and do it manually below
    configure: (proxy, _options) => {
      proxy.on('proxyReq', (proxyReq, req, _res) => {
        
        // 1. HARD OVERWRITE THE PATH (The 404 Fix)
        // We ignore whatever the browser sent and force it to the correct DDB endpoint
        proxyReq.path = '/v1/access/accesstoken';

        console.log(`[Proxy Auth] Rewrote path to: ${proxyReq.path}`);

        // 2. INJECT COOKIE
        const rawAuth = req.headers['x-cobalt-session'];
        if (rawAuth) {
           const cleanCookie = rawAuth.replace(/^"|"$/g, '');
           proxyReq.setHeader('Cookie', cleanCookie);
           proxyReq.removeHeader('x-cobalt-session');
        }

        // 3. FORCE CONTENT-LENGTH
        if (req.method === 'POST' && !req.body) {
           proxyReq.setHeader('Content-Length', '0');
        }

        // 4. STANDARD SPOOFING
        proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        proxyReq.setHeader('Referer', 'https://www.dndbeyond.com/');
        proxyReq.setHeader('Origin', 'https://www.dndbeyond.com');
      });
    },
    logLevel: "debug"
  },

  // ROUTE 2: Character Data (This one was working nicely)
  "/api/character": {
    target: "https://character-service.dndbeyond.com",
    secure: true,
    changeOrigin: true,
    pathRewrite: {
      "^/api/character": "/character/v5/character"
    },
    configure: (proxy, _options) => {
      proxy.on('proxyReq', (proxyReq, req, _res) => {
        proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        proxyReq.setHeader('Referer', 'https://www.dndbeyond.com/');
        proxyReq.setHeader('Origin', 'https://www.dndbeyond.com');
      });
    }
  }
};

module.exports = PROXY_CONFIG;