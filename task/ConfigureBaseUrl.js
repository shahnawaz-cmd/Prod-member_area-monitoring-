class ConfigureBaseUrl {
  async performAs(actor) {
    actor.baseUrl = process.env.BASE_URL || "https://members.vehiclehistory.report/members";
    console.log(`Base URL configured to: ${actor.baseUrl}`);
  }
}

module.exports = ConfigureBaseUrl;
