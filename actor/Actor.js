class Actor {
  constructor(page) {
    this.page = page;
    this.baseUrl = "https://members.vehiclehistory.report";
  }

  async attemptsTo(task) {
    await task.performAs(this);
  }
}

module.exports = Actor;
