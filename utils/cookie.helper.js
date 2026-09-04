const fs = require('fs');
const path = require('path');

const IP_POOL = {
  KOREA: '79.110.55.34',       // South Korea (KR) - KRW (₩)
  US: '162.251.62.82',          // United States (US) - USD ($)
  UK: '172.99.190.215',         // United Kingdom (GB) - GBP (£)
  GERMANY: '85.214.132.117',    // Germany (DE) - EUR (€)
  CANADA: '192.206.151.131',    // Canada (CA) - CAD ($)
};

class CookieHelper {
  constructor(pageOrContext) {
    this.context = pageOrContext.context ? pageOrContext.context() : pageOrContext;
  }

  async captureAllCookies(options = { log: true, attachToReport: true, saveToDisk: true }) {
    const cookies = await this.context.cookies();

    if (options.log !== false) {
      console.log('\n' + '═'.repeat(70));
      console.log(`🍪 [COOKIE HELPER - ALL COOKIES CAPTURED] Total: ${cookies.length}`);
      console.log('═'.repeat(70));
      if (cookies.length === 0) {
        console.log('   (No cookies found in context)');
      } else {
        cookies.forEach((c, idx) => {
          console.log(`   [${idx + 1}] ${c.name} = "${c.value}"`);
          console.log(`       Domain: ${c.domain} | Path: ${c.path} | Secure: ${c.secure} | HttpOnly: ${c.httpOnly} | SameSite: ${c.sameSite}`);
        });
      }
      console.log('═'.repeat(70) + '\n');
    }

    const formattedJson = JSON.stringify(cookies, null, 2);

    if (options.saveToDisk !== false) {
      try {
        const dir = path.resolve(process.cwd(), 'test-results', 'cookies');
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        const filename = options.filename || `cookies-${Date.now()}.json`;
        fs.writeFileSync(path.join(dir, filename), formattedJson, 'utf-8');
      } catch (err) {
        console.error('[COOKIE HELPER] Could not write cookies to disk:', err);
      }
    }

    if (options.attachToReport !== false && options.testInfo) {
      await options.testInfo
        .attach(options.filename || 'captured-all-cookies.json', {
          body: formattedJson,
          contentType: 'application/json',
        })
        .catch(() => {});
    }

    return cookies;
  }

  async getCookie(name) {
    const cookies = await this.context.cookies();
    return cookies.find((c) => c.name === name);
  }

  async injectOrModifyCookies(cookies, baseUrl = process.env.BASE_URL || 'https://members.vehiclehistory.report') {
    const defaultDomain = new URL(baseUrl).hostname;

    const formattedCookies = cookies.map((c) => ({
      path: '/',
      domain: c.domain || (!c.url ? defaultDomain : undefined),
      ...c,
    }));

    await this.context.addCookies(formattedCookies);

    console.log(`💉 [COOKIE HELPER] Injected/Modified ${cookies.length} cookie(s):`);
    cookies.forEach((c) => {
      console.log(`   • ${c.name} = "${c.value}" (Domain: ${c.domain || defaultDomain})`);
    });
  }

  async clearCookies(nameFilter) {
    if (nameFilter) {
      await this.context.clearCookies({ name: nameFilter });
      console.log(`🧹 [COOKIE HELPER] Cleared cookie: ${nameFilter}`);
    } else {
      await this.context.clearCookies();
      console.log(`🧹 [COOKIE HELPER] Cleared all cookies from context`);
    }
  }
}

class CookieIpInjector {
  constructor(pageOrContext, customDomain) {
    this.context = pageOrContext.context ? pageOrContext.context() : pageOrContext;
    const baseUrl = process.env.BASE_URL || 'https://members.vehiclehistory.report';
    this.domain = customDomain || new URL(baseUrl).hostname;
  }

  async getCwaIpCookie() {
    const cookies = await this.context.cookies();
    return cookies.find((c) => c.name === 'cwa_ip');
  }

  async getCwaIpValue() {
    const cookie = await this.getCwaIpCookie();
    return cookie ? cookie.value : undefined;
  }

  async setCwaIpCookie(ipAddress) {
    const hostname = this.domain;
    const parts = hostname.split('.');
    const rootDomain = parts.length > 2 ? `.${parts.slice(-2).join('.')}` : `.${hostname}`;

    const cookies = [
      {
        name: 'cwa_ip',
        value: ipAddress,
        domain: hostname,
        path: '/',
        secure: true,
        httpOnly: true,
        sameSite: 'Lax',
      },
    ];

    if (rootDomain !== hostname) {
      cookies.push({
        name: 'cwa_ip',
        value: ipAddress,
        domain: rootDomain,
        path: '/',
        secure: true,
        httpOnly: true,
        sameSite: 'Lax',
      });
    }

    await this.context.addCookies(cookies);

    console.log('\n' + '─'.repeat(70));
    console.log(`💉 [CWA IP INJECTOR] Injected 'cwa_ip': "${ipAddress}" (Host: ${hostname}, Root: ${rootDomain})`);
    console.log('─'.repeat(70) + '\n');

    return this.getCwaIpCookie();
  }

  async modifyAndVerifyIp(newIp) {
    const updatedCookie = await this.setCwaIpCookie(newIp);
    const success = updatedCookie && updatedCookie.value === newIp;

    if (!success) {
      throw new Error(
        `[COOKIE IP INJECTOR] Failed to verify 'cwa_ip'. Expected "${newIp}", got "${updatedCookie ? updatedCookie.value : 'undefined'}"`
      );
    }

    return {
      success: true,
      currentIp: updatedCookie ? updatedCookie.value : undefined,
      cookie: updatedCookie,
    };
  }
}

module.exports = {
  IP_POOL,
  CookieHelper,
  CookieIpInjector,
};
