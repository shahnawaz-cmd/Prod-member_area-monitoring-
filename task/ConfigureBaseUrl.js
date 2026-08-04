class ConfigureBaseUrl {
  async performAs(actor) {
    actor.baseUrl = process.env.BASE_URL || "https://members.vehiclehistory.report";
    actor.dashboardUrl = actor.baseUrl.includes('members.vehiclehistory.report') ? `${actor.baseUrl}/members/dashboard` : `${actor.baseUrl}/dashboard`;
    actor.myReportsUrl = actor.baseUrl.includes('members.vehiclehistory.report') ? `${actor.baseUrl}/members/my-reports` : `${actor.baseUrl}/my-reports`;
    console.log(`Base URL configured to: ${actor.baseUrl}`);
  }
}

module.exports = ConfigureBaseUrl;
