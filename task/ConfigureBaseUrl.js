class ConfigureBaseUrl {
  async performAs(actor) {
    // Priority: environment variable > default
    actor.baseUrl = process.env.BASE_URL || "https://members.vehiclehistory.report";
    console.log(`Base URL configured to: ${actor.baseUrl}`);
  }
}

module.exports = ConfigureBaseUrl;
