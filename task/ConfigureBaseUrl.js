class ConfigureBaseUrl {
  async performAs(actor) {
    actor.baseUrl = (process.env.BASE_URL || "https://members.vehiclehistory.report").replace(/\/+$/, '');
    const hasMembers = actor.baseUrl.endsWith('/members') || actor.baseUrl.includes('members.vehiclehistory.report');
    actor.dashboardUrl = hasMembers ? (actor.baseUrl.endsWith('/members') ? `${actor.baseUrl}/dashboard` : `${actor.baseUrl}/members/dashboard`) : `${actor.baseUrl}/dashboard`;
    actor.myReportsUrl = hasMembers ? (actor.baseUrl.endsWith('/members') ? `${actor.baseUrl}/my-reports` : `${actor.baseUrl}/members/my-reports`) : `${actor.baseUrl}/my-reports`;
    console.log(`Base URL configured to: ${actor.baseUrl}`);
  }
}

module.exports = ConfigureBaseUrl;
